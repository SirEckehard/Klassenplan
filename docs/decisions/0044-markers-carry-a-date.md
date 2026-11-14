# 0044 – Markers carry a date, and the app asks whether they still hold

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-12 on the checklist
  "Klassenplan Ausbau 3.4" (after twelve weeks, half a year being too long;
  classes from before count from the day they were made),
  [PEDAGOGY.md § 2](../PEDAGOGY.md#2-attributes-contextual-not-diagnostic),
  [PRIVACY.md](../PRIVACY.md), `src/utils/data/markerReview.ts`,
  `src/hooks/useMarkerReview.ts`,
  `src/components/ui/feedback/MarkerReviewReminder.tsx`

## Context

A marker describes how a student behaves now, not who they are, and the
pedagogical notes ask teachers to look at them at least once a term
(PEDAGOGY § 2). Nothing in the app said when a marker was set: a "restless"
from the first week of school stood in March as it stood in September, and
every mix weighed it. Data protection asks the same from the other side —
data kept no longer than it is needed — and leaves it to the one who keeps it.

## Decision

- **A student carries the day a marker changed** (`markersUpdatedAt`,
  `YYYY-MM-DD`). The store stamps it whenever a patch changes a marker
  (`stampMarkerChange` in `studentsStore`): behaviour, needs, performance,
  height, language level, role, wishes and distance wishes, seat
  preferences — not the name, the gender or the photo. A student imported
  from a list with markers is stamped on arrival (`stampNewStudent`).
- **A class carries the day its markers were said to hold**
  (`markersReviewedAt`), written by `updateClassMetadata` like the name and
  the notes.
- **The question:** once a student's markers stood still for
  `MARKER_REVIEW_AGE_WEEKS` (12) — counted from the latest of their own
  change, the class's last review and, for a class from before the dates,
  the day it was made — the plan layer shows a card above the plan: how many
  students it concerns, why it asks, and three answers. "Zur Klassenliste"
  goes there; "Passt noch" notes the day on the class; "Später" asks again in
  `MARKER_REVIEW_SNOOZE_DAYS` (7), kept in localStorage by class id. Students
  without a marker are never asked about.
- **The class layer's inspector** says when the markers were last said to
  hold, with "Jetzt geprüft", so a teacher who has just been through the list
  need not wait for the question.
- **Nothing changes by itself:** no marker is cleared or greyed out, no mix
  weighs an old marker less.

## Alternatives considered

- **Half a year.** Proposed first; too long for the maintainer, who chose
  twelve weeks over eight or six, or asking at every mix after four.
- **Markers that lapse.** Clearing or weakening a marker after a time would
  change plans without the teacher deciding it, and a front seat or a free
  seat beside may be needed for years.
- **One date for the class.** Simpler, but then a list imported in a new
  class would count as reviewed for all, and the card could not say how many
  students it concerns.
- **The clock starting with the next change** for classes from before the
  dates. Quieter after the update, but the classes nobody touched — the ones
  the question is for — would never be asked about.

## Consequences

- **Stored data:** two optional dates, on a student and on a class; the backup
  keeps export version 3 and takes both; an older version ignores them. A
  marker change now also changes the student's date, so an undo brings the
  old date back with the old marker.
- **Teachers** see the card once per class after the update when the class
  is older than twelve weeks and has markers; "Passt noch" or "Später" puts it
  away.
- **localStorage** gains `spg.markerReviewSnoozedUntil`: class ids and days,
  no names; "Alle Daten löschen" clears it.
- **The plans** do not change: the dates are read by the card alone.

## Addendum of 2026-11-14: the review before the release

The review of 2026-11-14 (M15, N34, A6 on its checklist) brought three
changes the maintainer chose:

- **The hand and the height are no markers to review.** Whether a child
  writes with the left hand or is tall does not change with the weeks; asked
  about every twelve weeks, the question wore thin. Neither carries a day any
  more nor brings the card; the card's sentence about behaviour fits what is
  left.
- **One answer for every class.** A class from before the dates counts from
  the day it was made, and most were made with the school year: they reach
  twelve weeks together, in the weeks after the release. Where there is more
  than one class, the card offers "Alle Klassen passen noch", which notes the
  day on every class (`confirmAll` in `useMarkerReview`) and says for how many
  it did.
- **One card at a time, short below `lg`.** The update notice, the backup
  reminder and this card stood one above the other and, thirteen weeks on
  without a backup, pushed the plan off a phone and halved it on a tablet.
  They now show one at a time in that order, and below `lg` with their
  sentence and their answers only; `touch-layouts.spec.ts` keeps the plan in
  sight with a notice due.
