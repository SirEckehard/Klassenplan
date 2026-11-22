# 0054 – A plan in use keeps how it went, and "Erfahrung" reads it

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's idea and choices of 2026-11-22 (feedback on a
  plan in "Bibliothek" that the mixing can use; a rating of the plan and, when
  it did not go well, the tables where it did not; "Lief gut" makes repetition
  milder; a criterion of its own; given in "Bibliothek" and in the plan
  layer's inspector, the tables as rows of names) and the four defaults
  confirmed on the page "Plan-Feedback „Erfahrung“" the same day (twice as
  long as a repetition, a quarter per pair without a table, good pairs out of
  "Wiederholung", no free text),
  [data-model.md](../data-model.md#plan-usage-record),
  [ALGORITHM.md](../ALGORITHM.md#how-a-plan-went),
  `src/types/PlanUsage.ts` (`PlanFeedback`), `src/utils/data/planUsage.ts`
  (`normalizePlanFeedback`, `withPlanFeedback`),
  `src/repositories/planUsageStore.ts` (`setPlanFeedback`),
  `src/utils/pairs.ts` (`buildPlanExperience`),
  `src/utils/algorithm/model/criteria.ts` (`pairTerm`, `historyFactor`),
  `src/utils/algorithm/model/fulfilment.ts`,
  `src/utils/algorithm/model/bounds.ts` (`fewestPairsTogether`)

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

- **"Erfahrung" is a criterion of its own** (`considerPlanFeedback`, family
  Verlauf, "Wichtig" by default, "Sehr wichtig" in "Klassenarbeit"), not a
  part of "Wiederholung": it acts with repetition off, and it shows what it
  achieved on a line of its own (decision 0031). A pair of a table that did
  not work costs `considerPlanFeedback` × 2 × its weight at the table, as a
  distance wish of the same level; a plan rated "Lief nicht gut" without a
  table weighs each of its pairs a quarter. It counts fully for the
  repetition's window of plans in use and fades out over a second one as
  long.
- **"Lief gut" makes repetition milder.** While "Erfahrung" counts, the pairs
  of a plan that went well count half as repetition, as two who wish each
  other do (decision 0033), and stay out of the "Wiederholung" line.
- **It weighs nothing without feedback, and it is never cleared for want of
  it.** Stored settings and presets from before take it at its default
  (`MIX_CRITERIA_VERSION` 3), unless every weight is off; a mix treats it as
  off while no plan has feedback, so a class mixing by chance stays so. The
  records load after the class, so the panel only hides it until then — a
  weight cleared on that would lose the level the teacher chose.
- **The fulfilment counts what the room allows**: per table that did not work,
  the pairs its students must form wherever they sit are left out.

Where the teacher gives it follows in the next step of the same change.

## Alternatives considered

- **Feedback on the saved plan.** The mixing reads the usage records, not the
  saved plans, while any record counts; a plan presented and never saved has
  only a record.
- **A note in words.** Free text can hold anything, health data included; the
  markers store no reason either ([PEDAGOGY.md](../PEDAGOGY.md)).
- **Feedback on a pair of students.** Exact, but that is the distance wish,
  which the class list already has.
- **A part of "Wiederholung"** (proposed first): no new criterion, but no
  effect with repetition off and one line for two meanings. The maintainer
  chose a criterion of its own.
- **A rating of the plan alone.** Simple, but it tells the mixing nothing
  repetition does not, so the tables come with "Lief nicht gut".
- **The criterion shown and weighed only with feedback**, as markers are
  (decision 0016). The records load after the class; a weight cleared while
  they load and set again once they are there would undo the teacher's
  level on every switch of class.

## Consequences

- `PlanUsage` gains an optional `feedback`; data written before reads as
  without one. The backup's validation knows the field; versions before this
  one do not check a record's unknown fields and restore it without using it.
- A class that gives no feedback stores and mixes exactly as before: every
  room of mixQuality gives the same plan for each of its 30 seeds as before
  (210 plans compared before and after).
- Measured over runs of six plans, the most restless table of each said not to
  have worked (`mixRuns`, 30 seeds): such a pair sat together again later in
  30.9 % of the chances at double desks without the feedback and 0.7 % with
  it, at groups of four 17.9 % and 2.0 %, at groups of six 15.8 % and 7.7 % —
  five tables of six cannot part every table of six. The fulfilment over the
  run moved from 85.0, 82.1 and 81.2 % to 87.5, 83.1 and 80.5 %, the
  "Erfahrung" line included. A mix takes no longer (see
  [PERFORMANCE.md](../PERFORMANCE.md#mix-quality)).
- What the feedback does for a class — whether it gets calmer — the app
  cannot measure: it sends nothing and has no outcome but the ratings
  themselves, too few and too noisy to read.
- The plan usage record now says how a plan went at which table, which is
  information about the students who sat there;
  [PRIVACY.md](../PRIVACY.md#data-inventory) lists it.
