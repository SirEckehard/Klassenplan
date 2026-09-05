# PERFORMANCE – Measurements & Optimizations

## Overview

Klassenplan approaches performance from two angles: Core Web Vitals at runtime, and build/bundle optimizations that keep the initial load small. The runtime half is deliberately thin — see "What was removed" below.

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

- **Manual chunking:** `vite.config.ts` splits vendor code into logical blocks and separates app-specific areas (algorithm, schemas, pdf-utils, logging, migration, scene).
- **Budgets:** `npm run check:bundle` enforces size limits against `dist/` and runs as part of `npm run build:static`.
- **Compression & PWA:** Brotli compression from 1 KB upward (`vite-plugin-compression`) plus a PWA precache strategy for fonts.
- **Strict CSP on the dev server:** despite relaxed inline scripts for HMR, the remaining directives stay restrictive so misconfigurations surface early.

## Prefetch & navigation

- **Route preloader:** `preloadLikelyRoutes` uses `requestIdleCallback` to warm up wizard and export pages. Missing routes trigger warning logs.
- **Prefetch hints:** `addPrefetchHint` creates `<link rel="prefetch">` entries once and logs them at debug level. Options for `as`, `crossOrigin` and `importance` are available.
- **Wizard-specific:** `prefetchGeneratorSteps` loads upcoming steps (e.g. the circle view) while the current step is still being edited.
- **`prefetchOrchestrator`** wraps those jobs to log their duration and failures. It kept a 40-entry telemetry ring for the dashboard; that is gone with it.
