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
- Tailwind: prefer canonical utility classes over arbitrary values (`max-h-96` instead of `max-h-[24rem]`, never `min-w-[200px]`-style values when a scale step exists); important modifier is postfix in Tailwind 4 (`p-0!`, not `!p-0`). Text between the scale's steps takes `text-micro` (10 px), `text-caption` (11 px) or `text-control` (13 px) from `@theme`, never a pixel value (`docs/DESIGNSYSTEM.md` § 3)

## Tests & Quality Checks

- Run unit tests with `npm test -- --run` (or `npx vitest run`)
- Coverage report: `npm run test:coverage` (v8 provider, HTML report in `coverage/`)
- Check modified files with `npx eslint <files>`
- TypeScript compilation check: `npm run typecheck` (app) and `npm run typecheck:test` (tests); both via `npm run typecheck:all`
- Check for unused exports: `npm run check:unused` — a ratchet against the baseline in `scripts/check-unused-exports.mjs`; the count may fall, never rise. For the full list run `npx ts-unused-exports tsconfig.ts-unused.json --allowUnusedTypes --ignoreFiles='vite-env.d.ts|index.tsx|App.tsx'`
- E2E: Playwright specs live in `e2e/` — smoke, the core flow, the rooms of a class in "Bibliothek" (`plans-library.spec.ts`) and the first-visit onboarding (sample class and tours) on a desktop, the tablet and phone layouts and the desktop layout worked by a finger on an interactive whiteboard (`touch-layouts.spec.ts`, projects `tablet`, `phone` and `whiteboard`, picked by the tags `@tablet` / `@phone` / `@whiteboard`) (`npm run test:e2e`; needs `npx playwright install chromium`)
- i18n consistency: `npm run check:i18n` (DE/EN key parity + every `t(key, 'default')` resolves to a real key + no key that no code refers to)
- Bundle budgets: `npm run check:bundle` (after a build; part of `npm run build:static`)
- Live addressing: `npm run check:live-seo` (after a deploy, by hand: every sitemap address answers 200 and is its own canonical, slash/`http://`/`www.` spellings redirect permanently, unknown addresses are 404; decision 0029)
- Docs consistency: `npm run check:docs` (relative links, heading anchors and `src/…`-style paths in Markdown resolve; `docs/CHANGELOG.md` is skipped)
- Algorithm runtime: `npm run bench` (by hand, not in CI; figures in `docs/PERFORMANCE.md`)
- Mix quality: `MIX_QUALITY=1 npx vitest run mixQuality` (by hand: five rooms, 30 seeds each, every criterion's fulfilment and the time per mix; figures in `docs/PERFORMANCE.md` and decision 0031)

**Current Code Quality Status (2026-10-26):**

- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: 0 compilation errors (strict mode)
- ✅ Tests: 3240 unit tests (332 test files, 1 skipped), 100% passing on 2026-10-27 + 14 Playwright tests (3 smoke + 2 core flow + 1 rooms + 4 onboarding + 2 tablet + 1 phone + 1 whiteboard), all passing on 2026-10-22
- 📊 Coverage: 81.0 % lines / 80.0 % statements / 71.8 % branches (`npm run test:coverage`, v8 provider, no thresholds enforced; measured before the criterion model of decision 0031)
- ⚠️ Unused Exports: 50 modules ignoring type-only exports, held by a ratchet (`npm run check:unused`); the remainder are re-export barrels, `lazyWithRetry` default exports and shared test helpers
- ✅ Test Infrastructure: Centralized accessibility helpers and toast matchers for robust testing
- ✅ Architecture: Repository Pattern implemented, UI components reorganized into logical subdirectories
- ✅ i18n: Bilingual support (German/English) fully implemented, DE/EN key parity 1:1 (2325 keys per language, none unused)
- 📦 Bundle: initial payload 205 KB brotli / 753 KB raw over 33 files (the browser check included), largest chunk 57 KB brotli, CSS 14 KB brotli

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
   `src/i18n/locales/{de,en}/changelog.json`. The release notes, the
   post-update notice and `/changelog` say the same: every item of the
   `## [X.Y.Z]` section is one entry in `changelogEntries.ts`, in the same
   order, its English text in `en/changelog.json` word for word (a trailing
   full stop aside) and the German one its translation — never a shorter or
   merged in-app version. Write them sorted Added → Improved → Fixed, most
   notable first, since the notice shows the first three.
   `src/data/__tests__/changelogParity.test.ts` fails on any drift
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
`lastmod` stamps in `public/sitemap.xml` from the last commit that changed what
each route shows — discard that unless the sitemap itself is the change. When a
release changed a page's content, regenerate it (`npm run generate:sitemap`) and
commit it before the bump: the Docker build has no git and serves the committed
file.

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

"Bibliothek" has a tour of its own (`library`), hosted by `SeatingPlanHeader`
like the layers' tours. A teacher coming from a version before 3.0 sees
`RedesignWelcome` once in place of the post-update notice (`isRedesignUpgrade`);
its "Tour starten" makes every tour due again (`restartTours`) — decision 0015.

### Inline defaults

`t('some.key', 'Deutscher Text')` is widespread in this codebase (~306 call
sites). The second argument is a _fallback_, not a translation: when the key is
missing from the JSON, i18next renders that German string — on `/en` too. Do not
add new inline defaults; `npm run check:i18n` fails as soon as one becomes the
actual source of a string. Existing ones are verified unreachable and are left
alone deliberately (removing 306 of them would be pure churn).

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
⌘+M minimises the window on a Mac. A key the browser only lends while the page
has the focus may be taken, with `preventDefault`, as an editor takes Ctrl+B
for bold: Ctrl/⌘+E exports on the plan layer and opens the room's own panel
on the room layer (otherwise the address bar's search on Windows), Ctrl/⌘+B
folds the toolbar (otherwise Firefox's bookmarks). The plan layer's keys (save, export, mix
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
- `npm run generate:glyph-widths` - Measures the advance widths of Atkinson Hyperlegible Next (weights 400 and 700) in Chromium and writes `src/data/nameGlyphWidths.json`, which lays out the names on the seats; run after updating `@fontsource-variable/atkinson-hyperlegible-next` (needs `npx playwright install chromium`)
- `python3 scripts/generate-wordmark.py` - Sets "Klassenplan" in Onest Bold as outlines and rewrites `public/brand/wordmark`, `public/brand/lockup` and `src/components/kpWordmarkPaths.ts`; by hand, only when the wordmark changes (needs fonttools, brotli, uharfbuzz, rsvg-convert; usage at the top of the script)
- `npm run check:i18n` - DE/EN key parity + orphaned inline defaults
- `npm run check:bundle` - Enforce bundle size budgets against `dist/` (run after a build)
- `npm run check:unused` - Unused-export ratchet (baseline in `scripts/check-unused-exports.mjs`)
- `npm run check:docs` - Links, heading anchors and repository paths in the Markdown docs resolve
- `npm run check:live-seo` - The deployed site's addresses: one per page, permanent redirects, real 404 (`SITE_URL`, needs the network)
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
- **Rooms of a class** – a class keeps the rooms its plans and mixes were made in (`ClassRecord.rooms`, `activeRoomId`; every `SavedPlan` and `MixResult` carries a `roomId`) — decision 0024. The open room's state is the class's working state; every other room keeps how it was left in `parked`, so opening a room (`useRoomManagement`, in one `flushSync`) loses nothing and saves nothing. `ensureClassRooms` (`src/utils/data/classRooms.ts`) repairs the shape on every read — a class without a room gets "Klassenraum", and plans and mixes without one go into the open room — and never on a write of the live state. Room names are unique within a class (`checkName`); the auto-save slot exists per room. See `docs/data-model.md`.
- **Plan usage record** – standalone store (`src/repositories/planUsageStore.ts`, one bucket per class under `DB_KEYS.planUsage`) noting which seating plans were really in use. Signals are raised where the action happens (present, export, save, hand-edit); merge rules are pure in `src/utils/data/planUsage.ts`; `subscribeToPlanUsage` pushes changes to `usePlanUsageRecords` so every consumer reads the same set. Feeds `buildPreviousPairs` and the neighbourhood view; repetition counts these plans alone — no mix, and a plan read for its fulfilment never against itself (`buildPreviousPairs`' `plan`, decision 0032). "Zurücksetzen" in that view empties a class's bucket and notes when (`resetPlanUsage`, `resetAtByClass`); from then on saved plans dated up to that day no longer count either (`buildPreviousPairs`' `since`, carried as `planUsageSince` wherever `planUsage` goes, the worker included), and the toast after it takes it back (`undoPlanUsageReset`) — decision 0023. A plan's inspector in "Bibliothek" marks it as used or not by hand ("Genutzt", `markPlanUsed`, source `marked`) and switches the class's detection off ("Automatisch erkennen", `manualClassIds`): then no signal is recorded, only marked plans count — `usePlanUsageRecords` resolves the records for the mode (`resolvePlanUsageMode`), and `buildPreviousPairs` gets `manual` (`planUsageManual`, beside `planUsageSince`) so the saved plans never stand in — decision 0025. Failures are logged and swallowed — a lost signal is nothing the teacher can act on. See `docs/ALGORITHM.md`.
- Result-pattern (`Success`/`Failure`) provides typed error handling and enables repository swapping.
- **Writes of the open class** go through the persist queue alone (`hooks/persistence/`). A write that fails is said at once — one toast per run of failures — and its jobs go back unless a newer one arrived; the queue tries again after 1 s, doubling to 30 s, eight times on its own, and the status bar shows "Nicht gespeichert" until a write succeeds, while leaving the page asks first. `idbClient` reopens the default store once when the browser closed its connection (Safari after a while in the background). `IndexedDBRepository` chains its operations before anything awaits, keeps no copy of the collection and changes it in one transaction (`changeCollection`), so a second tab never writes back what it read earlier; each tab keeps the class it has open on its own, and loads it anew when it comes back to the front after another tab wrote it (`isOpenClassChangedElsewhere`, its views starting afresh through `reloadGeneration`). A restore that replaces everything writes what is queued first, then holds the queue shut (`isRestoringRef`) and reloads without writing (`reloadCurrentClassData({ discardPending: true })`).
- Live data is stored unencrypted (offline-first, documented in `docs/SECURITY.md`); only exported backups are encrypted.
- Keys, record shapes, versions, retention and the wipe path: `docs/data-model.md`. CSV import format: `docs/csv-import.md`. Worker messages: `docs/worker-protocol.md`. Personal data inventory and self-hosting obligations: `docs/PRIVACY.md`. Recorded design decisions: `docs/decisions/` — a change that alters stored formats, student data, algorithm results or URLs should check the matching record first.

### Algorithm & Layout Engine

- Constraint engine weights criteria for restlessness, shyness, distraction, partners, distance wishes, height categories, language levels, social roles, door/window preferences and locked seats.
- **One criterion model** (`utils/algorithm/model/`, decision 0031): every criterion is written down once — a pair, seat, table or language term in `criteria.ts` — and the construction, the refinement, the fulfilment beside each criterion and the highlights on the seats all read it, so what a teacher reads is what was optimised. `seatRelations.ts` relates two seats as `partner` (the seat pair by index), `table`, or at another table the nearest seat `beside`, `ahead` or `behind` relative to the board, with no aisle between (`ADJACENT_GAP`, `ROW_GAP`); a relation weighs by `RELATION_WEIGHTS`, a criterion by its weight and `CRITERION_WEIGHTS` (all in `constants.ts`). `objective.ts` sums the terms and computes a swap exactly (`swapDelta`) — the refinement keeps a running score and trusts it. `fulfilment.ts` counts every criterion's cases against what the room and the class allow, so 100 % is a plan the mixing could not improve on; `seatingStatistics.ts` and `criterionHighlights.ts` stay the entry points the UI boundary allows. A new criterion is a term there and a case there, never a scorer of its own. Boys, girls and diverse students are three genders of their own.
- Window/door distances come from `algorithm/featureDistances.ts` (memoized per scene geometry) — the criterion model reads that one implementation.
- Randomness is injectable: every entry point accepts an `rng` (`algorithm/rng.ts`), defaulting to `Math.random`. Production behaviour is unchanged; tests pass `createRng(seed)` for exact assertions.
- Runs in a web worker; `src/workers/algorithmOperations.ts` holds the single implementation that both the worker and the main-thread fallback call, so the two cannot diverge. `algorithmWorkerClient.ts` owns transport: aborted and timed-out requests reject instead of silently re-running inline. The worker reports progress **stages**, never text — it cannot know the UI language.
- CSV parsing has its own worker (one dedicated instance per parse, cancelled by terminating it).
- A mix is one session in one worker call (`mix:run`, `runMixSession`): while a criterion carries weight, three starts of construction and simulated annealing (the refinement; greedy search is gone), each by the construction's tables' targets and the same pairs of the plans in use — never a mix, never the plan on screen as such (decision 0032) — weighed by recency, frequency and kind; the best plan by the score wins, never one worse than a construction. Without a criterion the students are dealt onto the seats at random (Fisher–Yates) and nothing else happens. "Vordere Plätze" at "Sehr wichtig" keeps the students needing a front seat within the front rows (`model/frontPool.ts`); below it the row behind them counts as a front seat too and every row further back costs steeply more (`frontRowsOf`, `frontSeatCost`), and stored settings without `criteriaVersion` are lifted once (`migrateStoredMixSettings`). The mix history records its result once, and nothing refines outside a mix — a restored plan stays as it was saved (decisions 0027, 0031). After a mix the circle follows (`useCircleAfterMix`).
- Circle mode stays in sync through `generateCircleSeating`, `regenerateCircle`, and `syncCircleFromTable` actions.
- Template system (`single`, `double`, `group4`, `group6`) defaults to 0° rotation and feeds drag-and-drop operations.

### Hook & Component Landscape

- Hooks are grouped by domain (`hooks/wizard`, `hooks/scene`, `hooks/canvas`, `hooks/circle`, `hooks/ui`, `hooks/student`) and favour focused responsibilities (scene history, canvas interactions, shortcut handling, drag/drop state, pan/zoom, photo cache, etc.).
- The workspace shell lives in `src/components/shell/`: `AppShell` frames every layer, `SeatingPlanHeader` carries the class (`HeaderClassMenu`), `LayerSwitcher`, Help and the settings menu (`AppSettingsMenu`), `AppStatusBar` holds the toolbar's switch and the live status line at its left end, undo/redo in the middle — one bordered control under the stage, the same spot on every layer, with the plan layer's own action beside it ("Mischen", in the circle the purely random shuffle's "Mischen" with the quiet "Angleichen" before it) — and on the right "Zurück" to the previous layer beside the way on: "Weiter" to the next layer, on the plan layer the two exits (`PlanExits`); the inspector's switch closes the bar, the mirror of the toolbar's (below); `Inspector` is the right-hand panel. The way on reads "Weiter" on every layer; its accessible name and tooltip say where it leads ("Weiter zum Sitzplan"). Zurück, Weiter, Exportieren, Präsentieren and the export page's Drucken show their word on a desktop and a whiteboard and their icon alone on a phone and a tablet (`statusBarWordClass`: a mouse from `lg`, any pointer from `xl`). A view never draws its own "carry on" or "go back" button, and nothing floats over the stage — corner controls belong to the status bar, the toolbar or the inspector; what must stand over the stage hangs from the bar (`StatusBarPortal` slot `float`, the class list's jump to its ends) and moves with it. Offline, a quiet cloud beside the toolbar's switch says so, in place of the floating badge the pages without a bar keep (`OfflineIndicator`, `hooks/ui/statusBarPresence`). While writes to storage fail, "Nicht gespeichert" stands in the same place, a button in the alert's ink that tries again at once (`hooks/persistence/persistStatus`). The status line states numbers on the class and the room layer; the verdict on them is a green check or a red cross (`--status-ok`, `--status-alert`) with its words ("Alle Namen gesetzt", "Passt genau") for the tooltip and the screen reader, never a segment of its own; a layer with nothing on it yet shows no icon. The plan layer states no count — the plan shows whether it is there — but the table plan states its fulfilment ("Erfüllung 55 %", the word only where `statusBarWordClass` shows words), portalled in by the view that mixes (`StatusBarPortal` slot `status`); it is the one place that states it, the inspector does not repeat it; pressing it switches the values per criterion on and off — turning them on brings the inspector into view, the column from `lg` up, the drawer on a tablet, and on a phone the values over the plan. The circle states nothing.
- **From `lg` up the shell is the window, not a document.** `AppShell` takes `h-dvh`, the two bars stand still and the three columns between them — toolbar, stage, inspector — scroll on their own, edge to edge with no centred column: the toolbar and the inspector _are_ the margins. A layer takes its geometry from `workspaceLayerClass` and `workspaceStageClass` (`shell/shellTokens.ts`) rather than spelling it out, so the four views (class, room, plan, circle) cannot disagree about it. Below `lg` the layer stays a scrolling page between the sticky header and status bar. A tablet keeps the toolbar beside the stage as a column that sticks under the header while the page scrolls and ends above the status bar (`SHELL_STATUS_BAR_HEIGHT`) — stacked above the stage, it pushed an iPad's room out of sight. From `lg` up the inspector's column folds away on every layer — the class, the room, the plan, the circle and the export sheet — from the switch at the right end of the status bar, a quiet arrow that mirrors the toolbar's at the left end, so the stage takes the width; the choice is remembered per device (`InspectorContext.folded`, `spg.inspectorFolded`), a touch screen narrower than `xl` (an iPad in landscape) starts folded, and an empty room, Ctrl/⌘+E, an opened student and the class layer's ticked students (`InspectorPortal reveal`) unfold it — the class layer's column is where a student is edited. Below `lg` the inspector has no column: a phone shows an opened student as a sheet from the bottom, a tablet as a drawer on the right, and what a layer portals in (the room's properties, the plan's criteria, the circle's summary, the export sheet's settings) opens as the same drawer from the same switch at the right end of the status bar (`StatusBarFrame`) — on a phone a button of its own, the mirror of the wrench. A tap beside a drawer or the phone's sheet closes it, as a tap beside a menu does (`useOutsideTap`: on the lift, so a scroll or a drag leaves it open and the tapped row still opens; the switch, what is portalled out of `#root` and an overlay above keep their taps). Without a class the inspector is suspended. The stage does not repeat what the drawer holds — no row of criteria under the plan, no setup button above the room — and on a phone a layer's action in the middle of the bar ("Mischen", "Angleichen") shows its icon alone, its name kept for the screen reader, so the toolbar's switch stays in reach. An iPad in portrait is a tablet; nothing that edits may be desktop-only.
- **The workspace has no page footer.** `App.tsx` leaves it off `/generator` for the same reason as the fullscreen routes, and `AppSettingsMenu` — the gear beside Help at the right of the header, the same place on every layer, on the export page and on the first screen — carries what a teacher reaches for from inside a plan and no layer owns: theme and language — the theme the system's until the switch chooses one, and again from "Design wie das System" (`utils/ui/themePreference.ts`) —, the update check, installing the app and wiping all data (`AppSettingsItems`; the start page and the pages beside the app carry the very same gear, see below), then the FAQ, feedback, the changelog with the running version beside it and the GitHub repository, and last the two legal pages — every row in view, the menu scrolling only in a window too short for them. The backup and "Bibliothek" are not repeated there — the foot of every toolbar carries them (below). The FAQ is reached from the gear and from Help: every help dialog (`HelpButton`) ends with a link to it, opened at the section that answers the screen it was asked on (`faqSection`). The support page closes every toolbar (below). Both pages show "Zurück" when the app opened them, and so do the pages opened from the gear, the changelog opened from the update notice and every page opened from the start page, the footer or another page beside the app (`APP_RETURN_STATE`, `useReturnToApp`, back through the history); a visitor from a search engine sees no such link.
- **The class is the document.** Which class is open is stated in the header on every layer — below `md` (a phone, an iPad mini in portrait) as a mark with the name in its label, since the name would push the layer switch off a 402px header and under it at 744px — and everything a class itself can undergo — create, rename, delete — lives in that menu's dropdown: a new class is named in a row at its top before it is made, as a new room is, and Enter makes and opens it; a rename takes the class's own row. No dialog asks for a class: the first screen's card names the first one in a field of its own, and "Bibliothek" adds one under a free name ("Neue Klasse", "Neue Klasse (2)" …) without opening it, its name in the inspector's header open and ready to be typed over, as a new room's is. While no student is open, the class layer's inspector is the class itself, as the room's is the room while nothing is selected: the name renamed in the header, school year and notes changed field by field, what the class holds, and its removal pinned below (`ClassInspector`, the very `ClassPanel` "Bibliothek" shows for a class, the two fields in `ClassMetadataFields`). They change nothing else about a class, so `updateClassMetadata` writes them without a reload — which would drop the undo history — and without a message (`applyClassMetadata`). `ClassDialogsProvider` holds what those places share — making a class with its busy state (`create`, which resolves with the new class's id), and the question before deleting one, the one dialog left.
- **One toolbar shape for every layer** (`ToolRail`), in two parts and in both densities of `SmartSidebar` — 208px with labels, 60px as icons, the groups told apart by a hairline rather than a gap. On top the layer's own groups, always in this order: Ansicht (which view is on the stage — list, focus mode, relations; table plan, circle), Hinzufügen (the class layer's students and placeholders, the room's tables and elements, "Bibliothek"'s classes and rooms), Ansichtseinstellungen (what the view shows), Verwalten (on the class layer the class list's import and export side by side, and "Liste drucken"). The toolbar holds what goes onto the stage and how it looks; naming, saving, opening and removing the thing a layer shows is its inspector's — the plan layer has no Verwalten. A layer leaves out a group it has nothing for but never reorders one. `ClassToolPanel`, `RoomToolPanel`, `PlanToolPanel` and `ExportToolPanel` fill that part; an entry that needs a value (a name, a number of placeholders, a set of switches) opens a panel instead of taking a permanent place. At the foot `ToolRailFoot` — drawn by `ToolRail` itself, so no panel lists it and none can forget or reorder it — carries what every layer needs, identical on every layer and on the export page: "Bibliothek" (a link to `/bibliothek`, marked as the current page there; the gear of the pages beside the app leads there too), "Klassenwerkzeuge" (one menu for the four class-tool routes below), "Backup" (export/import) and "Unterstützen". On a narrow phone (below `sm`) the plan layer's foot starts with "Präsentieren", which its status bar has no room for beside "Exportieren" (`planPresent`); an iPad mini in portrait has room for both in the bar. The first screen — no class yet — wears the same toolbar, with what needs a class greyed out, and the card that asks for one centred on the stage. The foot stays in view while the layer's part scrolls. A new tool joins one of the layer's groups, or the foot when every layer needs it — never a new floating button. On a phone the rail is a drawer from the left on every layer — the mirror of the inspector's, between the header and the status bar, not modal and without a head of its own, closed by Escape, by its switch, by a tap beside it or by an action taken in it — opened by the wrench at the left end of the status bar, where a tablet has the rail's switch (`StatusBarFrame`); no floating button, and the two drawers take turns. The panels its entries open are portalled above it (a full-screen sheet lay over them and hid them); the room's drawer leaves out the tables, which sit under the canvas there (`MobileTableTemplates`). An entry that switches a view passes `active` and announces a pressed state; an action does not.
- **The toolbar has no header of its own.** Which density it shows is a property of the workspace, so the switch sits in the status bar and the state lives in `ToolRailContext` (Ctrl/⌘+B still works). A sidebar outside the shell finds no provider, keeps its own state and its own switch, and names its column widths through `widths`.
- **The export page wears the shell too.** `/export` renders `AppShell` with the header's export variant (`SeatingPlanHeader view="export"`: no layer is current, each one leads back into the workspace, no plan name and no tour) and its own status bar (`ExportStatusBar` on `StatusBarFrame`, the frame every status bar shares). The toolbar (`ExportToolPanel`) switches the view — table plan, circle, and the note list — and saves the files — one PDF entry for whatever is on the sheet, PNG and SVG — above the foot every rail shares; the sheet is paper on the stage with nothing on top of it; what it carries is set in `ExportSheetInspector`, from the sheet as a whole to its details (the sheet's title renamed in the header, Seitenformat, Kopfzeile with the class info, the list's own form, Namen, Auf dem Blatt with the legend last — greyed out while the sheet carries neither badges nor the gender tint, which is all it explains —, Raumelemente), through `InspectorPortal` — the column from `lg` up, below it the drawer from the status bar, as on a layer. The sheet takes the page: margins of 10 mm and a one-line header in both orientations (`ExportPageFrame`, shared by `SceneSvg` and `CirclePrintView`), the table plan framed on its tables as the projection is — "Anzeige vergrößern" (`spg.export.frameOnTables`), switched off, goes back to the whole room in its outline; framed, the room elements are drawn lighter, the wall elements keep their gap from the photos too wherever that leaves the plan as large (`featuresForTableFrame`'s `clearance`), and the frame never reaches past the whole room's, so a room furnished to its walls is not drawn smaller — and the circle fitted to the area with places as large as their spacing allows (`utils/ui/circlePrintLayout`). The note list ("Liste", `NoteListSheet`, `utils/ui/noteList`) is the class with room to write beside every name — ruled lines or a grid of empty columns — by table as in the plan (rows away from the board, `tableRowsFromFront`), round the circle or by name, and runs to as many pages as it needs (`renderNoteListSvgPages`, one PDF page each), so it is a PDF only. It needs students, not a plan: "Liste drucken" under the class layer's Verwalten opens the page on it (`state: { mode: 'list', returnStep: 1 }`), the table plan and the circle greyed out until there is a plan, the list by name until someone is seated, and "Zurück" leading to the class; its settings live in one object (`spg.export.noteList`), badges and photos off until asked for, and nothing written on it comes back into the app — there is no note field on a student. Printing is the one blue button, with "Zurück" to the plan beside it as on every layer. It has no page footer either.
- **"Bibliothek" is a page of the shell** (`/bibliothek`, `src/pages/PlanLibrary.tsx`, decision 0024). It shows the classes, a class's rooms with its recent mixes and neighbourhoods, a room's plans and the room templates as folders in columns (`ColumnBrowser`, built by `buildLibraryColumns`): each column a labelled listbox whose selection follows the focus — ↑/↓, → into a folder, ← out of it, Enter opens, F2 renames, Delete removes, Tab from column to column, no type-to-find — and on a phone only the last column. It opens on the plan that is open, in its room, in its class. The neighbourhoods are a folder too: the class's students, and a student's neighbours in the next column, most often first, with their photos where there are — a pair of two full names does not fit a column, one name does. What is selected is read and changed in the inspector (`components/library/inspectors/`: class, room, plan, mix, neighbourhoods and a pair of them, template, folder), a class's name, school year and notes in its panel as in the class layer's inspector, F2 opening the name in the header of a class, a room, a plan or a template — only that entry's: the request names the entry it was made for, and choosing another lets it go; the status bar (`LibraryStatusBar`) holds the path — every step a way up — "Zurück" through the history, and the one blue button that opens the selection in the workspace: a plan on the plan layer, a room on the room layer, a class on the class layer, a mix where it still fits its room's tables, a template as a new room of the open class. Another class is browsed without being opened and changed in storage (`useClassLibrary`, `editInactiveClass`); opening something of it opens the class first. The header wears its outside variant (`view="library"`), the toolbar adds a class or a room (`LibraryToolPanel`). The page reads the inspector and `ClassDialogsProvider` itself, so it renders inside `ShellProviders` (`shell/AppShell.tsx`), whose `AppShell` then nests no second set — above them its hooks got the inert fallbacks.
- **The two exits, once.** Exporting and presenting save the plan first when it differs from the saved one; `usePlanExits` is the single implementation, used by `PlanExits` at the right end of the plan layer's status bar, beside "Zurück" — "Präsentieren", then "Exportieren" at the outer end; a narrow phone's bar (below `sm`) keeps "Exportieren", the one a teacher reaches for more often, in that same place and finds "Präsentieren" at the foot of its toolbar — by that foot and by Ctrl/⌘+E. Both leave with the arrangement on the stage: from the circle, the export sheet and the projection open on the circle. The plan layer is the last one, so its way on leads out of the workspace: the exits take the place the other layers give "Weiter", and the header carries neither. Both are the same quiet button: blue is the layer's own action — "Weiter" at the end of the other layers' bars, "Mischen" in the middle of the plan layer's — and a screen has one blue button.
- **Editing a thing happens in the inspector, not in the list.** `InspectorContext` holds what is selected (students; the room, the plan and the circle portal their own panels, see below) and whether the drawer is open below `lg`, and `StudentInspector` groups the controls under the pedagogical family they belong to. Adding an attribute means adding it to one group there — never a new column. Several ticked students are edited there too: `StudentBulkInspector` takes the panel — the column from `lg` up, on a tablet the drawer, which the ticks open and take along when they are let go (`InspectorPortal reveal`) and which a tap in the list leaves open, on a phone the sheet an opened student gets (`InspectorPortal sheet`) — with the same controls, fed the selection read as one student (a value all share, a flag all carry, the rest `mixed`), so an attribute added to `StudentInspector` belongs in it as well unless it is per person (name, photo, partners). That starts at two: a single ticked student gets the panel an opened one gets (`StudentInspectorPanel`), because the bulk panel would only take the name, the photo and the partners away — its arrows carry the tick along, its checkbox or Escape lets the selection go. The panel's close button is the phone's sheet's and the tablet's drawer's alone (`lg:hidden`): from `lg` up the column folds from the status bar instead, and putting the student away would only leave its empty notice. A phone's sheet comes from the status bar's switch alone, which carries how many are ticked (`badge`) — a sheet that came with every tick would cover the list being ticked; Escape or a tap beside it closes it and keeps the ticks, and while students are ticked an ✕ in the status bar takes the place of the class's count (`StatusBarPortal` slot `status`, `peer-not-empty:hidden`) and lets them go, as the sheet's own ✕ does. The row above the list stays search, filter and sort in every state.
- **A list row is one button.** The class list is a single card of rows divided by a hairline: number, avatar (`StudentAvatar`, to look at, not to press), name and the chips for what is set. The card is a size container (`@container`): where the list is wide enough (`@2xl`) the chips stand beside the name in rows at least 60px tall, where it is not they go under it — the width is the list's, not the window's, since the toolbar and the inspector take their share, and a row of fixed height spilled wrapped chips over the rows below. Where they go under it, the checkbox stands on the name's line and the chips start under the name, and the list's head says "Alle auswählen" instead of naming columns the rows do not have (`StudentListHeader`). On a phone the row above the list is the search and one button for the filter and the sort (`StudentListViewMenu`, a dot on it while a filter hides students), and what a search or a filter left ("3 von 24", with its ✕) stands in the list's head; from `md` up the two are fields beside the search, which say what is chosen without a tap. Pressing the row opens it in the inspector, pressing it again puts it away (`toggleStudent`; the column it unfolded folds back, a tablet's drawer closes) — the inspector is also where the name, the photo and the one destructive action live. The checkbox for bulk edits stays outside that button, because a checkbox inside a button is not a checkbox. While students are ticked the row ticks instead of opening (`selectionActive`), since the inspector then shows the selection. ↑/↓ (Home/End to the ends) step from row to row — from a checkbox to the next checkbox — and the student follows the focus into the inspector, as in "Bibliothek", except while students are ticked and on a phone, whose sheet would take the focus; the focus stays in the list (`selectStudent(id, { keepFocus: true })`), so an unnamed student's name field opens without taking it. Alt/⌥+↑/↓ step from inside the inspector (`StudentInspectorPanel`), leaving a text field alone but for the name field, which saves a changed name first. The inspector steps and counts in the list's order — searched, filtered, sorted — which the class layer publishes as `studentOrder` on `InspectorContext`. A search that clearly means one student opens it as the teacher types, the focus staying in the field — the only one found, else the only one whose name, a word of it, or (from two letters) a word's start the search is (`findSearchMatch` in `useStudentListView`, only on typing, so a rename in the inspector never moves it on); not while students are ticked and not on a phone, where Enter does it — Enter opens that student or the first one found. Opened and ticked look different: the selection fill (`--surface-option-selected`) belongs to ticked rows alone, the opened row sits on paper with a blue bar at its left edge — otherwise it reads as a tick beside an empty checkbox.
- **Naming a class is typing and Enter.** A student without a name opens with the name field already active, and Enter saves and steps to the next one (`StudentNameEditor`'s `onSubmit`). That replaced the quick-name dialog and its banner; what is still unnamed is stated in the status bar, not per row. Creating placeholders ends the same way: as many as the class has room for (`MAX_STUDENTS`), one message with the number that came about, and the first of them opened in the inspector.
- **A plan is named where it is saved — in its inspector.** The plan layer's inspector is the plan itself, as the room's is the room: headed by the plan's name with whether the stage is what was saved under it ("Gespeichert am …", "Änderungen noch nicht gespeichert", "Noch nicht gespeichert" — never "Nicht gespeichert" alone, the status bar's word for a failed write; `PlanInspectorHeader`, `usePlanSaveState`), the name renamed there as every inspector's is — a saved plan at once, as in "Bibliothek" (`renameSeatingPlan`), what it holds left as it was saved; a plan never saved takes the name its first save will use (`setPlanName`) — then the section "Plan" (`PlanSection`, in `views/PlanInspectorParts.tsx`, the circle's inspector leads with it too): "Plan speichern", into the open plan or as the first one, and once a plan is open "Als neuen Plan speichern", which leaves the open plan as it was and keeps the stage beside it under a free name ("Deutsch (2)") for the header to rename; both share `usePlanSave`. "Plan öffnen …" opens another saved plan of the class — the open room's first, each named with its room once the class has more than one, a plan of another room opening that room (`handleHistoryLoad`, as "Bibliothek" does); renaming and removing another plan stay in "Bibliothek". A name another plan carries is refused under the name, not by a toast. Ctrl/⌘+S saves straight away under the name the plan has, from the open name field under the typed one. The header carries no plan name. "The open plan" is the one `activePlanId` names — the id a save writes to — never the one that happens to share the name (`useOpenPlan`, used by the section and the exits). Setting the room up anew ("Neu einrichten") lets go of it, name and all (`releaseOpenPlan` through `useRoomSetup`'s `onRoomReplaced`): no save, the one before export and present included, may write the new tables over the old plan. The plan goes into the open room; the inspector's heading names that room once the class has more than one. Whether there is a plan is `hasPlanForScene` — a student in a seat, and a row of seats for every table as it stands — for the exits, the save and the auto-save on leaving the layer, and the export page's "Noch kein Sitzplan gemischt" asks the shape too. An arrangement made for other tables (the room set up anew under it) is stale: the plan layer mixes it over on its own (`useSeatingPlanViewLogic`, which tries again when an unmount — StrictMode's double mount included — aborted the run, since `handleMix` reports `aborted`), draws empty seats and scores nothing meanwhile, and where it cannot mix on its own says so with "Jetzt neu mischen". The first entry's mix stays the wizard's (`triggerAutoMix`), which sets `autoMixing` with the step so the view stands aside.
- **Three ways into the same student data.** The roster answers "who is in this class"; `AttributeFocusMode` asks one question of everybody at once ("Wer zeigt aktuell Unruhe?") and is how the eight yes/no flags get filled in; `RelationsView` answers who wants to sit next to whom across the class — a card per pair with both faces, the pairs both sides named marked and first — and shows who has named nobody yet. A new yes/no flag belongs in the focus mode's `PASSES` list as well as in the inspector; attributes with more than two values stay inspector-only. A view that wants the full width sets `suspended` on `InspectorContext`.
- **A seat's badges explain themselves** (decision 0021). One renderer draws them everywhere (`scene/SeatBadgePill`), in family ink and family order (`BADGE_ORDER` in `utils/ui/studentAppearance`); what a view shows and how many fit is `utils/ui/seatBadges` (`SeatBadgeView`: a filter, `collapse` for a legible "+N" where a tooltip can explain it, a priority for the active criteria). `BadgeTooltipLayer` over a host's SVG finds the icon under the pointer by its box — the badge layer takes no pointer events, because a drag grabs the seat underneath — and reports it, so the plan lights the seats it points at. The icons scale with the plan (6 to 8px on an iPad in portrait), so a finger's tap takes the nearest icon within 14px, a pen's within 6px, the mouse's within 2px (`useBadgeHover`'s `TAP_SLOP`); drawing them larger would send more of a small seat's badges behind its "+N". "Merkmale" in the plan's and the circle's toolbar chooses all, active criteria only or none (`spg.badgeDisplay`) and carries the legend; the export chooses per family. A new badge needs an entry in `BADGE_ORDER` and a `family`.
- **A name takes the seat's room, and a plan's names share one size.** `utils/ui/seatLabelLayout` fits a name and the badge pill against the seat as it stands under the upright name — a turned rectangle, every corner inside it, the editor's lock an obstacle where it is always drawn — on a touch screen, and a closed lock everywhere; the open lock a mouse reveals on hover lies over the name for that moment (`seatLockReservesRoom`) — (`fitNameOnSeat`, `placeSeatBadgePill`): a quarter turn gives a 55 × 65 seat 65 across, a slanted seat is widest across its middle, and on both a name may step aside from the lock beside it. It goes on two lines where that makes it larger — between words or after a hyphen, never inside a word — and full names ("Vor- und Nachname") always break, so a plan reads alike. `computePlanNameFontSize` (table plans) and `planNameFontSize` (the circle) set the size the great majority of seats reach — the editor measures it with the lock only where every seat shows one (a touch screen), so locking a seat never resizes the other names; a conspicuously long name shrinks on its own seat. Every seat and place draws its name through `SeatNameText`. The text is measured by arithmetic from Atkinson Hyperlegible Next's advance widths in `src/data/nameGlyphWidths.json` — regenerate it with `npm run generate:glyph-widths` after a font update — so jsdom, the export's static markup and the browser agree.
- **One drag for the plan and the circle** (decision 0022). `useDragGesture` runs every pointer drag — a press is a drag only after 4 px (8 px for a finger), Escape and a cancelled pointer end it — and each view adds its own target lookup (`useSeatDrag`: the seat under the pointer; `useCircleDragDrop`: the nearest place as drawn). Both draw the target as a ring inside the place (blue, rose when held), confirm a drop in green for a moment — one mark for every highlight of a place, a tint and a ring clear of its edge and concentric with the table's corners (`utils/ui/seatMark`) —, show `DragGhost` above the pointer and announce the drop; both have the same keyboard way — Enter or Space picks up, the arrow keys choose the place, Enter or Space puts down, Escape lets go (`useSeatKeyboardMove`, whose arrows go to the nearest seat that way as drawn, `nearestInDirection`; `useCircleKeyboardMove`, round the circle). The circle keeps its own locks (`CircleLayout.lockedStudentIds`), honoured by swaps, the shuffle and `restoreCircleLocks` after a regeneration.
- **The plan fits the stage.** The classroom is a fixed 900×600 shape, so from `lg` up the stage is a size container (`canvas-stage`) and the frame inside it takes `min(100%, 100cqh × 3/2)` (`canvas-fit`): capped by whichever dimension binds, centred in what is left, never scrolling and never leaving a void. Below `lg` the same class gives the frame the stage's full width — without it the auto-margined frame shrank to its SVG's 300px default. Room, plan and circle take their width from `canvas-fit` alone, never from a width of their own. Only the frame's width changes, which is what a window resize does anyway — every pointer coordinate is derived from its measured box.
- **The room inspector acts, it does not measure.** A drag places and sizes a table, so `SceneInspector` asks for no coordinates: it offers what a drag cannot do in one gesture — turning to a typed angle (the field follows the handle live) or in the 45° steps of Q/E, duplicating (a paste of the selection that leaves the clipboard alone), copying, cutting, pasting, removing — each with the canvas's own shortcut in its tooltip, and each for one table as for a whole selection. A turn — by the handle of a table or of a room element, by Q/E or in the inspector — moves the unlocked tables and the freely placed room elements (cabinet, divider, lectern) of the selection alike, each around its own centre (`useSelectionRotation`, `utils/canvas/selectionRotation.ts`). The arrow keys move what a drag moves — tables, free elements, and a wall element along its wall (`moveFeaturesBy`) — and a key held down is one undo step; a gesture on a mixed selection (delete, cut, paste, duplicate) is one step too (`useUndoStep`). Dragging is not the only way in: a click or Enter on a table or room element in "Hinzufügen" puts it on the free spot nearest the middle of the room, a wall element on the first free stretch of wall (`findFreeSpot`, `findFreeWallSpot`), and selects it. On a touch screen those entries let an upright swipe scroll the toolbar only while it is taller than its room (`touch-action: pan-y`, else `none`), so a drag onto the stage then has to leave sideways; a pointer the browser takes back (`pointercancel`) places nothing. A long press is the touch screen's right-click: a finger or pen becomes a drag or a selection box only past the drag threshold (`DRAG_THRESHOLD_PX`, the machine's `DRAG_THRESHOLD_REACHED`), its menu stays open when the finger lifts (`canvasPointerMachine` closes it only on Escape or a cancel), lies above, beside or below the finger but never under it (`placeTouchMenu`), and survives the click some browsers send at the lift (`swallowReleaseClick`). Safari on an iPad does not honour the stage's `touch-action: none` on the SVG, so the room, the plan and the editable circle also cancel `touchmove` (`useTouchScrollLock`) — or a selection box drawn in portrait scrolled the page. The browser's own `contextmenu` for a finger or pen is left to the long press (`handleSvgContextMenu`), or it would reopen the menu as a mouse menu beside the finger. Seat count and table type stay read-only. A table — or every table of a selection — is taken out of the mix there ("In der Mischung", `ClassroomTable.inactive`): it stays in the room, dashed and faint while empty, and mixing leaves it empty; a student put there by hand stays. The room's own panel fills the room from the board backwards ("Von vorne besetzen", `ClassroomScene.fillFromFront`), so spare seats end up at the back. Both act only through the per-table targets of `seatTargetsFor` (decision 0026); whether a class fits its room is `countActiveSeats`, never `countSeats`. A table, a room element or a selection is read in one section, "Eigenschaften" — the angle first, since every kind shares it, then "In der Mischung" or "Sichtbar" — then "Bearbeiten", the removal pinned below; a single table or element shows its shape in the header where a student shows a photo, and a selection names its tables, room elements and seats under its heading. With nothing selected the panel is the room's own, headed by its name and renamed there, as the class is in the class layer's inspector; its first section ("Raum") leads to the class's other rooms (`RoomListControls`): once the class has another, "Raum öffnen …", a menu shaped as the header's class menu (`InspectorMenuButton`) with every room, the open one checked, a pencil and a bin beside each — the removal asks first, takes the room's plans and mixes along and spares the open room and the last one — then "Neuer Raum", a row that names the room before it is made. Then "Neu einrichten" places as many tables of one kind as the class needs and replaces the tables after an undo snapshot (`useRoomSetup`) — four rows in an empty room, a menu ("Tischart wählen …") once tables stand; "Vorlagen" keeps this room for other classes — named in a row of the panel, after the room, where a name a template already carries is not saved over by Enter but offers "Vorlage „…“ ersetzen" as a row of its own — and opens a kept one as a room of its own from a menu of the same shape, renamed and removed there too (`RoomSetupSections`). That is where a room is rebuilt, not a dialog over the canvas; Ctrl/⌘+E lets the selection go and leads there, below `lg` the inspector's switch in the status bar is the way there — no second button above the canvas repeats it — and an empty room opens the drawer by itself.
- **What opens from a toolbar entry is a dropdown menu**: rows of icon and word on `menuSurfaceClass`, a check at the end of a row that is on (`CanvasSettingsGroups` for the view settings). No cards inside a popover, no icon-only chips; only a panel that asks for a value (a name, a number) is a small form on the same surface. Every popover that opens from a button — the toolbar's panels, the class menu, the gear — goes through `usePopoverFocus`: `FloatingDropdown` portals it to the end of the page, so the hook moves the focus in when it opens, keeps Tab and the arrow keys inside, and closes it on Escape with the focus back on the button. To a screen reader such a popover is a `role="dialog"` of buttons and links, not a `menu` or a `listbox`, which may hold neither switches nor a row's own rename and delete.
- **One shape for every inspector** (`shell/InspectorPanel.tsx`): a header strip naming what is selected — and renaming it: a student's, a class's, a room's, a plan's, a template's name and the export sheet's title are pressed in the header and open there as a field, never repeated as a field under it (`InspectorTitleField`, the student's `StudentNameEditor`, both in `editableTitleClass`; Enter or leaving keeps the name, Escape takes it back, a taken one is refused under it — the rules `NameField` shares through `useNameDraft`) — a scrolling body of sections divided by hairlines, and — where there is one — the destructive action pinned to the bottom. Inside a section every setting is an `InspectorRow`, at least 28px tall under a mouse and 44px on a touch screen whatever it holds, so the rows stand at one pitch; the values in them — `InspectorChoice`'s chips and every button that opens a menu (`familyValueControl`: the partners, the social role, the language) — share one height and padding — its name on the left, its value on the right as a switch or as `InspectorChoice` chips; a student attribute with more values than fit in one line (language level, social role) keeps the row and opens its values as a menu from a button (`InspectorSelect`), whose first row takes the value back — a plan's room in "Bibliothek" is the same menu without a family's colour and with "In einen neuen Raum verschieben" as its last row (`action`); the export's name rule and the note list's order, whose choice is the content, stand under the name as a list (`stacked`, `layout="list"`). The header's media, an action row and the destructive footer are `InspectorMediaTile`, `InspectorActionRow` and `InspectorDeleteFooter`, the same in every inspector. An attribute with a seat badge shows that badge's icon in its family's ink (`InspectorIcon`, `STUDENT_ATTRIBUTE_ICONS`), and an attribute's name starts with a capital in both languages. A row that holds one switch takes `labelsControl`: the row becomes its `<label>`, so the name operates the switch too and on a touch screen the row is a 44px target — never on a row of chips, whose first chip the label would press. A student's controls carry `variant="row"` for that; their `compact`, `hybrid` and `detailed` variants still serve the phone and the older views. A student, a table and a window are read the same way; none of the three brings a frame of its own.
- **A criterion is set in words, and the plan says what it came to.** Four named levels — Aus, Beachten, Wichtig, Sehr wichtig — stand for the weights 0–10 (`utils/mixImportance.ts`); there is no slider and no fine tuning, the four levels are the whole scale. The panel reads as the student inspector does: a criterion is an `InspectorRow` under its family's `InspectorSection` (the class list's headings, Verlauf first), its icon and name on the left and on the right a scale — a dash on the baseline for Aus, three rising bars filled in the family's ink (`ImportanceScale`) — whose words stand in each step's tooltip and accessible name; its explanation stays under the name, and the fulfilment under that is a bar and a percentage. The mixing follows the plan's own section (see above), led by the preset, a section of its own ("Voreinstellung", `MixRecipeSection` — internally still a recipe) with the switch for all criteria beside its heading and the count of active criteria under its button: a button that opens the presets as a menu (`utils/mixRecipes.ts`) and sets all sixteen at once — "Empfohlene Mischung" is the way back to the defaults — and which one is active is derived from the weights, never stored. How well the plan meets them is the status bar's to state, not the inspector's (see above); after the preset come "Hinweise" while the class and the room leave something unmet — more students needing a front seat "Sehr wichtig" than the front row holds, a wish answered with a distance wish (`MixHintsSection`, `useMixHints`, `model/feasibility.ts`); the section is not there otherwise. Decision 0018 holds the reasons.
- **Three ways to fill the inspector.** The class layer's selection is a student id, so `Inspector` resolves it from the seating-plan context itself; with no student open the layer portals the class (`ClassInspector`), which is why the status bar's switch opens it as a drawer below `lg`. The room layer's selection is table indices and feature ids buried in the canvas state, and the plan layer's criteria need the view's mix handlers, so both render through `InspectorPortal` into the shell's slot — markup travels down instead of a dozen mutators travelling up. The class layer's ticks do the same, because they live with the list — one ticked student in `StudentInspectorPanel`, the panel the shell draws for an opened one, several in `StudentBulkInspector`; a mounted portal (`portalMounted`) is how the class layer's inspector knows to hand its slot over. In the circle the plan layer portals `CircleInspector` instead: the plan's own section first, as in the table plan, then, in place of the criteria — the circle is not built from them — only what the order came to (`utils/algorithm/circleSummary.ts`): how many table neighbours stayed side by side. The arcs between table neighbours read the same derivation, because the neighbour lists stored on each seat describe the order the circle was built in and go stale on the first drag. `StatusBarPortal` does the same for the status bar (`history` for a layer's own undo/redo in the middle, `action` for its primary action beside them, `status` for what a view states at the left end).
- Layer UI resides in `src/components/SeatingPlanGenerator/` with shared UI primitives in `src/components/ui/` and student tools in `src/components/students/`.
- **The projection carries one bar, and it is ink in both themes.** `/present` puts every control into `PresentationToolbar` under the plan — the two views, the two shapes, the draw, what to show, the size, the way out — while the strip on top only says what is on the wall — the class and the view, no count of seats. Every button there carries its word under its icon (`barIconButtonClass`), so the bar stays on one line: at the board no tooltip explains an icon to a finger, and the word stays part of the button's accessible name. A setting that is on reads as a selection (`--surface-option-selected`), never in solid blue, which marks the view on the wall (teacher's or students'). In fullscreen the strip is not drawn and the bar lies over the plan, out of sight until the pointer nears the bottom edge, a tap lands there or the keyboard moves into it (`useEdgeReveal`). The plan is framed on the furniture, not on the empty 900×600 room: the board, the windows and the door come in from their walls to just beside the tables and furniture more than a gangway from them stays out (`featuresForTableFrame`, `frameContentBounds`), or a whiteboard got a quarter of its area filled; the exported sheet is framed the same way. The circle is framed on its ring the same way (`SimpleCircleView fit`), so 100 % fills the wall, and the draw works there too: it takes the circle's order as its pool and lights the drawn place (`CircleSpotlight`, the counterpart of `PresentationSpotlight`). After a tap the bar stays up five seconds rather than one and a half, and the projection shows no success message (`quietSuccessToasts`) and keeps the question whether the plan was in use for the way back (`holdUntilLeft`) — the wall faces the class; the contrast mode draws it black on white for a bright room, and the beamer keeps its own name rule (`spg.present.nameDisplay`, first names) apart from the editor's.
- **A tool used standing up is a route, not a panel.** "Wer kommt dran?" (`/wer-kommt-dran`), "Wo sitzt wer?" (`/wo-sitzt-wer`), "Gruppen bilden" (`/gruppen`) and "Dienste verteilen" (`/dienste`) share `components/tools/ToolPage.tsx`: the way back on top, the answer in the middle, one action pinned to the bottom edge. They are `noindex` and store nothing — but for the duties, which go round fairly only because each class's duties and rounds are kept (`repositories/dutyStore.ts`, `utils/dutyDraw.ts`, decision 0028) and whose rota is a PDF in the frame every export shares (`scene/DutyRosterSheet`) — and are reachable — together with the name game (`/namensspiel`) — from "Klassenwerkzeuge" at the foot of every toolbar ("Gruppen bilden" and "Dienste verteilen" also from the projection's bar); their way back goes through the history, so it returns to where they were opened from — the projection in the view it was left in. While the class sits in the circle, "Wer kommt dran?" draws from the circle and names who sits on either side (`findCircleLocation`) instead of a table. An empty state's button names the layer that supplies what is missing (`ToolEmptyState`'s `step`, read by `useSeatingWizard`), since the tool may have been opened from any layer. A new one of them needs a route, a `seoRoutes.json` entry, a `hidesFooter` entry and a `routeComponents` key — decision 0019 holds the reasons.
- **The pages beside the app share one frame** (`components/publicPage/`): `PublicPageHeader` (the lockup, and on the right "Zurück" when the visitor came from inside the site, beside the settings gear — the workspace's own `AppSettingsMenu`, row for row, which the start page carries beside its lockup too), the type in `pageTokens.ts`, and `LegalPage`/`LegalSection` for the Impressum, the Datenschutzerklärung and the stand-in that forwards to an operator's own; the 404 page wears the same header. None of them sets a minimum height: `App.tsx` makes the page a column at least as tall as the window, so the footer sits on its bottom edge however short the page is. The footer is one line of plain links — FAQ, feedback, support, the changelog, Datenschutz, Impressum — and nothing else; the legal pages stay words there rather than rows in the gear (§ 5 DDG: "easily recognisable"). The rules are in `docs/DESIGNSYSTEM.md` § 6d.
- Circle-specific components live under `src/components/circle/`; presentation mode lives in `src/pages/Present.tsx` + `src/components/scene/PresentationScene.tsx`.

### Styling & Design Tokens

- Tailwind CSS 4 via `@tailwindcss/vite` with semantic utilities defined in `src/index.css` (`@theme` + `@utility`).
- `@/utils/ui/designTokens` exports surface/button bundles (`primaryButtonClass`, `inputFieldClass`, …); student toggles rely on `@/components/students/studentStyleTokens` for consistent sizing and coloring.
- Components should only add layout classes on top of tokens — no ad-hoc color utilities.
- Immutable styling patterns ensure Dark/Light parity via CSS variables and prevent component-level drift.

### Easter eggs

Two small surprises wink at a teacher; they are deliberate, not dead code. On
World Teachers' Day (5 October) the status bar's line thanks the teacher once
a year (`useTeachersDayGreeting`, `spg.teachersDayGreeted`; switched off for
every unit test in `setupTests.ts` and under `navigator.webdriver`). The 404
page notes the missing address in a line of the class register, unexcused
(`ClassRegisterEntry`; left out of the prerendered `404.html`, so it never
keeps the build's date). Neither stores more than that year; the greeting's
fade honours reduced motion, and both speak both languages.

## SEO & Prerendering

- The app is a CSR SPA; `npm run build:static` prerenders all routes × languages into `dist/<path>/index.html` so crawlers see real content and per-route canonical/hreflang/JSON-LD. See `docs/SEO.md`.
- `src/data/seoRoutes.json` is the single source of truth for route metadata (titles, descriptions, `noindex`). Shared script helpers live in `scripts/utils/seoRoutes.mjs`.
- Canonical URLs come from the build-time `SITE_URL` (`define` in `vite.config.ts`), **never** from `window.location.origin`.
- **One address per page, no trailing slash** (decision 0029). nginx serves `dist/<path>/index.html` for `/<path>` through the named location `@page` — never `try_files … $uri/`, which answers `/faq` with a 301 to `/faq/` and puts every sitemap address under "Seite mit Weiterleitung" — redirects `/<path>/` to `/<path>`, and answers unknown addresses with the prerendered `404.html` and status 404. `http://` and `www.` are the reverse proxy's to redirect, permanently.
- **Never let `vite-plugin-compression` precompress HTML** — nginx's `brotli_static on` would serve the stale pre-prerender shell.
- Route components live in `src/pages/lazyPages.ts` and are shared by the router and `routePreloader`, so `preload()` warms the instance the router renders. Do not re-declare them with `lazyWithRetry` in `App.tsx`.
- Legal pages: `IMPRINT_URL` / `PRIVACY_URL` at build time replace `/impressum` and `/datenschutz` with forwarding pages (alias in `vite.config.ts`, validation in `src/config/legalPageUrls.ts`). Link to the legal pages only through `LegalPageLink`, never a plain `LocalizedLink`.
- Contact address: `CONTACT_EMAIL` at build time (validation in `src/config/contactEmail.ts`, `define` in `vite.config.ts`, read via `CONTACT_EMAIL` from `src/config/links.ts`); unset keeps the maintainer's address.
- `build:static` regenerates `sitemap.xml` and `robots.txt` only for a build that serves another site (`SITE_URL`, `IMPRINT_URL`, `PRIVACY_URL`); klassenplan.de's own image ships the committed files.

## Security & Deployment

- **No inline scripts in `index.html`** — the production CSP is `script-src 'self'` (no nonce/hash). The one classic script beside the module, `public/browser-check.js`, is written in ES5 so it runs where the bundle cannot: below Chrome/Edge 111, Safari 16.4 or Firefox 128 (what Tailwind CSS 4 needs; `color-mix()` and `CSS.registerProperty` mark them) it shows a notice instead of a blank page. Its two sentences are the one user-facing text outside the translations, since they must work without the bundle; `check-bundle.mjs` counts the file into the initial payload. The PWA install-prompt capture lives in the entry module; speculation rules are delivered via the `Speculation-Rules` HTTP header (`public/speculationrules.json`).
- Security headers live in `nginx-security-headers.conf` and must be re-`include`d in every nginx `location` that sets its own `add_header` (nginx does not inherit them otherwise). See `docs/SECURITY.md`.
- Service worker uses the **prompt update model** (`registerType: 'prompt'`, `skipWaiting` disabled) — a new SW activates only after the user confirms via `ReloadPrompt`. `clientsClaim` is on: it reaches only a page no worker controls yet, so the first visit is offline-ready without a reload while an update still waits (decision 0009). A path with a file extension (`/robots.txt`, `/.well-known/security.txt`) is kept out of the navigation fallback (`navigateFallbackDenylist`), or the precached shell answers it with the app's 404. Where a page cannot have a service worker (plain HTTP — a school's intranet, a staging host — or a browser that refuses one), the whole app still works offline: the build writes `offline-files.json` (every chunk, worker, stylesheet and font; `klassenplan:offline-file-list` in `vite.config.ts`) and `startOfflineWarmup` loads them into the HTTP cache while idle, which works because nginx serves them as immutable. Only `ReloadPrompt` may call `useRegisterSW`; everyone else reads the registration from the `swUpdateController` singleton (`src/hooks/pwa/`), which the settings gear's `UpdateCheckButton` uses for an on-demand check; a check that finds nothing new answers in the button itself ("Aktuell · v3.2.0", `useUpdateCheck`'s `upToDate`), not with a toast over the open menu. `ReloadPrompt` additionally re-checks hourly, on `visibilitychange` and on `online`. A toast that must stay open takes `duration: 0` — `Infinity` is clamped to a 32-bit int by `setTimeout` and fires after ~1 ms.
- Backups are encrypted with AES-GCM 256; PBKDF2-SHA256 with 600,000 iterations, KDF parameters stored in the envelope (legacy files without them decrypt with 250,000). Export enforces a min-8-char password with confirmation. See `docs/backup-format.md`.
- A backup is a `.klassenplan` file (`src/config/backupFile.ts`); the import still takes `.json`. The manifest registers the extension (`file_handlers`, `launch_handler: focus-existing`), so in Chrome and Edge on the desktop a double-click opens the installed app, and `useBackupFileLaunch` hands the file from `window.launchQueue` to the same restore as the file dialog (`importBackupFile`). "Als App installieren" in the gear menu calls the browser's own prompt where there is one and otherwise opens `InstallGuideDialog`, the steps for the browser it detects (`utils/ui/installGuide.ts`); it is hidden inside the installed app. What a school's IT needs — installation by policy, HTTPS, profiles that keep the data — is `docs/school-deployment.md`.

## Testing Strategy

- **Vitest** with jsdom environment for React component testing
- **@testing-library/react** for component interaction testing
- Test files follow `*.test.ts` or `*.test.tsx` pattern in `__tests__` directories
- Shared test utilities in `src/__tests__/utils/` provide mock data factories
- Tests that run the real hooks and repositories against storage mock `idb-keyval` with `createMemoryIdbKeyval` (`src/__tests__/utils/memoryIdbKeyval.ts`): the seams between live state, persist queue and repository are where mocked partners see nothing — a backup restore once wrote one class into another there. A file with more than one such test calls `resetSeatingRepository()` before each: the repository is a module singleton, and the class it has open would carry over into the next
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

- Toast notifications (custom toast system) for user feedback; default messages are i18n keys (`toast:errors.*`). They stack at the top right, just under the header — in the corner itself they lay over Help and the gear — the newest on top, and a view that faces a room calls `quietSuccessToasts()` (the projection does). A toast glides in and out (`components/ui/feedback/toastMotion.ts`; under reduced motion and in jsdom it comes and goes at once), a hairline shows the time it has left, which stands still while a toast is pointed at, holds the focus or is swiped and while the page is in the background, and a swipe to the right puts it away; the same id again keeps its card and starts its time anew. A control that stays in view answers in its own place instead — the gear's update check says "Aktuell · v…" in its row for three seconds
- Defensive programming with null checks throughout
- Graceful degradation when storage is unavailable
- Validation at data boundaries (imports, user input, backup files)
- Centralized error logging via logger utility
- Fire-and-forget promises must attach a `.catch` with logging (no bare `void somePromise()` for I/O)
- **A chunk that cannot be fetched never takes a page down.** Offline where no service worker serves the page (an origin without HTTPS, a private window) every chunk not loaded yet fails. What a teacher opens on demand — a dialog, a menu's lazy half — goes through `loadOnDemand` (`utils/performance/chunkLoad.ts`), not `React.lazy`, whose rejection reaches the layer's error boundary: the opener awaits `load()` and hands a failure to `reportChunkLoadFailure`, which says why in a toast. A dialog an entry of a menu opens is rendered beside the menu, never in it — choosing the entry closes the menu. Pages keep `lazyWithRetry`: online it reloads once for a stale deployment, offline it raises `OfflineChunkError`, which `RouteOfflineBoundary` turns into a notice with the way back — a reload offline leads to the browser's offline page, so nothing reloads while `navigator.onLine` is false
- A layer's error fallback stands as a card in the middle of the stage (`components/errors/WorkspaceErrorStage`), the inspector and the toolbar's switch suspended while it is shown (`suspended` on `InspectorContext` and `ToolRailContext`) — the view that filled both is gone
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
(`genderColors`) — besides the inspector's gender choice, whose pressed chip
wears it (`InspectorChoice`'s `tint`), and the frame round an avatar, which
takes the seat's contour as a seat's photo does (`getAvatarFrame`; the export's
note list frames its photos so too); the avatar's face and the cards stay
paper. Exports explain
the tint in their legend and switch it off in the sheet's inspector
("Geschlechterfarben"), the projection's colour switch takes it off the wall,
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
