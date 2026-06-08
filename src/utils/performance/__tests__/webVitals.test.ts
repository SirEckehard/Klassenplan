// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { PERFORMANCE_THRESHOLDS, webVitalsService } from '../webVitals';

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onINP: vi.fn(),
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

// Mock ProfessionalLogger - Vitest 4.x requires proper class mocking
vi.mock('@/utils/logging/professionalLogger', () => {
  const MockProfessionalLogger = vi.fn(function (this: any) {
    this.info = vi.fn();
    this.warn = vi.fn();
    this.error = vi.fn();
  });
  return { ProfessionalLogger: MockProfessionalLogger };
});

describe('webVitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (webVitalsService as any).isInitialized = false;

    // Mock window object
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'http://localhost:3000/' },
        navigator: { userAgent: 'test-agent' },
        localStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        performance: {
          now: vi.fn(() => 1000),
        },
      },
      writable: true,
    });

    // Mock import.meta.env
    Object.defineProperty(globalThis, 'import', {
      value: {
        meta: {
          env: {
            PROD: false,
          },
        },
      },
      configurable: true,
    });
  });

  describe('PERFORMANCE_THRESHOLDS', () => {
    it('has correct LCP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.LCP).toEqual({
        good: 2500,
        needsImprovement: 4000,
      });
    });

    it('has correct INP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.INP).toEqual({
        good: 200,
        needsImprovement: 500,
      });
    });

    it('has correct CLS thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.CLS).toEqual({
        good: 0.1,
        needsImprovement: 0.25,
      });
    });

    it('has correct FCP thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.FCP).toEqual({
        good: 1800,
        needsImprovement: 3000,
      });
    });

    it('has correct TTFB thresholds', () => {
      expect(PERFORMANCE_THRESHOLDS.TTFB).toEqual({
        good: 800,
        needsImprovement: 1800,
      });
    });
  });

  describe('webVitalsService', () => {
    it('initializes without errors', () => {
      expect(() => webVitalsService.initialize()).not.toThrow();
    });

    it('only registers listeners once when initialized multiple times', () => {
      webVitalsService.initialize();
      webVitalsService.initialize();

      expect(onLCP).toHaveBeenCalledTimes(1);
      expect(onINP).toHaveBeenCalledTimes(1);
      expect(onCLS).toHaveBeenCalledTimes(1);
      expect(onFCP).toHaveBeenCalledTimes(1);
      expect(onTTFB).toHaveBeenCalledTimes(1);
    });

    it('tracks route transitions', () => {
      const startTime = 1000;
      webVitalsService.trackRouteTransition('/home', '/about', startTime);

      const summary = webVitalsService.getPerformanceSummary();
      expect(summary.routeTransitions).toHaveLength(1);
      expect(summary.routeTransitions[0]).toMatchObject({
        from: '/home',
        to: '/about',
      });
    });

    it('tracks bundle loading performance', () => {
      webVitalsService.trackBundleLoading('main', 150, 1024, false);

      const summary = webVitalsService.getPerformanceSummary();
      expect(summary.bundleMetrics).toHaveLength(1);
      expect(summary.bundleMetrics[0]).toMatchObject({
        chunkName: 'main',
        loadTime: 150,
        size: 1024,
        cached: false,
      });
    });

    it('limits route transitions to 20 entries', () => {
      // Add 25 route transitions
      for (let i = 0; i < 25; i++) {
        webVitalsService.trackRouteTransition(
          `/route${i}`,
          `/route${i + 1}`,
          1000,
        );
      }

      const summary = webVitalsService.getPerformanceSummary();
      expect(summary.routeTransitions).toHaveLength(20);
    });

    it('limits bundle metrics to 50 entries', () => {
      // Add 55 bundle metrics
      for (let i = 0; i < 55; i++) {
        webVitalsService.trackBundleLoading(`chunk${i}`, 100, 1024, false);
      }

      const summary = webVitalsService.getPerformanceSummary();
      expect(summary.bundleMetrics).toHaveLength(50);
    });

    it('clears metrics correctly', () => {
      // Add some data
      webVitalsService.trackRouteTransition('/home', '/about', 1000);
      webVitalsService.trackBundleLoading('main', 150, 1024, false);

      // Clear metrics
      webVitalsService.clearMetrics();

      const summary = webVitalsService.getPerformanceSummary();
      expect(summary.routeTransitions).toHaveLength(0);
      expect(summary.bundleMetrics).toHaveLength(0);
      expect(summary.coreWebVitals).toHaveLength(0);
    });

    it('calculates overall score correctly', () => {
      // Mock some metrics with known thresholds
      const mockMetrics = [
        { name: 'LCP', value: 2000, threshold: 'good' as const },
        { name: 'FID', value: 50, threshold: 'good' as const },
        { name: 'CLS', value: 0.15, threshold: 'needs-improvement' as const },
      ];

      // Replace the internal metrics map
      (webVitalsService as any).metrics = new Map(
        mockMetrics.map((m) => [
          m.name,
          { ...m, timestamp: Date.now(), url: '/', userAgent: 'test' },
        ]),
      );

      const summary = webVitalsService.getPerformanceSummary();
      // Two 'good' scores (100 each) + one 'needs-improvement' (65) = average of 88.33, rounded to 88
      expect(summary.overallScore).toBe(88);
    });
  });

  describe('threshold classification', () => {
    it('classifies LCP correctly', () => {
      const service = webVitalsService as any;

      expect(service.getThreshold('LCP', 2000)).toBe('good');
      expect(service.getThreshold('LCP', 3000)).toBe('needs-improvement');
      expect(service.getThreshold('LCP', 5000)).toBe('poor');
    });

    it('classifies INP correctly', () => {
      const service = webVitalsService as any;

      expect(service.getThreshold('INP', 150)).toBe('good');
      expect(service.getThreshold('INP', 350)).toBe('needs-improvement');
      expect(service.getThreshold('INP', 600)).toBe('poor');
    });

    it('classifies CLS correctly', () => {
      const service = webVitalsService as any;

      expect(service.getThreshold('CLS', 0.05)).toBe('good');
      expect(service.getThreshold('CLS', 0.15)).toBe('needs-improvement');
      expect(service.getThreshold('CLS', 0.35)).toBe('poor');
    });

    it('defaults to good for unknown metrics', () => {
      const service = webVitalsService as any;

      expect(service.getThreshold('UNKNOWN', 1000)).toBe('good');
    });
  });

  describe('chunk name extraction', () => {
    it('extracts chunk names correctly', () => {
      const service = webVitalsService as any;

      expect(service.extractChunkName('/assets/main-abc123.js')).toBe('main');
      expect(service.extractChunkName('/assets/vendor-xyz789.js')).toBe(
        'vendor',
      );
      expect(service.extractChunkName('/assets/unknown.js')).toBe('unknown.js');
    });
  });
});
