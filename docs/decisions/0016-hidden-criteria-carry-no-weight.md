# 0016 – Criteria the class has no data for carry no weight

- **Status:** accepted
- **In place since:** v2.2.0 (2026-09-17)
- **Sources:** maintainer decision of 2026-09-17,
  `src/utils/mixSettings.ts` (`withoutUnavailableWeights`),
  `src/utils/criteriaValidation.ts`, the v2.2.0 changelog entries

## Context

The sidebar lists only the criteria a class has data for: `isCriterionAvailable`
decides, `useMixCriteria` filters the categories, and a criterion without data
is left out entirely rather than shown greyed out. Fifteen criteria at once
would otherwise fill the panel with rows a teacher can do nothing about.

A weight for such a hidden criterion could still be above 0 — carried over from
a class that did have the data, set by "all criteria on" or by the recommended
defaults, or restored from a backup — and the algorithm scored it either way.
`useAutoMixSettings` cleared a few of them when their data disappeared
(restless, distractibility, shy, front seat, …), but nothing covered a weight
that "all on" or the defaults had just written to a criterion the sidebar does
not show. The teacher saw a sidebar that did not mention the criterion and a
plan that was partly built on it.

The same change widened when distractibility counts as available. The criterion
carries two weights — `avoidConcentrationTogether` keeps two distractible
students apart, `avoidConcentrationNearRestless` keeps a distractible student
away from a restless one — but availability asked only for two distractible
students. With one distractible and several restless students the criterion
disappeared from the sidebar while its second weight went on acting.

## Decision

- `withoutUnavailableWeights(settings, students)` in
  `src/utils/mixSettings.ts` sets the weight of every criterion
  `isCriterionAvailable` rejects to 0, and takes both distractibility weights
  along. `SeatingPlanEditorView` runs it in an effect whenever the class or the
  settings change, so it applies in either sidebar density and on the phone row.
- `useMixCriteria.setWeight` refuses to raise an unavailable criterion above 0
  and says why in a toast, so no path can put the weight back while the data is
  missing.
- `isCriterionAvailable('avoidConcentrationTogether', …)` is true for two
  distractible students **or** one distractible student and at least one
  restless classmate. Both weights are set and cleared as one
  (`withCriterionWeight`), and the sidebar and the mix history show the higher
  of the two (`criterionWeight`).

## Alternatives considered

- **Show unavailable criteria disabled, with their weight.** Makes the stale
  weight visible without a rule, but puts up to fifteen rows in the panel that
  the teacher cannot act on — and a weight that is visible but unchangeable is
  no more honest than one that is hidden.
- **Leave the settings alone and ignore unavailable criteria at scoring time.**
  Same plans, but the stored settings, the mix history and a backup would keep
  weights that never acted, and the next class with that data would inherit them
  silently.
- **Only clear on load, not while the class changes.** Cheaper, but a trait
  removed from the last student would leave the criterion acting until the next
  visit.

## Consequences

- Plans change for classes that carried a weight for a criterion without data:
  those criteria no longer take part in construction, refinement or the
  statistics.
- The weight is cleared, not remembered. When the data comes back,
  `useAutoMixSettings` turns the criterion on at its recommended weight — not at
  the value the teacher had set before.
- A backup keeps the weights it was exported with; they are cleared the next
  time step 3 opens with that class.
- Distractibility now acts for classes it used to skip: one distractible student
  next to restless classmates is separated where the criterion was previously
  unavailable. Its two weights can no longer be set apart by hand — the data
  decides which of them has anything to do.
