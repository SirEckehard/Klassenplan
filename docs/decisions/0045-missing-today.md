# 0045 – Who is missing today, marked in the projection and never stored

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-12 on the checklist
  "Klassenplan Ausbau 3.4" (marked in the projection alone, by a tap on the
  seat, never stored), [decision 0001](0001-offline-first-no-server.md),
  [PRIVACY.md](../PRIVACY.md), `src/stores/absenceStore.ts`,
  `src/utils/ui/presentationSeats.ts`,
  `src/components/scene/PresentationScene.tsx`,
  `src/hooks/ui/useRandomStudentPicker.ts`

## Context

A seating plan stands for weeks; on any morning a few students are not
there. "Wer kommt dran?" drew them anyway, the teacher pressed "Überspringen",
and "Gruppen bilden" left groups one short. Keeping a register of absences is
not what Klassenplan is for, and a list of who was missing on which day is
personal data a seating plan does not need.

## Decision

- **A tap on a seat in the projection** marks its student as missing today; a
  second tap brings them back. The seat stays and is veiled with the page's
  colour, so the room still reads as it is set. Pan and zoom go on as before:
  a press that travels moves the plan (`useTapGesture`). The seat under the
  finger is found from where the press lands in the room's own coordinates
  (`seatAtPoint`), since the projection's seats carry no targets of their own
  and a layer of them would take the hover from the badges.
- **The projection's bar** counts them ("2 fehlen heute"); a press on the count
  lists them above the bar, where a name brings that student back and
  "Löschen" everybody (see the addendum). A screen reader hears each mark
  (`announce`).
- **The draw and the groups leave them out:** the projection's and
  "Wer kommt dran?"'s draw never picks them, and marking someone keeps the
  round as it was; "Gruppen bilden" builds its groups without them. Both pages
  say how many are missing under their title.
- **In memory, for the day:** `absenceStore` keeps the marks per class; a new
  day starts with everybody there, and so does a reload. Nothing goes to
  IndexedDB, localStorage or a backup.

## Alternatives considered

- **A list of names in a menu** beside the tap, for the keyboard and a screen
  reader. Proposed; the maintainer chose the tap alone at first and asked for
  the list two days later (see the addendum). Marking still takes a tap: a
  teacher without a pointer keeps "Überspringen" in "Wer kommt dran?".
- **Marking in the class list** as well. The list is where a class is kept,
  and a mark there would read as kept; the projection is where the day
  happens.
- **Keeping the marks** until changed, or for a lesson. A mark kept is a
  record of absences; one that ends with the day needs no deletion rule.

## Consequences

- **No stored data** and nothing in PRIVACY's inventory: the marks live in the
  open page.
- **The circle** in the projection draws as before: marks are made on the plan;
  made there, they still keep a student out of the draw in the circle.
- A teacher who reloads the projection marks again; that is the price of
  storing nothing.

## Addendum of 2026-11-14: the count lists the missing

On a phone the first use showed three things (the maintainer's notes of
2026-11-14):

- **The count opens a list**, as the maintainer asked: a press on "2 fehlen
  heute" no longer brings everybody back at once but lists the missing above
  the bar; a name brings that student back, "Löschen" at the list's foot
  everybody. The list hangs on the bar itself: in fullscreen only the
  projection is on screen, and the bar's row scrolls on a phone and would
  clip it.
- **The veil has the seat's shape.** It was a rectangle in the page's colour
  over the seat, whose corners showed past the table's round ones. It is the
  seat's own outline (`SeatShape.outline`) in the table's surface colour, so
  the seat reads as nearly empty.
- **A second finger abandons the tap** (`useTapGesture`): a finger resting on a
  seat through a pinch marked its student when it lifted.

Nothing about what is kept changes: the marks stay in memory, for the day.
