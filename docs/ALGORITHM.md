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
