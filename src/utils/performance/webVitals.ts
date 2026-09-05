// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Core Web Vitals, logged and nothing more.
 *
 * What this deliberately no longer does: keep a metric store, time route
 * transitions by patching `history.pushState`, observe resource loads, compute
 * an overall score, or feed a dashboard. All of that existed to fill a UI that
 * only ever ran in development, and none of it reached a backend — the CSP
 * allows `connect-src 'self'` and there is no analytics endpoint. What survives
 * is the one thing measuring in the app can do that Lighthouse cannot: report
 * numbers from a real session, on the machine that actually feels slow.
 *
 * The `web-vitals` package is imported dynamically by the caller, so it stays
 * out of the entry chunk.
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logInfo, logWarn, logError } from '@/utils';

/** Core Web Vitals boundaries, in milliseconds (CLS is unitless). */
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
} as const;

export type WebVitalName = keyof typeof PERFORMANCE_THRESHOLDS;
export type PerformanceRating = 'good' | 'needs-improvement' | 'poor';

const SOURCE = 'webVitals';

let initialized = false;

/** Classifies a measurement against the Core Web Vitals boundaries. */
export function rateMetric(
  name: WebVitalName,
  value: number,
): PerformanceRating {
  const thresholds = PERFORMANCE_THRESHOLDS[name];
  if (value <= thresholds.good) {
    return 'good';
  }
  return value <= thresholds.needsImprovement ? 'needs-improvement' : 'poor';
}

function handleMetric(name: WebVitalName, metric: Metric): void {
  const rating = rateMetric(name, metric.value);
  const data = {
    metric: name,
    value: metric.value,
    rating,
    // The package's own rating uses the same boundaries; a mismatch would mean
    // the table above has drifted from the spec.
    reportedRating: metric.rating,
  };

  if (rating === 'poor') {
    logWarn(`Poor ${name}`, data, SOURCE);
    return;
  }
  logInfo(`${name} ${rating}`, data, SOURCE);
}

/**
 * Registers the Core Web Vitals listeners. Safe to call more than once.
 *
 * Runs in every environment: the measurements are free (the browser collects
 * them anyway) and the log level decides who sees them — INFO in development,
 * so only a "poor" value surfaces in a production console.
 */
export function initializeWebVitals(): void {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  try {
    onLCP((metric) => handleMetric('LCP', metric));
    onINP((metric) => handleMetric('INP', metric));
    onCLS((metric) => handleMetric('CLS', metric));
    onFCP((metric) => handleMetric('FCP', metric));
    onTTFB((metric) => handleMetric('TTFB', metric));
  } catch (error) {
    initialized = false;
    logError('Failed to register Web Vitals listeners', { error }, SOURCE);
  }
}

/** Test seam: the registration guard outlives a single test. */
export function resetWebVitalsForTests(): void {
  initialized = false;
}
