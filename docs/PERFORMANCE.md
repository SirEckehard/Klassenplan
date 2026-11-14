# PERFORMANCE – Measurements & Optimizations

## Overview

Klassenplan approaches performance from two angles: Core Web Vitals at runtime, and build/bundle optimizations that keep the initial load small. The runtime half is deliberately thin: Web Vitals go to the console, and for profiling the browser's own tools answer the questions ([decision 0008](decisions/0008-no-telemetry.md)).

## Budgets

Klassenplan has no server, so there are no service level objectives in the usual sense. These budgets take their place. Bundle figures from 2026-11-14, algorithm figures from 2026-10-18, Core Web Vitals from 2026-09-14, layout shift from 2026-11-06.

| Area                                 | Budget                                                        | Current                                                                                                                  | Checked by                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Initial payload                      | ≤ 220 KB brotli, ≤ 840 KB raw                                 | 212.6 KB brotli, 765.9 KB raw                                                                                            | `npm run check:bundle`, part of `build:static` (CI, Docker)                                                         |
| Largest chunk                        | ≤ 78 KB brotli, ≤ 330 KB raw                                  | 50.5 KB brotli, 193.8 KB raw                                                                                             | same                                                                                                                |
| CSS                                  | ≤ 24 KB brotli, ≤ 200 KB raw                                  | 14.0 KB brotli, 91.8 KB raw                                                                                              | same                                                                                                                |
| Core Web Vitals                      | "good": LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1                  | Start page CLS 0.067 after prerendering ([SEO.md](SEO.md)); the workspace 0 on a first visit and a reload; no field data | Logged in the browser only (`webVitals.ts`); the workspace's layout shift ≤ 0.05 by `e2e/layout-shift.spec.ts` (CI) |
| "Mischen" with criteria, 36 students | ≤ 500 ms on the slowest supported device                      | ≈ 72 ms under Vitest 5, Apple M1 Pro (three starts)                                                                      | `npm run bench`, by hand                                                                                            |
| Offline use                          | The generator works without a connection after the first load | Since v1.2.0                                                                                                             | Not tested automatically                                                                                            |

The runtime budget is deliberately not a CI check: timings on a shared runner vary too much for a fixed ceiling. It is re-measured with `npm run bench` when the algorithm changes.

## Algorithm runtime

`src/utils/algorithm/__tests__/seatingAlgorithm.bench.ts` measures what the app asks of the worker — "Mischen" as one session of three starts of construction and annealing (`mix:run`, [decisions 0027](decisions/0027-one-mix-session.md) and [0031](decisions/0031-one-criterion-model.md)) — and its phases on their own, for a class with every attribute set, a full mix history, two saved plans and two locked seats, on double tables. All inputs come from fixed seeds.

Mean time per call in milliseconds, Apple M1 Pro, Node 24, Vitest 5.0.5, 2026-10-18:

| Students | Construction | "Mischen": three starts of construction and annealing | Refinement, one annealing |
| -------: | -----------: | ----------------------------------------------------: | ------------------------: |
|       12 |         0.16 |                                                    63 |                        21 |
|       24 |         0.60 |                                                    70 |                        24 |
|       36 |         1.30 |                                                    72 |                        24 |

`npm run bench` passes `--reporter=verbose`: Vitest 5's default reporter prints no result table.

**Vitest 5 measures about 60 % more than Vitest 4 for the same code.** Vite's module runner turns every imported binding into a getter, and the algorithm calls helpers such as `isRestless` often enough for that to show; Vitest warns about it on every run. The bundled app has no such getters, so a teacher waits less than these figures say. Switching the runner off (`experimental.viteModuleRunner: false`) would avoid the overhead but leaves the `@/` alias unresolved. Compare runs under the same Vitest major only.

What the numbers show:

- **Refinement dominates.** "Mischen" with criteria is three starts of construction plus annealing, about 72 ms for a full class under Vitest 5.
- **A swap is cheap.** It is computed exactly from the relations of the two seats (`swapDelta`) instead of scoring both tables anew, which is what pays for the three starts.
- **Annealing hardly depends on class size.** It runs a fixed cooling schedule (see [ALGORITHM.md](ALGORITHM.md#configuration)).
- **Class size is not what limits the algorithm up to 36 students.** Larger classes were not measured.

### Mix quality

`src/utils/algorithm/__tests__/mixQuality.test.ts` measures what a mix comes to by the fulfilment a teacher reads — seven rooms, 30 seeds each, every criterion's mean percentage and the weighted whole — and runs only on request (`MIX_QUALITY=1 npx vitest run mixQuality --silent=false`; without the flag Vitest 5 hides what a passing test prints). On 2026-11-06, after the window and door seats and the tables pushed together of 2026-11-02 — every room 0.7 to 1.3 points above 2026-10-29:

| Room                                       | Fulfilment | Time per mix, Vitest 5 |
| ------------------------------------------ | ---------: | ---------------------: |
| Single desks close together                |     88.0 % |                  24 ms |
| Double desks as "Neu einrichten" sets them |     89.4 % |                  30 ms |
| Group tables of four                       |     90.5 % |                  44 ms |
| Group tables of six, 28 students           |     88.2 % |                  62 ms |
| Mixed and turned tables                    |     87.7 % |                  42 ms |
| Double desks with history and locks        |     85.6 % |                  28 ms |
| Double desks, free seats and left-handers  |     90.1 % |                  33 ms |

The seventh room, added on 2026-11-12 with
[decision 0043](decisions/0043-free-neighbour-seat-and-left-handers.md), is 15
double desks for the 26 students of the second room, two of them needing the
seat beside free and every fifth left-handed; the six rooms before it gave the
same plans, seed for seed, after the two criteria came.

What a run of plans comes to — wishes taking turns, friends staying together, pairs repeating — is measured by `src/utils/algorithm/__tests__/mixRuns.test.ts` (`MIX_RUNS=1 npx vitest run mixRuns --silent=false`): six plans one after the other in three rooms, 30 seeds each, about 20 s; its figures are in [decision 0033](decisions/0033-wishes-take-turns.md).

The cooling schedule was checked on the score itself, 20 seeds of 26 students at double desks: the default reached −173.5 (90.1 % fulfilment, 18 ms), cooling at 0.99 −176.1 (90.1 %, 48 ms), at 0.995 with 200 swaps per step −179.8 (91.0 %, 384 ms). One annealing comes close to its best, so the schedule stays and "Mischen" takes three starts instead, which settle what one leaves to chance for little time. A second refinement after a mix is a coin toss ([decision 0027](decisions/0027-one-mix-session.md#appendix-the-measurement-of-2026-09-14)).

## Core Web Vitals monitoring

- **Metrics:** LCP, INP, CLS, FCP and TTFB are registered through `web-vitals` in `src/utils/performance/webVitals.ts`.
- **Thresholds:** good is ≤ 2.5 s (LCP), ≤ 200 ms (INP), ≤ 0.1 (CLS), ≤ 1.8 s (FCP), ≤ 800 ms (TTFB); up to the second boundary counts as "needs improvement", above it as "poor".
- **Logging is the whole output.** A "poor" measurement is a `logWarn`, everything else a `logInfo` — so a production console stays quiet unless something is actually slow, while a developer sees every value at INFO level. Nothing is stored and nothing is sent anywhere: the CSP allows `connect-src 'self'` and there is no analytics endpoint.
- **Registration:** `src/index.tsx` calls `initializeWebVitals()` through `scheduleIdleTask` after the first render, importing the module dynamically so `web-vitals` stays out of the entry chunk. The listeners use buffered `PerformanceObserver`s, so metrics from before that point are still reported.
- **Profiling** is the browser's own tooling — Lighthouse and the DevTools performance panel. If field telemetry ever becomes a requirement, the place to add a sink is `handleMetric` in `webVitals.ts`.

## Start page load

What keeps the start page light, from a PageSpeed Insights review (Lighthouse 13.4, desktop and mobile):

- **Language from the URL.** The language follows the path alone (`languageForPath`), so a first visit loads one language bundle and never switches (`src/i18n/i18n.ts`).
- **Carousel screenshots.** The slot is at most 488 CSS px wide. `HeroMockup` serves `srcset` variants of 480, 960 and 1440 px (`npm run generate:preview-images`, widths in `src/data/previewImages.json`) with `sizes` that account for portrait shots, and mounts only the visible slide and the next one: stacked slides are all inside the viewport, and `loading="lazy"` holds none of them back.
- **Service worker precache.** `preview/**` stays out of the glob; `includeAssets` lists the German 480 and 960 px AVIFs for offline use. The precache holds about 4 MB.
- **Font.** The Latin Atkinson Hyperlegible Next file is preloaded (`preloadPrimaryFont` in `vite.config.ts`), and `Atkinson Hyperlegible Next Fallback` in `src/index.css` gives Arial its metrics so the swap does not move text. Source Serif 4 (the optical-size variant) carries headings only and stays unpreloaded — it is `font-display: swap` behind `Source Serif 4 Fallback` (Times New Roman).
- **Entry chunk.** The storage history modal, the backup flow (dialogs, validators, `dataBackup`) and the CSV import pipeline with papaparse load on first use.
- **Icon weights.** Each Phosphor definition carries all six weights; the app draws `regular` and `bold` only, so the build keeps those two (`scripts/utils/iconWeights.ts`, guarded by `src/__tests__/iconWeights.test.ts`). On 2026-11-06 that took the initial payload from 212.9 to 207.8 KB brotli and 776 to 748 KB raw — brotli had packed the four unused weights well already.
- **Accessibility.** Carousel dots have 24 × 24 px targets, and the logo link's accessible name starts with its visible text.

Not done, deliberately:

- **Inlining critical CSS.** The usual swap from `media="print"` relies on an inline `onload` handler, which `script-src 'self'` blocks. Worth it only if a new measurement still shows the stylesheet as the render-blocking cost.

**Measuring:** lab runs of the same build vary widely. In some runs a freshly started headless Chrome painted its first frame one to two seconds late while the main thread sat idle (28–36 ms of work), which moved the mobile score between 81 and 91 without any code change. Compare the median of three to five runs.

## Build & bundle optimizations

- **Automatic chunking:** `vite.config.ts` deliberately sets no `manualChunks`. Forcing group names made Rolldown merge the shared app core into a `pdf-utils` chunk and pulled `jspdf` into every page load; automatic splitting keeps the lazily imported code out of the entry graph. Only the output file names are steered (`vendor/`, `chunks/`, `entry/`).
- **Budgets:** `npm run check:bundle` enforces size limits against `dist/` and runs as part of `npm run build:static`.
- **Compression & PWA:** Brotli compression from 1 KB upward (`vite-plugin-compression`) for JS/JSON/CSS/SVG plus a PWA precache strategy for fonts. HTML is deliberately excluded – see [SEO.md](SEO.md) for why precompressing it would serve a stale shell.
- **Strict CSP on the dev server:** despite relaxed inline scripts for HMR, the remaining directives stay restrictive so misconfigurations surface early.

## Prefetch & navigation

- **Route preloader:** `preloadLikelyRoutes` uses `requestIdleCallback` to warm up the pages a teacher is likely to open next — from the workspace the export, the projection, the start page and the four class tools. It reads the route name rather than the raw path, so `/generator/` and `/en/generator` count as the workspace. Missing routes trigger warning logs.
- **Prefetch hints:** `addPrefetchHint` creates `<link rel="prefetch">` entries once and logs them at debug level. Options for `as`, `crossOrigin` and `importance` are available.
- **Layers:** `prefetchGeneratorSteps` loads the other two layers (e.g. the circle view) while the current one is still being edited — the one behind as well as the one ahead.
- **Offline without a service worker.** Where nothing is precached — an origin without HTTPS, a private window — the build's `offline-files.json` lists every chunk, worker, stylesheet and font, and `warmOfflineFiles` loads them into the browser's HTTP cache once the app is idle, four at a time and at low priority (about 1 MB brotli, as much as the precache). nginx serves them as immutable, so the cache answers offline, in that session and the next. It runs only where no service worker can serve the page; with one, the precache already holds everything. What fails all the same — offline before the run is done — fails gracefully (see [ARCHITECTURE.md](ARCHITECTURE.md#build-and-delivery)).
- **`prefetchOrchestrator`** wraps those jobs to log their duration and failures.
