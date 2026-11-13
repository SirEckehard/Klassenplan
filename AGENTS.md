# AGENTS.md

Guidance for coding agents working in this repository. This is the only copy:
`CLAUDE.md` imports it (`@AGENTS.md`) and `.agents/rules/agents.md` references
it for Antigravity — edit this file, never those two.

## Code Style & Formatting

- Use TypeScript and React with ES Modules
- Leverage npm 10.9+ and Node 26+ features
- Follow light and dark mode design patterns - maintain existing design language unless explicitly requested otherwise
- Format code with Prettier (2 spaces, single quotes, semicolons)
- Write all code comments in English
- Use `camelCase` for variables, `PascalCase` for React components
- Run `npm run format` for files under `src/`; format other files manually with `npx prettier <file>` if needed
- Tailwind: prefer canonical utility classes over arbitrary values (`max-h-96` instead of `max-h-[24rem]`, never `min-w-[200px]`-style values when a scale step exists); important modifier is postfix in Tailwind 4 (`p-0!`, not `!p-0`). Text between the scale's steps takes `text-micro` (10 px), `text-caption` (11 px) or `text-control` (13 px) from `@theme`, never a pixel value; a size used once (a student's name in the class list, an inspector's title) stays in rem where it is, and the lockup's sizes belong to the logo (`docs/DESIGNSYSTEM.md` § 3)

## Tests & Quality Checks

- **After every change**, before it is committed: the unit tests, `npx eslint` and Prettier on the changed files, `npm run typecheck:all` and the E2E specs (`npm run test:e2e`, about a minute) — the specs are what notices a layout that breaks on a tablet or a phone, which no unit test renders. A spec that fails is fixed or its expectation brought up to date in the same change, never left for CI. A change to what an export sheet shows also runs `npm run test:visual` (the snapshots below): on a Mac `test:e2e` skips them, CI does not
- **What CI runs, locally in one go:** `npm run check:ci` — lint, typecheck, i18n, unused exports, docs, licences, unit tests, E2E, `build:static` (with the bundle budgets), in the order of `.github/workflows/ci.yml`, which it must keep in step with. Run it before a push of several commits and before a release
- **After a push**, check that CI went green (`gh run list --limit 3`, `gh run watch <id>`); a red run is fixed before the next change goes on top. CI retries a failed spec twice but fails the run on a spec that passed only on a retry (`failOnFlakyTests`): green means green at the first attempt
- Run unit tests with `npm test -- --run` (or `npx vitest run`)
- Coverage report: `npm run test:coverage` (v8 provider, HTML report in `coverage/`)
- Check modified files with `npx eslint <files>`
- TypeScript compilation check: `npm run typecheck` (app) and `npm run typecheck:test` (tests); both via `npm run typecheck:all`
- Check for unused exports: `npm run check:unused` — a ratchet against the baseline in `scripts/check-unused-exports.mjs`; the count may fall, never rise. For the full list run `npx ts-unused-exports tsconfig.ts-unused.json --allowUnusedTypes --ignoreFiles='vite-env.d.ts|index.tsx|App.tsx'`
- E2E: Playwright specs live in `e2e/` — smoke, the core flow, the rooms of a class and the mixing presets in "Bibliothek" (`plans-library.spec.ts`) the questions before a deletion (`questions.spec.ts`) the first-visit onboarding (sample class and tours) and the layout shift of a first visit and a reload (`layout-shift.spec.ts`, at most 0.05) on a desktop, the tablet and phone layouts and the desktop layout worked by a finger on an interactive whiteboard (`touch-layouts.spec.ts`, projects `tablet`, `phone` and `whiteboard`, picked by the tags `@tablet` / `@phone` / `@whiteboard`), and on all four the head every page wears (`page-header.spec.ts`), and the help's shortcuts scrolling into view (`help.spec.ts`), and the export sheets as pictures (`export-sheets.spec.ts`, project `visual`, Linux only) (`npm run test:e2e`; needs `npx playwright install chromium`)
- Export sheet snapshots: the seating plan, the circle, the list and the substitute's sheet, upright and across, and the name cards in their three formats and to colour in, against the PNGs in `e2e/__screenshots__/`. Chromium draws text differently on every system, so they are drawn on Linux, as CI runs, and the spec skips itself elsewhere; on a Mac `npm run test:visual` compares and `npm run test:visual:update` redraws them in Docker (`scripts/visual-snapshots.mjs`: the Playwright image of the installed version, linux/amd64, packages in a volume of its own; Docker Desktop or `colima start --vm-type vz --vz-rosetta`). A change that alters a sheet on purpose redraws them in the same commit, after a look at the changed PNGs. The class they print is `e2e/fixtures/sheets.klassenplan`, a backup restored through the app's own import (`WRITE_SHEET_FIXTURE=1 npx vitest run sheetsFixture` writes it anew, which changes every snapshot)
- i18n consistency: `npm run check:i18n` (DE/EN key parity + no `t(key, 'default')` inline default + no key that no code refers to)
- Bundle budgets: `npm run check:bundle` (after a build; part of `npm run build:static`)
- Live addressing: `npm run check:live-seo` (after a deploy, by hand: every sitemap address answers 200 and is its own canonical, slash/`http://`/`www.` spellings redirect permanently, unknown addresses are 404; decision 0029)
- Licences: `npm run check:licenses` (every production package in the lockfile is under a licence of `ALLOWED_LICENSES` in `scripts/utils/thirdPartyLicenses.ts`; the build itself writes `dist/third-party-licenses.txt` and fails on the same; `docs/SECURITY.md` § 4)
- Docs consistency: `npm run check:docs` (relative links, heading anchors and `src/…`-style paths in Markdown resolve; `docs/CHANGELOG.md` is skipped)
- Algorithm runtime: `npm run bench` (by hand, not in CI; figures in `docs/PERFORMANCE.md`)
- Mix quality: `MIX_QUALITY=1 npx vitest run mixQuality --silent=false` (by hand: six rooms, 30 seeds each, every criterion's fulfilment and the time per mix; figures in `docs/PERFORMANCE.md` and decision 0031)
- Mix runs: `MIX_RUNS=1 npx vitest run mixRuns --silent=false` (by hand: six plans one after the other in three rooms, 30 seeds each — how wishes take turns, whether friends stay together, how pairs repeat and every criterion's fulfilment over the run; figures in decision 0033)

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
- Follow existing commit message patterns (`fix:`, `change:`, `docs:`, `test:`, `update:` …), and keep the message short: a subject that says what changed, then a few lines at most — the code, the docs and the decision records carry the details
- Changelog entries, in `## [Unreleased]` as at a release, are written for teachers, who skip long ones: one short sentence each saying what changed for them, never how or why; related changes share one entry, and small fixes end the section as one "Other small fixes"
- Work happens on `update`; `main` only ever receives it as a fast-forward (`git merge --ff-only update`), never a merge commit

### Release workflow

A release is not finished when `main` is pushed — nothing is published until
the tag is. `.github/workflows/docker.yml` runs on `push: tags: ['v*']`, builds
the image for both architectures, pushes the multi-arch manifest to GHCR as
`X.Y.Z`, `X.Y` and `latest`, and only then creates the GitHub release. A push to
`main` alone triggers `ci.yml` and nothing else.

1. Run the gates on `update`: `npm run check:ci` — every check CI runs, the
   E2E specs and `build:static` with the bundle budgets included — and make
   sure the last CI run on `update` is green (`gh run list --limit 3`).
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
4. `git push origin main` and `git push origin update`, then wait for CI on
   the bump commit to go green (`gh run watch <id>`) before tagging
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

A coach mark that explains what a help topic explains takes that topic's key
(`help.*`), so the tour and the help say the same; only what the help leaves to
the screen — the way on, the toolbar's foot, the help itself — has a text of
its own under `generator:tour.*`. A tour reads its screen as a page is read:
header, toolbar top to bottom, stage, inspector, status bar left to right. The
keys are looked up with computed keys (`src/components/onboarding/tours.ts`),
which `npm run check:i18n` cannot see;
`src/components/onboarding/__tests__/tours.test.ts` checks instead that every
mark has a title and a body in both languages and names a help topic or a
`tour.*` key.

`e2e/onboarding.spec.ts` asserts the German tour titles word for word and in
tour order. When you rename a title in `de/generator.json`, add, remove or
reorder a mark in `tours.ts`, or change a view so that a mark's element is no
longer on screen, update the title lists in that spec as well.

"Bibliothek" has a tour of its own (`library`), hosted by `SeatingPlanHeader`
like the layers' tours. A teacher coming from a version before 3.0 sees
`RedesignWelcome` once in place of the post-update notice (`isRedesignUpgrade`);
its "Tour starten" makes every tour due again (`restartTours`) — decision 0015.

### Help texts

The help's topics (`src/components/help/workspaceHelpTopics.ts`,
`pageHelpTopics.ts`) each name a key written out in full, its `.title` and
`.body` beneath it, which `check:i18n` sees through that parent;
`src/components/help/__tests__/helpTopics.test.ts` checks both languages. A
topic is two or three words and one sentence about what the screen does not
say by itself — a key goes into `utils/shortcuts.ts`, which the help lists
under "Tastenkürzel".

### Inline defaults

Call `t('some.key')` without a second argument. A second string is a
_fallback_, not a translation: when the key is missing from the JSON, i18next
renders that German text — on `/en` too. `npm run check:i18n` fails on any
inline default; the one exception is `RootErrorBoundary`, which must render when
the bundles did not load.

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
`formatDateAndTime`), which resolve the locale from the active i18n language
via `Intl.DateTimeFormat`.
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
- `npm run capture:preview-screenshots` - Re-shoots all start page screenshots (6 slides × DE/EN × light/dark) as PNG masters in `assets/preview/` (kept out of `public/`, so no build ships them) from the sample class in a varied room, then runs `generate:preview-images`; starts its own dev server (needs `npx playwright install chromium`, libwebp and libavif). Run after UI changes that show on the slides
- `npm run generate:preview-images` - Full-size and downscaled (`-480/-960/-1440`) AVIF/WebP start page screenshots from the PNG masters in `assets/preview/` into `public/preview/`, then stamps a hash of them into `src/data/previewImages.json` as `version`, which the carousel appends to every image URL (`?v=…`) — the file names never change, and nginx and the service worker cache them as immutable; run after replacing a screenshot and commit the JSON with the images (needs libwebp and libavif)
- `npm run generate:glyph-widths` - Measures the advance widths of Atkinson Hyperlegible Next (weights 400 and 700) in Chromium and writes `src/data/nameGlyphWidths.json`, which lays out the names on the seats; run after updating `@fontsource-variable/atkinson-hyperlegible-next` (needs `npx playwright install chromium`)
- `python3 scripts/generate-wordmark.py` - Sets "Klassenplan" in Onest Bold as outlines and rewrites `public/brand/wordmark`, `public/brand/lockup` and `src/components/kpWordmarkPaths.ts`; by hand, only when the wordmark changes (needs fonttools, brotli, uharfbuzz, rsvg-convert; usage at the top of the script)
- `npm run check:ci` - Every check CI runs, in its order: lint, typecheck, i18n, unused exports, docs, licences, unit tests, E2E, `build:static` (needs `npx playwright install chromium`)
- `npm run check:i18n` - DE/EN key parity + no inline defaults + no unused keys
- `npm run check:bundle` - Enforce bundle size budgets against `dist/` (run after a build)
- `npm run check:unused` - Unused-export ratchet (baseline in `scripts/check-unused-exports.mjs`)
- `npm run check:docs` - Links, heading anchors and repository paths in the Markdown docs resolve
- `npm run check:licenses` - Production dependencies under licences compatible with the AGPL (the build writes `dist/third-party-licenses.txt`)
- `npm run check:live-seo` - The deployed site's addresses: one per page, permanent redirects, real 404 (`SITE_URL`, needs the network)
- `npm run bench` - Seating algorithm runtime benchmark (by hand)
- `vitest run --reporter=verbose` - Run tests with detailed output
- `vitest run src/path/to/test.test.ts` - Run single test file

## Core Architecture

This is a React-based classroom seating plan generator. Its workspace is one shell — header, layer switcher, stage, status bar (`src/components/shell/`) — around three layers of the same classroom: Klasse, Raum, Plan. Internally the layer is the numeric `step`, though the switcher does not present it as a one-way road. The application combines layered contexts, Zustand stores, XState machines for canvas interaction, repository-backed persistence and a constraint-driven algorithm pipeline running in a web worker. Goals, non-goals, scenarios and data-flow diagrams: `docs/ARCHITECTURE.md`.

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
- **Tables carry ids, locks name their table by id** (decision 0036): `withTableIds` gives every table of the live scene an id where a scene enters it (layout store, the canvas's scene transaction), a copy one of its own; `anchorLocks` derives a lock's index from its `tableId`, `-1` while the table is gone — `removeTables` rests those locks, and the room's undo brings them back with the table. A resting lock binds nothing.
- **Stored seats are ids** (decision 0035): `IndexedDBRepository` writes every seat of the class collection — the open arrangement, plans, mixes, parked rooms, circles — as its student's id and reads the class's students back onto them (`dehydrateCollection` / `hydrateCollection`, `src/utils/data/storedSeating.ts`), and the backup does the same from export version 3 on. The app never sees an id on a seat; a new place that stores seating goes through that module both ways.
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
- **One criterion model** (`utils/algorithm/model/`, decision 0031): every criterion is written down once — a pair, seat, table or language term in `criteria.ts` — and the construction, the refinement, the fulfilment beside each criterion and the highlights on the seats all read it, so what a teacher reads is what was optimised. `seatRelations.ts` relates two seats as `partner` (the seat pair by index), at a group table `corner` or `opposite` by where they sit at it (the template's grid and the edge each seat faces, so a turn changes nothing) and `table` for the rest of it, or at another table the nearest seat `beside`, `ahead` or `behind` relative to the board, with no aisle between (`ADJACENT_GAP`, `ROW_GAP`); a relation weighs by `RELATION_WEIGHTS`, a criterion by its weight and `CRITERION_WEIGHTS` (all in `constants.ts`). `objective.ts` sums the terms and computes a swap exactly (`swapDelta`) — the refinement keeps a running score and trusts it. `fulfilment.ts` counts every criterion's cases against what the room and the class allow, so 100 % is a plan the mixing could not improve on; `seatingStatistics.ts` and `criterionHighlights.ts` stay the entry points the UI boundary allows. A new criterion is a term there and a case there, never a scorer of its own. Boys, girls and diverse students are three genders of their own.
- Window/door distances come from `algorithm/featureDistances.ts` (memoized per scene geometry) — the criterion model reads that one implementation.
- Randomness is injectable: every entry point accepts an `rng` (`algorithm/rng.ts`), defaulting to `Math.random`. Production behaviour is unchanged; tests pass `createRng(seed)` for exact assertions.
- Runs in a web worker; `src/workers/algorithmOperations.ts` holds the single implementation that both the worker and the main-thread fallback call, so the two cannot diverge. `algorithmWorkerClient.ts` owns transport: aborted and timed-out requests reject instead of silently re-running inline. The worker reports progress **stages**, never text — it cannot know the UI language.
- CSV parsing has its own worker (one dedicated instance per parse, cancelled by terminating it).
- A mix is one session in one worker call (`mix:run`, `runMixSession`): while a criterion carries weight, three starts of construction and simulated annealing (the refinement), each by the construction's tables' targets and the same pairs of the plans in use — never a mix, never the plan on screen as such (decision 0032) — weighed by recency, frequency and kind; the best plan by the score wins, never one worse than a construction. Without a criterion the students are dealt onto the seats at random (Fisher–Yates) and nothing else happens. "Vordere Plätze" at "Sehr wichtig" keeps the students needing a front seat within the front rows (`model/frontPool.ts`); below it the row behind them counts as a front seat too and every row further back costs steeply more (`frontRowsOf`, `frontSeatCost`), and stored settings without `criteriaVersion` are lifted once (`migrateStoredMixSettings`). The mix history records its result once, and nothing refines outside a mix — a restored plan stays as it was saved (decisions 0027, 0031). After a mix the circle follows (`useCircleAfterMix`).
- Circle mode stays in sync through `generateCircleSeating`, `regenerateCircle`, and `syncCircleFromTable` actions.
- Template system (`single`, `double`, `group4`, `group6`) defaults to 0° rotation and feeds drag-and-drop operations.

### Hook & Component Landscape

- Hooks are grouped by domain (`hooks/wizard`, `hooks/scene`, `hooks/canvas`, `hooks/circle`, `hooks/ui`, `hooks/student`) and favour focused responsibilities (scene history, canvas interactions, shortcut handling, drag/drop state, pan/zoom, photo cache, etc.).
- **The interface's rules live in [`docs/UI.md`](docs/UI.md)**: the workspace shell (header, toolbar, stage, inspector, status bar) and how each behaves from a phone to a whiteboard, the class list, the inspector's shape, the drag, how the plan fits the stage and turns upright, the room inspector, help beside the stage, the criteria panel, the export page, "Bibliothek", the projection, the class tools and the pages beside the app. **Read it before you change anything under `src/components` or `src/pages`**, and bring it up to date in the same change when the interface behaves differently afterwards
- Layer UI resides in `src/components/SeatingPlanGenerator/` with shared UI primitives in `src/components/ui/` and student tools in `src/components/students/`.
- Circle-specific components live under `src/components/circle/`; presentation mode lives in `src/pages/Present.tsx` + `src/components/scene/PresentationScene.tsx`.

### Styling & Design Tokens

- Tailwind CSS 4 via `@tailwindcss/vite` with semantic utilities defined in `src/index.css` (`@theme` + `@utility`).
- `@/utils/ui/designTokens` exports surface/button bundles (`primaryButtonClass`, `inputFieldClass`, …); student toggles rely on `@/components/students/studentStyleTokens` for consistent sizing and coloring.
- Components should only add layout classes on top of tokens — no ad-hoc color utilities.
- **Motion has places, not a style** (`docs/DESIGNSYSTEM.md` § 6g). Curves and durations live in `utils/ui/motion.ts`, and everything that moves asks `motionEnabled` first, since the reduced-motion guard in `index.css` reaches CSS only. A mix, an undo or a swap lets the students glide to their new seats (`useSeatFlight`: inert copies on a layer above every table, started where the student sat; the seats carry `data-seat-flight`, `data-seat-student`, `data-seat-centre`, their badges and photos `data-seat-flight-part`; `holdStill` keeps the student a finger put down; every position is read before a copy is hung, and the copies wait at the old seat until the frame after the first that shows them, or the commit's own time comes off the flight; a seat is drawn in the shape its table cuts — `insetSeatPath` with no inset — and carries the table's outline along its outer sides (`seatTableEdges`, `seatTableEdgePath`), hidden on the seat and shown in the copy (`data-seat-flight-edge`), so nothing changes when it lands); drawers, the phone's sheet and the room's tray slide from their edge, the inspector's column over the window's, the toolbar's width glides (`usePanelMotion`, `useWidthMotion`); a dropdown fades (`FloatingDropdown`); another layer fades in (`useLayerFade`, not View Transitions, which change the state a frame late). The logo moves in two moments (`components/shell/brandMotion.ts`, decision 0040): pointed at, it plays once to its end, and between the start page and the workspace, the only two heads that take part, its letters fly onto the mark's seats. The change itself always happens at once — what is gone or hidden moves as an `inertCopy` — and nothing moves across a change of layout, on the first drawing or under reduced motion.
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
- Service worker uses the **prompt update model** (`registerType: 'prompt'`, `skipWaiting` disabled) — a new SW activates only after the user confirms via `ReloadPrompt`. `clientsClaim` is on: it reaches only a page no worker controls yet, so the first visit is offline-ready without a reload while an update still waits (decision 0009). A path with a file extension (`/robots.txt`, `/.well-known/security.txt`) is kept out of the navigation fallback (`navigateFallbackDenylist`), or the precached shell answers it with the app's 404. Where a page cannot have a service worker (plain HTTP — a school's intranet, a staging host — or a browser that refuses one), the whole app still works offline: the build writes `offline-files.json` (every chunk, worker, stylesheet and font; `klassenplan:offline-file-list` in `vite.config.ts`) and `startOfflineWarmup` loads them into the HTTP cache while idle, which works because nginx serves them as immutable. Only `ReloadPrompt` may call `useRegisterSW`; everyone else reads the registration from the `swUpdateController` singleton (`src/hooks/pwa/`), which the settings gear's `UpdateCheckButton` uses for an on-demand check; what a check finds the button itself says ("Aktuell · v3.2.0", offline, failed — `useUpdateCheck`'s `answer`), not a toast over the open menu. A waiting version is a state (`setUpdateReady`, `useUpdateReady` in `swUpdateController`): the status bar shows "Neue Version" and the gear's row "Aktualisieren", and `ReloadPrompt` raises its toast only while no status bar is mounted (`useStatusBarMounted`) — decision 0037. `ReloadPrompt` additionally re-checks hourly, on `visibilitychange` and on `online`. A toast that must stay open takes `duration: 0` — `Infinity` is clamped to a 32-bit int by `setTimeout` and fires after ~1 ms.
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

**Stored formats: properties over examples.** What is written and read back —
seats as ids, the rooms of a class, locks by table id, a backup the import
must read, stored mix settings — is tested with fast-check
(`*.property.test.ts`, 200 runs each) on generators in
`src/__tests__/utils/arbitraries.ts`, which produce only what the app can hold.
A failing property prints its seed and the smallest value that breaks it: that
is a bug to fix, not a flake to retry.

### Modern Test Patterns (Preferred)

**When writing or modifying tests, use semantic accessibility-first queries:**

```typescript
// ❌ Fragile - breaks with UI text changes
screen.getByText('Erfolgreich gespeichert');

// ✅ Robust - ARIA roles, through the shared helpers or Testing Library
import { getButton, getDialog, getHeading } from '@/__tests__/utils';

getButton(/Speichern|Save/i); // Button by accessible name
getDialog(/Backup/i); // Dialog by its title
getHeading(/Klassenliste|Class list/i, 2); // h2 by text
screen.getByRole('checkbox', { name: /Unruhig|Restless/i });
```

**Shared helpers** (`src/__tests__/utils/`): `getButton`, `getHeading`,
`getDialog` (`accessibilityHelpers.ts`), `setupLocalStorageMock`
(`mockHandlers.ts`), the mock
factories in `testHelpers.ts`, `createMemoryIdbKeyval`,
`resetSeatingRepository`/`unmountAndSettle` and the property generators
(`arbitraries.ts`). A helper nobody calls does not stay.

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

- **A message is a toast only when nothing closer can say it** (decision 0037). Four questions, in this order: is the result on the screen — then `announce()` (`utils/ui/toast`), heard by a screen reader, no card; does it belong to a control — then the control answers, under its field or at the blocked button (`useRefusalHint`, `HintTooltip open`); is it a state or a confirmation the screen does not show — then the status bar (`confirmInStatusBar`, `useUpdateReady`); only then `showToast`. Default messages are i18n keys (`toast:errors.*`). A toast stands over the middle of the status bar, 16 px above it — clear of the toolbar, the inspector's column and an open drawer, and where the middle leaves too little room for that, centred on what they leave; `AppShell` measures this for the provider (`hooks/ui/toastDock.ts`, `data-shell-toolbar`, `data-shell-inspector`, below `md` above what carries `data-status-bar-hang`) — and at the bottom of the window outside the shell; the newest nearest the bar. A view that faces a room calls `quietSuccessToasts()` (the projection does). A toast rises in and sinks out (`components/ui/feedback/toastMotion.ts`; under reduced motion and in jsdom it comes and goes at once), a hairline shows the time it has left, which stands still while a toast is pointed at, holds the focus or is swiped and while the page is in the background; a tap anywhere on it or a swipe sideways or down puts it away, only its own button does something else; the same id again keeps its card and starts its time anew. Errors stand 8 s
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
- **A deletion asks as near its button as what it takes along allows** (decision 0041): what comes back asks nothing and offers "Rückgängig" (`offerStudentUndo`, in "Bibliothek" `useLibraryHistory`), what loses only itself asks in place (`question` on a row of `InspectorMenuButton`, `InlineQuestion`), what takes more along asks in `ConfirmDialog`, which counts what goes (`confirmFacts`)
- **No global Enter-to-confirm** on destructive questions — `InlineQuestion` and `ConfirmDialog` focus "Abbrechen", so Enter cancels unless the confirm button was chosen on purpose
- **One focus ring**: `--focus-ring`, quiet ink, for every control; blue stays with what can be pressed and what is selected
- **Responsive design** that works at 200% zoom
- **Breakpoints are rem, in CSS and JS alike**: Tailwind's `md:` is `48rem`, which moves with the browser's default text size (18px puts it at 864px). A layout decision in JS goes through `useBreakpointUp` / `useLayoutMode` / `isBreakpointUp` (`hooks/ui/useBreakpoint.ts`), which compare in rem too — never `window.innerWidth` against a px number, or the two disagree in between
- **Touch-optimized** interactions for mobile devices: on a coarse pointer a control is a 44px target (`pointer-coarse:` in the markup, `useIsCoarsePointer` in an SVG, where a transparent hit area around the painted shape grows), the toolbar starts with its labels from `xl` up (`ToolRailContext`), and a choice that needs hover is left out (`buildPhotoDisplayGroup`'s `hasHover`)

## Important Constraints

- Maximum 36 students per classroom (defined in `src/utils/constants.ts`)
- Classroom dimensions are fixed at 900x600 pixels
- Mix history is limited to 20 entries to prevent memory bloat
- Backup files have strict size limits (24 MB decrypted content, the encrypted file's limit derived from it; see `BACKUP_LIMITS`); the export checks its result with the import's validator and refuses a backup the import would refuse (`BackupExportError`)
- Student photos: 20 MB max input, stored as ~160px JPEG blobs (EXIF stripped via canvas re-encode)

## Color Palette Standards

Colour is split in two, and the split is the rule that matters (see
`docs/DESIGNSYSTEM.md` § 4):

**The interface is paper and ink.** A warm neutral ramp (`--surface-page`,
`--surface-card`, `--border-card`, `--text-page`, `--text-muted`) plus exactly
one accent:

- **Blue (`#2563eb`, `--button-primary-bg`)** - the only colour that means "you
  can act here": the one primary button per screen, selection. The focus ring is
  quiet ink (`--focus-ring`), not blue.
- **Rose (`#be123c`, `--button-danger-bg`)** - destructive actions only, never
  next to the primary button.
- **Green (`#15803d`, `--button-success-bg`)** - confirmation of a completed
  action, not a decoration.

**Everything else that is coloured describes pedagogy**, through the `--data-*`
families, and never appears in chrome. Each family always ships with an icon and
a spelled-out word, so colour is never the only channel:

| Family           | Token prefix      | Covers                                                                                |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------- |
| Verhalten        | `--data-behavior` | Unruhe, Ablenkbarkeit, Ablenkung durch Unruhe                                         |
| Soziales         | `--data-social`   | Schüchternheit, Wunsch-/Distanzpartner, Rollen                                        |
| Lernen           | `--data-learning` | Fördern heterogen, Fördern homogen                                                    |
| Sprache          | `--data-language` | Sprachförderung, Sprachstand                                                          |
| Platz &amp; Raum | `--data-space`    | Vordere Plätze, Körpergröße, Fensterplätze, Türnähe, Freier Nachbarplatz, Linkshänder |
| Person           | `--data-person`   | Geschlechtermischung, Foto, Name                                                      |
| Verlauf          | `--data-history`  | Wiederholung (the plans already used, not a student)                                  |

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
design system reserves for step labels. A `dark:` variant is a sign the colour
is not a token yet — there are no palette-based ones left. Dark mode is handled inside the token, so no
`dark:` variant is needed when a token is used; hand-written colour utilities
still need one and should be replaced instead.
