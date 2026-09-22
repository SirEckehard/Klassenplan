# 0017 – A seat is paper and ink, not a gender colour

- **Status:** superseded by 0020
- **In place since:** unreleased (2026-09-20)
- **Sources:** maintainer decision of 2026-09-20, the redesign concept
  "Papier & Werkzeug", `src/utils/ui/studentAppearance.ts`,
  `docs/DESIGNSYSTEM.md` § 4

## Context

Every occupied seat was tinted by the student's gender: lavender for a girl,
mint for a boy, cornflower for a non-binary student, white for nobody's guess.
It came from the first version of the canvas and was never revisited, so the
colour carried through everything the plan is shown on — the editor, the
beamer, the PDF, the circle — and a legend under the export explained it.

The colour rule the redesign settled on says the interface is paper and ink with
one accent, and that colour describes pedagogy only in the six `--data-*`
families, each of which always travels with an icon and a spelled-out word so
colour is never the only channel (`docs/DESIGNSYSTEM.md` § 4). A gender tint
breaks that on both counts: it is the one attribute painted on the seat itself,
in colours belonging to no family, with nothing beside them to read.

It also gave one of sixteen criteria a rank the other fifteen do not have.
Restlessness, shyness, the wish partners, the language level — all of them are
chips a teacher can turn on and off. Gender was the floor plan.

And it is projected. A seating plan on the smartboard is the one place a class
reads itself, and a colour-coded map of who counts as a girl and who counts as a
boy is not a thing a teacher chooses to put on the wall — it was simply always
there, visible from the back row, to everybody in the room.

## Decision

Occupied seats render in the canvas surface with a hairline contour, the same
for everyone. The two states that belong to the seat rather than to a person
keep their own look: an empty seat is the sunken surface, a seat held by hand
takes the blue that means "you did this".

`getStudentAppearance` therefore no longer branches on gender, and the export
legend loses its gender swatches — there is nothing left for them to explain.
The presentation's colour toggle stays, renamed `showRoomColors`, because it
still greys the windows, doors, board and desk.

## Consequences

- A plan no longer answers "how is the gender mix distributed" at a glance. It
  is answered where it is acted on: the **Geschlechter** criterion in the
  inspector, its fulfilment value, and the statistics after a mix.
- Teachers who used the tint to eyeball the mix lose that. The way back, if it
  is wanted, is a chip on the seat in the **Person** family — colour with an
  icon and a word, like every other attribute — not a fill.
- Exports and the beamer view get cleaner: a printed plan is black on white
  apart from the attribute chips, which is also cheaper to print.
- The seat text moves from pure black/white to `--text-page`, so the plan reads
  as the same ink as everything else.

## Alternatives considered

- **Keep the tint, make it the Person family.** One family has one colour; three
  genders would need three shades of it, which is the same colour code in a
  quieter palette and still the only attribute painted on the seat.
- **Make it a setting.** A toggle would keep the code path, the legend and the
  question alive, and default to something. The plan should not have an opinion
  about gender that has to be switched off.
