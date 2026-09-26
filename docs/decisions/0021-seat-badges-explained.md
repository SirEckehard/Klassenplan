# 0021 – The badges on a seat explain themselves, and a sheet says only what it should

- **Status:** accepted
- **In place since:** unreleased (2026-09-26)
- **Sources:** maintainer requests of 2026-09-26 (the icons still in their old
  colours; "beim Hover über das jeweilige Icon auch anzeigen, was das Icon
  genau bedeutet"; all of the proposed improvements, "Merkmale am Platz"
  defaulting to all, wish and distance partners told apart by their icon
  alone), `src/utils/ui/seatBadges.ts`, `src/utils/ui/studentAppearance.ts`,
  `src/components/scene/SeatBadgePill.tsx`,
  `src/components/scene/BadgeTooltip.tsx`,
  `src/components/SeatingPlanGenerator/canvas/BadgeLegend.tsx`

## Context

A seat shows a student's badges as a row of small icons. Three things were
wrong with that row:

- **Colour.** Each badge carried a colour of its own from the old Tailwind
  palette, and the yes/no flags (restless, shy, …) fell back to one amber for
  all. The chips in the class list had moved to the pedagogical families of
  the design system (§ 4) long before; the seat, the circle and the exports had
  not.
- **Meaning.** Every icon had an SVG `<title>`, but the badge layer takes no
  pointer events — the seat underneath is what a drag grabs, and the drop
  target is found with `elementFromPoint` — so no tooltip ever appeared. The
  design system requires colour to come with an icon and a word; on a seat the
  word was nowhere.
- **Room.** Up to twelve badges shrank to 5 units to fit a seat, and on three
  rows the pill reached up into the name.

Exports print the same badges, including behaviour and learning, on sheets that
may hang on a classroom wall. The only choice was all of them or none.

## Decision

1. **Family colours everywhere.** Every badge carries its `family` from where it
   is defined (`STUDENT_FLAGS` for the flags). Seats, the circle, the projection,
   the drag previews and both exports draw an icon in its family's
   `--data-<name>-text` ink (`getBadgeColor`), on a paper pill
   (`BADGE_PILL_COLORS`). The hex values are spelled out because the exports
   serialise their SVG; a test holds both themes to `src/index.css`. Wish and
   distance partners are now the same violet and differ by their icon.
2. **Reading order.** Badges are sorted by family — Verhalten, Soziales, Lernen,
   Sprache, Platz & Raum (`BADGE_ORDER`) — on a seat, in the class list's chips,
   in the legends and in "Wer kommt dran?".
3. **A tooltip that finds the icon by its box.** `useBadgeHover` measures the
   slots of the pill under the pointer instead of making the layer a pointer
   target, so dragging is untouched. A mouse hovers; a finger taps, and the
   tooltip stays until the next tap, a scroll or Escape. It names the family,
   what the badge is and what it means — whom a wish points at, what a level or
   a role means, how the mix treats a flag. The seat's `aria-label` reads the
   badges out as well.
4. **Pointing rings the seats.** An icon, or a row of the legend, rings the
   seats it points at — everyone who shares a trait, or a student and the
   classmates a wish or a distance names — in the selection colour, since it
   passes no verdict. The ring belongs to the seat, inset into it. A criterion's
   highlight had drawn a second ring around the whole table in the colour of
   its worst seat, which at a double or group table marked the neighbours too;
   the maintainer's test of 2026-09-26 found it, and since then a criterion
   rings each seat it concerns in that seat's own status colour and the table
   ring is gone.
5. **Legible, and "+N" for the rest.** Where a tooltip can explain it (plan,
   circle, projection) icons stay at 7 units or more and below the name; what
   does not fit becomes a "+N" whose tooltip lists the rest, and badges whose
   criterion the mix weighs keep their place first. Paper cannot be hovered, so
   the exports keep the old rule and shrink until every icon fits.
6. **"Merkmale" in the toolbar.** The plan and the circle get a settings group:
   all badges (the default), only those whose mix criterion is on, or none
   (`spg.badgeDisplay`, shared by both), two switches for what pointing at a
   badge does — the tooltip and the marking of everyone who shares it, both on
   by default (`spg.badgeHover`) — and the legend of every badge the class
   carries, grouped by family.
7. **The export chooses per family.** Under "Bedürfnisse", one switch per family
   the class carries decides what the sheet and its legend show
   (`spg.export.hiddenBadgeFamilies`, nothing hidden by default).

## Alternatives considered

- **Keep the per-badge colours.** They told a wish (green) from a distance wish
  (red) at a glance. They also broke the one rule that makes colour mean
  something here — a colour is a family — and nothing but the seat still spoke
  that way. The maintainer chose to try the icon alone first.
- **Make the badge layer a pointer target** and forward `pointerdown` to the
  seat. Native `<title>` tooltips would have appeared, a second or so late and
  unstyled, but the drop target lookup (`elementFromPoint` → the seat) would
  have hit the icon mid-drag, and every renderer would have needed the seat's
  handlers.
- **A card for the whole seat on hover** instead of one tooltip per icon. It
  would show everything at once, but it was not what was asked for, and it
  would cover the neighbouring seats the highlight is meant to show.
- **Per-family switches in the editor, too.** One choice of three keeps the
  menu a menu; the editor is read by the teacher alone, the printout by the
  class.

## Consequences

- No stored class data changes. Two preferences are new in localStorage and are
  removed by "delete all data" like the others.
- The plans the algorithm produces are unchanged; "only active criteria" and the
  priority under "+N" read the weights, they do not set them.
- Exports look as before but for the colours, the order and the pill; with a
  family switched off, its badges and its legend rows are gone from the sheet.
- The class list's chips change order to the family order.
- A new badge needs an entry in `BADGE_ORDER` (its place and the criteria it
  feeds) and a `family`; the tooltip wording comes from `describeBadge`.
