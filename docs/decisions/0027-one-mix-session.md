# 0027 – A mix is one session: construction and refinement decide by the same facts

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the code review of 2026-10-10 (findings M6, M7, N5, N6, and the
  second refinement found while carrying them out), the maintainer's decisions
  of 2026-10-10 (one session; the refinement after a restore goes as well),
  [ALGORITHM.md](../ALGORITHM.md#overview),
  [PERFORMANCE.md](../PERFORMANCE.md#algorithm-runtime),
  `src/utils/algorithm/seatingAlgorithm.ts` (`runMixSession`,
  `RefineOptions.session`), `src/utils/algorithm/scoring/arrangementScoring.ts`,
  `src/workers/algorithmOperations.ts` (`mix:run`),
  `src/hooks/useSeatingAlgorithm.ts`, `src/hooks/circle/useCircleAfterMix.ts`

## Context

"Mischen" with a criterion ran the construction and the refinement as two
worker calls, and the two disagreed about what they decide by:

- The construction counts the plan on screen as the newest plan in use, and
  the mix history as it was. The refinement ran after the construction had
  entered the mix history and stood on screen: it held the construction's own
  pairs against it. Measured over 40 seeds, the refined plans kept none of the
  360 pairs the construction had made.
- The construction weighs an earlier pair by `buildPreviousPairs` — plans in
  use fully, mixes at half, older entries less. The refinement charged every
  earlier pair the full weight, so the decay and the confidence of the usage
  records reached the construction only, while the refinement settles the
  plan.
- Each drew an even spread of the tables' targets of its own, and the
  refinement built its pair keys by hand instead of through `seatPairKey`.

On top of that, three refinements ran outside "Mischen", through a trigger
mechanism from v1.5.0 that no document described: a second one after every
mix, whose result never reached the mix history — history and screen differed
after every mix, and the teacher waited for two runs of simulated annealing,
although the measurement that removed "Verfeinern" in 3.0 had found a second
refinement to be a coin toss ([PERFORMANCE.md](../PERFORMANCE.md#does-a-longer-refinement-help));
one after the first mix on entering the plan layer; and one after a backup
was restored, which rearranged the restored plan as the plan layer opened.

## Decision

- **One worker operation, `mix:run`,** replaces `mix:generate` and
  `mix:refine`. `runMixSession` constructs and — while a criterion carries
  weight — refines in the same call, by the targets and the earlier pairs the
  construction decided by (`RefineOptions.session`). Those earlier pairs are
  what came before this mix: the plan on screen, the plans in use (or the
  saved plans), the earlier mixes — never the construction's own. Within the
  session every table is held to the construction's count.
- **The refinement weighs an earlier pair** by the weight `buildPreviousPairs`
  gives it, as the construction does, and keys pairs through `seatPairKey` and
  `seatStudentIdentifier`.
- **`refineSeatingLocal` on its own** — a test, the benchmark — does not count
  the arrangement it refines as an earlier plan either.
- **The mix history gains one entry per mix:** the arrangement the session
  settled on, which is the one on screen. That is what
  [decision 0014](0014-mix-history-records-refined-plan.md) wanted, without
  replacing an entry afterwards.
- **The app refines only within "Mischen".** The automatic refinements and
  their trigger mechanism (`useAutoMixTriggers`, `useAutoMixTrigger`) are
  gone; what else followed a mix — drawing the circle anew — is
  `useCircleAfterMix`.

## Alternatives considered

- **Correcting each point within the two calls.** The same change of results,
  but two calls would keep deciding by two copies of the facts, and the class
  would still be copied into the worker twice per mix.
- **Keeping the refinement after a restore, without holding the plan's own
  pairs against it.** Declined on 2026-10-10: a restore brings back what was
  saved.
- **Leaving it.** The fulfilment the badge shows differed by less than half a
  point, but the refinement contradicted the documented weighting, the
  history disagreed with the screen, and every mix took twice as long.

## Consequences

- Plans change for classes that mix with a criterion. A seed comparison of the
  old and the new path — 30 seeds, 24 students at double desks and 28 at
  group tables, three earlier mixes, the default weights — found the weighted
  fulfilment at 62.8 → 62.1 % and 64.4 → 65.0 %, and the pairs of the plan on
  screen recurring 2.7 → 2.7 and 1.8 → 1.7 times per plan: no change beyond
  the noise.
- "Mischen" runs simulated annealing once instead of twice: 110 → 58 ms and
  234 → 123 ms in that comparison.
- The mix history holds the plan on screen after every mix (before: after
  none of the 30).
- A restored plan stays as it was saved. The first plan on the plan layer is
  refined within its own mix while a criterion is on.
- With the tables spread evenly, the refinement keeps the counts the
  construction drew.
- The worker protocol changes. The worker ships with the app, so no stored
  data and no older client is affected.
- Under Vitest the annealing measures about a tenth slower than before, most
  of it the module runner's getters on the shared key functions, which the
  bundled app does not have ([PERFORMANCE.md](../PERFORMANCE.md#algorithm-runtime)).
