# 0020 – Seats carry a quiet gender tint again

- **Status:** accepted
- **In place since:** unreleased (2026-09-22)
- **Sources:** maintainer decision of 2026-09-22, which reverses
  [0017](0017-seats-are-paper-and-ink.md); `src/utils/ui/studentAppearance.ts`,
  `src/utils/ui/classBadgeLegend.ts`, `src/components/scene/PresentationScene.tsx`

## Context

Decision 0017 took the gender tint off the seats: every occupied seat became
the canvas surface with a hairline. Its consequences named the cost — teachers
who used the tint to eyeball the mix lose that — and the way back it had in
mind: a chip in the **Person** family rather than a fill.

On 2026-09-22 the maintainer asked for the fill of the earlier design back —
green for a boy, lilac for a girl, blue for a non-binary student — in quiet
tones for light and dark mode that suit the current design language. No further
reason is on record.

The earlier tint predates the redesign: pale 50-level fills with saturated
500-level contours in light mode, 700-level fills in dark mode, all raw
Tailwind palette values.

## Decision

An occupied seat is tinted by the student's gender again, in `STUDENT_COLORS`
(`src/utils/ui/studentAppearance.ts`):

| Gender  | Light fill / contour  | Dark fill / contour   |
| ------- | --------------------- | --------------------- |
| boy     | `#ebf4ef` / `#84bf9d` | `#20312a` / `#376f4c` |
| girl    | `#f3effc` / `#b79deb` | `#2d2b3f` / `#685a9c` |
| diverse | `#ecf4f9` / `#8abddc` | `#232f3b` / `#406a8c` |

The fills are washes of the canvas (9 % of the hue over white, 16 % over the
dark canvas) and the contours mid-tones, so the seat's text keeps at least 12:1
on all of them. A student without a gender stays paper.

- Only seat renderers ask for the tint (`genderColors` on
  `getStudentAppearance`, `showGenderColors` on `SceneTable`, `SeatGrid`,
  `TableSeat` and `SimpleCircleView`). Avatars, the inspector's photo frame,
  the attribute focus mode's cards and the name game stay paper — they show a
  person, not a seat.
- The two states of a seat keep outranking it: a held seat is blue, an empty
  one sunken. The projection's contrast mode stays black on white.
- The export legend lists the genders present in the class again
  (`getPresentGenderLegend`), so a printed plan explains its colours.
- The projection's colour switch (`showColors`, stored as
  `spg.present.showColors`, on by default) takes the tint off the seats along
  with the room colours it already greyed.

## Alternatives considered

- **A chip in the Person family**, as 0017 proposed — colour with an icon and a
  word like every other attribute. The maintainer asked for the fill instead.
- **The earlier values unchanged.** Their saturated contours and 700-level dark
  fills clash with the paper-and-ink interface the rest of the app uses.

## Consequences

- A plan answers "how is the gender mix distributed" at a glance again, in the
  editor, on the beamer, in the circle and in every export.
- The tint is the one attribute painted on the seat and read without an icon or
  a word beside it on screen; only exports carry a legend. That is an exception
  to the rule in `docs/DESIGNSYSTEM.md` § 4 that colour never travels alone.
- The projection shows the tint by default. A teacher who does not want a
  gender map on the wall switches colours off once; the choice is kept between
  lessons.
- The diverse blue and the held seat's blue are neighbours. They stay apart by
  the held seat's saturated contour and its lock icon.
