# AGENTS.md

Guidance for coding agents working in this repository. This is the only copy:
`CLAUDE.md` imports it (`@AGENTS.md`) and `.agents/rules/agents.md` references
it for Antigravity — edit this file, never those two.

## Code Style & Formatting

- Use TypeScript and React with ES Modules
- Leverage npm 10.9+ and Node 24+ features
- Follow light and dark mode design patterns - maintain existing design language unless explicitly requested otherwise
- Format code with Prettier (2 spaces, single quotes, semicolons)
- Write all code comments in English
- Use `camelCase` for variables, `PascalCase` for React components
- Run `npm run format` for files under `src/`; format other files manually with `npx prettier <file>` if needed
- Tailwind: prefer canonical utility classes over arbitrary values (`max-h-96` instead of `max-h-[24rem]`, never `min-w-[200px]`-style values when a scale step exists); important modifier is postfix in Tailwind 4 (`p-0!`, not `!p-0`)

## Tests & Quality Checks

- Run unit tests with `npm test -- --run` (or `npx vitest run`)
- Coverage report: `npm run test:coverage` (v8 provider, HTML report in `coverage/`)
- Check modified files with `npx eslint <files>`
- TypeScript compilation check: `npm run typecheck` (app) and `npm run typecheck:test` (tests); both via `npm run typecheck:all`
- Check for unused exports: `npm run check:unused` — a ratchet against the baseline in `scripts/check-unused-exports.mjs`; the count may fall, never rise. For the full list run `npx ts-unused-exports tsconfig.ts-unused.json --allowUnusedTypes --ignoreFiles='vite-env.d.ts|index.tsx|App.tsx'`
- E2E: Playwright specs live in `e2e/` — smoke, the core flow and the first-visit onboarding (sample class and tours) (`npm run test:e2e`; needs `npx playwright install chromium`)
- i18n consistency: `npm run check:i18n` (DE/EN key parity + every `t(key, 'default')` resolves to a real key)
- Bundle budgets: `npm run check:bundle` (after a build; part of `npm run build:static`)
- Docs consistency: `npm run check:docs` (relative links, heading anchors and `src/…`-style paths in Markdown resolve; `docs/CHANGELOG.md` is skipped)
- Algorithm runtime: `npm run bench` (by hand, not in CI; figures in `docs/PERFORMANCE.md`)

**Current Code Quality Status (2026-09-22):**

- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: 0 compilation errors (strict mode)
- ✅ Tests: 2393 unit tests (242 test files) + 9 Playwright tests (3 smoke + 2 core flow + 4 onboarding), 100% passing
- 📊 Coverage: 72.5 % lines / 71.8 % statements / 61.9 % branches (`npm run test:coverage`, v8 provider, no thresholds enforced)
- ⚠️ Unused Exports: 52 modules ignoring type-only exports, held by a ratchet (`npm run check:unused`); the remainder are re-export barrels, `lazyWithRetry` default exports and shared test helpers
- ✅ Test Infrastructure: Centralized accessibility helpers and toast matchers for robust testing
- ✅ Architecture: Repository Pattern implemented, UI components reorganized into logical subdirectories
- ✅ i18n: Bilingual support (German/English) fully implemented, DE/EN key parity 1:1 (2159 keys per language)
- 📦 Bundle: initial payload 208 KB brotli / 768 KB raw over 41 preloaded files, largest chunk 63 KB brotli, CSS 14 KB brotli

## Logging

- Project uses centralized logging system (`src/utils/logger.ts`), backed by two modules: `utils/logging/loggerCore.ts` (levels, formatting, sink) and `utils/logging/logger.client.ts` (console sink + helpers). There is no buffering/sampling/remote layer — add a sink to `LoggerCore` if that ever becomes a requirement.
- All `console.*` statements replaced with structured logging (except in logger implementations)
- Development: INFO level and higher, Production: WARN level and higher
- Debug mode (dev builds only): `window.logger.enableDebug()` in browser; production toggles via `logger.enableDebug()` (`@/utils/logger`)
- **IMPORTANT**: Never use `console.log/warn/error` directly - always use `logInfo/logWarn/logError/logDebug` from `@/utils`
- Exception: `console.*` is allowed ONLY in logger implementation files and test files
- See `docs/LOGGING.md` for details

## Git Workflow

- Do not create new branches
- Follow existing commit message patterns
- Work happens on `update`; `main` only ever receives it as a fast-forward (`git merge --ff-only update`), never a merge commit

### Release workflow

A release is not finished when `main` is pushed — nothing is published until
the tag is. `.github/workflows/docker.yml` runs on `push: tags: ['v*']`, builds
the image for both architectures, pushes the multi-arch manifest to GHCR as
`X.Y.Z`, `X.Y` and `latest`, and only then creates the GitHub release. A push to
`main` alone triggers `ci.yml` and nothing else.

1. Run the gates on `update`: `npm test -- --run`, `npm run lint`,
   `npm run typecheck:all`, `npm run check:i18n`, `npm run check:unused`,
   `npm run check:docs`, `npm run build` followed by `npm run check:bundle`.
   Bring the docs up to date for what the release changed — the affected
   `docs/` pages with their **Last reviewed** date, and a decision record in
   `docs/decisions/` where one is needed (see its README)
2. Commit the bump as `update: vX.Y.Z changelog and version bump`, touching all
   eight files: `package.json` and `package-lock.json` (the two project entries
   at the top only — dependencies share the version string), `README.md` (image
   tag + `KLASSENPLAN_VERSION` example), `docker-compose.yml` (the example in
   the comment), `docs/CHANGELOG.md`, `src/data/changelogEntries.ts` and
   `src/i18n/locales/{de,en}/changelog.json`
3. `git checkout main && git merge --ff-only update`
4. `git push origin main` and `git push origin update`
5. `git tag -a vX.Y.Z -m vX.Y.Z <bump-commit>` — annotated, on the bump commit,
   matching the existing tags
6. `git push origin vX.Y.Z`

The release notes are cut out of `docs/CHANGELOG.md` by `awk`, from the
`## [X.Y.Z]` heading to the next one, so that section has to exist before the
tag is pushed — the `release` job fails outright when it finds nothing. A
hyphen in the tag (`v2.1.0-rc.1`) marks a pre-release and keeps it off
`latest`.

Build artefacts are not part of a release commit: `npm run build` rewrites the
`lastmod` stamps in `public/sitemap.xml` from the last commit touching each
route — discard that unless the sitemap itself is the change.

## Special Instructions

- Respond in chat in German, but code comments in English
- Maintain existing project structure (`src/components`, `src/hooks`, `src/utils`, etc.)
- Always use the `@/` import alias for `src/` directory

## Internationalization (i18n)

- The application is fully bilingual (German is the primary language; English must stay complete and consistent)
- Translation files are located in `src/i18n/locales/{de,en}/`
- Namespaces: `common`, `toast`, `pages`, `generator`, `students`, `changelog`
- **IMPORTANT**: When adding or modifying UI texts, BOTH language versions MUST be updated (key parity is checked in reviews)
- Use the `t()` function from `react-i18next` for all user-facing texts; keep plural keys (`key_one`/`key_other`) in sync across both languages
- **No user-facing strings in `src/utils`**: utils return i18n keys (e.g. `'toast:backupValidation.invalidData'`) or call `i18n.t(...)` directly. `showToast()` resolves any message containing a `:` namespace separator as an i18n key.

### Workflow for new texts

1. Check if a suitable i18n key already exists
2. If not: Add key to the German file (`de/*.json`)
3. Add corresponding key to the English file (`en/*.json`)
4. Use `t('namespace:key')` or `t('key')` in the component
5. Run `npm run check:i18n` — it fails on key drift between DE and EN

### Onboarding tour texts

The coach-mark texts under `generator:tour.*` are looked up with computed keys
(`src/components/onboarding/tours.ts`), which `npm run check:i18n` cannot see;
`src/components/onboarding/__tests__/tours.test.ts` checks instead that every
mark has a title and a body in both languages.

`e2e/onboarding.spec.ts` asserts the German tour titles word for word and in
tour order. When you rename a title in `de/generator.json`, add, remove or
reorder a mark in `tours.ts`, or change a view so that a mark's element is no
longer on screen, update the title lists in that spec as well.

### Inline defaults

`t('some.key', 'Deutscher Text')` is widespread in this codebase (~735 call
sites). The second argument is a _fallback_, not a translation: when the key is
missing from the JSON, i18next renders that German string — on `/en` too. Do not
add new inline defaults; `npm run check:i18n` fails as soon as one becomes the
actual source of a string. Existing ones are verified unreachable and are left
alone deliberately (removing 735 of them would be pure churn).

### Dates and times

Never format a date with a hardcoded locale (`toLocaleDateString('de-DE')`).
Use the helpers from `@/utils` (`formatDate`, `formatLongDate`, `formatTime`,
`formatTimeWithSeconds`, `formatDayMonth`, `formatDateAndTime`), which resolve
the locale from the active i18n language via `Intl.DateTimeFormat`.
`formatLongDate` spells the month out (`3. September 2026` / `September 3,
2026`) and is what release dates render with.

Dates that get **stored** are ISO 8601 (`toIsoDate`) and formatted on render
with `formatStoredDate`, which passes pre-ISO legacy strings through untouched.
Date-only strings (`YYYY-MM-DD`) are parsed as **local** midnight, not UTC —
`new Date('2026-09-03')` would otherwise render as 2 September west of UTC and
break the `toIsoDate` round-trip.

## Modern Import Patterns

### Module Boundaries

**Status:** Migration complete – import central utils exclusively via `@/utils`.

**When editing files that import from utils submodules:**

```typescript
// ✅ Preferred pattern (central utils API)
import { generateId, logError, errorHandlers } from '@/utils';
```

**Migration guide:** See `docs/MODULE_BOUNDARIES.md` for complete API

**Note:** Keep specialized namespaces separate:

- `@/utils/algorithm` - Algorithm functions
- `@/utils/data` - Data persistence
- `@/utils/ui` - UI utilities

**UI boundary (enforced by ESLint):** `src/components` and `src/pages` do not import `@/utils/algorithm` or `@/utils/data`. Allowed are type imports and the display derivations `seatingStatistics`, `criterionHighlights`, `planReasons` and `planUsage`; `LOCAL_STORAGE_KEYS` and `shuffleArray` come from `@/utils`. `src/utils` does not import `@/components`. Details and the reasons in `docs/MODULE_BOUNDARIES.md`.

**When to migrate:**

- ✅ When making other changes to a file
- ✅ When file imports ≥3 utils from different submodules
- ❌ Don't create separate PRs just for migration
- ❌ Don't migrate if only touching tests

## Development Commands

- `npm run dev` - Start Vite dev server (port 3000, set in `vite.config.ts`; Playwright starts its own on 5173)
- `npm run preview` - Serve the production bundle locally
- `npm run build` - Build production bundle (runs `generate:sitemap` first)
- `npm run build:static` - Build, prerender every route, verify the output (Docker/CI path; needs `npx playwright install chromium`)
- `npm test` - Run Vitest in watch mode (append `-- --run` for single run)
- `npm run test:coverage` - Single run with a v8 coverage report (`coverage/index.html`)
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run lint` - Check code with ESLint
- `npm run typecheck` / `npm run typecheck:all` - TypeScript strict checks
- `npm run format` - Format code with Prettier
- `npm run generate:sitemap` - Generate sitemap (auto-run before builds)
- `npm run capture:preview-screenshots` - Re-shoots all start page screenshots (6 slides × DE/EN × light/dark) as PNG masters in `public/preview/` from the sample class in a varied room, then runs `generate:preview-images`; starts its own dev server (needs `npx playwright install chromium`, libwebp and libavif). Run after UI changes that show on the slides
- `npm run generate:preview-images` - Full-size and downscaled (`-480/-960/-1440`) AVIF/WebP start page screenshots from the PNG masters in `public/preview/`; run after replacing a screenshot (needs libwebp and libavif)
- `npm run check:i18n` - DE/EN key parity + orphaned inline defaults
- `npm run check:bundle` - Enforce bundle size budgets against `dist/` (run after a build)
- `npm run check:unused` - Unused-export ratchet (baseline in `scripts/check-unused-exports.mjs`)
- `npm run check:docs` - Links, heading anchors and repository paths in the Markdown docs resolve
- `npm run bench` - Seating algorithm runtime benchmark (by hand)
- `vitest run --reporter=verbose` - Run tests with detailed output
- `vitest run src/path/to/test.test.ts` - Run single test file

## Core Architecture

This is a React-based classroom seating plan generator. Its workspace is one shell — header, layer switcher, stage, status bar (`src/components/shell/`) — around three layers of the same classroom: Klasse, Raum, Plan. Internally the layer is still the numeric `step`; the switcher only stopped presenting it as a one-way road. The application combines layered contexts, Zustand stores, XState machines for canvas interaction, repository-backed persistence and a constraint-driven algorithm pipeline running in a web worker. Goals, non-goals, scenarios and data-flow diagrams: `docs/ARCHITECTURE.md`.

### State Management Architecture

1. **SeatingPlanGeneratorProvider** (`src/contexts/seatingPlan/SeatingPlanProviders.tsx`) wraps the app and layers the providers:
   - `SeatingPlanStoreProvider` bridges `useSeatingGenerator` into `useSyncExternalStore` snapshots.
   - Domain providers (`StudentManagement`, `ClassroomLayout`, `SeatingAlgorithm`) expose trimmed state/actions.
2. **Domain contexts** split responsibilities:
   - `StudentManagementContext` – student CRUD, CSV import/export, placeholder generation
   - `ClassroomLayoutContext` – scene editing, feature palette (windows/doors/podium/board), template CRUD, circle sync & seating mode switching
   - `SeatingAlgorithmContext` – mix settings, refinement, locking, statistics badges, history actions
3. **Zustand vanilla stores** (`src/stores/`): `studentsStore`, `algorithmStore`, `layoutStore` (factories in `featureStores.ts`); persistence runs externally via `hooks/persistence/usePersistQueue.ts` and the repositories.
4. **XState 5 machines** (`src/stateMachines/canvas/`): `canvasPointerMachine` and `keyboardInteractionMachine` own pointer/keyboard interaction on the canvas; stores own domain data. Template drag from the toolbar runs in `useTemplateDrag` without a machine.
5. **useSeatingGenerator** orchestrates repositories, undo/redo stacks, worker-based algorithm calls and UI signals (post-update notice, changelog badge).

Consumers import dedicated hooks (e.g. `useClassroomLayoutContext`) to minimize re-renders and keep side effects localized.

### Data Persistence

- **localStorage** – UI preferences only (theme, grid visibility, layout options, consent, presentation toggles); no personal data
- **IndexedDB repositories** (`src/repositories/`) – students, seating plans, templates, mix history, circle layouts and `ClassroomFeature` data (windows, doors, podium, board)
- **`src/repositories/idbClient.ts` is the only module that imports `idb-keyval`.** Never reach past it — it offers rejecting primitives (`readValue`, `writeValue`, …) for callers with their own error handling and `try…` variants that return a `Result`.
- **Student photos** – separate IndexedDB store (`src/repositories/studentPhotoStore.ts`, blobs keyed by student id, schema-versioned) with an in-memory cache (`src/hooks/student/studentPhotoCache.ts`). Every photo-store call returns a `Result`; the cache turns write failures into `StudentPhotoStorageError` so a UI handler can toast them.
- **Plan usage record** – standalone store (`src/repositories/planUsageStore.ts`, one bucket per class under `DB_KEYS.planUsage`) noting which seating plans were really in use. Signals are raised where the action happens (present, export, save, hand-edit); merge rules are pure in `src/utils/data/planUsage.ts`; `subscribeToPlanUsage` pushes changes to `usePlanUsageRecords` so every consumer reads the same set. Feeds `buildPreviousPairs` and the neighbourhood view. Failures are logged and swallowed — a lost signal is nothing the teacher can act on. See `docs/ALGORITHM.md`.
- Result-pattern (`Success`/`Failure`) provides typed error handling and enables repository swapping.
- Live data is stored unencrypted (offline-first, documented in `docs/SECURITY.md`); only exported backups are encrypted.
- Keys, record shapes, versions, retention and the wipe path: `docs/data-model.md`. CSV import format: `docs/csv-import.md`. Worker messages: `docs/worker-protocol.md`. Personal data inventory and self-hosting obligations: `docs/PRIVACY.md`. Recorded design decisions: `docs/decisions/` — a change that alters stored formats, student data, algorithm results or URLs should check the matching record first.

### Algorithm & Layout Engine

- Constraint engine weights criteria for restlessness, shyness, distraction, partners, distance wishes, height categories, language levels, social roles, door/window preferences and locked seats.
- Scoring exists in two shapes on purpose: `scoring/*` rates a _candidate placement_ while a plan is built, `scoring/arrangementScoring.ts` rates _finished tables_ during refinement. Their multipliers live side by side in `constants.ts` (`PLACEMENT_SCORE_WEIGHTS` / `TABLE_SCORE_WEIGHTS`) so neither can drift unnoticed.
- Window/door distances come from `algorithm/featureDistances.ts` (memoized per scene geometry) — the algorithm, the statistics and the criterion highlights share that one implementation.
- Randomness is injectable: every entry point accepts an `rng` (`algorithm/rng.ts`), defaulting to `Math.random`. Production behaviour is unchanged; tests pass `createRng(seed)` for exact assertions.
- Runs in a web worker; `src/workers/algorithmOperations.ts` holds the single implementation that both the worker and the main-thread fallback call, so defaults (e.g. simulated annealing) cannot diverge. `algorithmWorkerClient.ts` owns transport: aborted and timed-out requests reject instead of silently re-running inline. The worker reports progress **stages**, never text — it cannot know the UI language.
- CSV parsing has its own worker (one dedicated instance per parse, cancelled by terminating it).
- Multi-pass refinement via `refineSeatingLocal` supports configurable tries/passes and reuses immutable scene snapshots.
- Circle mode stays in sync through `generateCircleSeating`, `regenerateCircle`, and `syncCircleFromTable` actions.
- Template system (`single`, `double`, `group4`, `group6`) defaults to 0° rotation and feeds drag-and-drop operations.

### Hook & Component Landscape

- Hooks are grouped by domain (`hooks/wizard`, `hooks/scene`, `hooks/canvas`, `hooks/circle`, `hooks/ui`, `hooks/student`) and favour focused responsibilities (scene history, canvas interactions, shortcut handling, drag/drop state, pan/zoom, photo cache, etc.).
- The workspace shell lives in `src/components/shell/`: `AppShell` frames every layer, `SeatingPlanHeader` carries the class (`HeaderClassMenu`), the plan's name (`HeaderPlanName` — a pencil at rest, a save button while it is edited or unsaved), `LayerSwitcher`, Help and the settings menu (`AppSettingsMenu`), `AppStatusBar` holds the toolbar's switch at its left end, then undo/redo and the live status line, the two exits in the middle (`PlanExits`) and the layer's one primary action on the right, and `Inspector` is the right-hand panel. A view never draws its own "carry on" or "go back" button, and nothing floats over the stage — corner controls belong to the status bar, the toolbar or the inspector. The status line states numbers; a verdict anyone reads off them ("passt genau") is an icon with its words for the tooltip and the screen reader, not another segment.
- **From `lg` up the shell is the window, not a document.** `AppShell` takes `h-dvh`, the two bars stand still and the three columns between them — toolbar, stage, inspector — scroll on their own, edge to edge with no centred column: the toolbar and the inspector _are_ the margins. A layer takes its geometry from `workspaceLayerClass` and `workspaceStageClass` (`shell/shellTokens.ts`) rather than spelling it out, so the four views (class, room, plan, circle) cannot disagree about it. Below `lg` the layer stays a stacked, scrolling page.
- **The workspace has no page footer.** `App.tsx` leaves it off `/generator` for the same reason as the fullscreen routes, and `AppSettingsMenu` — the gear beside Help at the right of the header, the same place on every layer, on the export page and on the first screen, which has no toolbar — carries what a teacher reaches for from inside a plan and no layer owns: theme and language, the update check, wiping all data (`AppSettingsItems` with `storage={false}`, shared with the footer's own gear) and the two legal pages. The backup and the saved plans are not repeated there — the class layer's toolbar carries the backup ("Backup" → export/import), the plan layer's the saved plans. The FAQ is reached from Help: every help dialog (`HelpButton`) ends with a link to it, opened at the section that answers the screen it was asked on (`faqSection`). The support page closes every toolbar (below). Both pages show "Zurück" when the app opened them, and so do the two legal pages opened from the gear and the changelog opened from the update notice (`APP_RETURN_STATE`, `useReturnToApp`); a visitor from a search engine sees no such link. Feedback and the changelog stay on the pages they belong to.
- **The class is the document.** Which class is open is stated in the header on every layer, and everything a class itself can undergo — create, rename, delete — lives in that menu's dropdown. `ClassDialogsProvider` owns those dialogs, so the header and the class layer's empty state open the same ones.
- **One toolbar shape for every layer** (`ToolRail`): insert on top, look at in the middle, manage at the bottom, in both densities of `SmartSidebar` — 208px with labels, 60px as icons, the groups told apart by a hairline rather than a gap. `ClassToolPanel`, `RoomToolPanel` and `PlanToolPanel` fill it; an entry that needs a value (a name, a number of placeholders, a set of switches) opens a panel instead of taking a permanent place. A new tool joins one of the three groups — never a new floating button. Below the groups every rail ends with "Unterstützen" (`ToolRailSupport` inside `ToolRail`), so no layer's panel lists it and none can forget it.
- **The toolbar has no header of its own.** Which density it shows is a property of the workspace, so the switch sits in the status bar and the state lives in `ToolRailContext` (⌘/Strg+B still works). A sidebar outside the shell finds no provider, keeps its own state and its own switch, and names its column widths through `widths`.
- **The export page wears the shell too.** `/export` renders `AppShell` with the header's export variant (`SeatingPlanHeader view="export"`: no layer is current, each one leads back into the workspace, no plan name and no tour) and its own status bar (`ExportStatusBar` on `StatusBarFrame`, the frame every status bar shares). The toolbar (`ExportToolPanel`) switches the arrangement and saves the files — one PDF entry for whichever arrangement is on the sheet, PNG and SVG; the sheet is paper on the stage with nothing on top of it; what it carries is set in `ExportSheetInspector`, through `InspectorPortal` from `lg` up and under the sheet below it; printing is the one blue button. It has no page footer either.
- **The two exits, once.** Exporting and presenting save the plan first when it differs from the saved one; `usePlanExits` is the single implementation, used by the status bar's `PlanExits` and by Ctrl/Cmd+E. Both are the same quiet button: blue is the layer's own action at the end of that bar, and a screen has one blue button.
- **Editing a thing happens in the inspector, not in the list.** `InspectorContext` holds what is selected (students so far; tables and features follow), and `StudentInspector` groups the controls under the pedagogical family they belong to. Adding an attribute means adding it to one group there — never a new column. Several ticked students are edited there too: from `lg` up `StudentBulkInspector` takes the panel with the same controls, fed the selection read as one student (a value all share, a flag all carry, the rest `mixed`), so an attribute added to `StudentInspector` belongs in it as well unless it is per person (name, photo, partners). Below `lg` the bulk bar (`StudentBulkEditBar`) stays above the list.
- **A list row is one button.** The class list is a single card of 60px rows divided by a hairline: number, avatar (`StudentAvatar`, to look at, not to press), name and the chips for what is set. Pressing the row opens it in the inspector — which is also where the name, the photo and the one destructive action live. The checkbox for bulk edits stays outside that button, because a checkbox inside a button is not a checkbox. While students are ticked the row ticks instead of opening (`selectionActive`), since the inspector then shows the selection.
- **Naming a class is typing and Enter.** A student without a name opens with the name field already active, and Enter saves and steps to the next one (`StudentNameEditor`'s `onSubmit`). That replaced the quick-name dialog and its banner; what is still unnamed is stated in the status bar, not per row.
- **Three ways into the same student data.** The roster answers "who is in this class"; `AttributeFocusMode` asks one question of everybody at once ("Wer zeigt Unruhe?") and is how the eight yes/no flags get filled in; `RelationsView` answers who wants to sit next to whom across the class and marks the pairs both sides named. A new yes/no flag belongs in the focus mode's `PASSES` list as well as in the inspector; attributes with more than two values stay inspector-only. A view that wants the full width sets `suspended` on `InspectorContext`.
- **The plan fits the stage.** The classroom is a fixed 900×600 shape, so from `lg` up the stage is a size container (`canvas-stage`) and the frame inside it takes `min(100%, 100cqh × 3/2)` (`canvas-fit`): capped by whichever dimension binds, centred in what is left, never scrolling and never leaving a void. Only the frame's width changes, which is what a window resize does anyway — every pointer coordinate is derived from its measured box.
- **The room inspector acts, it does not measure.** A drag places and sizes a table, so `SceneInspector` asks for no coordinates: it offers what a drag cannot do in one gesture — rotating in 15° steps, duplicating, copying, cutting, pasting, removing — each with the canvas's own shortcut in its tooltip. Seat count and table type stay read-only.
- **What opens from a toolbar entry is a dropdown menu**: rows of icon and word on `menuSurfaceClass`, a check at the end of a row that is on (`CanvasSettingsGroups` for the view settings). No cards inside a popover, no icon-only chips; only a panel that asks for a value (a name, a number) is a small form on the same surface.
- **One shape for every inspector** (`shell/InspectorPanel.tsx`): a header strip naming what is selected, a scrolling body of sections divided by hairlines, and — where there is one — the destructive action pinned to the bottom. Inside a section every setting is an `InspectorRow` — its name on the left, its value on the right as a switch or as `InspectorChoice` chips. A student's controls carry `variant="row"` for that; their `compact`, `hybrid` and `detailed` variants still serve the phone and the older views. A student, a table and a window are read the same way; none of the three brings a frame of its own.
- **A criterion is set in words, and the plan says what it came to.** Four named levels — Aus, Beachten, Wichtig, Sehr wichtig — stand for the weights 0–10 (`utils/mixImportance.ts`); there is no slider and no fine tuning, the four words are the whole scale. The switch for all criteria sits beside the inspector's heading (`MixCriteriaSwitch` in its `actions`), the panel below repeats neither heading nor total, and the fulfilment beside each criterion is a bar and a percentage. Above the criteria a recipe (`utils/mixRecipes.ts`) sets all sixteen at once — "Empfohlene Mischung" is the way back to the defaults — and which one is active is derived from the weights, never stored. Under them, "Warum dieser Plan" (`utils/algorithm/planReasons.ts`) builds up to three sentences from the seats themselves. A new criterion therefore needs a `met` and an `open` sentence in both languages and a decision whether names say anything about it (`NAMED_CRITERIA`); decision 0018 holds the reasons.
- **Three ways to fill the inspector.** The class layer's selection is a student id, so `Inspector` resolves it from the seating-plan context itself. The room layer's selection is table indices and feature ids buried in the canvas state, and the plan layer's criteria need the view's mix handlers, so both render through `InspectorPortal` into the shell's slot — markup travels down instead of a dozen mutators travelling up. The class layer's multi-selection does the same; a mounted portal (`portalMounted`) is how the class layer's inspector knows to hand its slot over. `StatusBarPortal` does the same for the status bar (`start` for a layer's own history, `end` for its primary action).
- Layer UI resides in `src/components/SeatingPlanGenerator/` with shared UI primitives in `src/components/ui/` and student tools in `src/components/students/`.
- **The projection carries one bar, and it is ink in both themes.** `/present` puts every control into `PresentationToolbar` under the plan — the two views, the two shapes, the draw, what to show, the size, the way out — while the strip on top only says what is on the wall. In fullscreen the strip is not drawn and the bar lies over the plan, out of sight until the pointer nears the bottom edge, a tap lands there or the keyboard moves into it (`useEdgeReveal`). The plan is framed on the furniture, not on the empty 900×600 room; the contrast mode draws it black on white for a bright room, and the beamer keeps its own name rule (`spg.present.nameDisplay`, first names) apart from the editor's.
- **A tool used standing up is a route, not a panel.** "Wer kommt dran?" (`/wer-kommt-dran`), "Wo sitzt wer?" (`/wo-sitzt-wer`) and "Gruppen bilden" (`/gruppen`) share `components/tools/ToolPage.tsx`: the way back on top, the answer in the middle, one action pinned to the bottom edge. They are `noindex`, store nothing, and are reachable from the plan layer's toolbar ("Gruppen bilden" also from the projection's bar); their way back goes through the history, so it returns to where they were opened from — the projection in the view it was left in. A new one of them needs a route, a `seoRoutes.json` entry, a `hidesFooter` entry and a `routeComponents` key — decision 0019 holds the reasons.
- **The pages beside the app share one frame** (`components/publicPage/`): `PublicPageHeader` (the lockup, and "Zurück" when the app opened the page), the type in `pageTokens.ts`, and `LegalPage`/`LegalSection` for the Impressum, the Datenschutzerklärung and the stand-in that forwards to an operator's own. None of them sets a minimum height: `App.tsx` makes the page a column at least as tall as the window, so the footer sits on its bottom edge however short the page is. The rules are in `docs/DESIGNSYSTEM.md` § 6d.
- Circle-specific components live under `src/components/circle/`; presentation mode lives in `src/pages/Present.tsx` + `src/components/scene/PresentationScene.tsx`.

### Styling & Design Tokens

- Tailwind CSS 4 via `@tailwindcss/vite` with semantic utilities defined in `src/index.css` (`@theme` + `@utility`).
- `@/utils/ui/designTokens` exports surface/button bundles (`primaryButtonClass`, `inputFieldClass`, …); student toggles rely on `@/components/students/studentStyleTokens` for consistent sizing and coloring.
- Components should only add layout classes on top of tokens — no ad-hoc color utilities.
- Immutable styling patterns ensure Dark/Light parity via CSS variables and prevent component-level drift.

## SEO & Prerendering

- The app is a CSR SPA; `npm run build:static` prerenders all routes × languages into `dist/<path>/index.html` so crawlers see real content and per-route canonical/hreflang/JSON-LD. See `docs/SEO.md`.
- `src/data/seoRoutes.json` is the single source of truth for route metadata (titles, descriptions, `noindex`). Shared script helpers live in `scripts/utils/seoRoutes.mjs`.
- Canonical URLs come from the build-time `SITE_URL` (`define` in `vite.config.ts`), **never** from `window.location.origin`.
- **Never let `vite-plugin-compression` precompress HTML** — nginx's `brotli_static on` would serve the stale pre-prerender shell.
- Route components live in `src/pages/lazyPages.ts` and are shared by the router and `routePreloader`, so `preload()` warms the instance the router renders. Do not re-declare them with `lazyWithRetry` in `App.tsx`.
- Legal pages: `IMPRINT_URL` / `PRIVACY_URL` at build time replace `/impressum` and `/datenschutz` with forwarding pages (alias in `vite.config.ts`, validation in `src/config/legalPageUrls.ts`). Link to the legal pages only through `LegalPageLink`, never a plain `LocalizedLink`.
- Contact address: `CONTACT_EMAIL` at build time (validation in `src/config/contactEmail.ts`, `define` in `vite.config.ts`, read via `CONTACT_EMAIL` from `src/config/links.ts`); unset keeps the maintainer's address.
- `build:static` regenerates `sitemap.xml` and `robots.txt` only for a build that serves another site (`SITE_URL`, `IMPRINT_URL`, `PRIVACY_URL`); klassenplan.de's own image ships the committed files.

## Security & Deployment

- **No inline scripts in `index.html`** — the production CSP is `script-src 'self'` (no nonce/hash). The PWA install-prompt capture lives in the entry module; speculation rules are delivered via the `Speculation-Rules` HTTP header (`public/speculationrules.json`).
- Security headers live in `nginx-security-headers.conf` and must be re-`include`d in every nginx `location` that sets its own `add_header` (nginx does not inherit them otherwise). See `docs/SECURITY.md`.
- Service worker uses the **prompt update model** (`registerType: 'prompt'`, `skipWaiting`/`clientsClaim` disabled) — a new SW activates only after the user confirms via `ReloadPrompt`. Only `ReloadPrompt` may call `useRegisterSW`; everyone else reads the registration from the `swUpdateController` singleton (`src/hooks/pwa/`), which the footer's `UpdateCheckButton` uses for an on-demand check. `ReloadPrompt` additionally re-checks hourly, on `visibilitychange` and on `online`. A toast that must stay open takes `duration: 0` — `Infinity` is clamped to a 32-bit int by `setTimeout` and fires after ~1 ms.
- Backups are encrypted with AES-GCM 256; PBKDF2-SHA256 with 600,000 iterations, KDF parameters stored in the envelope (legacy files without them decrypt with 250,000). Export enforces a min-8-char password with confirmation. See `docs/backup-format.md`.

## Testing Strategy

- **Vitest** with jsdom environment for React component testing
- **@testing-library/react** for component interaction testing
- Test files follow `*.test.ts` or `*.test.tsx` pattern in `__tests__` directories
- Shared test utilities in `src/__tests__/utils/` provide mock data factories
- Coverage via the v8 provider (`npm run test:coverage`); no thresholds are enforced, the report exists to make gaps visible

Key testing utilities:

- `createMockStudent()` - Generate test student data
- `createMockClassroomScene()` - Generate test classroom layouts
- `setupCleanStorage()` - Reset storage between tests

**Algorithm tests: prefer a seed over statistics.** Every randomised step takes an
injectable `rng` (`createRng(seed)` from `@/utils/algorithm/rng`, default
`Math.random`). Pass a seeded source and assert the exact arrangement instead of
looping 20 times over a probabilistic expectation — see
`src/utils/algorithm/__tests__/seatingDeterminism.test.ts`.

### Modern Test Patterns (Preferred)

**When writing or modifying tests, use semantic accessibility-first queries:**

```typescript
// ❌ Fragile - breaks with UI text changes
screen.getByText('Erfolgreich gespeichert');
screen.getByText('Mischen ist komplett zufällig!');

// ✅ Robust - uses ARIA roles and helpers
import { getButton, getAlert, getField, getHeading } from '@/__tests__/utils';

getButton(/Speichern/i); // Find button by accessible name
getAlert(/Warnung/i); // Find alert by aria-label
getField(/Tafel anzeigen/i); // Find form field by label
getHeading(/Klassenliste/i, 2); // Find h2 by text
```

**Toast testing:**

```typescript
// ❌ Old pattern
expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();

// ✅ New pattern with toast matchers
import { expectSuccessToast, expectErrorToast } from '@/__tests__/utils';

expectSuccessToast('Erfolgreich gespeichert');
expectErrorToast(); // Just check toast exists
```

**Available test helpers:**

- `toastMatchers.ts` - `expectSuccessToast()`, `expectErrorToast()`, `waitForToast()`
- `accessibilityHelpers.ts` - `getButton()`, `getAlert()`, `getField()`, `getDialog()`, etc.

**When to use:**

- ✅ Always prefer semantic queries for new tests
- ✅ Migrate when fixing or modifying existing tests
- ✅ Use `getByRole()` over `getByText()` for interactive elements
- ✅ Match UI texts bilingually (`/Merkmale|Markers/i`) — tests render German because the language follows the URL and jsdom's has no `/en` prefix, but a spec should survive a switch; mind that `getByText` ignores `aria-hidden` and unanchored patterns also hit longer German sentences

## Performance Considerations

- The seating algorithm is computationally intensive - uses web workers for large classrooms
- State updates use `React.useCallback` and `React.useMemo` extensively to prevent unnecessary re-renders
- The classroom canvas uses SVG for crisp rendering at all zoom levels
- Large student lists (>36 students) are discouraged due to algorithm complexity
- **React.memo** used for expensive component re-renders
- **Lazy loading** implemented for large components; PDF vendor chunk loads on demand
- Native `wheel` listeners read live values through refs instead of re-subscribing per frame (see `usePanZoom`, `StudentPhotoCropModal`)

## Error Handling Patterns

- Toast notifications (custom toast system) for user feedback; default messages are i18n keys (`toast:errors.*`)
- Defensive programming with null checks throughout
- Graceful degradation when storage is unavailable
- Validation at data boundaries (imports, user input, backup files)
- Centralized error logging via logger utility
- Fire-and-forget promises must attach a `.catch` with logging (no bare `void somePromise()` for I/O)
- Every error boundary fallback renders `components/errors/ErrorReportLink`: a reference code (`utils/errorReport.ts`) plus a prepared mail to `CONTACT_EMAIL` (`src/config/links.ts`, build variable) and a clipboard copy of the same lines. Nothing is sent automatically — decision 0008 still holds

## Accessibility Features

- **Keyboard navigation** support throughout the application
- **aria-label** and **aria-pressed** attributes for screen readers
- **Focus management**: modals trap focus and restore it to the trigger element on close (`Modal.tsx`)
- **No global Enter-to-confirm** on destructive dialogs — the auto-focused confirm button handles Enter natively
- **Responsive design** that works at 200% zoom
- **Touch-optimized** interactions for mobile devices

## Important Constraints

- Maximum 36 students per classroom (defined in `src/utils/constants.ts`)
- Classroom dimensions are fixed at 900x600 pixels
- Mix history is limited to 20 entries to prevent memory bloat
- Backup files have strict size limits (16 MB encrypted file, 12 MB decrypted content; see `BACKUP_LIMITS`)
- Student photos: 20 MB max input, stored as ~160px JPEG blobs (EXIF stripped via canvas re-encode)

## Color Palette Standards

Colour is split in two, and the split is the rule that matters (see
`docs/DESIGNSYSTEM.md` § 4):

**The interface is paper and ink.** A warm neutral ramp (`--surface-page`,
`--surface-card`, `--border-card`, `--text-page`, `--text-muted`) plus exactly
one accent:

- **Blue (`#2563eb`, `--button-primary-bg`)** - the only colour that means "you
  can act here": the one primary button per screen, selection, focus ring.
- **Rose (`#be123c`, `--button-danger-bg`)** - destructive actions only, never
  next to the primary button.
- **Green (`#15803d`, `--button-success-bg`)** - confirmation of a completed
  action, not a decoration.

**Everything else that is coloured describes pedagogy**, through the `--data-*`
families, and never appears in chrome. Each family always ships with an icon and
a spelled-out word, so colour is never the only channel:

| Family           | Token prefix      | Covers                                               |
| ---------------- | ----------------- | ---------------------------------------------------- |
| Verhalten        | `--data-behavior` | Unruhe, Ablenkbarkeit, Ablenkung durch Unruhe        |
| Soziales         | `--data-social`   | Schüchternheit, Wunsch-/Distanzpartner, Rollen       |
| Lernen           | `--data-learning` | Fördern heterogen, Fördern homogen                   |
| Sprache          | `--data-language` | Sprachförderung, Sprachstand                         |
| Platz &amp; Raum | `--data-space`    | Vordere Plätze, Körpergröße, Fensterplätze, Türnähe  |
| Person           | `--data-person`   | Geschlechtermischung, Foto, Name                     |
| Verlauf          | `--data-history`  | Wiederholung (the plans already used, not a student) |

A seat is not one of those families. An occupied seat carries the student's
gender as a quiet tint — green for a boy, lilac for a girl, blue for a
non-binary student, paper when nobody said — in `STUDENT_COLORS`
(`utils/ui/studentAppearance.ts`), and only seat renderers ask for it
(`genderColors`); avatars, photo frames and cards stay paper. Exports explain
the tint in their legend, the projection's colour switch takes it off the wall,
and the contrast mode never shows it — decision 0020, which replaced 0017.

Each family exposes `--data-<name>` (the accent), `--data-<name>-text` (chip and
icon foreground, contrast-checked at 4.5:1) and `--data-<name>-surface` (chip
background).

Never reach for a raw Tailwind palette class (`bg-amber-500`, `text-green-600`)
in a component — take the token. `src/` is clean of them but for one
deliberate exception: the orange step counter in `OnboardingTour`, which the
design system reserves for step labels. Three
comments in `studentAppearance.ts` and `classWorkbenchTokens.ts` still _name_
old palette classes to say what a hex value came from; they set nothing. A `dark:`
variant is a sign the colour is not a token yet — there are no
palette-based ones left. Dark mode is handled inside the token, so no
`dark:` variant is needed when a token is used; hand-written colour utilities
still need one and should be replaced instead.
