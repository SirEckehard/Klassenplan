# 0014 – The mix history records the refined plan

- **Status:** accepted
- **In place since:** v2.1.0 (2026-09-16)
- **Sources:** [ALGORITHM.md](../ALGORITHM.md), maintainer decision of
  2026-09-14, `src/hooks/useSeatingAlgorithm.ts`, `src/utils/pairs.ts`

## Context

With at least one criterion active, _Mischen_ constructs an arrangement, records
it in the mix history and then refines it in a second worker call
(`useSeatingMixHandler`). Only the screen received the refined arrangement.

The mix history is more than a list. `buildPreviousPairs` counts its pairs at
half weight for "avoid previous pairs" (`MIX_HISTORY_CONTRIBUTION` in
`src/utils/pairs.ts`), and loading a shuffle from the history puts its
arrangement back on screen. The criterion therefore avoided pairs the teacher
never saw, and loading an entry brought back a plan the teacher never had.

## Decision

`useSeatingAlgorithm` remembers the entry `generateSeatingPlan` recorded last.
When `refineSeatingLocal` starts from exactly that arrangement — the chain
`useSeatingMixHandler` runs — its result replaces the entry's seating; id,
timestamp and settings stay. Any other refinement leaves the history alone.

## Alternatives considered

- **Recording the entry only after the refinement.** Needs a separate "record"
  action passed through the contexts to the mix handler, and a shuffle whose
  refinement is interrupted would leave a plan on screen without an entry.
- **Keeping the constructed arrangement.** The weaknesses described above.

## Consequences

- Later shuffles avoid the pairs of the refined plans, so plans change for
  classes that shuffle with criteria.
- Entries recorded before the change keep their constructed arrangement until
  newer shuffles push them out (20 per class).
- If the refinement is interrupted, the entry keeps the constructed arrangement
  — which is also what stays on screen.
- The refinement itself still reads the history with its own constructed entry
  in it, as before.
