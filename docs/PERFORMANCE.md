# PERFORMANCE – Measurements & Optimizations

## Overview

Klassenplan approaches performance from two angles: Core Web Vitals at runtime, and build/bundle optimizations that keep the initial load small. The runtime half is deliberately thin — see "What was removed" below.

## Budgets

Klassenplan has no server, so there are no service level objectives in the usual sense. These budgets take their place. Figures from 2026-09-14.

| Area                                 | Budget                                                        | Current                                                                   | Checked by                                                  |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Initial payload                      | ≤ 250 KB brotli, ≤ 900 KB raw                                 | 221.4 KB brotli, 878.2 KB raw                                             | `npm run check:bundle`, part of `build:static` (CI, Docker) |
| Largest chunk                        | ≤ 78 KB brotli, ≤ 330 KB raw                                  | 64.2 KB brotli, 276.3 KB raw                                              | same                                                        |
| CSS                                  | ≤ 24 KB brotli, ≤ 200 KB raw                                  | 19.1 KB brotli, 171.4 KB raw                                              | same                                                        |
| Core Web Vitals                      | "good": LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1                  | Start page CLS 0.067 after prerendering ([SEO.md](SEO.md)); no field data | Logged in the browser only (`webVitals.ts`)                 |
| "Mischen" with criteria, 36 students | ≤ 500 ms on the slowest supported device                      | ≈ 63 ms on an Apple M1 Pro                                                | `npm run bench`, by hand                                    |
| Offline use                          | The generator works without a connection after the first load | Since v1.2.0                                                              | Not tested automatically                                    |

The runtime budget is deliberately not a CI check: timings on a shared runner vary too much for a fixed ceiling. It is re-measured with `npm run bench` when the algorithm changes.

## Algorithm runtime

`src/utils/algorithm/__tests__/seatingAlgorithm.bench.ts` measures the calls the app sends to the worker, for a class with every attribute set, a full mix history, two saved plans and two locked seats, on double tables. All inputs come from fixed seeds.

Mean time per call in milliseconds, Apple M1 Pro, Node 24, `vitest bench`, 2026-09-14:

| Students | Construction | Refinement, annealing ("Mischen" 600 × 2) | Refinement, greedy (600 × 2) |
| -------: | -----------: | ----------------------------------------: | ---------------------------: |
|       12 |          0.1 |                                        56 |                            5 |
|       24 |          0.4 |                                        59 |                            9 |
|       36 |          0.9 |                                        62 |                           13 |

What the numbers show:

- **Refinement dominates.** "Mischen" with criteria is construction plus annealing, about 63 ms for a full class.
- **Annealing hardly depends on class size.** It runs a fixed cooling schedule (see [ALGORITHM.md](ALGORITHM.md#configuration)).
- **`triesPerPass` and `passes` do not reach annealing.** They only apply to the greedy search, which the app does not use. The "Verfeinern" button, which passed 1,800 × 4, therefore did the same refinement work as "Mischen"; it measured 56 / 59 / 62 ms as well and was removed on 2026-09-14.
- **Class size is not what limits the algorithm up to 36 students.** Larger classes were not measured.

### Does a longer refinement help?

Checked on 2026-09-14 with a temporary experiment on the same fixture: 20 seeds per class size, scored by the weighted criteria fulfilment the statistics badge shows (higher is better).

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
