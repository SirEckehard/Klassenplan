# Design System – Klassenplan

This document describes the binding design tokens for Klassenplan. All values reflect the state of the Tailwind 4 migration (see `src/index.css`).

## 1. Token layers

1. **CSS source (`src/index.css`)**
   - `@theme` declares color values, radii, shadows, and focus rings for light and dark mode.
   - `@utility` produces semantic classes such as `panel-surface`, `primary-button`, `input-field`, or `canvas-frame`, which consume the CSS variables.
2. **TypeScript exports (`src/utils/ui/designTokens.ts`)**
   - Each exported constant maps to the corresponding utility class and thus forms the binding API for components.
3. **Student-specific tokens (`src/components/students/studentStyleTokens.ts`)**
   - Built on top of `mutedIconButtonClass`, these provide extended tokens for gender, needs, height, and partner toggles. Color variants are realized via utility overrides with `!` priority.

> **Ground rule:** Components import the token constants and only add necessary layout classes (e.g. `flex`, `gap-*`, `w-full`). Raw utilities from `src/index.css` or base Tailwind classes are not used directly inside components.

## 2. Surface and button tokens

| Token                    | Underlying classes    | Typical use                                          |
| ------------------------ | --------------------- | ---------------------------------------------------- |
| `panelSurfaceClass`      | `panel-surface`       | Shells, wizard steps, quick menu                     |
| `cardSurfaceClass`       | `card-surface`        | Cards, dialog content                                |
| `listContainerClass`     | `list-container`      | History panels, template lists                       |
| `badgeSurfaceClass`      | `badge-surface`       | Status badges, pills                                 |
| `primaryButtonClass`     | `primary-button`      | Primary actions                                      |
| `secondaryButtonClass`   | `secondary-button`    | Secondary actions                                    |
| `dangerButtonClass`      | `danger-button`       | Destructive actions                                  |
| `successButtonClass`     | `success-button`      | Confirmations                                        |
| `iconButtonClass`        | `icon-button`         | Prominent icon actions                               |
| `quietIconButtonClass`   | `quiet-icon-button`   | Toolbar / secondary actions                          |
| `dangerIconButtonClass`  | `danger-icon-button`  | Warn / delete icons                                  |
| `successIconButtonClass` | `success-icon-button` | Success icons                                        |
| `loadingIconButtonClass` | `loading-icon-button` | Loading indicators                                   |
| `mutedIconButtonClass`   | `muted-icon-button`   | Neutral icon actions, basis for student toggles      |
| `inputFieldClass`        | `input-field`         | Inputs, selects, textareas                           |
| `textareaFieldClass`     | `textarea-field`      | Multi-line fields                                    |
| `pillTabBaseClass`       | `pill-tab-base`       | Step navigation, filters                             |
| `pillTabActiveClass`     | `pill-tab-active`     | Active pill states                                   |
| `pillTabInactiveClass`   | `pill-tab-inactive`   | Inactive pill states                                 |
| `menuSurfaceClass`       | `menu-surface`        | Desktop menus                                        |
| `touchMenuSurfaceClass`  | `touch-menu-surface`  | Touch-optimized menus                                |
| `floatingStatusClass`    | `floating-status`     | Floating badges                                      |
| `canvasFrameClass`       | `canvas-frame`        | Canvas frame                                         |

All classes in the table automatically read the variables defined in `@theme`. Dark-mode variants are embedded inside the utility definitions.

**Interaction behavior:** All button and icon-button tokens explicitly set `cursor: pointer` and switch to `cursor: not-allowed` automatically in the `:disabled` state. This keeps the mouse cursor consistent regardless of browser defaults.

## 3. Radii, borders, and shadows

The central radii live in `@theme`:

| Variable          | Value (light)     | Used for                         |
| ----------------- | ----------------- | -------------------------------- |
| `--radius-panel`  | `1.5rem` (≈24 px) | `panel-surface`, `canvas-frame`  |
| `--radius-card`   | `1rem` (≈16 px)   | `card-surface`, `list-container` |
| `--radius-list`   | `1rem` (≈16 px)   | History panels                   |
| `--radius-badge`  | `9999px`          | `badge-surface`                  |
| `--radius-pill`   | `9999px`          | Buttons, tabs                    |
| `--radius-canvas` | `1.5rem` (≈24 px) | Canvas wrapper                   |

**Borders & shadows**

- Standard borders (`card-surface`, `list-container`, `muted-icon-button`) use 1 px (`border`) backed by `--border-card` / `--border-list`.
- Highlighted panels (`panel-surface`, `canvas-frame`) use `border: 2px solid var(--border-panel)`.
- Shadows are centrally defined in `--shadow-*` (e.g. `--shadow-panel`, `--button-primary-shadow`). All adjustments go through the variables.

## 4. Focus, hover, and color worlds

- Focus rings are driven by `--focus-ring-primary`, `--focus-ring-danger`, `--focus-ring-success`.
- Buttons and icon buttons have defined hover states (e.g. `--button-primary-bg-hover`). These values also apply in the dark variant because `@layer base` overrides the variables.
- For glass/gradient surfaces (`panel-surface`, `menu-surface`), `--backdrop-blur-*` provides consistent blur.

## 5. Tokens for student toggles

`src/components/students/studentStyleTokens.ts` provides specialized tokens built on `mutedIconButtonClass`:

- **Gender selector**: `genderButtonTokens` with `compactBaseClass`, `detailedBaseClass`, colored `compactStyleMap` / `detailedActiveStyleMap`, and icon color maps.
- **Special needs**: `specialNeedsButtonTokens` with an `activeStateClass` (amber) and a neutral `inactiveStateClass`.
- **Height selector**: `heightButtonTokens` including dropdown styles (`dropdownOptionBaseClass`, `dropdownActiveStyleMap`, …) and icon color maps.
- **Partner / avoid partner**: `partnerButtonTokens` and `avoidPartnerButtonTokens` with matching dropdown variants.

**Important:** The tokens already include minimum sizes (`min-h-10`, `min-w-[44px]`) and typography (`text-xs font-semibold`). Additional classes are only allowed for layout scaffolding (e.g. `grid`, `gap-*`).

## 6. Classroom features & feature palette

The classroom features (windows, doors, teacher's desk, blackboard) are rendered as `ClassroomFeature` shapes on the canvas. Colors live in `src/utils/ui/featureStyles.ts` (`getFeatureStyles()`, light/dark palettes per feature type) and are consumed by `ClassroomCanvas.tsx`. They align with the primary palette:

- **Window**: light blue (`#dbeafe`) / dark mode `#1e3a8a`, border `#1d4ed8` or `#60a5fa`
- **Door**: warm amber (`#fef3c7`) / dark mode `#78350f`, border `#b45309` or `#fbbf24`
- **Blackboard**: mint green (`#d1fae5`) / dark mode `#1e3a33`, border `#1e3a33` or `#10b981`
- **Teacher's desk**: neutral gray (`#e5e7eb`) / dark mode `#4b5563`, border `#6b7280` or `#9ca3af`

Drag indicators use:

- Table templates: blue (`bg-blue-600` / `dark:bg-blue-500`)
- Room features: amber (`bg-amber-500` / `dark:bg-amber-400`)

The palette in `SmartEditPanel` still relies on `cardSurfaceClass` and `panelSurfaceClass`, but adds targeted gradients for hover states (`hover:bg-blue-50/80`, `dark:hover:bg-blue-900/30`). Adjustments happen centrally in the panel, not in the components.

## 7. Extensions & maintenance

1. New surface or button variants are first added as a utility in `src/index.css` and then exported from `designTokens.ts`.
2. Changes to colors, radii, or shadows happen exclusively via `@theme`. Light and dark mode update together as a result.
3. Components that combine multiple tokens use template literals (`` className={`${cardSurfaceClass} ${customLayout}`} ``) and keep the token unchanged as the base class.
4. Student-specific token extensions follow the pattern in `studentStyleTokens.ts`. Color variants use `!` utilities to safely override the base values.

## 8. References

- `src/utils/ui/designTokens.ts` – central export point for surfaces & buttons
- `src/components/students/studentStyleTokens.ts` – tokens for student-specific toggles
- `src/index.css` – source of all variables, utilities, and dark-mode overrides
