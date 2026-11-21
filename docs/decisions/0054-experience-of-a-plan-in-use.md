# 0054 – A plan in use keeps how it went, and "Erfahrung" reads it

- **Status:** proposed
- **In place since:** — (the next release)
- **Sources:** the maintainer's idea and choices of 2026-11-22 (feedback on a
  plan in "Bibliothek" that the mixing can use; a rating of the plan and, when
  it did not go well, the tables where it did not; "Lief gut" makes repetition
  milder; a criterion of its own; given in "Bibliothek" and in the plan
  layer's inspector, the tables as rows of names), the page "Plan-Feedback
  „Erfahrung“", [data-model.md](../data-model.md#plan-usage-record),
  `src/types/PlanUsage.ts` (`PlanFeedback`), `src/utils/data/planUsage.ts`
  (`normalizePlanFeedback`, `withPlanFeedback`),
  `src/repositories/planUsageStore.ts` (`setPlanFeedback`)

## Context

"Wiederholung" knows which students sat together in the plans in use
([decision 0032](0032-repetition-reads-plans-in-use.md)), not whether it
worked. What a teacher learns about an arrangement — the plan went well, the
table by the window was restless — is lost, unless it is turned into markers of
a child: "unruhig", a distance wish. Both outlast the arrangement they came
from, and both say something about one student that was true of a group.

A rating of the whole plan adds nothing the mixing could use: repetition
pushes every pair of a plan in use apart already, and a rating cannot tell
which pair it means. What can be used is where it did not work (a table), for
how long (longer than repetition), and that it did work — the one thing
repetition cannot express, since it treats every pair alike.

## Decision

- **Feedback belongs to the usage record** (`PlanUsage.feedback`), the record
  the mixing reads, not to the saved plan: a rating, `good` or `poor`, and with
  `poor` the tables at which it did not work, each as the sorted ids of who sat
  there (`poorTables`). No names and no reason are stored.
- **Giving feedback marks the plan as used.** It confirms the record, or gives
  a plan without one a record with the source `marked`, dated the day the plan
  was made, as "Genutzt" does ([decision 0025](0025-plan-usage-marked-by-hand.md)).
  Taking it back leaves the plan used. A table is kept only when every pair of
  it sat together in that arrangement (`normalizePlanFeedback`).
- **It lives and goes with the record**: a later signal for the same
  arrangement keeps it, taking the record out of the count stops it counting,
  "Zurücksetzen" empties it with the neighbourhoods and its undo brings it
  back ([decision 0023](0023-neighbourhood-reset.md)), and a backup carries it
  inside `planUsage`.

The criterion that reads it, where the teacher gives it and what the mixing
does with it follow in the next steps of the same change.

## Alternatives considered

- **Feedback on the saved plan.** The mixing reads the usage records, not the
  saved plans, while any record counts; a plan presented and never saved has
  only a record.
- **A note in words.** Free text can hold anything, health data included; the
  markers store no reason either ([PEDAGOGY.md](../PEDAGOGY.md)).
- **Feedback on a pair of students.** Exact, but that is the distance wish,
  which the class list already has.

## Consequences

- `PlanUsage` gains an optional `feedback`; data written before reads as
  without one. The backup's validation knows the field; versions before this
  one do not check a record's unknown fields and restore it without using it.
- A class that gives no feedback stores and mixes exactly as before.
- The plan usage record now says how a plan went at which table, which is
  information about the students who sat there;
  [PRIVACY.md](../PRIVACY.md#data-inventory) lists it.
