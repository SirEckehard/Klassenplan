# PERFORMANCE – Measurements & Optimizations

## Overview

Klassenplan approaches performance from two angles: Core Web Vitals at runtime, and build/bundle optimizations that keep the initial load small. The runtime half is deliberately thin — see "What was removed" below.

## Budgets

Klassenplan has no server, so there are no service level objectives in the usual sense. These budgets take their place. Figures from 2026-09-14; initial payload and algorithm runtime from 2026-09-16.

| Area                                 | Budget                                                        | Current                                                                   | Checked by                                                  |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Initial payload                      | ≤ 220 KB brotli, ≤ 840 KB raw                                 | 195.4 KB brotli, 749.6 KB raw                                             | `npm run check:bundle`, part of `build:static` (CI, Docker) |
| Largest chunk                        | ≤ 78 KB brotli, ≤ 330 KB raw                                  | 64.2 KB brotli, 276.3 KB raw                                              | same                                                        |
| CSS                                  | ≤ 24 KB brotli, ≤ 200 KB raw                                  | 19.1 KB brotli, 171.4 KB raw                                              | same                                                        |
| Core Web Vitals                      | "good": LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1                  | Start page CLS 0.067 after prerendering ([SEO.md](SEO.md)); no field data | Logged in the browser only (`webVitals.ts`)                 |
| "Mischen" with criteria, 36 students | ≤ 500 ms on the slowest supported device                      | ≈ 109 ms under Vitest 5 (≈ 66 ms under Vitest 4), Apple M1 Pro            | `npm run bench`, by hand                                    |
| Offline use                          | The generator works without a connection after the first load | Since v1.2.0                                                              | Not tested automatically                                    |

The runtime budget is deliberately not a CI check: timings on a shared runner vary too much for a fixed ceiling. It is re-measured with `npm run bench` when the algorithm changes.

## Algorithm runtime

`src/utils/algorithm/__tests__/seatingAlgorithm.bench.ts` measures the calls the app sends to the worker, for a class with every attribute set, a full mix history, two saved plans and two locked seats, on double tables. All inputs come from fixed seeds.

Mean time per call in milliseconds, Apple M1 Pro, Node 24, Vitest 5.0.1, median of three runs, 2026-09-16:

| Students | Construction | Refinement, annealing ("Mischen" 600 × 2) | Refinement, greedy (600 × 2) |
| -------: | -----------: | ----------------------------------------: | ---------------------------: |
|       12 |         0.15 |                                        94 |                            9 |
|       24 |         0.66 |                                       102 |                           16 |
|       36 |         1.45 |                                       107 |                           21 |

`npm run bench` passes `--reporter=verbose`: Vitest 5's default reporter prints no result table.

**Vitest 5 measures about 60 % more than Vitest 4 for the same code.** On the same machine and day, Vitest 4.1.11 measured 0.10 / 0.41 / 0.90 ms for construction, 59 / 61 / 65 ms for annealing and 5 / 10 / 13 ms for the greedy search — in line with its figures from 2026-09-14. Vite's module runner turns every imported binding into a getter, and the algorithm calls helpers such as `isRestless` often enough for that to show; Vitest warns about it on every run. The bundled app has no such getters, so the Vitest 4 figures are the closer estimate of what a teacher waits for. Switching the runner off (`experimental.viteModuleRunner: false`) would avoid the overhead but leaves the `@/` alias unresolved. Compare runs under the same Vitest major only.

What the numbers show:

- **Refinement dominates.** "Mischen" with criteria is construction plus annealing, about 109 ms for a full class under Vitest 5 (66 ms under Vitest 4).
- **Annealing hardly depends on class size.** It runs a fixed cooling schedule (see [ALGORITHM.md](ALGORITHM.md#configuration)).
- **`triesPerPass` and `passes` do not reach annealing.** They only apply to the greedy search, which the app does not use. The "Verfeinern" button, which passed 1,800 × 4, therefore did the same refinement work as "Mischen"; it measured 56 / 59 / 62 ms under Vitest 4 as well and was removed on 2026-09-14.
- **Class size is not what limits the algorithm up to 36 students.** Larger classes were not measured.

### Does a longer refinement help?

Checked on 2026-09-14 with a temporary experiment on the same fixture, timed under Vitest 4: 20 seeds per class size, scored by the weighted criteria fulfilment the statistics badge shows (higher is better).

| Variant                                               | 24 students | 36 students | Time, 36 students |
| ----------------------------------------------------- | ----------: | ----------: | ----------------: |
| Construction only                                     |      54.5 % |      53.7 % |              1 ms |
| "Mischen": construction and annealing                 |      59.7 % |      60.7 % |             60 ms |
| "Verfeinern" afterwards, as today                     |      61.6 % |      59.9 % |             59 ms |
| "Verfeinern" with three times the swaps per step      |      61.2 % |      59.8 % |            178 ms |
| "Verfeinern" with slower cooling (0.99)               |      60.9 % |      60.2 % |            180 ms |
| "Verfeinern" with both                                |      61.9 % |      59.9 % |            539 ms |
| "Verfeinern" as greedy search, 1,800 tries × 4 passes |      61.1 % |      60.4 % |             71 ms |

- **The refinement inside "Mischen" is what matters:** five to seven points over construction alone.
- **A second refinement is a coin toss.** It gains one to two points for 24 students and loses up to one point for 36, where more runs got worse than better.
- **Longer schedules do not pay off.** They take three to nine times as long without a consistent gain, so the app's schedule stays as it is.
- **Annealing optimises the internal table score, not the badge's percentage.** The two do not always move together, which is how a refinement can lower the value a teacher sees.
- **Consequence:** the "Verfeinern" button was removed on 2026-09-14. The rows above keep its name for the record.

The fixture is one synthetic class in one room; differences of one or two points are small.

## Core Web Vitals monitoring

- **Metrics:** LCP, INP, CLS, FCP and TTFB are registered through `web-vitals` in `src/utils/performance/webVitals.ts`.
- **Thresholds:** good is ≤ 2.5 s (LCP), ≤ 200 ms (INP), ≤ 0.1 (CLS), ≤ 1.8 s (FCP), ≤ 800 ms (TTFB); up to the second boundary counts as "needs improvement", above it as "poor".
- **Logging is the whole output.** A "poor" measurement is a `logWarn`, everything else a `logInfo` — so a production console stays quiet unless something is actually slow, while a developer sees every value at INFO level. Nothing is stored and nothing is sent anywhere: the CSP allows `connect-src 'self'` and there is no analytics endpoint.
- **Registration:** `src/index.tsx` calls `initializeWebVitals()` through `scheduleIdleTask` after the first render, importing the module dynamically so `web-vitals` stays out of the entry chunk. The listeners use buffered `PerformanceObserver`s, so metrics from before that point are still reported.

## What was removed (2026-09-05)

The runtime layer used to be ≈1,700 lines: a `PerformanceDashboard` overlay, a `PerformanceDebugButton`, `usePerformanceMonitoring` (React context, per-component render timing, memory polling, `withPerformanceTracking`, `useAsyncPerformanceTracking`), `usePerformanceDashboard`, a navigation observer that patched `history.pushState`/`replaceState` to time route transitions, a `PerformanceResourceTiming` observer for chunk loads, an overall-score calculation, and a `performanceDashboard` feature flag with its own env-var resolution.

None of it reached a backend, all of it was visible only to a developer running the app locally, and Lighthouse or the DevTools performance panel answer the same questions without any code. Coverage reflected that: the dashboard and its hook sat at 0 %.

For profiling, use the browser's own tooling. If field telemetry ever becomes a requirement, the place to add a sink is `handleMetric` in `webVitals.ts`.

## Start page load

A PageSpeed Insights review of the start page on 2026-09-16 (Lighthouse 13.4, desktop and mobile) led to these changes:

- **Language from the URL.** i18next-browser-languagedetector cached `de-DE` before `src/i18n/i18n.ts` compared the stored value with `'de'`, so every first visit loaded the English bundle, rendered the German start page in English and switched back — six extra chunks, six extra screenshots and a layout shift of 0.12. The language now follows the path alone (`languageForPath`).
- **Carousel screenshots.** The slot is at most 488 CSS px wide but received the 2990 px originals, all six at once, since stacked slides are all inside the viewport and `loading="lazy"` holds none of them back. `HeroMockup` now serves `srcset` variants of 480, 960 and 1440 px (`npm run generate:preview-images`, widths in `src/data/previewImages.json`) with `sizes` that account for portrait shots, and mounts only the visible slide and the next one.
- **Service worker precache.** Globbing `png` precached all 24 screenshot PNGs — 11 MB on every first visit. `preview/**` is now excluded from the glob; `includeAssets` lists the German 480 and 960 px AVIFs for offline use. The precache went from 15.7 MB to about 4 MB.
- **Font.** The Latin DM Sans file is preloaded (`preloadPrimaryFont` in `vite.config.ts`), and `DM Sans Fallback` in `src/index.css` gives Arial the metrics of DM Sans so the swap does not move text.
- **Entry chunk.** The storage history modal, the backup flow (dialogs, validators, `dataBackup`) and the CSV import pipeline with papaparse load on first use. The entry chunk shrank from 677 to 537 KB raw (162 to 133 KB brotli), and the Phosphor icons in it from 49 to 25.
- **Accessibility.** Carousel dots have 24 × 24 px targets, and the logo link's accessible name starts with its visible text.

Not done, deliberately:

- **Inlining critical CSS.** The usual swap from `media="print"` relies on an inline `onload` handler, which `script-src 'self'` blocks. Worth it only if a new measurement still shows the stylesheet as the render-blocking cost.
- **Trimming icon weights.** Each Phosphor definition carries all six weights; the 25 icons left in the entry chunk take about 84 KB raw. A subset with only `regular` and `fill` would mean replacing every icon import.

**Measuring:** lab runs of the same build vary widely. In some runs a freshly started headless Chrome painted its first frame one to two seconds late while the main thread sat idle (28–36 ms of work), which moved the mobile score between 81 and 91 without any code change. Compare the median of three to five runs.

## Build & bundle optimizations

- **Automatic chunking:** `vite.config.ts` deliberately sets no `manualChunks`. Forcing group names made Rolldown merge the shared app core into a `pdf-utils` chunk and pulled `jspdf` into every page load; automatic splitting keeps the lazily imported code out of the entry graph. Only the output file names are steered (`vendor/`, `chunks/`, `entry/`).
- **Budgets:** `npm run check:bundle` enforces size limits against `dist/` and runs as part of `npm run build:static`.
- **Compression & PWA:** Brotli compression from 1 KB upward (`vite-plugin-compression`) for JS/JSON/CSS/SVG plus a PWA precache strategy for fonts. HTML is deliberately excluded – see [SEO.md](SEO.md) for why precompressing it would serve a stale shell.
- **Strict CSP on the dev server:** despite relaxed inline scripts for HMR, the remaining directives stay restrictive so misconfigurations surface early.

## Prefetch & navigation

- **Route preloader:** `preloadLikelyRoutes` uses `requestIdleCallback` to warm up wizard and export pages. Missing routes trigger warning logs.
- **Prefetch hints:** `addPrefetchHint` creates `<link rel="prefetch">` entries once and logs them at debug level. Options for `as`, `crossOrigin` and `importance` are available.
- **Wizard-specific:** `prefetchGeneratorSteps` loads upcoming steps (e.g. the circle view) while the current step is still being edited.
- **`prefetchOrchestrator`** wraps those jobs to log their duration and failures. It kept a 40-entry telemetry ring for the dashboard; that is gone with it.
