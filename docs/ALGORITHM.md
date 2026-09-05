# Algorithm Documentation

This document describes the algorithms used in the Klassenplan seating generator.

## Overview

The seating plan generation is a two-phased process:

1.  **Construction (Greedy)**: A valid initial arrangement is built by placing students one-by-one into the best available seats.
2.  **Refinement (Iterative)**: An existing arrangement is improved by swapping students to reduce constraint violations (score).

The two phases are **separate user actions**, not one pipeline:

| UI action             | Worker operation | Runs                                                             |
| :-------------------- | :--------------- | :--------------------------------------------------------------- |
| "Mischen" / shuffle   | `mix:generate`   | `generateSeatingPlan()` — construction only, **no refinement**   |
| "Verfeinern" / refine | `mix:refine`     | `refineSeatingLocal()` — refinement of the arrangement on screen |

`generateSeatingPlan()` is `initializeAssignment` → `runPass` → `finalize`; it never calls `refineSeatingLocal()`. A plain shuffle therefore never pays for a local search.

---

## Refinement Strategies

We provide two distinct strategies for the refinement phase. The choice of strategy depends on the complexity of the constraints and the desired balance between speed and quality.

> **Default:** The two layers disagree on purpose, so read both:
>
> - `refineSeatingLocal()` on its own falls back to **Greedy** — Simulated Annealing needs `useAnnealing: true` in its options (see `src/utils/algorithm/seatingAlgorithm.ts`). This is what a direct caller (a test, say) gets.
> - Every call **the app** makes goes through `executeAlgorithmOperation('mix:refine', …)`, which merges in `DEFAULT_REFINE_OPTIONS = { useAnnealing: true }` (see `src/workers/algorithmOperations.ts`). **The "Verfeinern" button therefore runs Simulated Annealing**, unless a caller explicitly passes `useAnnealing: false`.
>
> That constant lives in `algorithmOperations.ts` and nowhere else, so the worker and the main-thread fallback cannot drift apart on it.

### Strategy A: Greedy Refinement (Local Search)

**Concept**: A "Hill Climbing" approach. The algorithm looks for swaps that _immediately_ improve the total score (lower is better). It never accepts a swap that makes the arrangement worse.

- **Pros**:
  - **Fast**: Very efficient, typically runs in under 100ms.
  - **Deterministic**: Running it twice on the same input usually yields similar results.
- **Cons**:
  - **Local Optima**: Can get "stuck". For example, if swapping Student A and Student B makes things worse temporarily but allows for a perfect arrangement 2 moves later, Greedy will never find it.
- **Best for**:
  - Standard classrooms with few heavy constraints.
  - Minor adjustments to an already good plan.

### Strategy B: Simulated Annealing (SA)

**Concept**: Probabilistic optimization inspired by metallurgy. The algorithm explores the solution space by trying random swaps.

- If a swap improves the score, it is **always accepted**.
- If a swap _worsens_ the score, it is **accepted with a probability** that depends on:
  1.  How much worse the new score is (small regressions are accepted more often).
  2.  The current "temperature" (early in the process, chaos is allowed; later, only improvements are accepted).

**Formula**: $P(accept) = e^{(currentScore - newScore) / temperature}$

- **Pros**:
  - **Global Optima**: Can escape local traps by temporarily accepting worse states to find a better global configuration.
  - **Robustness**: Handles complex, conflicting constraints (e.g., "A needs front", "B avoids C", "C needs double table") much better than Greedy.
- **Cons**:
  - **Slower**: Requires thousands of iterations to be effective (200ms - 1s).
  - **Non-deterministic**: Different runs can produce different layouts.
- **Best for**:
  - Complex scenarios with many constraints.
  - "Locked" seats that fragment the solution space.
  - When the "Greedy" result is unsatisfactory.

## Configuration

The **Simulated Annealing** process is controlled by these parameters:

| Parameter           | Default | Description                                                                               |
| :------------------ | :------ | :---------------------------------------------------------------------------------------- |
| `initialTemp`       | `10.0`  | Starting "chaos" level. Higher values allow more bad swaps early on.                      |
| `coolingRate`       | `0.97`  | How fast the system cools down (0-1). closer to 1 = slower cooling, more thorough search. |
| `iterationsPerTemp` | `50`    | Number of swap attempts at each temperature step.                                         |
| `minTemp`           | `0.01`  | When to stop.                                                                             |

---

## Plan Usage Record

`avoidPreviousPairs` reads pair weights from `buildPreviousPairs()`
(`src/utils/pairs.ts`). Feeding it the mix history alone had a known weakness:
teachers shuffle many times before settling, so the mix history is mostly
experiments, and a pair that happened to come up in a dozen consecutive tries
looked exactly like a pair that really sat together for a term.

The plan usage record fixes that. It notes which arrangements were **actually in
use**, derived from actions that only happen for a real plan — no extra step in
the UI:

| Signal      | Raised by                                       | Confidence |
| :---------- | :---------------------------------------------- | ---------: |
| `presented` | `/present` after 30 s of dwell time, table mode |        1.0 |
| `exported`  | print, PDF, PNG or SVG export of a table plan   |        1.0 |
| `saved`     | a plan saved under a name the teacher chose     |        0.8 |
| `edited`    | seats rearranged by hand (debounced 4 s)        |        0.3 |

A record is rated by its **strongest** signal, never by their sum: presenting a
plan twice is not better evidence than presenting it once.

**Deduplication** is what keeps the record honest. Every signal is reduced to
the sorted pair keys of the arrangement and hashed into a fingerprint
(`computePlanFingerprint`). A signal whose fingerprint already exists extends
that record — `lastSeenAt` moves, the source is added — instead of appending a
second one. Presenting the same plan every week for a term is therefore one
record spanning that term, not twelve records. Experiments never enter at all,
because nobody presents, exports or names them.

`edited` is deliberately weaker than the rest: rearranging seats says the
teacher means this arrangement, not yet that it was used. Such a record is
_provisional_ and is dropped as soon as a different arrangement turns up. If one
of the stronger signals arrives for the same fingerprint first, it is promoted
instead.

**Where it lives:** `src/utils/data/planUsage.ts` (pure merge rules),
`src/repositories/planUsageStore.ts` (storage, one bucket per class),
`src/hooks/plan/usePlanUsageTracking.ts` (the `edited` signal).

**One bucket per class, and it has to stay that way.** `activeClass` is set
optimistically on a class switch, before the new class's data is loaded, so any
effect reading a class id next to class data can briefly see one class's id
beside the previous class's plans — the same hazard `applyPersistedState`
already warns about for the persist queue. The one-time backfill from older
saved plans therefore runs inside `applyPersistedState`
(`src/hooks/useSeatingPersistence.ts`), where the id and the plans come from the
same load, and a pending `edited` signal is dropped when the class changes.
`sweepOrphanPlanUsage` is the backstop: on every load it drops records that name
nobody from the class they sit under, which also repairs buckets contaminated by
earlier versions.

### Confirmation

The signals are cheap because they are read from what the teacher does anyway —
which also means they can be wrong. So the record is written first and a toast
offers to take it back: doing nothing keeps the plan counted, one click marks it
`confirmed: false`. The prompt appears on the **first strong signal** for an
arrangement, never again for the same one, and never for a hand edit. The
neighbourhood view (third tab of the history modal) lists every counted plan and
lets one be withdrawn or restored later.

`isCountedUsage()` in `src/utils/data/planUsage.ts` is the single definition of
what counts, shared by the evaluation and the scoring, so the number a teacher
reads and the number the algorithm optimizes cannot drift apart.

### How the weights are built

`buildPreviousPairs()` sums two independent histories per pair, capped at 1:

| History              | Source                                                                                           | Factor                           |
| :------------------- | :----------------------------------------------------------------------------------------------- | :------------------------------- |
| What was really used | the arrangement on screen, then the usage records — or the saved plans when no record exists yet | `entry.confidence`               |
| The running session  | recent mixes                                                                                     | `MIX_HISTORY_CONTRIBUTION` = 0.5 |

Both decay with recency within themselves: the newest entry counts fully, the
oldest down to `MIN_DECAY_WEIGHT`.

Two properties matter here:

- **Real plans are read first and can never be crowded out.** Before this, all
  sources shared one window; a full mix history (20 entries) pushed the saved
  plans out of it entirely, so after a long shuffling session the criterion ran
  purely on experiments from that one afternoon.
- **Experiments weigh half.** The mix history still does its job — shuffling
  twice in a row should not hand back the same neighbours — but it can no longer
  outweigh an arrangement a class actually sat in.

`MIX_HISTORY_CONTRIBUTION` is the tuning knob if repeated shuffling turns out to
vary too much or too little.
