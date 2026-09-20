# Module Boundaries – Utils API & Import Guidelines

> **Status:** current · **Last reviewed:** 2026-09-14

## Goal & background

Klassenplan's utility landscape is centralized so that components, hooks, and services share consistent helpers via a single public API. The entry point is [`src/utils/index.ts`](../src/utils/index.ts), which bundles all approved functions into logically grouped export blocks (ID generation, logging, constants, seating helpers, toasts, design tokens, and more). This keeps tree-shaking, bundle splitting, and type definitions stable, while specialized namespaces (`algorithm`, `data`, `csv`, `ui`) can evolve on their own.

The boundary that matters most runs between the UI and those namespaces: components render prepared state, and the compute-heavy or storage-bound code stays behind hooks, contexts and repositories. That boundary is enforced by ESLint, see [Enforcement](#enforcement).

## Public utils API (`@/utils`)

| Category                   | Example exports                                                                                     | Typical consumers                              | Notes                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Core helpers               | `generateId`, `deepClone`, `shuffleArray`                                                           | UI components, hooks                           | Always import via `@/utils`, never directly from `./id` etc.                                               |
| Storage keys               | `LOCAL_STORAGE_KEYS`, `LEGACY_EXPORT_KEYS`                                                          | UI components, hooks                           | Dependency-free constants from `utils/data/storageKeys.ts`; the rest of `@/utils/data` stays out of the UI |
| Logging & errors           | `logInfo`, `logWarn`, `logError`, `errorHandlers`                                                   | Services, hooks, workers                       | Logging goes exclusively through these functions.                                                          |
| Constants & mix settings   | `MAX_STUDENTS`, `TABLE_PRESETS`, `DEFAULT_MIX_WEIGHTS`, `normalizeMixSettings`                      | Algorithm, UI, and form hooks                  | Constants live in a single place and stay in sync with tests.                                              |
| Seating & layout utilities | `countStudents`, `addSeatingForTables`, `calculateTableGroupBounds`, `getWishPartnerIds`            | Canvas / scene components, drag-and-drop hooks | Only functions exported through the index count as public API.                                             |
| UI & feedback              | `showToast`, `TOAST_MESSAGES`, `announcePlanSaved`, `panelSurfaceClass`, `getSidebarSurfaceClasses` | UI components, toast system                    | UI-specific tokens and toasts originate in `@/utils/ui` exports, but are surfaced through the main index.  |
| Validation & shortcuts     | `stringValidation`, `shortcutMap`, `type Shortcut`                                                  | Forms, keyboard hooks                          | Types are intentionally exported alongside, so TS checks stay centralized.                                 |

> **Rule of thumb:** If a function is exported from `src/utils/index.ts`, it is public for the app. Anything else stays internal.

A namespace module is surfaced through the index only when it has no dependencies of its own (`shuffleArray`, the storage keys, `downloadCsvTemplate`). That keeps the central API cheap to import from anywhere.

## Specialized namespaces

A few areas intentionally stay outside the central API to optimize bundle size and avoid side effects. The build does not pin these boundaries with `manualChunks` – Rolldown splits automatically (see the comment in `vite.config.ts`), so what keeps a namespace out of the entry graph is the import boundary itself, not a chunk name.

- `@/utils/algorithm`: Compute-heavy seating and circle algorithms, scoring and statistics. Consumed by hooks, stores, contexts and the algorithm worker. UI code only uses type imports and the display derivations listed below.
- `@/utils/data`: Persistence helpers – IndexedDB access, storage keys, CSV parsing, plan usage merge rules. Consumed by repositories, hooks, stores, contexts, services and workers. UI code only uses type imports and `planUsage`; storage keys come from `@/utils`.
- `@/utils/csv`: The CSV import vocabulary and its detection steps (column synonyms, school-software presets, encoding sniffing, preamble stripping, diagnostics). Consumed by `@/utils/data/csvUtils.ts`, the CSV worker and the import dialogs. Only `downloadCsvTemplate` is surfaced through the central index; everything else is imported from the namespace.
- `@/utils/demo`: The sample class – invented students and a furnished room ([decision 0015](decisions/0015-onboarding-sample-class-and-tour.md)). Consumed only by `useDemoClass`, which takes the pictures from `@/utils/image/demoAvatar`; keeping both out of the index keeps them out of the entry bundle.
- `@/utils/ui`: UI-adjacent helpers (toasts, scroll, design tokens, feature styles) with no component imports. Stays optionally loadable and is re-exported through the central index when needed.
- `@/services/export`: Modules that render React components to SVG/PDF (`sceneRenderer`, `pdfExportFunctions`). Anything that instantiates components at runtime belongs here – which is why it cannot live in `utils/`.
- `@/services/backup`, `@/services/migration`: Backup export and import, "delete all data", and the start-up migration. They work through repositories and the photo cache, which utils may not reach.
- `@/services/ui`: Imperative UI wrappers (e.g. `dialogs` for `confirmDialog` / `promptDialog`) that render components dynamically via `createRoot`. Consumers are hooks and pages, not other utils.

## Who may import what

| Importing layer                            | `@/utils` | `@/utils/algorithm`                                                     | `@/utils/data`            |
| ------------------------------------------ | --------- | ----------------------------------------------------------------------- | ------------------------- |
| `src/components`, `src/pages` (enforced)   | yes       | type imports, `seatingStatistics`, `criterionHighlights`, `planReasons` | type imports, `planUsage` |
| hooks, contexts, stores, services, workers | yes       | yes                                                                     | yes                       |
| repositories                               | yes       | not used                                                                | yes                       |
| `src/utils` (enforced)                     | yes       | yes                                                                     | yes – but no layer above  |
| tests                                      | yes       | yes – to build fixtures                                                 | yes                       |

### Why the UI exceptions

- **Type imports** carry no runtime code, so they cannot pull a namespace into a component's chunk.
- **`seatingStatistics`, `criterionHighlights`, `planReasons`, `planUsage`** are pure, synchronous derivations of what is on screen: the fulfilment beside each criterion, the criterion highlights on the seats, the sentences under "Warum dieser Plan" and the neighbourhood view. They have to show exactly what the algorithm scores – `isCountedUsage()` is shared by the evaluation and the scoring for precisely that reason ([ALGORITHM.md](ALGORITHM.md#confirmation)). Wrapping them in hooks would add a layer without protecting anything.

Adding an exception means extending the allow-list in `eslint.config.js` and the table above in the same commit, with the reason.

## Enforcement

`eslint.config.js` checks the boundaries on every `npm run lint` (and therefore in CI):

- **Deep paths into the central API** (`@/utils/constants`, `@/utils/logger`, …) are rejected everywhere; import from `@/utils`.
- **`src/components` and `src/pages`** use `@typescript-eslint/no-restricted-imports`: `@/utils/algorithm` and `@/utils/data` are blocked, including their index modules and nested paths, except for type imports and the three modules above.
- **`src/utils`** is the bottom layer: it imports no components, pages, hooks, contexts, stores, state machines, services, repositories or workers. Code that needs one of them belongs in that layer.
- **Test files** are exempt from the layer rules.

### Former crossings

Until 2026-09-14 five utils modules imported layers above them. Each moved to the layer it depends on; the pure pieces they use (`tableMigration`, `backupValidation`, the storage helpers) stayed in utils.

| Was in utils                           | Now                                          | Why there                                                          |
| -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `utils/data/dataBackup.ts`             | `src/services/backup/dataBackup.ts`          | Reads and wipes through repositories, the photo store and cache    |
| `utils/migration/migrationService.ts`  | `src/services/migration/migrationService.ts` | Reads and writes through `@/repositories/idbClient`                |
| `utils/export/pdfExportFunctions.ts`   | `src/services/export/pdfExportFunctions.ts`  | Renders the scene with `sceneRenderer` and reads the photo cache   |
| `utils/state/resetApplicationState.ts` | `src/stores/resetApplicationState.ts`        | Resets the stores                                                  |
| `utils/performance/routePreloader.ts`  | `src/pages/routePreloader.ts`                | Shares the lazy components of `pages/lazyPages.ts` with the router |

## Import guidelines

1. **Default case:** Always import from `@/utils`.
   ```ts
   import { generateId, logError } from '@/utils';
   ```
2. **Algorithm logic:** UI code reaches it through hooks and contexts; the exceptions are listed above.
3. **Persistence:** Components interact with hooks and contexts, never with repositories or `@/utils/data` directly. Storage keys for UI preferences come from `@/utils`.
4. **UI support:** UI components use `@/utils` for tokens and toasts. Special cases (e.g. `responsiveViewBox`) live in `@/utils/ui` and are only imported when they are not already available via the index.
5. **No component imports in utils:** Anything that renders components belongs in `@/services`.
6. **Tests:** May import namespace internals to set up fixtures; otherwise the same structure applies.
