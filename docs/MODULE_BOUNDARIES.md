# Module Boundaries – Utils API & Import Guidelines

## Goal & background

Klassenplan's utility landscape is centralized so that components, hooks, and services share consistent helpers via a single public API. The entry point is [`src/utils/index.ts`](../src/utils/index.ts), which bundles all approved functions into logically grouped export blocks (ID generation, logging, constants, seating helpers, toasts, design tokens, and more). This keeps tree-shaking, bundle splitting, and type definitions stable, while specialized namespaces (`algorithm`, `data`, `ui`) can be versioned independently.

## Public utils API (`@/utils`)

| Category                     | Example exports                                                                                    | Typical consumers                                | Notes                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Core helpers                 | `generateId`, `deepClone`                                                                           | UI components, hooks                             | Always import via `@/utils`, never directly from `./id` etc.                                              |
| Logging & errors             | `logInfo`, `logWarn`, `logError`, `errorHandlers`                                                   | Services, hooks, workers                         | Logging goes exclusively through these functions.                                                         |
| Constants & mix settings     | `MAX_STUDENTS`, `TABLE_PRESETS`, `DEFAULT_MIX_WEIGHTS`, `normalizeMixSettings`                      | Algorithm, UI, and form hooks                    | Constants live in a single place and stay in sync with tests.                                             |
| Seating & layout utilities   | `countStudents`, `addSeatingForTables`, `calculateTableGroupBounds`, `snapPosition`                 | Canvas / scene components, drag-and-drop hooks   | Only functions exported through the index count as public API.                                            |
| UI & feedback                | `showToast`, `TOAST_MESSAGES`, `announcePlanSaved`, `panelSurfaceClass`, `getSidebarSurfaceClasses` | UI components, toast system                      | UI-specific tokens and toasts originate in `@/utils/ui` exports, but are surfaced through the main index. |
| Validation & shortcuts       | `stringValidation`, `shortcutMap`, `type Shortcut`                                                  | Forms, keyboard hooks                            | Types are intentionally exported alongside, so TS checks stay centralized.                                |

> **Rule of thumb:** If a function is exported from `src/utils/index.ts`, it is public for the app. Anything else stays internal.

## Specialized namespaces

A few areas intentionally stay outside the central API to optimize bundle size and avoid side effects. The build configuration (`vite.config.ts`) mirrors these boundaries in its manual-chunks setup.

- `@/utils/algorithm`: Houses compute-heavy seating and circle algorithms. Only the algorithm service or specialized hooks should consume it. Components may only use prepared results.
- `@/utils/data`: Manages persistence (IndexedDB, backup, storage keys) and may only be used by repositories, contexts, or service layers.
- `@/utils/ui`: UI-adjacent helpers (toasts, scroll, design tokens, feature styles) with no component imports. Stays optionally loadable and is re-exported through the central index when needed.
- `@/services/export`: Modules that render React components to SVG/PDF (e.g. `sceneRenderer`). Anything that instantiates components at runtime belongs here – which is why it cannot live in `utils/`.
- `@/services/ui`: Imperative UI wrappers (e.g. `dialogs` for `confirmDialog` / `promptDialog`) that render components dynamically via `createRoot`. Consumers are hooks and pages, not other utils.

## Import guidelines

1. **Default case:** Always import from `@/utils`.
   ```ts
   import { generateId, logError } from '@/utils';
   ```
2. **Algorithm logic:** Only services/hooks may reach into `@/utils/algorithm` directly. UI code may only use prepared results or adapters.
3. **Persistence:** Repository implementations access `@/utils/data`. Components only interact with repository hooks.
4. **UI support:** UI components use `@/utils` for tokens and toasts. Special cases (e.g. `responsiveViewBox`) live in `@/utils/ui` and are only imported when they are not already available via the index.
5. **No cross-layer import paths:** Algorithm or data modules must never import components. Check: `rg "from '@/components" src/utils` must stay empty.
6. **Tests:** The same structure applies to unit tests. Test helpers that need utils use `@/utils` or the appropriate namespace.
