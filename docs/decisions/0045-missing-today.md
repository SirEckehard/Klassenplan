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
  brings everybody back. A screen reader hears each mark (`announce`).
- **The draw and the groups leave them out:** the projection's and
  "Wer kommt dran?"'s draw never picks them, and marking someone keeps the
  round as it was; "Gruppen bilden" builds its groups without them. Both pages
  say how many are missing under their title.
- **In memory, for the day:** `absenceStore` keeps the marks per class; a new
  day starts with everybody there, and so does a reload. Nothing goes to
  IndexedDB, localStorage or a backup.

## Alternatives considered

- **A list of names in a menu** beside the tap, for the keyboard and a screen
  reader. Proposed; the maintainer chose the tap alone. A teacher without a
  pointer keeps "Überspringen" in "Wer kommt dran?".
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
