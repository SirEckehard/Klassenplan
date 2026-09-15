# 0013 – One performance criterion at a time

- **Status:** accepted
- **In place since:** v2.1.0 (2026-09-16)
- **Sources:** [PEDAGOGY.md](../PEDAGOGY.md#tension-between-peertutoring-and-homogeneousperformancegroups),
  maintainer decision of 2026-09-14, `src/utils/mixSettings.ts`

## Context

Two criteria use the teachers' performance flags and pull in opposite
directions: `peerTutoring` seats strong and weak students together,
`homogeneousPerformanceGroups` seats students of the same level together. Both
carry a recommended weight of 3, because both approaches are legitimate.

The controls already set the other criterion to 0, but settings could still
carry both: `normalizeMixSettings` filled missing fields with both recommended
weights, and the automatic activation of `peerTutoring` — when performance data
first appear, and on the first visit to step 3 — ignored a chosen homogeneous
criterion. With equal weights, construction then applied `peerTutoring`,
refinement applied `homogeneousPerformanceGroups`, and the table score rewarded
mixed tables whenever `peerTutoring` was above 0.

## Decision

- `resolvePerformanceCriterion()` in `src/utils/mixSettings.ts` picks the one
  criterion that applies: the higher weight, `peerTutoring` on a tie.
  Construction (`scorePerformance`), refinement (`arrangementScoring.ts`), the
  table score (`tableScoring.ts`) and the statistics all ask it.
- `normalizeMixSettings()` sets the other weight to 0, so the store, stored
  settings and imported backups hold at most one of the two.
- The automatic activation of `peerTutoring` leaves a chosen homogeneous
  criterion alone, and the criterion toggle clears the other criterion before
  it sets its own.

## Alternatives considered

- **One three-way control (mixed / similar / off).** Clearer in the UI, but it
  changes the controls and the stored `MixSettings` shape, including the backup
  format, for the same effect on the plans.
- **A shared tie-break rule without touching the settings.** Would align
  construction and refinement, but leave settings that show two active criteria
  while only one applies.

## Consequences

- Plans change only for settings that carried both weights: they now follow the
  higher weight, or `peerTutoring` on a tie, in every phase.
- Such settings lose the other weight the next time they are loaded — from the
  browser, a class or a backup.
- The recommended weights stay 3 for both; "all on" and the defaults resolve to
  `peerTutoring`.
