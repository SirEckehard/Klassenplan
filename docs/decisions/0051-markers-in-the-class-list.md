# 0051 – The class list explains its markers, and a brush replaces the focus mode

- **Status:** accepted
- **In place since:** v3.5.0 (2026-11-25)
- **Sources:** the maintainer's choices of 2026-11-19 on the page "Merkmale in
  der Klassenliste" (B, E, F and H taken, A, C, D and G not), a screenshot of
  the list on a phone, [UI.md § The class list](../UI.md#the-class-list),
  `src/components/students/StudentChips.tsx`,
  `src/components/students/StudentRow.tsx`,
  `src/components/students/StudentMarkerDetails.tsx`,
  `src/components/students/StudentCardLayer.tsx`,
  `src/components/students/StudentListHeader.tsx`,
  `src/components/students/markerBrush.ts`,
  `src/hooks/student/useStudentCard.ts`,
  `src/hooks/student/useStudentCardSettings.ts`

## Context

The class list showed a student's markers as chips of words. On a phone a
student with thirteen markers took eleven lines of chips, the next one two;
going through the class meant scrolling past the few who carry most. A
partner chip said "Wunschpartner" and named the classmates only in a
`title`, which a finger never sees. Hovering a chip showed the browser's
grey text, where a badge on a seat opens a card that says what it means.
And a marker could only be changed in the inspector, a sheet over the list
on a phone; for "who is restless?" there was the focus mode, a view of its
own with a card per student that left the rest of the list behind.

## Decision

- **Below `lg` the badges are the seats' icons**, in one line per row,
  families a gap apart, what does not fit behind "+N"
  (`StudentChips variant="icons"`). From `lg` up they stay words. The width
  of the list does not decide it, the device does: the maintainer asked for
  it on phones and upright tablets only.
- **A badge explains itself with the seat's card** (`BadgeLines`,
  `FloatingCard`, shared with `BadgeTooltip`), under a mouse or a pen at
  once, under a finger after a long press (`useStudentCard`), with a line on
  what the mix makes of it. A partner badge lights the rows it names. A name
  rested on opens the student's markers at a glance with the day they
  changed. A badge whose criteria the mix weighs at nothing is drawn dashed
  in the list (`data-chip-off`). Both cards can be switched off under
  "Ansichtseinstellungen" → "Merkmale" in the class toolbar
  (`spg.studentCards`), as the seats' tooltip can in the plan's — asked for
  by the maintainer on 2026-11-22.
- **Below `lg` a row unfolds in place** (`StudentMarkerDetails`): the markers
  in words, what they mean, the partners as names to jump to, and
  "Bearbeiten" into the inspector. It only reads.
- **The brush replaces the focus mode.** At the end of the list's head
  "Markieren" turns the head into the ten yes/no markers and the question the
  chosen one asks; each row pressed then sets or takes off that marker
  (`brushPatch`). The focus mode, its entry under "Ansicht" and its texts are
  gone; its questions moved to the brush.

## Alternatives considered

- **Shorter words and partner names in the chips** (A): kept the rows
  uneven; not taken.
- **Five fixed family fields per row** (C) and **the markers as a sentence**
  (D): a grid that recalled the sixteen old columns, and prose that hides a
  single marker; not taken.
- **A menu on every chip to change it** (G): would have split the row into
  many targets and asked every new attribute of two places; not taken.
- **Keeping the focus mode beside the brush**: two ways to the same answer;
  the maintainer chose to dissolve it.

## Consequences

- "Editing happens in the inspector" now has one exception: the brush. It is
  a mode, entered and left on purpose, and sets only yes/no markers; a level,
  a partner, a name or a photo stays the inspector's.
- A new yes/no marker belongs in `BRUSH_MARKERS` and in the inspector, where
  it belonged in the focus mode's `PASSES` before.
- The class list now reads the mix's weights (`mixSettings` through
  `StudentInput`), which only the plan layer read before; it shows them and
  never changes them.
- The long press keeps the browser's own menu off the rows on a touch screen
  (`touch-callout-none`, `select-none`), so a name in the list cannot be
  selected and copied there.
- The help, the tour, the FAQ and the start page speak of it; the tour gains
  a mark on it. Its word is "Markieren" — in code the brush — so ticking
  students for the inspector is "auswählen" throughout, as "Alle auswählen"
  always was.
- The brush's markers are told apart without the selection's blue: the
  chosen one in its family's fill, the others as a quiet outline.
