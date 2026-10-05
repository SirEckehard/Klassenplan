# 0023 – The neighbourhoods can be reset in one click

- **Status:** accepted
- **In place since:** unreleased (2026-10-03)
- **Sources:** maintainer decision of 2026-10-03 ("Neuanfang ab heute"),
  [ALGORITHM.md](../ALGORITHM.md#plan-usage-record),
  `src/repositories/planUsageStore.ts` (`resetPlanUsage`,
  `undoPlanUsageReset`), `src/utils/pairs.ts` (`buildPreviousPairs`' `since`),
  `src/components/library/inspectors/NeighboursPanel.tsx` (until 2026-10-06
  `NeighborhoodMatrix.tsx`, the list of pairs it replaced)

## Context

The neighbourhood view under "Bibliothek" shows who has sat next to whom,
from the plans that were really in use ([decision 0010](0010-plan-usage-from-actions.md)).
A teacher could only take plans out of the count one at a time. At the start of
a school year, or with a class that was mixed up anew, the whole history is
what should go — and taking every record out was not even enough:
`buildPreviousPairs` falls back to the saved plans when no record counts, so the
old pairs came back by another way.

## Decision

"Zurücksetzen" in the neighbourhood view starts the class afresh, in one click,
without a confirmation dialog; the toast after it offers "Rückgängig".

- `resetPlanUsage` empties the class's bucket, keeps the class among
  `backfilledClassIds` so its saved plans do not seed it again, and stamps the
  moment in `resetAtByClass`.
- `buildPreviousPairs` receives that moment as `since` (carried as
  `planUsageSince` beside `planUsage`, into the worker too) and leaves out
  saved plans dated up to the day of the reset and mixes from before it.
- `undoPlanUsageReset` puts the records back beside any that arrived since and
  restores the previous stamp.

## Alternatives considered

- **Taking every record out of the count** ("Nicht werten" for all). Reversible
  record by record, but the fallback to the saved plans would have counted the
  old pairs again.
- **Deleting the saved plans and the mix history as well.** Rejected: the plans
  and mixes are still wanted for loading, only not for the count.
- **A confirmation dialog.** The toast's "Rückgängig" makes the click safe
  without asking first, as the toast that withdraws a single plan does.

## Consequences

- `PlanUsageData` gains an optional `resetAtByClass`; data written before it
  reads as never reset. Backups carry it as `planUsageResetAt`.
- For a class that was reset, the algorithm and the statistics produce
  different plans than before: older pairs no longer push students apart. A
  class that was never reset produces exactly the plans it did before.
- Saved plans carry a day, not a moment, so a plan saved on the day of the
  reset no longer counts through the fallback; a plan saved under a name after
  the reset has a usage record of its own anyway.
