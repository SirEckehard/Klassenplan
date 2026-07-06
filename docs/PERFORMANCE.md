# PERFORMANCE – Measurements & Optimizations

## Overview

Klassenplan monitors performance from two angles: Core Web Vitals at runtime, and build/bundle optimizations to minimize initial-load cost. The entry point (`src/index.tsx`) initializes monitoring immediately before the React render, so relevant metrics are captured from the very first paint.

## Core Web Vitals monitoring

- **Metrics:** LCP, INP, CLS, FCP, and TTFB are registered through `web-vitals` and stored as structured records.
- **Thresholds:** Good values are ≤ 2.5 s (LCP), ≤ 200 ms (INP), ≤ 0.1 (CLS), ≤ 1.8 s (FCP), and ≤ 800 ms (TTFB). Values in between flag optimization potential; anything above is marked "poor".
- **Persistence & logging:** Measurements land in an internal map store, which the logger differentiates by threshold (`logInfo` for "good", `logWarn` for "poor"). In production they are forwarded to `ProfessionalLogger`.
- **Additional streams:** Navigations (max. 20 entries), bundle loads (max. 50 entries), and memory usage (heap monitoring > 80 %) round out the monitoring.
- **Scoring:** An overall score (0–100) is computed from the threshold buckets (`good` = 100, `needs-improvement` = 65, `poor` = 25).

## Real-time dashboard & tooling

- **`usePerformanceMonitoring` hook:** Provides `performanceState`, per-component render times (anything > 16 ms is logged), memory history, and insights (e.g. slow transitions > 300 ms).
- **Dashboard components:** `PerformanceDashboard` visualizes Core Web Vitals, transitions, bundle metrics, and memory. `PerformanceDebugButton` enables the overlay in dev environments or via `localStorage.enablePerformanceDashboard`.
- **HOCs & utilities:** `withPerformanceTracking` measures render times of individual components; `useAsyncPerformanceTracking` logs the duration of asynchronous operations (`fast` < 100 ms, `slow` > 500 ms).
- **Activation:** Monitoring starts automatically on mount; stop/reset are available via hook methods (`stopMonitoring`, `clearPerformanceData`).

## Build & bundle optimizations

- **Manual chunking:** `vite.config.ts` splits vendor code into logical blocks (`ui-vendor`, `data-vendor`, `pdf-vendor`, `web-vitals-vendor`, `vendor`) and separates app-specific areas (`performance`, `algorithm`, `schemas`, `pdf-utils`, `logging`, `migration`, `scene`).
- **Compression & PWA:** Brotli compression from 1 KB upward (`vite-plugin-compression`) and a PWA setup with a precache strategy for fonts reduce load times.
- **Strict CSP on the dev server:** Despite relaxed inline scripts for HMR, the remaining directives stay restrictive so misconfigurations surface early.

## Prefetch & navigation

- **Route preloader:** `preloadLikelyRoutes` uses `requestIdleCallback` to warm up wizard and export pages. Missing routes trigger warning logs.
- **Prefetch hints:** `addPrefetchHint` creates `<link rel="prefetch">` entries once and logs them at debug level. Options for `as`, `crossOrigin`, and `importance` are available.
- **Wizard-specific:** `prefetchGeneratorSteps` loads upcoming steps (e.g. the circle view) while the current step is still being edited and registers matching query URLs as prefetch targets.

## Current metrics & tests (as of 2026-05-24)

| Measurement                | Result                                      | Source                                                                |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| Core Web Vitals thresholds | see section above                           | `src/utils/performance/webVitals.ts` + Vitest coverage                |
| Route transitions          | capped at 20 entries                        | Vitest `webVitals.test.ts` (`limits route transitions to 20 entries`) |
| Bundle metrics             | capped at 50 entries                        | Vitest `webVitals.test.ts` (`limits bundle metrics to 50 entries`)    |
| Overall-score weighting    | 2×"good" + 1×"needs-improvement" → score 88 | Vitest `webVitals.test.ts` (`calculates overall score correctly`)     |
| Performance monitoring     | starts automatically in `initializeApp`     | `src/index.tsx`                                                       |
