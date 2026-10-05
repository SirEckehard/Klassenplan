# 0025 – The plans in use can be marked by hand instead of detected

- **Status:** accepted
- **In place since:** unreleased (2026-10-06)
- **Sources:** maintainer request of 2026-10-06 (the detection switched off,
  the plans marked as "genutzt" in the inspector of a plan in "Bibliothek"),
  its open points — per class, records kept, no fallback, "Genutzt" —
  confirmed the same day,
  [ALGORITHM.md](../ALGORITHM.md#marking-by-hand),
  `src/repositories/planUsageStore.ts` (`setPlanUsageManual`, `markPlanUsed`),
  `src/utils/data/planUsage.ts` (`markPlanUsage`, `resolvePlanUsageMode`),
  `src/utils/pairs.ts` (`buildPreviousPairs`' `manual`),
  `src/components/library/inspectors/PlanPanel.tsx`

## Context

Which plans were really in use is read from what the teacher does — present,
export, save under a name ([decision 0010](0010-plan-usage-from-actions.md)).
That costs no extra step, but it guesses: a plan shown once to discuss it, or
exported for a substitute who never used it, counts as a plan the class sat in.
The only correction was the toast after the first strong signal and "Nicht
werten" in the neighbourhoods' list, record by record. A teacher who wants to
decide alone had no way to stop the guessing.

## Decision

The inspector of a plan in "Bibliothek" gains a section "Nutzung" with two
switches:

- **"Genutzt"** marks this plan as used or not, with the detection on or off.
  A plan with a record keeps it and takes the answer (`confirmed`); a plan
  without one gets a record with the new source `marked`, dated the day the
  plan was made.
- **"Automatisch erkennen"** switches the detection of the whole class off or
  on (`PlanUsageData.manualClassIds`). Off, `recordPlanUsage` and the backfill
  write nothing for the class, and only records marked as used count.

The detected records are kept while a class marks by hand.
`usePlanUsageRecords` resolves them for the mode on reading
(`resolvePlanUsageMode`: unanswered reads as not counted), so every reader —
the neighbourhoods, the statistics, the algorithm — stays on
`isCountedUsage`. `buildPreviousPairs` additionally receives the mode as
`manual` (`planUsageManual`, carried beside `planUsageSince`, into the worker
too) and then never falls back to the saved plans.

## Alternatives considered

- **One switch for all classes, in the settings menu.** The record and the
  reset are per class, and a teacher may well trust the detection in one class
  and not in another; the request named the plan's inspector as the place.
- **Keeping the detected records counted after the switch.** Simpler, but then
  "only what I mark counts" would not hold for everything detected before.
  Resolving on reading keeps them for a switch back without counting them now.
- **Deleting the detected records when the detection goes off.** Not
  reversible, and the next signal after switching back would have no history to
  extend.
- **Resolving the fallback through the records alone, without a flag.** A class
  that marked nothing has no counted record, so the saved plans would have
  stood in for it — exactly the plans the teacher did not mark.

## Consequences

- `PlanUsageData` gains an optional `manualClassIds`, `PlanUsageSource` the
  value `marked`; data written before reads as detecting. Backups carry the
  list as `planUsageManualClassIds`. A backup holding a `marked` record is
  refused by versions before this one, whose validation knows four sources.
- A class that detects its plans produces exactly the plans it did before. A
  class that marks by hand produces different ones as soon as the switch goes
  off: only the marked plans push pairs apart, and with none marked only the
  arrangement on screen and the recent mixes do.
- While the detection is off, the toast after presenting or exporting no
  longer appears for the class, since nothing is recorded to take back.
