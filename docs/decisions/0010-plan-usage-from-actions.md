# 0010 – Plan usage is derived from actions, not asked for

- **Status:** accepted
- **In place since:** v2.0.1 (2026-09-05)
- **Sources:** [ALGORITHM.md](../ALGORITHM.md#plan-usage-record),
  `src/types/PlanUsage.ts`, `src/utils/data/planUsage.ts`

## Context

The "avoid previous pairs" criterion used to read the mix history. Teachers
shuffle many times before settling on a plan, so that history is mostly
experiments: a pair that came up in a dozen tries looked exactly like a pair that
really sat together for a term.

## Decision

Klassenplan records which plans were really in use, from actions that only
happen for a real plan — presenting it for 30 seconds, exporting it, saving it
under a name, rearranging seats by hand — with no extra step in the UI.

- A record is rated by its strongest signal, never by their sum.
- Records are deduplicated by a fingerprint of the arrangement's pairs.
- A hand edit alone only creates a provisional record.
- The first strong signal for an arrangement shows a toast that lets the teacher
  withdraw it; the neighbourhood view lists every counted plan.
- Only pair keys and timestamps are stored, at most 40 records per class.

## Alternatives considered

- **Feeding the criterion from the mix history alone.** The weakness described
  above.
- **Storing full arrangements.** Rejected: pair keys keep a year of records small
  and duplicate no personal data beyond the student ids already stored.

## Consequences

- Signals can be wrong, hence the confirmation toast and the withdraw option.
- Records live in one bucket per class, so work that reads a class id next to
  class data runs where both come from the same load. Until 2026-09-14 the class
  id changed ahead of the data on a class switch; now both change in one update
  ([ARCHITECTURE.md](../ARCHITECTURE.md#switching-classes)).
- Backups since format version 2 carry the record.
