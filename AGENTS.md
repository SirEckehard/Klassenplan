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
- E2E: Playwright specs live in `e2e/` — smoke, the core flow and the first-visit onboarding (sample class and tours) on a desktop, the tablet and phone layouts and the desktop layout worked by a finger on an interactive whiteboard (`touch-layouts.spec.ts`, projects `tablet`, `phone` and `whiteboard`, picked by the tags `@tablet` / `@phone` / `@whiteboard`) (`npm run test:e2e`; needs `npx playwright install chromium`)
- i18n consistency: `npm run check:i18n` (DE/EN key parity + every `t(key, 'default')` resolves to a real key + no key that no code refers to)
- Bundle budgets: `npm run check:bundle` (after a build; part of `npm run build:static`)
- Docs consistency: `npm run check:docs` (relative links, heading anchors and `src/…`-style paths in Markdown resolve; `docs/CHANGELOG.md` is skipped)
- Algorithm runtime: `npm run bench` (by hand, not in CI; figures in `docs/PERFORMANCE.md`)

**Current Code Quality Status (2026-10-03):**

- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: 0 compilation errors (strict mode)
- ✅ Tests: 2769 unit tests (281 test files) + 13 Playwright tests (3 smoke + 2 core flow + 4 onboarding + 2 tablet + 1 phone + 1 whiteboard), 100% passing
- 📊 Coverage: 76.0 % lines / 75.2 % statements / 66.3 % branches (`npm run test:coverage`, v8 provider, no thresholds enforced)
- ⚠️ Unused Exports: 51 modules ignoring type-only exports, held by a ratchet (`npm run check:unused`); the remainder are re-export barrels, `lazyWithRetry` default exports and shared test helpers
- ✅ Test Infrastructure: Centralized accessibility helpers and toast matchers for robust testing
- ✅ Architecture: Repository Pattern implemented, UI components reorganized into logical subdirectories
- ✅ i18n: Bilingual support (German/English) fully implemented, DE/EN key parity 1:1 (1949 keys per language, none unused)
- 📦 Bundle: initial payload 197 KB brotli / 742 KB raw over 28 files (the browser check included), largest chunk 60 KB brotli, CSS 14 KB brotli

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
6. When a text leaves the UI, remove its key from both languages:
   `check:i18n` also fails on a key no code refers to. A key built at runtime
   counts as long as the code writes out its start (`` `mix.criteria.${key}` ``)
   or a parent of two segments or more that a suffix is added to
   (`'tour.plan.canvas'` + `.title`)

The changelog namespace is not bundled: `/changelog` and the update notice
wait for it (`useChangelogReady`), everything else must not read it.

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

`t('some.key', 'Deutscher Text')` is widespread in this codebase (~356 call
sites). The second argument is a _fallback_, not a translation: when the key is
missing from the JSON, i18next renders that German string — on `/en` too. Do not
add new inline defaults; `npm run check:i18n` fails as soon as one becomes the
actual source of a string. Existing ones are verified unreachable and are left
alone deliberately (removing 356 of them would be pure churn).

### Keyboard shortcuts

A shortcut is written one way in every UI text: the Windows name first, the
Mac symbol second, no spaces around `+` — `Strg/⌘+S`, `Alt/⌥+←`,
`Strg/⌘+Umschalt+Z`, in English `Ctrl/⌘+S`, `Alt/⌥+←`, `Ctrl/⌘+Shift+Z`. Keys
carry the name of the text's language (Umschalt, Entf, Rücktaste,
Eingabetaste · Shift, Del, Backspace, Enter), arrow keys are `←` `→`, and two
alternatives are joined by a spaced slash (`Umschalt+Q / Umschalt+E`) or a word
("oder"). A tooltip names the shortcut in parentheses after the label. Most teachers use Windows, and `⌘` is
what the Mac key shows. `src/i18n/__tests__/shortcutNotation.test.ts` fails on
the old notations; the changelog is exempt, since it quotes earlier versions.

A shortcut never takes a key the browser or the system keeps for itself —
Ctrl/⌘+Shift+T reopens a tab, Ctrl/⌘+Shift+C and +I open the developer tools,
⌘+M minimises the window on a Mac. The plan layer's keys (save, export, mix
with Ctrl/⌘+Enter) live in `usePlanShortcuts`, which the table plan and the
circle share; every shortcut the help lists (`utils/shortcuts.ts`) must be
registered wherever the help lists it. `useKeyboardShortcuts` accepts `+` and
a bare space (`' '`, alias `space`) as keys.

A shortcut on a single character key — a letter, a digit, a symbol, without
Ctrl/⌘ or Alt — can be switched off in the settings menu ("Kürzel mit einer
Taste"), because speech input types words as keystrokes (WCAG 2.1.4).
`useKeyboardShortcuts` honours that on its own; a handler of its own asks
`isSilencedCharacterKey(event)` first (`PlanControls`, `useKeyboardInteraction`,
`SimpleCircleView`). Whatever such a key does must stay reachable another way.

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

**UI boundary (enforced by ESLint):** `src/components` and `src/pages` do not import `@/utils/algorithm` or `@/utils/data`. Allowed are type imports and the display derivations `seatingStatistics`, `criterionHighlights`, `circleSummary` and `planUsage`; `LOCAL_STORAGE_KEYS` and `shuffleArray` come from `@/utils`. `src/utils` does not import `@/components`. Details and the reasons in `docs/MODULE_BOUNDARIES.md`.

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
- `npm run generate:preview-images` - Full-size and downscaled (`-480/-960/-1440`) AVIF/WebP start page screenshots from the PNG masters in `public/preview/`, then stamps a hash of them into `src/data/previewImages.json` as `version`, which the carousel appends to every image URL (`?v=…`) — the file names never change, and nginx and the service worker cache them as immutable; run after replacing a screenshot and commit the JSON with the images (needs libwebp and libavif)
- `npm run generate:glyph-widths` - Measures the advance widths of Instrument Sans (weights 400 and 700) in Chromium and writes `src/data/nameGlyphWidths.json`, which lays out the names on the seats; run after updating `@fontsource-variable/instrument-sans` (needs `npx playwright install chromium`)
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
- **Plan usage record** – standalone store (`src/repositories/planUsageStore.ts`, one bucket per class under `DB_KEYS.planUsage`) noting which seating plans were really in use. Signals are raised where the action happens (present, export, save, hand-edit); merge rules are pure in `src/utils/data/planUsage.ts`; `subscribeToPlanUsage` pushes changes to `usePlanUsageRecords` so every consumer reads the same set. Feeds `buildPreviousPairs` and the neighbourhood view. "Zurücksetzen" in that view empties a class's bucket and notes when (`resetPlanUsage`, `resetAtByClass`); from then on saved plans dated up to that day and mixes before that moment no longer count either (`buildPreviousPairs`' `since`, carried as `planUsageSince` wherever `planUsage` goes, the worker included), and the toast after it takes it back (`undoPlanUsageReset`) — decision 0023. Failures are logged and swallowed — a lost signal is nothing the teacher can act on. See `docs/ALGORITHM.md`.
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
- The workspace shell lives in `src/components/shell/`: `AppShell` frames every layer, `SeatingPlanHeader` carries the class (`HeaderClassMenu`), `LayerSwitcher`, Help and the settings menu (`AppSettingsMenu`), `AppStatusBar` holds the toolbar's switch and the live status line at its left end, undo/redo in the middle — one bordered control under the stage, the same spot on every layer, with the plan layer's own action beside it ("Mischen", in the circle "An Sitzplan anpassen") — and on the right "Zurück" to the previous layer beside the way on: "Weiter" to the next layer, on the plan layer the two exits (`PlanExits`); the inspector's switch closes the bar, the mirror of the toolbar's (below); `Inspector` is the right-hand panel. The way on reads "Weiter" on every layer; its accessible name and tooltip say where it leads ("Weiter zum Sitzplan"). Zurück, Weiter, Exportieren, Präsentieren and the export page's Drucken show their word on a desktop and a whiteboard and their icon alone on a phone and a tablet (`statusBarWordClass`: a mouse from `lg`, any pointer from `xl`). A view never draws its own "carry on" or "go back" button, and nothing floats over the stage — corner controls belong to the status bar, the toolbar or the inspector; what must stand over the stage hangs from the bar (`StatusBarPortal` slot `float`, the class list's jump to its ends) and moves with it. Offline, a quiet cloud beside the toolbar's switch says so, in place of the floating badge the pages without a bar keep (`OfflineIndicator`, `hooks/ui/statusBarPresence`). The status line states numbers on the class and the room layer; the verdict on them is a green check or a red cross (`--status-ok`, `--status-alert`) with its words ("Alle Namen gesetzt", "Passt genau") for the tooltip and the screen reader, never a segment of its own; a layer with nothing on it yet shows no icon. The plan layer, table plan and circle alike, states nothing: the plan shows whether it is there, and its figures are in the inspector.
- **From `lg` up the shell is the window, not a document.** `AppShell` takes `h-dvh`, the two bars stand still and the three columns between them — toolbar, stage, inspector — scroll on their own, edge to edge with no centred column: the toolbar and the inspector _are_ the margins. A layer takes its geometry from `workspaceLayerClass` and `workspaceStageClass` (`shell/shellTokens.ts`) rather than spelling it out, so the four views (class, room, plan, circle) cannot disagree about it. Below `lg` the layer stays a scrolling page between the sticky header and status bar. A tablet keeps the toolbar beside the stage as a column that sticks under the header while the page scrolls and ends above the status bar (`SHELL_STATUS_BAR_HEIGHT`) — stacked above the stage, it pushed an iPad's room out of sight. From `lg` up the inspector's column folds away on every layer — the class, the room, the plan, the circle and the export sheet — from the switch at the right end of the status bar, a quiet arrow that mirrors the toolbar's at the left end, so the stage takes the width; the choice is remembered per device (`InspectorContext.folded`, `spg.inspectorFolded`), a touch screen narrower than `xl` (an iPad in landscape) starts folded, and an empty room, Ctrl/⌘+E, an opened student and the class layer's ticked students (`InspectorPortal reveal`) unfold it — the class layer's column is where a student is edited. Below `lg` the inspector has no column: a phone shows an opened student as a sheet from the bottom, a tablet as a drawer on the right, and what a layer portals in (the room's properties, the plan's criteria, the circle's summary) opens as the same drawer from the same switch at the right end of the status bar (`StatusBarFrame`) — on a phone a button of its own, the mirror of the wrench. Without a class the inspector is suspended. The stage does not repeat what the drawer holds — no row of criteria under the plan, no setup button above the room — and on a phone a layer's action in the middle of the bar ("Mischen", "An Sitzplan anpassen") shows its icon alone, its name kept for the screen reader, so the toolbar's switch stays in reach. An iPad in portrait is a tablet; nothing that edits may be desktop-only.
- **The workspace has no page footer.** `App.tsx` leaves it off `/generator` for the same reason as the fullscreen routes, and `AppSettingsMenu` — the gear beside Help at the right of the header, the same place on every layer, on the export page and on the first screen — carries what a teacher reaches for from inside a plan and no layer owns: theme and language, the update check, wiping all data (`AppSettingsItems` with `storage={false}`, shared with the footer's own gear), then feedback, the changelog with the running version beside it and the GitHub repository, and last the two legal pages. The backup and "Pläne & Verlauf" are not repeated there — the foot of every toolbar carries them (below). The FAQ is reached from Help: every help dialog (`HelpButton`) ends with a link to it, opened at the section that answers the screen it was asked on (`faqSection`). The support page closes every toolbar (below). Both pages show "Zurück" when the app opened them, and so do the pages opened from the gear and the changelog opened from the update notice (`APP_RETURN_STATE`, `useReturnToApp`); a visitor from a search engine sees no such link.
- **The class is the document.** Which class is open is stated in the header on every layer — on a phone as a mark with the name in its label, since the name would push the layer switch off a 402px header — and everything a class itself can undergo — create, rename, delete — lives in that menu's dropdown. `ClassDialogsProvider` owns those dialogs, so the header and the class layer's empty state open the same ones.
- **One toolbar shape for every layer** (`ToolRail`), in two parts and in both densities of `SmartSidebar` — 208px with labels, 60px as icons, the groups told apart by a hairline rather than a gap. On top the layer's own groups, always in this order: Ansicht (which view is on the stage — list, focus mode, relations; table plan, circle), Hinzufügen (the room's tables and elements), Ansichtseinstellungen (what the view shows), Verwalten (on the class layer everything about who is in the class, the class list's import and export side by side). A layer leaves out a group it has nothing for but never reorders one. `ClassToolPanel`, `RoomToolPanel`, `PlanToolPanel` and `ExportToolPanel` fill that part; an entry that needs a value (a name, a number of placeholders, a set of switches) opens a panel instead of taking a permanent place. At the foot `ToolRailFoot` — drawn by `ToolRail` itself, so no panel lists it and none can forget or reorder it — carries what every layer needs, identical on every layer and on the export page: "Klassenwerkzeuge" (one menu for the four class-tool routes below), "Pläne & Verlauf" (`StorageHistoryModal` through `useStorageHistoryModal`, loaded on first use and shared with the footer's gear), "Backup" (export/import) and "Unterstützen". On a phone the plan layer's foot starts with "Präsentieren", which its status bar has no room for beside "Exportieren" (`planPresent`). The first screen — no class yet — wears the same toolbar, with what needs a class greyed out, and the card that asks for one centred on the stage. The foot stays in view while the layer's part scrolls. A new tool joins one of the layer's groups, or the foot when every layer needs it — never a new floating button. On a phone the rail is a drawer from the left on every layer — the mirror of the inspector's, between the header and the status bar, not modal, closed by Escape, by its switch or by an action taken in it — opened by the wrench at the left end of the status bar, where a tablet has the rail's switch (`StatusBarFrame`); no floating button, and the two drawers take turns. The panels its entries open are portalled above it (a full-screen sheet lay over them and hid them); the room's drawer leaves out the tables, which sit under the canvas there (`MobileTableTemplates`). An entry that switches a view passes `active` and announces a pressed state; an action does not.
- **The toolbar has no header of its own.** Which density it shows is a property of the workspace, so the switch sits in the status bar and the state lives in `ToolRailContext` (Ctrl/⌘+B still works). A sidebar outside the shell finds no provider, keeps its own state and its own switch, and names its column widths through `widths`.
- **The export page wears the shell too.** `/export` renders `AppShell` with the header's export variant (`SeatingPlanHeader view="export"`: no layer is current, each one leads back into the workspace, no plan name and no tour) and its own status bar (`ExportStatusBar` on `StatusBarFrame`, the frame every status bar shares). The toolbar (`ExportToolPanel`) switches the view and saves the files — one PDF entry for whichever arrangement is on the sheet, PNG and SVG — above the foot every rail shares; the sheet is paper on the stage with nothing on top of it; what it carries is set in `ExportSheetInspector`, through `InspectorPortal` from `lg` up and under the sheet below it. The sheet takes the page: margins of 10 mm and a one-line header in both orientations (`ExportPageFrame`, shared by `SceneSvg` and `CirclePrintView`), the table plan framed on its tables as the projection is — "Anzeige vergrößern" (`spg.export.frameOnTables`), switched off, goes back to the whole room in its outline — and the circle fitted to the area with places as large as their spacing allows (`utils/ui/circlePrintLayout`). Printing is the one blue button, with "Zurück" to the plan beside it as on every layer. It has no page footer either.
- **The two exits, once.** Exporting and presenting save the plan first when it differs from the saved one; `usePlanExits` is the single implementation, used by `PlanExits` at the right end of the plan layer's status bar, beside "Zurück" — "Exportieren", then "Präsentieren" at the outer end; a phone's bar keeps "Exportieren", the one a teacher reaches for more often, and finds "Präsentieren" at the foot of its toolbar — by that foot and by Ctrl/⌘+E. Both leave with the arrangement on the stage: from the circle, the export sheet and the projection open on the circle. The plan layer is the last one, so its way on leads out of the workspace: the exits take the place the other layers give "Weiter", and the header carries neither. Both are the same quiet button: blue is the layer's own action — "Weiter" at the end of the other layers' bars, "Mischen" in the middle of the plan layer's — and a screen has one blue button.
- **Editing a thing happens in the inspector, not in the list.** `InspectorContext` holds what is selected (students; the room, the plan and the circle portal their own panels, see below) and whether the drawer is open below `lg`, and `StudentInspector` groups the controls under the pedagogical family they belong to. Adding an attribute means adding it to one group there — never a new column. Several ticked students are edited there too: from `lg` up `StudentBulkInspector` takes the panel with the same controls, fed the selection read as one student (a value all share, a flag all carry, the rest `mixed`), so an attribute added to `StudentInspector` belongs in it as well unless it is per person (name, photo, partners). That starts at two: a single ticked student gets the panel an opened one gets (`StudentInspectorPanel`), because the bulk panel would only take the name, the photo and the partners away — its arrows carry the tick along, its close button lets the selection go. Below `lg` the bulk bar (`StudentBulkEditBar`) stays above the list.
- **A list row is one button.** The class list is a single card of rows divided by a hairline: number, avatar (`StudentAvatar`, to look at, not to press), name and the chips for what is set. The card is a size container (`@container`): where the list is wide enough (`@2xl`) the chips stand beside the name in rows at least 60px tall, where it is not they go under it — the width is the list's, not the window's, since the toolbar and the inspector take their share, and a row of fixed height spilled wrapped chips over the rows below. Pressing the row opens it in the inspector — which is also where the name, the photo and the one destructive action live. The checkbox for bulk edits stays outside that button, because a checkbox inside a button is not a checkbox. While students are ticked the row ticks instead of opening (`selectionActive`), since the inspector then shows the selection. Opened and ticked look different: the selection fill (`--surface-option-selected`) belongs to ticked rows alone, the opened row sits on paper with a blue bar at its left edge — otherwise it reads as a tick beside an empty checkbox.
- **Naming a class is typing and Enter.** A student without a name opens with the name field already active, and Enter saves and steps to the next one (`StudentNameEditor`'s `onSubmit`). That replaced the quick-name dialog and its banner; what is still unnamed is stated in the status bar, not per row. Creating placeholders ends the same way: as many as the class has room for (`MAX_STUDENTS`), one message with the number that came about, and the first of them opened in the inspector.
- **A plan is named where it is saved.** "Plan speichern" in the plan layer's toolbar opens `PlanSavePanel`: the name, then "Speichern" — "Umbenennen und speichern" once the name is new, which renames the open plan (`rename` on `handleSaveSeatingPlan`) — and, with a new name, "Als neuen Plan speichern", which leaves the open plan as it was. A name another plan carries is refused in the panel, not by a toast. Ctrl/⌘+S saves straight away under the name the plan has. The header carries no plan name. "The open plan" is the one `activePlanId` names — the id a save writes to — never the one that happens to share the name (`useOpenPlan`, used by the panel and the exits); whether there is a plan at all is `hasSeatedStudent` — a student in a seat — for the exits and the save, and the export page's "Noch kein Sitzplan gemischt".
- **Three ways into the same student data.** The roster answers "who is in this class"; `AttributeFocusMode` asks one question of everybody at once ("Wer zeigt Unruhe?") and is how the eight yes/no flags get filled in; `RelationsView` answers who wants to sit next to whom across the class and marks the pairs both sides named. A new yes/no flag belongs in the focus mode's `PASSES` list as well as in the inspector; attributes with more than two values stay inspector-only. A view that wants the full width sets `suspended` on `InspectorContext`.
- **A seat's badges explain themselves** (decision 0021). One renderer draws them everywhere (`scene/SeatBadgePill`), in family ink and family order (`BADGE_ORDER` in `utils/ui/studentAppearance`); what a view shows and how many fit is `utils/ui/seatBadges` (`SeatBadgeView`: a filter, `collapse` for a legible "+N" where a tooltip can explain it, a priority for the active criteria). `BadgeTooltipLayer` over a host's SVG finds the icon under the pointer by its box — the badge layer takes no pointer events, because a drag grabs the seat underneath — and reports it, so the plan lights the seats it points at. The icons scale with the plan (6 to 8px on an iPad in portrait), so a finger's tap takes the nearest icon within 14px, a pen's within 6px, the mouse's within 2px (`useBadgeHover`'s `TAP_SLOP`); drawing them larger would send more of a small seat's badges behind its "+N". "Merkmale" in the plan's and the circle's toolbar chooses all, active criteria only or none (`spg.badgeDisplay`) and carries the legend; the export chooses per family. A new badge needs an entry in `BADGE_ORDER` and a `family`.
- **A name takes the seat's room, and a plan's names share one size.** `utils/ui/seatLabelLayout` fits a name and the badge pill against the seat as it stands under the upright name — a turned rectangle, every corner inside it, the editor's lock an obstacle (`fitNameOnSeat`, `placeSeatBadgePill`): a quarter turn gives a 55 × 65 seat 65 across, a slanted seat is widest across its middle, and there a name may step aside from the lock. It goes on two lines where that makes it larger — between words or after a hyphen, never inside a word — and full names ("Vor- und Nachname") always break, so a plan reads alike. `computePlanNameFontSize` (table plans) and `planNameFontSize` (the circle) set the size the great majority of seats reach; a conspicuously long name shrinks on its own seat. Every seat and place draws its name through `SeatNameText`. The text is measured by arithmetic from Instrument Sans' advance widths in `src/data/nameGlyphWidths.json` — regenerate it with `npm run generate:glyph-widths` after a font update — so jsdom, the export's static markup and the browser agree.
- **One drag for the plan and the circle** (decision 0022). `useDragGesture` runs every pointer drag — a press is a drag only after 4 px (8 px for a finger), Escape and a cancelled pointer end it — and each view adds its own target lookup (`useSeatDrag`: the seat under the pointer; `useCircleDragDrop`: the nearest place as drawn). Both draw the target as a ring inside the place (blue, rose when held), confirm a drop in green for a moment, show `DragGhost` above the pointer and announce the drop; both have the same keyboard way — Enter or Space picks up, the arrow keys choose the place, Enter or Space puts down, Escape lets go (`useSeatKeyboardMove`, whose arrows go to the nearest seat that way as drawn, `nearestInDirection`; `useCircleKeyboardMove`, round the circle). The circle keeps its own locks (`CircleLayout.lockedStudentIds`), honoured by swaps, the shuffle and `restoreCircleLocks` after a regeneration.
- **The plan fits the stage.** The classroom is a fixed 900×600 shape, so from `lg` up the stage is a size container (`canvas-stage`) and the frame inside it takes `min(100%, 100cqh × 3/2)` (`canvas-fit`): capped by whichever dimension binds, centred in what is left, never scrolling and never leaving a void. Below `lg` the same class gives the frame the stage's full width — without it the auto-margined frame shrank to its SVG's 300px default. Room, plan and circle take their width from `canvas-fit` alone, never from a width of their own. Only the frame's width changes, which is what a window resize does anyway — every pointer coordinate is derived from its measured box.
- **The room inspector acts, it does not measure.** A drag places and sizes a table, so `SceneInspector` asks for no coordinates: it offers what a drag cannot do in one gesture — turning to a typed angle (the field follows the handle live) or in the 45° steps of Q/E, duplicating (a paste of the selection that leaves the clipboard alone), copying, cutting, pasting, removing — each with the canvas's own shortcut in its tooltip, and each for one table as for a whole selection. A turn — by the handle of a table or of a room element, by Q/E or in the inspector — moves the unlocked tables and the freely placed room elements (cabinet, divider, lectern) of the selection alike, each around its own centre (`useSelectionRotation`, `utils/canvas/selectionRotation.ts`). The arrow keys move what a drag moves — tables, free elements, and a wall element along its wall (`moveFeaturesBy`) — and a key held down is one undo step; a gesture on a mixed selection (delete, cut, paste, duplicate) is one step too (`useUndoStep`). Dragging is not the only way in: a click or Enter on a table or room element in "Hinzufügen" puts it on the free spot nearest the middle of the room, a wall element on the first free stretch of wall (`findFreeSpot`, `findFreeWallSpot`), and selects it. On a touch screen those entries let an upright swipe scroll the toolbar only while it is taller than its room (`touch-action: pan-y`, else `none`), so a drag onto the stage then has to leave sideways; a pointer the browser takes back (`pointercancel`) places nothing. A long press is the touch screen's right-click: a finger or pen becomes a drag or a selection box only past the drag threshold (`DRAG_THRESHOLD_PX`, the machine's `DRAG_THRESHOLD_REACHED`), its menu stays open when the finger lifts (`canvasPointerMachine` closes it only on Escape or a cancel), lies above, beside or below the finger but never under it (`placeTouchMenu`), and survives the click some browsers send at the lift (`swallowReleaseClick`). The browser's own `contextmenu` for a finger or pen is left to the long press (`handleSvgContextMenu`), or it would reopen the menu as a mouse menu beside the finger. Seat count and table type stay read-only. With nothing selected the panel is the room's own: "Neu einrichten" places as many tables of one kind as the class needs, "Vorlagen" keeps this room for other classes and loads a kept one (`RoomSetupSections`) — both replace the room after an undo snapshot (`useRoomSetup`). That is where a room is rebuilt, not a dialog over the canvas; Ctrl/⌘+E lets the selection go and leads there, below `lg` the inspector's switch in the status bar is the way there — no second button above the canvas repeats it — and an empty room opens the drawer by itself.
- **What opens from a toolbar entry is a dropdown menu**: rows of icon and word on `menuSurfaceClass`, a check at the end of a row that is on (`CanvasSettingsGroups` for the view settings). No cards inside a popover, no icon-only chips; only a panel that asks for a value (a name, a number) is a small form on the same surface. Every popover that opens from a button — the toolbar's panels, the class menu, the gear — goes through `usePopoverFocus`: `FloatingDropdown` portals it to the end of the page, so the hook moves the focus in when it opens, keeps Tab and the arrow keys inside, and closes it on Escape with the focus back on the button. To a screen reader such a popover is a `role="dialog"` of buttons and links, not a `menu` or a `listbox`, which may hold neither switches nor a row's own rename and delete.
- **One shape for every inspector** (`shell/InspectorPanel.tsx`): a header strip naming what is selected, a scrolling body of sections divided by hairlines, and — where there is one — the destructive action pinned to the bottom. Inside a section every setting is an `InspectorRow` — its name on the left, its value on the right as a switch or as `InspectorChoice` chips. A row that holds one switch takes `labelsControl`: the row becomes its `<label>`, so the name operates the switch too and on a touch screen the row is a 44px target — never on a row of chips, whose first chip the label would press. A student's controls carry `variant="row"` for that; their `compact`, `hybrid` and `detailed` variants still serve the phone and the older views. A student, a table and a window are read the same way; none of the three brings a frame of its own.
- **A criterion is set in words, and the plan says what it came to.** Four named levels — Aus, Beachten, Wichtig, Sehr wichtig — stand for the weights 0–10 (`utils/mixImportance.ts`); there is no slider and no fine tuning, the four words are the whole scale. The switch for all criteria sits beside the inspector's heading (`MixCriteriaSwitch` in its `actions`), the panel below repeats neither heading nor total, and the fulfilment beside each criterion is a bar and a percentage. Above the criteria a recipe (`utils/mixRecipes.ts`) sets all sixteen at once — "Empfohlene Mischung" is the way back to the defaults — and which one is active is derived from the weights, never stored. Decision 0018 holds the reasons.
- **Three ways to fill the inspector.** The class layer's selection is a student id, so `Inspector` resolves it from the seating-plan context itself. The room layer's selection is table indices and feature ids buried in the canvas state, and the plan layer's criteria need the view's mix handlers, so both render through `InspectorPortal` into the shell's slot — markup travels down instead of a dozen mutators travelling up. The class layer's ticks do the same, because they live with the list — one ticked student in `StudentInspectorPanel`, the panel the shell draws for an opened one, several in `StudentBulkInspector`; a mounted portal (`portalMounted`) is how the class layer's inspector knows to hand its slot over. In the circle the plan layer portals `CircleInspector` instead of the criteria: the circle is not built from them, so its panel only reads what the order came to (`utils/algorithm/circleSummary.ts`) — how many table neighbours stayed side by side. The arcs between table neighbours read the same derivation, because the neighbour lists stored on each seat describe the order the circle was built in and go stale on the first drag. `StatusBarPortal` does the same for the status bar (`history` for a layer's own undo/redo in the middle, `action` for its primary action beside them).
- Layer UI resides in `src/components/SeatingPlanGenerator/` with shared UI primitives in `src/components/ui/` and student tools in `src/components/students/`.
- **The projection carries one bar, and it is ink in both themes.** `/present` puts every control into `PresentationToolbar` under the plan — the two views, the two shapes, the draw, what to show, the size, the way out — while the strip on top only says what is on the wall — the class and the view, no count of seats. Every button there carries its word, under the icon where it would otherwise be an icon alone (`barIconButtonClass`): at the board no tooltip explains an icon to a finger, and the word stays part of the button's accessible name. In fullscreen the strip is not drawn and the bar lies over the plan, out of sight until the pointer nears the bottom edge, a tap lands there or the keyboard moves into it (`useEdgeReveal`). The plan is framed on the furniture, not on the empty 900×600 room: the board, the windows and the door come in from their walls to just beside the tables and furniture more than a gangway from them stays out (`featuresForTableFrame`, `frameContentBounds`), or a whiteboard got a quarter of its area filled; the exported sheet is framed the same way. The circle is framed on its ring the same way (`SimpleCircleView fit`), so 100 % fills the wall, and the draw works there too: it takes the circle's order as its pool and lights the drawn place (`CircleSpotlight`, the counterpart of `PresentationSpotlight`). After a tap the bar stays up five seconds rather than one and a half, and the projection shows no success message (`quietSuccessToasts`) — the wall faces the class; the contrast mode draws it black on white for a bright room, and the beamer keeps its own name rule (`spg.present.nameDisplay`, first names) apart from the editor's.
- **A tool used standing up is a route, not a panel.** "Wer kommt dran?" (`/wer-kommt-dran`), "Wo sitzt wer?" (`/wo-sitzt-wer`) and "Gruppen bilden" (`/gruppen`) share `components/tools/ToolPage.tsx`: the way back on top, the answer in the middle, one action pinned to the bottom edge. They are `noindex`, store nothing, and are reachable — together with the name game (`/namensspiel`) — from "Klassenwerkzeuge" at the foot of every toolbar ("Gruppen bilden" also from the projection's bar); their way back goes through the history, so it returns to where they were opened from — the projection in the view it was left in. While the class sits in the circle, "Wer kommt dran?" draws from the circle and names who sits on either side (`findCircleLocation`) instead of a table. An empty state's button names the layer that supplies what is missing (`ToolEmptyState`'s `step`, read by `useSeatingWizard`), since the tool may have been opened from any layer. A new one of them needs a route, a `seoRoutes.json` entry, a `hidesFooter` entry and a `routeComponents` key — decision 0019 holds the reasons.
- **The pages beside the app share one frame** (`components/publicPage/`): `PublicPageHeader` (the lockup, and "Zurück" when the app opened the page), the type in `pageTokens.ts`, and `LegalPage`/`LegalSection` for the Impressum, the Datenschutzerklärung and the stand-in that forwards to an operator's own; the 404 page wears the same header. None of them sets a minimum height: `App.tsx` makes the page a column at least as tall as the window, so the footer sits on its bottom edge however short the page is. The rules are in `docs/DESIGNSYSTEM.md` § 6d.
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

- **No inline scripts in `index.html`** — the production CSP is `script-src 'self'` (no nonce/hash). The one classic script beside the module, `public/browser-check.js`, is written in ES5 so it runs where the bundle cannot: below Chrome/Edge 111, Safari 16.4 or Firefox 128 (what Tailwind CSS 4 needs; `color-mix()` and `CSS.registerProperty` mark them) it shows a notice instead of a blank page. Its two sentences are the one user-facing text outside the translations, since they must work without the bundle; `check-bundle.mjs` counts the file into the initial payload. The PWA install-prompt capture lives in the entry module; speculation rules are delivered via the `Speculation-Rules` HTTP header (`public/speculationrules.json`).
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

- Toast notifications (custom toast system) for user feedback; default messages are i18n keys (`toast:errors.*`). They stack at the top right, just under the header — in the corner itself they lay over Help and the gear — and a view that faces a room calls `quietSuccessToasts()` (the projection does)
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
- **No global Enter-to-confirm** on destructive dialogs — `ConfirmDialog` focuses "Abbrechen", so Enter on a destructive dialog cancels unless the confirm button was chosen on purpose
- **Responsive design** that works at 200% zoom
- **Breakpoints are rem, in CSS and JS alike**: Tailwind's `md:` is `48rem`, which moves with the browser's default text size (18px puts it at 864px). A layout decision in JS goes through `useBreakpointUp` / `useLayoutMode` / `isBreakpointUp` (`hooks/ui/useBreakpoint.ts`), which compare in rem too — never `window.innerWidth` against a px number, or the two disagree in between
- **Touch-optimized** interactions for mobile devices: on a coarse pointer a control is a 44px target (`pointer-coarse:` in the markup, `useIsCoarsePointer` in an SVG, where a transparent hit area around the painted shape grows), the toolbar starts with its labels from `xl` up (`ToolRailContext`), and a choice that needs hover is left out (`buildPhotoDisplayGroup`'s `hasHover`)

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
