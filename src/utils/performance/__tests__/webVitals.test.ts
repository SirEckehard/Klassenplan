// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What is left of the Web Vitals layer after the dashboard was removed: the
 * five listeners and the rating that decides whether a measurement is worth a
 * warning. The thresholds are the published Core Web Vitals boundaries, so a
 * changed number here is a claim about the spec, not a tuning decision.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const webVitalsMocks = vi.hoisted(() => ({
  onLCP: vi.fn(),
  onINP: vi.fn(),
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));

vi.mock('web-vitals', () => webVitalsMocks);

const loggerMocks = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

vi.mock('@/utils', () => loggerMocks);

const loadModule = async () => {
  const module = await import('../webVitals');
  module.resetWebVitalsForTests();
  return module;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  const { resetWebVitalsForTests } = await import('../webVitals');
  resetWebVitalsForTests();
});

describe('rateMetric', () => {
  it.each([
    ['LCP', 2500, 'good'],
    ['LCP', 2501, 'needs-improvement'],
    ['LCP', 4001, 'poor'],
    ['INP', 200, 'good'],
    ['INP', 501, 'poor'],
    ['CLS', 0.1, 'good'],
    ['CLS', 0.2, 'needs-improvement'],
    ['CLS', 0.3, 'poor'],
    ['FCP', 1800, 'good'],
    ['TTFB', 800, 'good'],
    ['TTFB', 1801, 'poor'],
  ] as const)('rates %s at %s as %s', async (name, value, expected) => {
    const { rateMetric } = await loadModule();

    expect(rateMetric(name, value)).toBe(expected);
  });

  it('treats the boundary itself as the better bucket', async () => {
    const { rateMetric, PERFORMANCE_THRESHOLDS } = await loadModule();

    // "≤ 2.5 s is good" — an LCP of exactly 2500 ms must not be reported as a
    // problem.
    expect(rateMetric('LCP', PERFORMANCE_THRESHOLDS.LCP.good)).toBe('good');
    expect(rateMetric('LCP', PERFORMANCE_THRESHOLDS.LCP.needsImprovement)).toBe(
      'needs-improvement',
    );
  });
});

describe('initializeWebVitals', () => {
  it('registers all five metrics', async () => {
    const { initializeWebVitals } = await loadModule();

    initializeWebVitals();

    expect(webVitalsMocks.onLCP).toHaveBeenCalledTimes(1);
    expect(webVitalsMocks.onINP).toHaveBeenCalledTimes(1);
    expect(webVitalsMocks.onCLS).toHaveBeenCalledTimes(1);
    expect(webVitalsMocks.onFCP).toHaveBeenCalledTimes(1);
    expect(webVitalsMocks.onTTFB).toHaveBeenCalledTimes(1);
  });

  it('registers only once', async () => {
    const { initializeWebVitals } = await loadModule();

    initializeWebVitals();
    initializeWebVitals();

    // Double registration would report every metric twice.
    expect(webVitalsMocks.onLCP).toHaveBeenCalledTimes(1);
  });

  it('warns about a poor measurement and stays quiet otherwise', async () => {
    const { initializeWebVitals } = await loadModule();
    initializeWebVitals();

    const report = webVitalsMocks.onLCP.mock.calls[0]![0] as (metric: {
      value: number;
      rating: string;
    }) => void;

    report({ value: 5000, rating: 'poor' });
    expect(loggerMocks.logWarn).toHaveBeenCalledWith(
      'Poor LCP',
      expect.objectContaining({ metric: 'LCP', rating: 'poor' }),
      'webVitals',
    );

    loggerMocks.logWarn.mockClear();
    report({ value: 1000, rating: 'good' });

    // A healthy page must not fill a production console with warnings.
    expect(loggerMocks.logWarn).not.toHaveBeenCalled();
    expect(loggerMocks.logInfo).toHaveBeenCalledWith(
      'LCP good',
      expect.objectContaining({ rating: 'good' }),
      'webVitals',
    );
  });

  it('survives a registration that throws', async () => {
    webVitalsMocks.onLCP.mockImplementationOnce(() => {
      throw new Error('no PerformanceObserver');
    });
    const { initializeWebVitals } = await loadModule();

    expect(() => initializeWebVitals()).not.toThrow();
    expect(loggerMocks.logError).toHaveBeenCalled();
  });
});
