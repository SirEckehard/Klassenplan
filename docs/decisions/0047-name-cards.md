# 0047 – Name cards: a fifth sheet that belongs to the children

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-12 on the checklist
  "Klassenplan Ausbau 3.4" (E1 no Grundschrift, a font of one's own instead;
  E6 Andika, ABeeZee, Patrick Hand, Atkinson and OpenDyslexic; E7 the own
  font and picture in the backup), [decision 0034](0034-substitute-sheet.md)
  (the export view as a pattern), `src/utils/ui/tableCards.ts`,
  `src/components/scene/TableCardsSheet.tsx`,
  `src/utils/export/cardFonts.ts`, `src/repositories/cardFileStore.ts`,
  `src/hooks/export/useTableCardSheet.ts`

## Context

In the first weeks of a school year every desk wants a card with a name on
it — for the teacher learning names, for the substitute, for children who
cannot read yet. Teachers make them by hand or in a word processor, once per
class, from the list the app already holds. A card like that is not a sheet
for the teacher: it stands in front of a child for weeks, and the
maintainer asked for cards that are lovingly made and can be made lovingly —
a font for beginners, pictures, drawings.

## Decision

- **A fifth view on the export page**, "Namensschilder", beside the plan, the
  circle, the list and the substitute's sheet, and a second way in on the
  class layer ("Tischkarten drucken"), as the list has. It needs the class,
  not a plan: by name without one, table by table as the plan reads with one.
  The settings live in one object (`spg.export.cards`, `TableCardSettings`).
- **Three formats**, all on A4: a tent card two to a page (cut across, folded
  along each middle), one large across a page, and eight badges of 105 ×
  74 mm. A folded card prints its back upside down, so both faces stand
  upright on the desk. Cut lines are dashed with scissors, folds dotted.
- **One card:** the first name large on the four writing lines of a first
  exercise book (ascender line, x-height band shaded, baseline, descender
  line), the rest of the name small where asked for, a picture on the left —
  the child's motif, the child's photo, or one picture of the teacher's for
  every card — and a foot with the class and the table. One name size for
  the class, the largest at which every name fits; a name far longer than
  the others gets a size of its own rather than shrinking the class.
- **Colour, because the cards belong to the children.** Every other sheet is
  ink on paper (`sheetInk`); a card takes a tint of coloured paper — six calm
  tones, one per child or one for all, or white — and its motif's ink. "Zum
  Ausmalen" takes the colour away again: white paper, the motif as an
  outline, the name hollow, for the children to colour in.
- **Motifs** are 57 Phosphor icons in sets (animals, vehicles, nature, food,
  all), drawn duotone on a card and light to colour in — weights the build
  otherwise strips, kept for these icons alone (`MOTIF_ICON_NAMES`,
  `scripts/utils/iconWeights.ts`). A child's tint and motif come from its id
  (`spreadSlots`): no two children share one while one is free, and a second
  printing of the same class gives the same cards.
- **Fonts:** Andika (default, drawn for beginning readers), ABeeZee, Patrick
  Hand, OpenDyslexic and the app's Atkinson Hyperlegible, all under the OFL,
  from fontsource; loaded with the card view only, as files. The Grundschrift
  of the Grundschulverband is not shipped: its licence permits use, not
  distribution. A teacher loads a font of their own instead (TTF, OTF, WOFF,
  WOFF2, up to 2 MB); its licence is theirs to mind. Names are measured with a
  canvas in the chosen font before they are laid out.
- **The teacher's files** — one font, one picture — lie in the default keyval
  store (`spg.cardFont`, `spg.cardImage`) as name, type and bytes; a picture
  is made smaller on loading (1200 px, JPEG for a photo, PNG for a drawing).
  "Delete all data" takes them and counts them; a backup carries them as data
  URLs (`cardFiles`, export version 3 unchanged), a full restore replaces
  them, a merge only fills what is missing.
- **Printing and files:** the pages name their font but do not carry it — an
  own font may be megabytes — so the preview, the print and the PDF add it
  once, the PDF page by page. Cards are a PDF only, as the list is.

## Alternatives considered

- **Shipping the Grundschrift**, the maintainer's first wish: not without the
  rights holder's consent; asking was left for later (E1).
- **A picture per child** chosen by hand: a second step, once the cards are in
  use; the motif from the id already keeps every child's card its own.
- **A sheet in the house style, ink on paper:** consistent, and wrong for
  what stands on a child's desk for weeks.
- **The teacher's files in a database of their own,** as the photos are: one
  font and one picture need no store of their own, and in the default store
  "delete all data" takes them without another path.

## Consequences

- **New stored data:** `spg.export.cards` (localStorage), `spg.cardFont` and
  `spg.cardImage` (IndexedDB), `cardFiles` in the backup. A picture of the
  teacher's is theirs — unless they put a child into it; PRIVACY.md says so.
- **Bundle:** the fonts are assets fetched with the view, the motifs' extra
  weights travel with the export page's chunk.
- **Snapshots:** `export-sheets.spec.ts` draws the three formats and the
  colouring mode.
