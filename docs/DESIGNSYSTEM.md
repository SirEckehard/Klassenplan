# Design System – Klassenplan

> **Status:** current · **Last reviewed:** 2026-09-20 · **Maintainer:** Eike
> Schäfer · **Describes:** Klassenplan 2.2.0

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
| `badgeSurfaceClass`      | `badge-surface`       | Status badges, pills                                    |
| `dataChipClass`          | `data-chip`           | One pedagogical fact: icon, word, family colour         |
| `dataHeadingClass`       | `data-heading`        | A section heading in its family's accent                |
| `dataFamilyClass[…]`     | `data-behavior`, …    | Sets the family's three custom properties               |
| `primaryButtonClass`     | `primary-button`      | Primary actions                                         |
| `secondaryButtonClass`   | `secondary-button`    | Secondary actions                                       |
| `neutralButtonClass`     | `neutral-button`      | Neutral actions (e.g. back navigation)                  |
| `dangerButtonClass`      | `danger-button`       | Destructive actions                                     |
| `successButtonClass`     | `success-button`      | Confirmations                                           |
| `warningButtonClass`     | `warning-button`      | Warning actions                                         |
| `iconButtonClass`        | `icon-button`         | Prominent icon actions                                  |
| `quietIconButtonClass`   | `quiet-icon-button`   | Toolbar / secondary actions                             |
| `dangerIconButtonClass`  | `danger-icon-button`  | Warn / delete icons                                     |
| `successIconButtonClass` | `success-icon-button` | Success icons                                           |
| `loadingIconButtonClass` | `loading-icon-button` | Loading indicators                                      |
| `mutedIconButtonClass`   | `muted-icon-button`   | Neutral icon actions, basis for student toggles         |
| `inputFieldClass`        | `input-field`         | Inputs, selects, textareas                              |
| `selectFieldClass`       | `input-field`         | Alias for select elements                               |
| `textareaFieldClass`     | `textarea-field`      | Multi-line fields                                       |
| `segmentedTrackClass`    | `segmented-track`     | Recessed track a segmented control's options sit in     |
| `pillTabBaseClass`       | `pill-tab-base`       | Segmented options: layer switcher, filters, dialog tabs |
| `pillTabActiveClass`     | `pill-tab-active`     | Active pill states                                      |
| `pillTabInactiveClass`   | `pill-tab-inactive`   | Inactive pill states                                    |
| `menuSurfaceClass`       | `menu-surface`        | Desktop menus                                           |
| `touchMenuSurfaceClass`  | `touch-menu-surface`  | Touch-optimized menus                                   |
| `floatingStatusClass`    | `floating-status`     | Floating badges                                         |
| `canvasFrameClass`       | `canvas-frame`        | Canvas frame                                            |
| `toastSurfaceClass`      | `toast-surface`       | Toast container                                         |
| `toastAccentClass`       | `toast-accent`        | Toast accent bar                                        |
| `toastIconClass`         | `toast-icon`          | Toast icon                                              |

All classes in the table automatically read the variables defined in `@theme`. Dark-mode variants are embedded inside the utility definitions.

**Interaction behavior:** All button and icon-button tokens explicitly set `cursor: pointer` and switch to `cursor: not-allowed` automatically in the `:disabled` state. This keeps the mouse cursor consistent regardless of browser defaults.

## 3. Typefaces, radii, borders, and shadows

**Typefaces.** Two families from one superfamily, both self-hosted through Fontsource — no CDN, because the production CSP is `script-src 'self'` and the app ships no third-party requests:

| Token          | Stack                                                      | Used for                                  |
| -------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `--font-sans`  | `'Instrument Sans Variable'`, `'Instrument Sans Fallback'` | The whole interface, the plan, the export |
| `--font-serif` | `'Instrument Serif'`, `'Instrument Serif Fallback'`        | Display headings, empty states            |

Both fallbacks are metric-matched `@font-face` stand-ins calculated from `@capsizecss/metrics` the way `next/font` does (`xWidthAvg` against the fallback), so the swap does not move text: Instrument Sans over Arial, Instrument Serif over Times New Roman. Only the Latin Instrument Sans file is preloaded; the serif carries headings and swaps in.

SVG `font-family` attributes are not reached by the `@theme` token, so the scene, the presentation and the circle print view take `svgFontFamily` from `designTokens.ts`. The image and PDF exporters embed the same Latin woff2 as base64 (`getPrimaryFontBase64` in `utils/export/svgRasterizer.ts`), so an exported file renders identically on a machine that has neither font installed.

Numbers that sit in columns or get compared — counts, percentages, times — are set with `tabular-nums`.

The central radii live in `@theme`:

| Variable                   | Value (light)      | Used for                                    |
| -------------------------- | ------------------ | ------------------------------------------- |
| `--radius-panel`           | `0.875rem` (14 px) | `panel-surface`, `canvas-frame`             |
| `--radius-card`            | `0.625rem` (10 px) | `card-surface`, `list-container`, menus     |
| `--radius-list`            | `0.625rem` (10 px) | History panels                              |
| `--radius-pill`            | `0.5rem` (8 px)    | Buttons, tabs, toast icon                   |
| `--radius-floating-status` | `0.5rem` (8 px)    | `floating-status`                           |
| `--radius-badge`           | `9999px`           | `badge-surface` — the only round shape left |

`--radius-pill` keeps its name for compatibility; controls stopped being pills. Only badges and avatars stay circular.

A segmented control is `SegmentedControl` (`components/ui/controls/`), which wraps `segmented-track` around `pill-tab-base` options, one of them carrying `pill-tab-active`. Reach for the component, not the classes. The active option is a raised paper pill rather than a blue one — blue means "you can act here", and which view you are looking at is not an action. `--surface-sunken` is the recessed ground it sits on.

**Borders & shadows**

- Every surface — panels and the canvas frame included — uses a 1 px border. The 2 px frame is gone; structure is carried by the line, not by the weight.
- Shadows are for things that genuinely float: `--menu-shadow` and `--toast-shadow` at `0 8px 24px -12px`. Resting surfaces use `0 1px 2px` at 5 % or nothing at all, and every button shadow token is `none`.
- The glass look is gone: `--backdrop-blur-soft` and `--backdrop-blur-medium` both resolve to `none`. The variables stay so the utilities referencing them keep resolving and a future surface can opt back in.
- All adjustments go through the variables; never hand a component its own `shadow-*` utility.

## 4. Focus, hover, and the two colour worlds

**The interface is paper and ink.** A warm neutral ramp plus exactly one accent, which means one thing: _you can act here_.

| Role       | Light     | Dark      | Token                       |
| ---------- | --------- | --------- | --------------------------- |
| Page       | `#fcfbf8` | `#101113` | `--surface-page`            |
| Surface    | `#ffffff` | `#181a1d` | `--surface-card` / `-panel` |
| Line       | `#e3dfd6` | `#2a2d31` | `--border-card`             |
| Muted text | `#54565a` | `#a9acb1` | `--text-muted`              |
| Ink        | `#17181a` | `#f2f1ee` | `--text-page`               |
| Accent     | `#2563eb` | `#2563eb` | `--button-primary-bg`       |

Rose (`--button-danger-bg`) and green (`--button-success-bg`) are the two exceptions, reserved for destructive and confirming actions.

**Everything else that is coloured describes pedagogy.** Six `--data-*` families, and no interface element may use them:

| Family           | Accent    | Chip text | Chip surface | Covers                                                       |
| ---------------- | --------- | --------- | ------------ | ------------------------------------------------------------ |
| Verhalten        | `#b45309` | `#8a3d06` | `#fbf0df`    | Unruhe, Ablenkbarkeit, Ablenkung durch Unruhe                |
| Soziales         | `#6d28d9` | `#5b21b6` | `#efe9fc`    | Schüchternheit, Wunsch-/Distanzpartner, Rollen, Wiederholung |
| Lernen           | `#15803d` | `#14622f` | `#e6f2ea`    | Fördern heterogen, Fördern homogen                           |
| Sprache          | `#be123c` | `#9f1239` | `#fbe8ec`    | Sprachförderung, Sprachstand                                 |
| Platz &amp; Raum | `#0e7490` | `#0b5f76` | `#e2f0f5`    | Vordere Plätze, Körpergröße, Fensterplätze, Türnähe          |
| Person           | `#52525b` | `#43464b` | `#f0f0ee`    | Geschlechtermischung, Foto, Name                             |

Every chip-text-on-chip-surface pair clears 4.5:1, and a data colour never appears without its icon and its spelled-out word, so colour is never the only channel.

In code a family is a class, not a hex: `dataFamilyClass.behavior` sets `--data-chip-text`, `--data-chip-surface` and `--data-chip-accent`, and `dataChipClass` or `dataHeadingClass` beside it supplies the shape. `StudentChips` maps the badge keys from `utils/ui/studentAppearance` to families in one place; nothing else decides what colour an attribute speaks in.

**Two rules that decide arguments**

1. The interface uses no data colour. No button is green because it saves, no toolbar is amber.
2. A data colour never appears alone. Icon and word travel with it.

`warning-button` is the one leftover: it carried the old amber "back / side trip" accent and is used for navigation (Namensspiel, Zurück zum Klassenraum), not for warnings. Its tokens (`--button-warning-*`) now render neutral; the call sites move to `secondary-button` and the token disappears with them.

**Focus and hover**

- A focus ring is a solid 2 px contour in `--focus-ring-primary` (danger and success variants exist), never a soft glow. The old translucent rings are gone.
- Buttons and icon buttons have defined hover states (e.g. `--button-primary-bg-hover`). These apply in dark mode too, because `@layer base` overrides the variables rather than the utilities.

## 5. Tokens for student toggles

`src/components/students/studentStyleTokens.ts` provides specialized tokens built on `mutedIconButtonClass`:

- **Gender selector**: `genderButtonTokens` with `compactBaseClass`, `detailedBaseClass`, colored `compactStyleMap` / `detailedActiveStyleMap`, and icon color maps.
- **Special needs**: `specialNeedsButtonTokens` with an `activeStateClass` (amber) and a neutral `inactiveStateClass`.
- **Height selector**: `heightButtonTokens` including dropdown styles (`dropdownOptionBaseClass`, `dropdownActiveStyleMap`, …) and icon color maps.
- **Partner / avoid partner**: `partnerButtonTokens` and `avoidPartnerButtonTokens` with matching dropdown variants.

**Important:** The tokens already include minimum sizes (`min-h-10`, `min-w-[44px]`) and typography (`text-xs font-semibold`). Additional classes are only allowed for layout scaffolding (e.g. `grid`, `gap-*`).

## 6. Classroom features & feature palette

The classroom features (windows, doors, teacher's desk, blackboard) are rendered as `ClassroomFeature` shapes on the canvas. Colors live in `src/utils/ui/featureStyles.ts` (`getFeatureStyles()`, light/dark palettes per feature type) and are consumed by `ClassroomCanvas.tsx`.

They are drawn like a floor plan: a barely tinted fill carrying a strong ink contour. Projectors wash pastel fills out almost completely, so the contour — not the fill — is what has to survive the beamer. The hues stay recognisable but live at ink darkness instead of candy lightness:

- **Window**: fill `#f5f7fb` / dark `#12203f`, contour `#1e3a8a` or `#6f9bf5`
- **Door**: fill `#fbf7f0` / dark `#2b1810`, contour `#7c2d12` or `#d08a5f`
- **Blackboard**: fill `#f2f7f3` / dark `#12261a`, contour `#14532d` or `#57b37a`
- **Teacher's desk**: fill `#f3f1ec` / dark `#202327`, contour `#3f3f46` or `#8c9096`
- **Cabinet**: fill `#f7f3ed` / dark `#2a2218`, contour `#6b5a45` or `#b79a74`

These are deliberately _not_ the `--data-*` families: a window is furniture, not a pedagogical fact.

Drag indicators use:

- Table templates: blue (`bg-blue-600` / `dark:bg-blue-500`)
- Room features: amber (`bg-amber-500` / `dark:bg-amber-400`)

Every layer's toolbar is a `ToolRail` (`src/components/shell/ToolRail.tsx`) inside `SmartSidebar`. An entry adds layout classes only; its two densities — the 208px labelled column and the 60px icon rail — come from the rail, so a new tool cannot invent a look of its own. An entry is a row, not a card: 36px tall, `rounded-lg`, paper on hover (`--surface-sunken`) and `--surface-option-selected` when it is the view on screen, with the icon taking `--text-badge` so the state has a second channel.

From `lg` up `SmartSidebar` drops that panel surface: on the desktop shell it is not a card but the window's left edge, one hairline (`border-r`) of `--border-card` against the sunken stage. Below `lg` the layer is still a stacked document, where a panel needs a frame of its own to read as one.

## 6a. The stage

A layer's stage is `workspaceStageClass` — the sunken surface the subject sits
on. Where that subject is the classroom, it also carries `canvas-stage`, which
from `lg` up makes it a size container and centres its content, and the frame
inside takes `canvas-fit`: `min(100%, 100cqh * 3 / 2)` for the fixed 900×600
plan. The frame itself is `canvas-frame` — white, one hairline, no radius.

## 6b. The inspector

The right-hand panel is a wall, not a stack of cards. `InspectorHeader`,
`InspectorBody`, `InspectorSection` and `InspectorFooter`
(`src/components/shell/InspectorPanel.tsx`) are its only parts: the header is a
strip of 44px media, an `h2` and a subtitle above a hairline; sections carry a
`data-heading` in their family's colour and are separated by `border-t` with
`first:border-t-0`, never by a gap; the footer holds what acts on the whole
selection, destructive last. A panel that needs a new group adds a section —
not a card, not a heading of its own invention.

## 6c. Menus

A dropdown is a `menuSurfaceClass` box; its rows are `menuItemClass`, and the one destructive row is `menuItemDangerClass`. Both hover on paper — `--surface-sunken`, or `--button-icon-danger-bg` for the destructive one — never on blue: blue means "you can act here", and a hovered row is a pointer, not an action.

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
