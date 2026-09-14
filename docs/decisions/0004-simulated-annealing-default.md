# 0004 – Simulated annealing as the app's refinement default

- **Status:** accepted
- **Sources:** `DEFAULT_REFINE_OPTIONS` in `src/workers/algorithmOperations.ts`;
  [ALGORITHM.md](../ALGORITHM.md#refinement-strategies)

## Context

Refinement improves an arrangement by swapping students. Two strategies exist:
a greedy local search that only accepts improvements, and simulated annealing,
which accepts some worse swaps early on to leave local optima behind.

## Decision

Every refinement the app runs uses simulated annealing:
`executeAlgorithmOperation` merges `DEFAULT_REFINE_OPTIONS = { useAnnealing: true }`
into the options of `mix:refine`. `refineSeatingLocal()` called directly — in a
test, say — still defaults to the greedy search.

## Alternatives considered

- **Greedy local search as the default.** Faster, but it gets stuck in local
  optima; with many conflicting constraints or locked seats it misses
  arrangements that are only reachable through a temporarily worse one.

## Consequences

- Two refinements of the same plan can produce different results. Tests pass a
  seeded random source (`createRng(seed)`) instead of relying on statistics.
- Refinement takes longer than a greedy pass. The documented timings are not
  measured yet.
- Changing this default changes the plans teachers get for the same class, so
  it needs its own decision record.
