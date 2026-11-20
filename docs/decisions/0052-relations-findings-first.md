# 0052 – The relations view: what deserves a look first, then a line per student

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-20 on the page "Beziehungen
  der Klasse" (A and C taken, H left for later, B, D, E, F and G not),
  [UI.md § The class list](../UI.md#the-class-list),
  `src/utils/student/classRelations.ts`,
  `src/components/studentInput/RelationsView.tsx`

## Context

"Beziehungen" showed a card per pair of wishes, with two large faces, and a
second group for the distance wishes. A class of 24 with three wishes each
made up to 72 cards, a student often chosen stood on many of them, and what
a teacher most needs before mixing was nowhere: a wish whose partner wants
to sit apart stood in two groups without a link, a student nobody named did
not appear at all, and the order of the wishes — the first counts most —
was lost.

## Decision

- **Four figures come first** (`describeClassRelations`): contradictions,
  who nobody has named yet (only once somebody named somebody), who has
  named nobody yet, and the mutual pairs. Pressing a figure shows who it is
  about.
- **Below, a line per student** instead of a card per pair: the wishes as
  small faces with their rank, both arrows for a returned wish, how often the
  student was named, whom they keep apart from, and "Widerspruch" beside the
  name. The lines follow the class list's order or sort by how rarely or how
  often a student was named. Where the list is wide the line is four columns and
  the faces carry names, so it shows who named whom; where it is narrow the
  faces stand alone and a count says how often.
- **The wording never judges** ("noch von niemandem genannt", not an
  outsider), and the view stays on the class layer, which only the teacher
  sees: nothing of it reaches a projection or an export.

## Alternatives considered

- **Whether a wish is met in the open and in the last plan** (B): would tie
  the class layer to plans and rooms; not taken.
- **Denser pair cards** (D), **a sociogram** (E), **a sociomatrix** (F):
  pairs still miss who nobody named; a sociogram is unreadable on a phone and
  sizes students by popularity; a matrix works on a desktop alone. Not taken.
- **Dissolving the view into the class list** (G): would lose the class seen
  as a whole; not taken.
- **Entering wishes by tapping faces** (H): open, decided later; it would be
  a second place to edit, as "Markieren" is (decision 0051).

## Consequences

- Every pair now stands twice, once on each student's line; the figures and
  the faces' cards carry what a pair card showed.
- Ranking students by how often they were named is a sharp tool. It is a
  sort the teacher chooses, never the default, and a student named by nobody
  is told apart by a figure, not by colour on the line.
