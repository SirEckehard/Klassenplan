# Design System – Klassenplan

> **Status:** current · **Last reviewed:** 2026-10-29 · **Maintainer:** Eike
> Schäfer · **Describes:** Klassenplan 3.1.2

This document describes the binding design tokens for Klassenplan. All values live in `src/index.css` and are reachable from TypeScript through `src/utils/ui/designTokens.ts`.

The look is called **Papier & Werkzeug**: the interface is a passepartout in warm paper grey, and the classroom is the picture inside it. Two rules carry the whole system, and § 4 spells them out — the interface uses exactly one accent colour, and every other colour describes pedagogy.

## 1. Token layers

1. **CSS source (`src/index.css`)**
   - `@theme` declares color values, radii, shadows, and focus rings for light and dark mode.
   - `@utility` produces semantic classes such as `panel-surface`, `primary-button`, `input-field`, or `canvas-frame`, which consume the CSS variables.
2. **TypeScript exports (`src/utils/ui/designTokens.ts`)**
   - Each exported constant maps to the corresponding utility class and thus forms the binding API for components.
3. **Student-specific tokens (`src/components/students/studentStyleTokens.ts`)**
   - Built on top of `mutedIconButtonClass`, these provide extended tokens for gender, needs, height, and partner toggles. Color variants are realized via utility overrides with `!` priority.

> **Ground rule:** Components import the token constants and only add necessary layout classes (e.g. `flex`, `gap-*`, `w-full`). Raw utilities from `src/index.css` or base Tailwind classes are not used directly inside components.

> **Tailwind conventions:** Prefer canonical scale classes over arbitrary values (`max-h-96` instead of `max-h-[24rem]`); arbitrary values are reserved for cases without a scale step (e.g. `max-h-[calc(100vh-3rem)]`). The important modifier is postfix in Tailwind 4: `p-0!`, not `!p-0`.

## 2. Surface and button tokens

| Token                    | Underlying classes    | Typical use                                             |
| ------------------------ | --------------------- | ------------------------------------------------------- |
| `panelSurfaceClass`      | `panel-surface`       | Shells, wizard steps, quick menu                        |
| `cardSurfaceClass`       | `card-surface`        | Cards, dialog content                                   |
| `listContainerClass`     | `list-container`      | History panels, template lists                          |
| `dataChipClass`          | `data-chip`           | One pedagogical fact: icon, word, family colour         |
| `dataHeadingClass`       | `data-heading`        | A section heading in its family's accent                |
| `dataFamilyClass[…]`     | `data-behavior`, …    | Sets the family's three custom properties               |
| `primaryButtonClass`     | `primary-button`      | Primary actions                                         |
| `secondaryButtonClass`   | `secondary-button`    | Secondary actions                                       |
| `neutralButtonClass`     | `neutral-button`      | Neutral actions (e.g. back navigation)                  |
| `dangerButtonClass`      | `danger-button`       | Destructive actions                                     |
| `iconButtonClass`        | `icon-button`         | Prominent icon actions                                  |
| `quietIconButtonClass`   | `quiet-icon-button`   | Toolbar / secondary actions                             |
| `quietLinkClass`         | `quiet-link`          | Links in a page's chrome: FAQ, contact, "Zurück"        |
| `dangerIconButtonClass`  | `danger-icon-button`  | Warn / delete icons                                     |
| `successIconButtonClass` | `success-icon-button` | Success icons                                           |
| `mutedIconButtonClass`   | `muted-icon-button`   | Neutral icon actions, basis for student toggles         |
| `inputFieldClass`        | `input-field`         | Inputs, selects, textareas                              |
| `selectFieldClass`       | `input-field`         | Alias for select elements                               |
| `segmentedTrackClass`    | `segmented-track`     | Recessed track a segmented control's options sit in     |
| `pillTabBaseClass`       | `pill-tab-base`       | Segmented options: layer switcher, filters, dialog tabs |
| `pillTabActiveClass`     | `pill-tab-active`     | Active pill states                                      |
| `pillTabInactiveClass`   | `pill-tab-inactive`   | Inactive pill states                                    |
| `menuSurfaceClass`       | `menu-surface`        | Desktop menus                                           |
| `touchMenuSurfaceClass`  | `touch-menu-surface`  | Touch-optimized menus                                   |
| `floatingStatusClass`    | `floating-status`     | Floating badges                                         |
| `canvasFrameClass`       | `canvas-frame`        | Canvas frame                                            |
| `toastSurfaceClass`      | `toast-surface`       | Toast, stacked top right under the header (§ 6f)        |
| `toastIconClass`         | `toast-icon`          | Toast icon, the one coloured part of a toast            |
| `toastActionClass`       | `toast-action`        | The one button a toast may carry                        |
| `toastTimelineClass`     | `toast-timeline`      | The hairline that shows a toast's time left             |

All classes in the table automatically read the variables defined in `@theme`. Dark-mode variants are embedded inside the utility definitions.

**Interaction behavior:** All button and icon-button tokens explicitly set `cursor: pointer` and switch to `cursor: not-allowed` automatically in the `:disabled` state. This keeps the mouse cursor consistent regardless of browser defaults.

## 3. Typefaces, radii, borders, and shadows

**Typefaces.** Two families from one superfamily, both self-hosted through Fontsource — no CDN, because the production CSP is `script-src 'self'` and the app ships no third-party requests:

| Token          | Stack                                                                            | Used for                                  |
| -------------- | -------------------------------------------------------------------------------- | ----------------------------------------- |
| `--font-sans`  | `'Atkinson Hyperlegible Next Variable'`, `'Atkinson Hyperlegible Next Fallback'` | The whole interface, the plan, the export |
| `--font-serif` | `'Source Serif 4 Variable'`, `'Source Serif 4 Fallback'`                         | Display headings, empty states            |

Both fallbacks are metric-matched `@font-face` stand-ins calculated from `@capsizecss/metrics` the way `next/font` does (`xWidthAvg` against the fallback), so the swap does not move text: Atkinson Hyperlegible Next over Arial, Source Serif 4 over Times New Roman (the overrides were measured in Chromium at display size and calibrated against the earlier `@capsizecss` values, so they are close, not exact; the serif is the optical-size variant, declared in `index.css` for Latin and Latin Extended only). Only the Latin Atkinson Hyperlegible Next file is preloaded; the serif carries headings and swaps in.

SVG `font-family` attributes are not reached by the `@theme` token, so the scene, the presentation and the circle print view take `svgFontFamily` from `designTokens.ts`. The image and PDF exporters embed the same woff2 files as base64, the Latin and the Latin Extended subset with the ranges the UI loads them for (`getEmbeddedFontCss` in `utils/export/svgRasterizer.ts`), so an exported file renders identically on a machine that has neither font installed — "Gülşen" and "Łukasz" included.

Numbers that sit in columns or get compared — counts, percentages, times — are set with `tabular-nums`.

**Sizes.** Text takes Tailwind's scale (`text-xs` 12 px, `text-sm` 14 px, …) and, between its steps, three tokens from `@theme`, each for one role:

| Token          | Size                | Used for                                                                                        |
| -------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `text-micro`   | `0.625rem` (10 px)  | A counter on a button, the smallest captions (the phone's table templates, a preset group)      |
| `text-caption` | `0.6875rem` (11 px) | Uppercase group headings in the toolbar, menus and lists; small print such as an error's report |
| `text-control` | `0.8125rem` (13 px) | Rows and entries of the toolbar, the inspector and the menus, and their fields                  |

They set no line height, so a row keeps the one it inherits, and they grow with the browser's text size, as rem does. A size used once — a student's name in the class list, an inspector's title — stays where it is, in rem; the lockup's sizes belong to the logo.

The central radii live in `@theme`:

| Variable                   | Value (light)      | Used for                                                              |
| -------------------------- | ------------------ | --------------------------------------------------------------------- |
| `--radius-panel`           | `0.875rem` (14 px) | `panel-surface`, `canvas-frame`                                       |
| `--radius-card`            | `0.625rem` (10 px) | `card-surface`, `list-container`, menus, the projection bar's buttons |
| `--radius-list`            | `0.625rem` (10 px) | History panels                                                        |
| `--radius-pill`            | `0.5rem` (8 px)    | Buttons, tabs, a toast's button                                       |
| `--radius-floating-status` | `0.5rem` (8 px)    | `floating-status`                                                     |

`--radius-pill` keeps its name for compatibility; controls stopped being pills. Only badges and avatars stay circular.

A segmented control is `SegmentedControl` (`components/ui/controls/`), which wraps `segmented-track` around `pill-tab-base` options, one of them carrying `pill-tab-active`. Reach for the component, not the classes. The active option is a raised paper pill rather than a blue one — blue means "you can act here", and which view you are looking at is not an action. `--surface-sunken` is the recessed ground it sits on.

**Borders & shadows**

- Every surface — panels and the canvas frame included — uses a 1 px border. The 2 px frame is gone; structure is carried by the line, not by the weight.
- Shadows are for things that genuinely float: `--menu-shadow` at `0 8px 24px -12px`, `--toast-shadow` a softer `0 10px 28px -14px` over a 1 px contact shadow. Resting surfaces use `0 1px 2px` at 5 % or nothing at all, and every button shadow token is `none`.
- The glass look is gone: `--backdrop-blur-soft` and `--backdrop-blur-medium` both resolve to `none`. The variables stay so the utilities referencing them keep resolving and a future surface can opt back in.
- All adjustments go through the variables; never hand a component its own `shadow-*` utility.

## 4. Focus, hover, and the two colour worlds

**The interface is paper and ink.** A warm neutral ramp plus exactly one accent, which means one thing: _you can act here_.

| Role       | Light     | Dark      | Token                       |
| ---------- | --------- | --------- | --------------------------- |
| Page       | `#fcfbf8` | `#101113` | `--surface-page`            |
| Surface    | `#ffffff` | `#181a1d` | `--surface-card` / `-panel` |
| Line       | `#e3dfd6` | `#2a2d31` | `--border-card`             |
| Empty step | `#8f897c` | `#6b7078` | `--scale-empty`             |
| Muted text | `#54565a` | `#a9acb1` | `--text-muted`              |
| Ink        | `#17181a` | `#f2f1ee` | `--text-page`               |
| Accent     | `#2563eb` | `#2563eb` | `--button-primary-bg`       |

Rose (`--button-danger-bg`) and green (`--button-success-bg`) are the two exceptions, reserved for destructive and confirming actions.

**Everything else that is coloured describes pedagogy.** Seven `--data-*` families — six for what a student brings, one for the plans already used — and no interface element may use them:

| Family           | Accent    | Chip text | Chip surface | Covers                                              |
| ---------------- | --------- | --------- | ------------ | --------------------------------------------------- |
| Verhalten        | `#b45309` | `#8a3d06` | `#fbf0df`    | Unruhe, Ablenkbarkeit, Ablenkung durch Unruhe       |
| Soziales         | `#6d28d9` | `#5b21b6` | `#efe9fc`    | Schüchternheit, Wunsch-/Distanzpartner, Rollen      |
| Lernen           | `#15803d` | `#14622f` | `#e6f2ea`    | Fördern heterogen, Fördern homogen                  |
| Sprache          | `#be123c` | `#9f1239` | `#fbe8ec`    | Sprachförderung, Sprachstand                        |
| Platz &amp; Raum | `#0e7490` | `#0b5f76` | `#e2f0f5`    | Vordere Plätze, Körpergröße, Fensterplätze, Türnähe |
| Person           | `#52525b` | `#43464b` | `#f0f0ee`    | Geschlechtermischung, Foto, Name                    |
| Verlauf          | `#a21caf` | `#86198f` | `#fae8fb`    | Wiederholung                                        |

Every chip-text-on-chip-surface pair clears 4.5:1, and a data colour never appears without its icon and its spelled-out word, so colour is never the only channel. A seat has no room for the word; there it comes from the tooltip, the legend and the seat's label (§ 6e).

In code a family is a class, not a hex: `dataFamilyClass.behavior` sets `--data-chip-text`, `--data-chip-surface` and `--data-chip-accent`, and `dataChipClass` or `dataHeadingClass` beside it supplies the shape. Every badge in `utils/ui/studentAppearance` carries its `family` from where it is defined (`STUDENT_FLAGS` for the yes/no flags), and every place that shows one reads it from there: `StudentChips` for the chips, and `getBadgeColor` for the icons on a seat — in the plan, the circle and the exports — which draws them in the family's `--data-<name>-text` ink. The exports serialise their SVG, so `DATA_FAMILY_TEXT_COLORS` spells those tokens out as hex, and a test holds both themes to `src/index.css`. Nothing else decides what colour an attribute speaks in.

**Two rules that decide arguments**

1. The interface uses no data colour. No button is green because it saves, no toolbar is amber.
2. A data colour never appears alone. Icon and word travel with it.

**The gender tint on a seat**

An occupied seat is tinted by gender — green for a boy, lilac for a girl, blue
for a non-binary student, paper when nobody said — in `STUDENT_COLORS`
(`utils/ui/studentAppearance.ts`). It is not a data family and the one
exception to rule 2: on screen the tint stands without a word, and only the
export legend names it. The tones are washes of the canvas (light fills around
`#f3effc`, dark fills around `#2d2b3f`) with a mid-tone contour, and the seat's
text keeps at least 12:1 on each. Only seats carry the fill; an avatar's frame
takes the contour (`getAvatarFrame`) — the ring a seat's photo wears — while
the face behind an initial and every card stay paper. The projection's colour
switch removes it and its contrast mode never shows it. The one control that carries it is the inspector's gender choice:
its pressed chip wears the tint its seats will wear, so the choice says what
it comes to. Decision 0020 holds the reasons.

`warning-button` is the one leftover: it carried the old amber "back / side trip" accent and is used for navigation (Namensspiel, Zurück zum Klassenraum), not for warnings. Its tokens (`--button-warning-*`) now render neutral; the call sites move to `secondary-button` and the token disappears with them.

**How far something got is chrome, not pedagogy**

A fulfilment value, a mix with every criterion switched off, a check that
failed: three states that say how something went, in `--status-ok`,
`--status-warn` and `--status-alert` (each with a `-surface` and a `-text`
companion). They are not `--data-*` families — the criterion they describe
keeps its own family — and they are the only other colours the interface is
allowed to carry. `getStatisticStatusMeta` is the one place that picks between
them.

**The projection brings its own bar**

`/present` floats one bar over the plan, in `--present-bar-*`: paper with a
hairline in the light theme, ink in the dark one, like the rest of the chrome.
It exists because the bar belongs to the teacher standing in front of the wall
while the projection belongs to the room — the contrast mode's white wall
changes the wall, not the bar. In fullscreen the room gets the wall to itself:
the strip on top is gone, and the bar slides away until the pointer comes near
the bottom edge (a tap there on a touch screen) or the keyboard moves into it.
Every button on it carries a word — under the icon, the size slider's name and
value under the slider, so the bar stays on one line — since at the board no
tooltip explains an icon to a finger. A setting that is on (badges, photos,
room, colours, contrast) reads as a selection, light blue with a blue hairline;
the solid blue marks whose view is on the wall, teacher's or students'. After a tap it stays up five seconds, as a teacher at the board steps back to
look before the second tap. The plan is framed on the tables: the board, the
windows and the door come in from their walls to just beside them, so the room
keeps its front and its sides while the names grow to the wall's size, and
furniture far from the tables stays out of the picture. No success message
shows there — the wall faces the class. The exported sheet is framed the same
way (`SceneSvg`), within margins of 10 mm and a header of one line — brand,
title, date — in both orientations (`ExportPageFrame`); its switch "Anzeige
vergrößern", switched off, brings back the whole room in its outline, everything
where it stands. The note list ("Liste", `NoteListSheet`) wears the same frame
on every page it runs to: grey rules on paper, no colour but a badge's ink when
switched on, a stronger rule where a table begins, and the room to write —
ruled lines at 22pt (about 8 mm), or a grid whose empty heads take a date.

Its contrast mode goes the other way: black on white whatever the theme, with
thicker contours and the seat names bolder (`SEAT_CONTRAST_COLORS`). Those are
the only hard-coded colours left in `src/`, chosen for a wall and a weak
projector rather than for a screen.

**Focus and hover**

- A focus ring is a solid 2 px contour in `--focus-ring-primary` (danger and success variants exist), never a soft glow. The old translucent rings are gone.
- Buttons and icon buttons have defined hover states (e.g. `--button-primary-bg-hover`). These apply in dark mode too, because `@layer base` overrides the variables rather than the utilities.
- A `secondary-button` that switches something on carries `aria-pressed`, and while it is `true` the button wears the selection colours (`--surface-option-selected`, `--border-option-selected`, `--text-badge`) — hovered or not. The state a screen reader hears is the state on screen; no call site paints its own.

## 5. Tokens for student toggles

A student attribute is an `InspectorRow` with either `InspectorChoice` chips or
a `ToggleSwitch` — neither of which needs a token of its own. The selectors
used to carry four shapes each (compact, detailed, hybrid, row); only `row`
ever reached a screen once the inspector existed, and the other three took
2,500 lines of hand-written palette classes with them when they went.

What is left in `src/components/students/studentStyleTokens.ts`:

- **Partner / avoid partner** (`partnerButtonTokens`, `avoidPartnerButtonTokens`):
  the button that opens the list of classmates. Both wear the **Soziales**
  family when they are set — a wish and a distance wish are told apart by the
  icon before the row's name, not by two different colours; the button itself
  carries only who it points at.
- **Bulk bar chips** (`specialNeedsButtonTokens`): setting a flag for twelve
  students at once is an action, so the chip takes the blue accent, and the
  mixed state (some of them carry it) is the same chip with a dashed border.

**Important:** The tokens already include minimum sizes and typography.
Additional classes are only allowed for layout scaffolding (e.g. `grid`,
`gap-*`).

## 6. Classroom features & feature palette

The classroom features (windows, doors, teacher's desk, blackboard) are rendered as `ClassroomFeature` shapes on the canvas. Colors live in `src/utils/ui/featureStyles.ts` (`getFeatureStyles()`, light/dark palettes per feature type) and are consumed by `ClassroomCanvas.tsx`.

They are drawn like a floor plan: a barely tinted fill carrying a strong ink contour. Projectors wash pastel fills out almost completely, so the contour — not the fill — is what has to survive the beamer. The hues stay recognisable but live at ink darkness instead of candy lightness:

- **Window**: fill `#f5f7fb` / dark `#12203f`, contour `#1e3a8a` or `#6f9bf5`
- **Door**: fill `#fbf7f0` / dark `#2b1810`, contour `#7c2d12` or `#d08a5f`
- **Blackboard**: fill `#f2f7f3` / dark `#12261a`, contour `#14532d` or `#57b37a`
- **Teacher's desk**: fill `#f3f1ec` / dark `#202327`, contour `#3f3f46` or `#8c9096`
- **Cabinet**: fill `#f7f3ed` / dark `#2a2218`, contour `#6b5a45` or `#b79a74`

These are deliberately _not_ the `--data-*` families: a window is furniture, not a pedagogical fact.

Drag indicators use `--button-primary-bg` for a table template and `--text-muted` for a room feature.

Every layer's toolbar is a `ToolRail` (`src/components/shell/ToolRail.tsx`) inside `SmartSidebar`. An entry adds layout classes only; its two densities — the 208px labelled column and the 60px icon rail — come from the rail, so a new tool cannot invent a look of its own. An entry is a row, not a card: 36px tall, `rounded-lg`, paper on hover (`--surface-sunken`) and `--surface-option-selected` when it is the view on screen, with the icon taking `--text-badge` so the state has a second channel.

The rail has two parts. On top the layer's own groups, in an order no layer changes — **Ansicht**, **Hinzufügen**, **Ansichtseinstellungen**, **Verwalten** — each titled in small caps in the labelled column and set off by a hairline on the icon rail; a layer leaves out what it has nothing for. Inside a group a shorter hairline (`ToolRailDivider`) separates two kinds of one thing, the room's tables and its elements. What is added goes under Hinzufügen on every layer — the class's students and placeholders as the room's tables and "Bibliothek"'s classes; Verwalten holds what acts on what is there, such as the class list as a file. At the foot, under a full-width hairline and without a title, the entries every layer shares, drawn by the rail rather than the layer and identical on every layer and on the export page: "Bibliothek", "Klassenwerkzeuge", "Backup" and, last, "Unterstützen". Only the layer's part scrolls on a short window; the foot stays in view.

From `lg` up `SmartSidebar` drops that panel surface: on the desktop shell it is not a card but the window's left edge, one hairline (`border-r`) of `--border-card` against the sunken stage. The inspector's column is its mirror on the right — `--surface-page`, one `border-l` — so the two edges of the window are the same paper, between the header and the status bar on `--surface-card`; the drawers below `lg` lie over the stage and keep the card surface with its shadow. Below `lg` the layer is still a scrolling document, where a panel needs a frame of its own to read as one. On a tablet that card stands beside the stage, sticks under the header while the page scrolls and ends above the status bar; a phone opens it as a drawer.

## 6a. The stage

A layer's stage is `workspaceStageClass` — the sunken surface the subject sits
on. Where that subject is the classroom, it also carries `canvas-stage`, which
from `lg` up makes it a size container and centres its content, and the frame
inside takes `canvas-fit`: `min(100%, 100cqh * 3 / 2 - 1px)` for the fixed
900×600 plan, the pixel making room for the frame's hairline, and the stage's
full width below `lg`. Room, plan and circle take their width from it alone.
The frame itself is `canvas-frame` — white, one hairline, no radius.

What the room editor draws on top of the room is its own and goes into no
export: the selection — tables, room elements, the selection rectangle, the
rotation and resize handles, a seat's keyboard focus — is `--canvas-selection`,
the interface's one blue (`--focus-ring-primary`), with
`--canvas-selection-fill` for the rectangle; alignment guides are
`--canvas-guide` (amber, so they never read as a selection) and a predicted
photo collision is `--canvas-alert`. The drawing used to select in two blues of
its own.

On a touch screen the handles and the seat's lock keep their painted size but
take a larger transparent hit area (`useIsCoarsePointer`), and a long press —
the touch screen's right-click — opens its menu above, beside or below the
finger, never under it (`placeTouchMenu`), as a list with words
(`touchMenuSurfaceClass`).

"Bibliothek" puts folders on its stage instead of a room: one card
(`cardSurfaceClass`) holding columns of 16rem (`ColumnBrowser`), each divided
from the next by a hairline and scrolling on its own; a new column scrolls into
view. A row is a list option, not a card: an icon or a room's thumbnail
(`RoomThumbnail`, ink on paper), the name with a quiet line under it, chips of
one quiet word ("geöffnet", "automatisch gesichert") and a caret for a folder.
Hover is `--surface-sunken`; the rows on the selected path are sunken, and the
deepest one — the entry the inspector shows — carries the blue bar at its edge,
as an opened student does. Groups within a column ("Räume", "Verlauf") are
titled in small caps and set off by a hairline. On a phone only the last column
shows, the full width.

## 6b. The inspector

The right-hand panel is a wall, not a stack of cards. A setting inside it is a row — `InspectorRow` with its name and, on the right, a `ToggleSwitch` for a yes/no or `InspectorChoice` chips for a handful of values; pressing the chip a value already has clears it, so "not decided" stays reachable. A student attribute with more values than fit beside the name in one line — the five language levels, the four social roles — keeps its row and shows its value as a button in the family's colour that opens the values as a menu (`InspectorSelect`): rows of icon and word, a check at the end of the chosen one, "Keine" or "Nicht angegeben" first to take it back. Stacked as a list, the two took nine rows of a panel for what most students leave unset, and a teacher stepping through the class read the value off a column of rows. A plan's room in "Bibliothek" is the same kind of menu without a family's colour, since a class may have many rooms, and its last row, below a hairline, moves the plan into a new one (`InspectorSelect`'s `action`). Where the choice is the content rather than one attribute among many — the export's name rule, the note list's order — the values stand as a list under the name instead (`stacked` row, `layout="list"`): one bordered column of rows, a check at the end of the chosen one, because a run of chips wrapping onto a second line reads as a scatter rather than a scale. Every attribute that has a seat badge shows that badge's icon in its family's ink (`InspectorIcon`, icons from `STUDENT_ATTRIBUTE_ICONS` and `STUDENT_FLAGS`) — before the row's name for a flag or a partner, inside the option for a value, and on the menu's button once one is set; language level and social role carry their criterion's icon before the name (`CRITERIA_ICON_MAP`), since their values each bring one of their own — so the symbol on the plan is one the teacher has seen beside its word. An attribute's name starts with a capital in both languages ("Unruhig", "Restless"), wherever it stands as a label. Several students who disagree show that too: a switch with its knob in the middle, and the chips of the values some of them have outlined in dashes (`aria-pressed="mixed"`), a list or menu row a dash where the check would be, and a menu's button "Gemischt" — otherwise a mixed selection looks like one where nothing is set. `InspectorHeader`,
`InspectorBody`, `InspectorSection` and `InspectorDeleteFooter`
(`src/components/shell/InspectorPanel.tsx`) are its only parts, with
`InspectorMediaTile` for the header's media where there is no photo,
`InspectorActionRow` for an action and `InspectorMenuButton` for a choice
among more entries than the panel should list — the preset, a kind of table,
the rooms, the templates: one button the panel's width that opens them as a
menu, shaped as the header's class menu (a check at the chosen entry, a
pencil and a bin beside it where an entry can be renamed and removed) — shared by the student, the room, the plan and
every panel of "Bibliothek": the header is a
strip of 44px media, an `h2` and a subtitle above a hairline — the `h2` wraps
rather than truncates, and a student's arrows to the neighbours sit in the
subtitle beside the position, so the name keeps the width. The name in the
`h2` is where it is renamed — a student's, a class's, a room's, a plan's, a
template's, the export sheet's title: a bordered pill (`editableTitleClass`)
that opens as a field when pressed (`InspectorTitleField`,
`StudentNameEditor`), so no section repeats it as a field under the heading
and the body starts with what only the panel holds; sections carry a
`data-heading` in their family's colour and are separated by `border-t` with
`first:border-t-0`, never by a gap; the footer holds what acts on the whole
selection, destructive last. A panel that needs a new group adds a section —
not a card, not a heading of its own invention, and not a heading over a
single row: a table's angle and its place in the mix share "Eigenschaften".
A row that holds a switch wears an icon before its name — a badge's in its
family's ink, otherwise a neutral grey one (`InspectorIcon` without a
family), the one the toolbar gives the same setting (`viewSettingIcons.ts`,
`FEATURE_TYPE_ICONS`); a row of choices leaves the icons to its values. What
a setting does stands under its name (`InspectorRow`'s `description`), on
the name's edge past the icon, never as a loose paragraph below the row. A
single table or room element shows its shape in the header's media tile,
where a student shows a photo. The plan's criteria are read
the same way: a row per criterion under the family it acts on, its importance
a scale at the row's end — a dash on the baseline for "Aus", three rising bars in the
family's ink, the level's word in the tooltip and the accessible name — since
four word chips took a line of their own and sixteen criteria three screens of
scrolling; the explanation stays under the name
([decision 0018](decisions/0018-criteria-in-words-with-recipes.md)). Its empty
steps take `--scale-empty`, 3:1 against the page in both themes, since a line's
colour left the scale and above all its "Aus" dash out of sight; under a mouse
the steps show the level the pointer rests on before it is pressed — the bars
it would add half-filled, the ones it would take away already empty.

From `lg` up the column folds away on every layer — the class, the room, the
plan, the circle and the export sheet — from the switch at the right end of
the status bar, so the stage takes the width. The switch is a quiet arrow, the
mirror of the toolbar's at the left end: towards the edge while the column
shows, away from it while it is folded, named for what it does ("Inspektor
ausblenden", "Plan einblenden"). It is also the one that opens the
drawer below `lg`. A touch screen narrower than `xl` starts with the column
folded; opening a student or ticking several unfolds it, since the class
layer's column is where a student is edited.

A row that holds a single switch is its `<label>` (`labelsControl`): a tap on
the name works the switch, where the switch alone is 28×16px. Every row is at
least 28px tall under a mouse and 44px on a touch screen (`pointer-coarse:`),
whatever it holds, and every value in it — a chip, or a button that opens a
menu (the partners, the social role, the language level;
`familyValueControl`) — is as tall and as padded as the next, so the rows of
a panel stand at one pitch. On an iPad the partners' buttons stayed small
while the rest grew to 44px, and their rows huddled together between rows
spread wide.

A panel with nothing selected belongs to what the layer shows as a whole: the
class layer's, while no student is open, is the class — its name, school year
and notes, what it holds, its removal — the panel "Bibliothek" shows for it. The
room's names its tables in the header, its name in a field of its own as the
class's, with "Raum öffnen …" and "Neuer Raum" under that name, and offers
what concerns the room itself — "Neu einrichten" and "Vorlagen", as menu
rows — rather than repeating the seats and students the
status bar already states. The plan layer's is the plan: its name and whether
the stage is what was saved under it in the header, then "Plan" — the name,
"Plan speichern", "Als neuen Plan speichern" once the name is new, "Plan
öffnen …" for another plan of the class — and only below it the mixing, with
no row for the fulfilment the status bar states; the circle's
leads with the same section. Saving the plan is therefore no entry of the
toolbar: the toolbar holds what goes onto the stage and how it looks, the
panel names, keeps, opens and removes what the stage shows. That is also why the room
has no dialog over its canvas: rebuilding a room happens in the panel, and an
empty room says so in words on the drawing. A name is asked for there too — a
new room's, a template's (in "Bibliothek" as in the room's panel), and in the header's class menu a new class's — in a row that opens under the entry: Enter keeps
it, Escape or leaving the row drops it, and a name that is taken is said under
the field as it is typed; replacing the template that carries it is a row of
its own, never what Enter does.

Below `lg` the panel keeps its parts but loses its column. A phone shows an
opened student as a sheet from the bottom; a tablet shows it as a drawer on
the right, between the two bars, where the column stands from `lg` up. What a
layer portals in — the room's properties, the plan's criteria, the circle's
summary — opens as the same drawer from the switch at the right end of the
status bar, the mirror of the toolbar's switch at the left end. The drawer is
not modal: the stage beside it stays in reach, and Escape closes it.

The toolbar loses its column on a phone as well. There it is a drawer from the
left, the mirror of the inspector's, and the same place at the left end of the
status bar opens it — a wrench on a secondary button, mirrored by the
inspector's sliders at the right end, since the bar's blue
button is the layer's own action and a second one floating over the stage
would compete with it. The two drawers take turns; an action taken in the
toolbar's closes it, so the stage shows what the action did, while an entry
that opens a panel keeps it open behind the panel. A full-screen sheet would
lie over those panels, which open at the end of the page.

On a phone the header shows the open class as a mark rather than by name: the
name would push the layer switch off a 402px header, and the switch is the
header's reason to exist.

## 6c. Menus

A dropdown is a `menuSurfaceClass` box; its rows are `menuItemClass`, and the one destructive row is `menuItemDangerClass`. Both hover on paper — `--surface-sunken`, or `--button-icon-danger-bg` for the destructive one — never on blue: blue means "you can act here", and a hovered row is a pointer, not an action.

Whatever opens from a toolbar entry is such a dropdown: a row per choice, an icon and a word. A setting that is on carries a check at the row's end (`CanvasSettingsGroups`), a setting with a handful of values is a group of such rows with the chosen one checked, and small caps above a group name it. There are no cards inside a popover and no icon-only chips whose meaning lives in a tooltip. Only a panel that asks for a value — a name, a number of placeholders — is a small form, on the same surface. What a group only explains goes below its rows (`footer`), after a hairline — the key to the seat badges under "Merkmale" is the one so far.

A dropdown is reached with the keyboard as well as the pointer (`usePopoverFocus`): the focus moves into it when it opens, Tab and the arrow keys stay inside, Escape closes it and gives the focus back to its button. To assistive technology it is a dialog of buttons and links rather than a `menu` — a menu may hold neither the theme switch nor a row's own rename and delete.

## 6f. Messages

A toast is a card of the app's paper (`toastSurfaceClass`): `--toast-bg` with a `--toast-border` hairline, `--radius-card`, `--toast-shadow`, 23 rem wide and as wide as a phone. Its colour is in its icon alone (`toastIconClass`, `--toast-accent-*`): a check for success, a circle for an error, a triangle for a warning, an "i" for information, a shield for the critical. The one button it may carry (`toastActionClass`) is quiet — a hairline on `--toast-action-bg`, beside the text and under it when the text is long — because blue is the screen's primary button. Text, icon and close button share one centre line, and on a touch screen both buttons take a 44 px target around their 28 px.

They stack at the top right under the header, the newest on top. A new one glides 28 px in from the right and fades in while the older ones move down; one that goes glides out the same way and the stack closes up behind it (`components/ui/feedback/toastMotion.ts`, Web Animations: 380 ms in, 200 ms out). The same id again does not double: the card keeps its place, takes the new text, nudges and starts its time anew. A hairline along the bottom edge (`toastTimelineClass`) shows the time left. Every toast's time stands still while one is pointed at, holds the keyboard focus or is being swiped, and while the page is in the background (WCAG 2.2.1). A swipe to the right puts a toast away as its close button does. With "Reduce motion" set nothing moves: toasts come and go at once and the hairline is not drawn — the global guard in `index.css` reaches CSS only, so `motionEnabled` (`utils/ui/motion`) asks the media query itself.

A control that stays in view answers in its own place rather than with a toast over it: the gear's update check says "Aktuell · v3.2.0" in its row for three seconds.

## 6g. Motion

Something moves where it changes its place or comes in from an edge, and nowhere else. One module holds the curves and the durations (`utils/ui/motion.ts`): `arrive` (`cubic-bezier(0.16, 1, 0.3, 1)`) for coming in, `leave` (`cubic-bezier(0.4, 0, 1, 1)`) for going out, `settle` (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for moving from one place to another. Going out is quicker than coming in.

| What                                              | How it moves                                                                                                                                                                     | Duration                         | Curve          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------- |
| A mix, an undo, a swap in the plan and the circle | every student who changed seats glides there, lifted a little half-way, in the shape and with the table's outline it lands in (`useSeatFlight`); the circle's go straight across | 420 ms                           | settle         |
| A drawer, the phone's sheet                       | in from its own edge, back out over it (`usePanelMotion`)                                                                                                                        | 220 / 160 ms, sheet 260 / 180 ms | arrive / leave |
| The inspector's column, the toolbar's width       | the column slides over the window's edge, the toolbar's width glides; the stage grows with them (`usePanelMotion` `column`, `useWidthMotion`)                                    | 220 ms                           | arrive         |
| A dropdown                                        | fades in, the last 4 px from its anchor's side (`FloatingDropdown`)                                                                                                              | 140 / 100 ms                     | arrive / leave |
| Another layer                                     | the workspace between the bars fades in (`useLayerFade`)                                                                                                                         | 180 ms                           | linear         |
| A screen turned upright or back                   | the frame turns into place from a quarter back (`useTurnAnimation`)                                                                                                              | 260 ms                           | settle         |
| A toast                                           | see § 6f                                                                                                                                                                         | 380 / 200 ms                     | arrive / leave |

Whatever moves only shows: the change itself happens at once. A student is in the new seat, a drawer is closed, a menu is gone, and focus, Escape and the tap beside a panel behave as they always did. Where the real element is already gone or hidden — a drawer closed, a menu shut, a seat clipped by its table — an inert copy (`inertCopy`: no ids, no focus, no name for a screen reader, no pointer) moves in its place and is removed when it arrives. A student a finger put down does not fly; only the one it displaced does. Nothing moves when the layout itself changes — a window resized past a breakpoint, a tablet turned —, on the first drawing, or under "Reduce motion": every one of these runs on the Web Animations API, which the global guard in `index.css` cannot reach, so each asks `motionEnabled` first. A layer fades rather than cross-fading through the browser's View Transitions, which would change the layer a frame late.

Still on purpose: the class list as it is searched, filtered and sorted, the inspector stepping from student to student, chips, switches and the importance scale (colour only), every number in the status bar, the export sheet, the pages beside the app. Nothing moves on its own.

## 6e. Badges on a seat

A seat shows a student's badges as icons on a pill (`SeatBadgePill`, the one renderer for the plan, the circle, the projection and both exports): `--surface-card` at 94 % with a `--border-option-hover` hairline, each icon in its family's `--data-<name>-text` ink (`BADGE_PILL_COLORS`, `getBadgeColor`), a "+N" in `--text-muted`. They read in family order — Verhalten, Soziales, Lernen, Sprache, Platz & Raum (`BADGE_ORDER`) — as the chips in the class list and every legend do.

The word a chip carries comes three other ways: a tooltip on hover or tap (`BadgeTooltipLayer` on `menuSurfaceClass`: the family in small caps, what the badge is, what it means — a fingertip's tap takes the nearest icon within 14px, as the icons are a fifth of its size on an iPad), the seat's `aria-label`, and the legend under "Merkmale" in the plan's and the circle's toolbar. Pointing at an icon or a legend row rings the seats it points at in the selection colour (`--border-option-selected`), standing still in the plan and the circle alike — only a passing criterion breathes; a criterion rings the seats it concerns in the status colour of each one's verdict (`--status-ok`, `-warn`, `-alert`). Either way the ring belongs to the seat — never to the table, which would mark the neighbours at a double or group table too. A place a dragged student hovers — a seat, or a token of the circle — wears the same mark: `--border-option-selected` where the student can land, `--status-alert` where the place is held. Every mark has one shape (`utils/ui/seatMark`, drawn by `SeatMark` in `TableSeat` and `TokenMark` in `SimpleCircleView`): a tint over the whole place and a 2.5-unit ring 2 units clear of the inner side of its edge, concentric with it — on a seat, a corner that is the table's takes the table's radius less the inset (`seatTableCorners`, `insetSeatPath`) — the seat itself is that shape with no inset, the table's radius in the table's corners and its own 4 elsewhere — so the table neither clips the ring nor runs its outline into it. From the outside in a place is its edge — a held seat's blue hairline all round, just inside the table's outline —, its mark, then the keyboard focus, on the mark's line or inside a mark; the three never cross. A held seat keeps its fill, so the gender tint stays; its lock is an icon without a plate of its own, in the seat's upper left inside where a mark's ring runs — `--text-muted` while open, `--border-option-selected` when closed (`.seat-lock` in `index.css`) — with the two-tone focus ring round it, and a name keeps clear of the icon, not of the toggle's 20-unit box (`SEAT_LOCK_ICON_SIZE`). The place the drag started from is no target; it fades, and over a taken place shows who would come. After the drop both places ring `--status-ok` for a moment and let go (`seat-drop-confirm`) — green is a completed action, never a target. The preview of the student (`DragGhost`) floats above the pointer so the ring stays in sight, a seat with the table's radius all round at its own scale, and says whom a drop would swap with ([decision 0022](decisions/0022-one-drag-for-plan-and-circle.md)). The badge layer takes no pointer events — a drag grabs the seat underneath — so the tooltip finds the icon by its box (`useBadgeHover`). Both the tooltip and the marking can be switched off under "Merkmale" (`spg.badgeHover`).

A screen keeps icons at `LEGIBLE_BADGE_ICON_SIZE` or larger and the pill below the name; what does not fit becomes the "+N", whose tooltip lists the rest, and badges whose criterion the mix weighs keep their place first (`fitSeatBadges`). Paper cannot be hovered: an export shrinks the icons until every one fits. Decision 0021 holds the reasons.

The name above the pill takes what the seat has left. Name and pill are fitted against the seat as it stands under the upright name — at a quarter turn, on a plan turned for its board, a 55 × 65 seat gives the name 65 across; a seat turned at a slant is widest across its middle and the pill sits as low as the outline allows; on both the name may step aside from the editor's lock. The lock takes room only where it is always drawn — on a touch screen, and a closed lock everywhere; the open lock a mouse reveals on hover lies over the name for that moment, so the editor's names come out as large as the export's. A name breaks into two lines where that makes it larger, between words or after a hyphen, never inside a word ("Paul" over "Zimmermann"); full names always break, so a plan reads alike. A plan's names share one size: as large as the great majority of seats allow, while a conspicuously long name shrinks on its own seat (`seatLabelLayout`, `computePlanNameFontSize`, `SeatNameText`). The circle does the same inside its round places. The text is measured by arithmetic from the advance widths of Atkinson Hyperlegible Next (`src/data/nameGlyphWidths.json`, written by `npm run generate:glyph-widths`), so the editor, the projection and every export arrive at the same layout.

## 6d. The start page and the pages beside it

`pages/StartPage.tsx` is the one page that sells rather than works, and it
does so with the workspace's own means. The hero title and each section's
claim are set in `--font-serif`; above a claim, small caps name what the
section is about. Sections are divided by a hairline, not by cards, and the
page carries one blue button — "Plane jetzt deine Klasse!". FAQ, contact and
support are quiet links in ink.

The criteria section is the only place on the page with colour, and it may
have it because every colour there describes pedagogy: each family is a
`dataHeadingClass` over `dataChipClass` chips, icon and word, in the order and
with the names the inspector uses (`criteriaIcons.ts`,
`generator:mix.criteria.*`). The layers, presets, importance levels and tools
the page mentions are quoted from the app's own keys, so the page cannot call
a thing differently from the screen it describes.

The preview (`HeroMockup`) is a `panelSurfaceClass` frame around whole-window
screenshots (`npm run capture:preview-screenshots`), with no browser chrome
drawn around them. Nothing floats over the picture: the slide's name, its
position and the controls sit in a strip below it, the way the app keeps its
own out of the stage.

The pages beside it — FAQ, support, contact, changelog, Impressum,
Datenschutzerklärung and the 404 page — share its type
(`components/publicPage/pageTokens.ts`) and a header of their own
(`PublicPageHeader`: the lockup, and on the right "Zurück" when the visitor
came from inside the site — the app, the start page, the footer, another of
these pages — beside the settings gear, the workspace's own `AppSettingsMenu`
row for row; the start page carries the same gear beside its lockup).
Each opens with small caps, a serif title and a muted lead; what follows is
divided by hairlines, never framed in cards, and a page has at most one blue
button — the donation, the mail address, the way to the generator, the way
home. A link inside running text is `pageInlineLinkClass`, a link in the
page's chrome `quietLinkClass`. Where a page is a list of parts — the
changelog's versions, the sections of a legal text (`LegalPage`,
`LegalSection`) — each part is a row: its name on the left, staying in view
while the part is read, its text on the right. The changelog tells its kinds
of change apart by icon and word, in the same order in every version, and
gives them no colour: none of them is something to act on.

None of these pages sets a minimum height. `App.tsx` makes the page a column
at least as tall as the window, so the footer sits on the bottom edge however
short the page is. The footer is one line of words — FAQ, feedback, support,
the changelog with the running version, Datenschutz, Impressum — without
icons, separators or controls: the theme, the language, the update check and
wiping the data live in the gear at the top, the same menu in the same place
as in the workspace.
With all of that in it, the footer broke onto a second line on an iPad. The
two legal pages stay words in the footer rather than rows in the gear, where
a visitor looks for them and where an imprint is "easily recognisable"
(§ 5 DDG).

## 7. Extensions & maintenance

1. New surface or button variants are first added as a utility in `src/index.css` and then exported from `designTokens.ts`.
2. Changes to colors, radii, or shadows happen exclusively via `@theme`. Light and dark mode update together as a result.
3. Components that combine multiple tokens use template literals (``className={`${cardSurfaceClass} ${customLayout}`}``) and keep the token unchanged as the base class.
4. Student-specific token extensions follow the pattern in `studentStyleTokens.ts`. Color variants use `!` utilities to safely override the base values.
5. The onboarding tour (`components/onboarding/OnboardingTour.tsx`) draws its ring and dimmed backdrop with the `tour-spotlight` utility and its popover on `menuSurfaceClass`. It adds no colours of its own apart from the orange step counter, the accent reserved for step labels.

## 8. References

- `src/utils/ui/designTokens.ts` – central export point for surfaces & buttons
- `src/components/students/studentStyleTokens.ts` – tokens for student-specific toggles
- `src/index.css` – source of all variables, utilities, and dark-mode overrides
