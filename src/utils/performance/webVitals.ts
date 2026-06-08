import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import {
  logInfo,
  logWarn,
  logError,
  isFeatureEnabled,
  getFeatureFlagSnapshot,
} from '@/utils';
import { ProfessionalLogger } from '@/utils/logging/professionalLogger';

// Performance thresholds based on Core Web Vitals recommendations
export const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (LCP) - loading performance
  LCP: {
    good: 2500, // ≤ 2.5s
    needsImprovement: 4000, // 2.5s - 4.0s
  },
  // Interaction to Next Paint (INP) - interactivity (replaces FID in v5)
  INP: {
    good: 200, // ≤ 200ms
    needsImprovement: 500, // 200ms - 500ms
  },
  // Cumulative Layout Shift (CLS) - visual stability
  CLS: {
    good: 0.1, // ≤ 0.1
    needsImprovement: 0.25, // 0.1 - 0.25
  },
  // First Contentful Paint (FCP) - loading performance
  FCP: {
    good: 1800, // ≤ 1.8s
    needsImprovement: 3000, // 1.8s - 3.0s
  },
  // Time to First Byte (TTFB) - server response time
  TTFB: {
    good: 800, // ≤ 800ms
    needsImprovement: 1800, // 800ms - 1.8s
  },
} as const;

export type PerformanceThreshold = 'good' | 'needs-improvement' | 'poor';

export interface PerformanceMetric {
  name: string;
  value: number;
  threshold: PerformanceThreshold;
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface RouteTransitionMetric {
  from: string;
  to: string;
  duration: number;
  timestamp: number;
}

export interface BundleLoadingMetric {
  chunkName: string;
  loadTime: number;
  size: number;
  cached: boolean;
  timestamp: number;
}

class WebVitalsService {
  private logger: ProfessionalLogger;
  private isProduction: boolean;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private routeTransitions: RouteTransitionMetric[] = [];
  private bundleMetrics: BundleLoadingMetric[] = [];
  private isInitialized = false;
  private isTracking = false;
  private navigationCleanup: (() => void) | null = null;
  private resourceObserver: PerformanceObserver | null = null;

  constructor() {
    this.logger = new ProfessionalLogger();
    this.isProduction = import.meta.env.PROD;
  }

  /**
   * Initialize Web Vitals monitoring
   */
  public initialize(): void {
    if (!isFeatureEnabled('performanceDashboard')) {
      logInfo(
        'Web Vitals monitoring skipped because performance dashboard flag is disabled',
        {
          flag: 'performanceDashboard',
          featureFlags: getFeatureFlagSnapshot().map(
            ({ name, value, source }) => ({
              name,
              value,
              source,
            }),
          ),
        },
        'webVitals',
      );
      return;
    }

    if (typeof window === 'undefined') {
      logWarn(
        'Web Vitals can only be initialized in browser environment',
        {},
        'webVitals',
      );
      return;
    }

    if (this.isInitialized) {
      logInfo(
        'Web Vitals monitoring already initialized - skipping duplicate initialization',
        {
          featureFlags: getFeatureFlagSnapshot().map(
            ({ name, value, source }) => ({
              name,
              value,
              source,
            }),
          ),
        },
        'webVitals',
      );
      return;
    }

    try {
      this.isTracking = true;
      // Core Web Vitals
      onLCP(this.handleMetric.bind(this, 'LCP'));
      onINP(this.handleMetric.bind(this, 'INP'));
      onCLS(this.handleMetric.bind(this, 'CLS'));

      // Additional metrics
      onFCP(this.handleMetric.bind(this, 'FCP'));
      onTTFB(this.handleMetric.bind(this, 'TTFB'));

      // Custom performance observers
      this.initializeNavigationObserver();
      this.initializeResourceObserver();

      logInfo(
        'Web Vitals monitoring initialized',
        {
          environment: this.isProduction ? 'production' : 'development',
          metricsEnabled: ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'],
          featureFlags: getFeatureFlagSnapshot().map(
            ({ name, value, source }) => ({
              name,
              value,
              source,
            }),
          ),
        },
        'webVitals',
      );
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      this.isTracking = false;
      logError('Failed to initialize Web Vitals', { error }, 'webVitals');
    }
  }

  /**
   * Handle Web Vitals metric
   */
  private handleMetric(metricName: string, metric: Metric): void {
    if (!this.isTracking) {
      return;
    }
    const threshold = this.getThreshold(metricName, metric.value);

    const performanceMetric: PerformanceMetric = {
      name: metricName,
      value: metric.value,
      threshold,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.metrics.set(metricName, performanceMetric);

    // Log based on threshold
    const logData = {
      metric: metricName,
      value: metric.value,
      threshold,
      rating: metric.rating,
      id: metric.id,
    };

    if (threshold === 'poor') {
      logWarn(`Poor ${metricName} performance`, logData, 'webVitals');
    } else if (threshold === 'needs-improvement') {
      logInfo(`${metricName} needs improvement`, logData, 'webVitals');
    } else {
      logInfo(`Good ${metricName} performance`, logData, 'webVitals');
    }

    // Send to analytics in production
    if (this.isProduction) {
      this.sendToAnalytics(performanceMetric);
    }
  }

  /**
   * Get performance threshold classification
   */
  private getThreshold(
    metricName: string,
    value: number,
  ): PerformanceThreshold {
    const thresholds =
      PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];

    if (!thresholds) {
      return 'good'; // Default for unknown metrics
    }

    if (value <= thresholds.good) {
      return 'good';
    } else if (value <= thresholds.needsImprovement) {
      return 'needs-improvement';
    } else {
      return 'poor';
    }
  }

  /**
   * Track route transition performance
   */
  public trackRouteTransition(
    from: string,
    to: string,
    startTime: number,
  ): void {
    if (!this.isTracking) {
      return;
    }
    const duration = performance.now() - startTime;

    const routeMetric: RouteTransitionMetric = {
      from,
      to,
      duration,
      timestamp: Date.now(),
    };

    this.routeTransitions.push(routeMetric);

    // Keep only last 20 transitions
    if (this.routeTransitions.length > 20) {
      this.routeTransitions = this.routeTransitions.slice(-20);
    }

    logInfo(
      'Route transition tracked',
      {
        from,
        to,
        duration: Math.round(duration),
        performance:
          duration < 100 ? 'excellent' : duration < 300 ? 'good' : 'slow',
      },
      'webVitals',
    );
  }

  /**
   * Track bundle loading performance
   */
  public trackBundleLoading(
    chunkName: string,
    loadTime: number,
    size: number,
    cached = false,
  ): void {
    if (!this.isTracking) {
      return;
    }
    const bundleMetric: BundleLoadingMetric = {
      chunkName,
      loadTime,
      size,
      cached,
      timestamp: Date.now(),
    };

    this.bundleMetrics.push(bundleMetric);

    // Keep only last 50 bundle loads
    if (this.bundleMetrics.length > 50) {
      this.bundleMetrics = this.bundleMetrics.slice(-50);
    }

    logInfo(
      'Bundle loading tracked',
      {
        chunk: chunkName,
        loadTime: Math.round(loadTime),
        size: `${Math.round(size / 1024)}KB`,
        cached,
        performance:
          loadTime < 100 ? 'fast' : loadTime < 500 ? 'normal' : 'slow',
      },
      'webVitals',
    );
  }

  /**
   * Initialize Navigation API observer for route transitions
   */
  private initializeNavigationObserver(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.navigationCleanup?.();
    this.navigationCleanup = null;

    const scheduleIdle = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (
          window as unknown as {
            requestIdleCallback: (cb: () => void) => number;
          }
        ).requestIdleCallback(callback);
      } else {
        // Fallback keeps routing metrics working in browsers without requestIdleCallback support.
        setTimeout(callback, 100);
      }
    };

    const recordTransition = (from: string, to: string) => {
      if (!from || !to || from === to) {
        return;
      }

      const startTime = performance.now();

      scheduleIdle(() => {
        this.trackRouteTransition(from, to, startTime);
      });
    };

    if (
      'navigation' in window &&
      (window as unknown as { navigation?: EventTarget }).navigation
    ) {
      const navigation = (window as unknown as { navigation: EventTarget })
        .navigation;
      const handleNavigate = (
        event: Event & { destination?: { url: string } },
      ) => {
        const destinationUrl = event.destination?.url;
        if (!destinationUrl) {
          return;
        }

        try {
          const destinationPath = new URL(destinationUrl).pathname;
          recordTransition(window.location.pathname, destinationPath);
        } catch {
          // Ignore invalid navigation destinations.
        }
      };

      navigation.addEventListener('navigate', handleNavigate);

      this.navigationCleanup = () => {
        navigation.removeEventListener('navigate', handleNavigate);
      };

      return;
    }

    const getCurrentPath = () =>
      `${window.location.pathname}${window.location.search}`;
    let previousPath = getCurrentPath();

    const resolvePath = (url?: string | URL | null) => {
      if (url instanceof URL) {
        return `${url.pathname}${url.search}`;
      }

      if (typeof url === 'string') {
        try {
          const parsed = new URL(url, window.location.href);
          return `${parsed.pathname}${parsed.search}`;
        } catch {
          return url;
        }
      }

      return getCurrentPath();
    };

    const handlePathChange = (targetPath: string) => {
      if (!targetPath || targetPath === previousPath) {
        return;
      }

      const fromPath = previousPath;
      previousPath = targetPath;

      recordTransition(fromPath, targetPath);
    };

    const patchHistoryMethod = (
      method: 'pushState' | 'replaceState',
    ): (() => void) | null => {
      const original = history[method] as (
        data: unknown,
        unused: string,
        url?: string | URL | null,
      ) => void;

      if (typeof original !== 'function') {
        return null;
      }

      const patched = function (
        this: History,
        data: unknown,
        unused: string,
        url?: string | URL | null,
      ) {
        original.call(this, data, unused, url);
        handlePathChange(resolvePath(url));
      };

      history[method] = patched as History['pushState'];

      return () => {
        history[method] = original;
      };
    };

    const restorePushState = patchHistoryMethod('pushState');
    const restoreReplaceState = patchHistoryMethod('replaceState');

    const handlePopState = () => {
      handlePathChange(getCurrentPath());
    };

    const handleHashChange = () => {
      handlePathChange(getCurrentPath());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    this.navigationCleanup = () => {
      restorePushState?.();
      restoreReplaceState?.();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }

  /**
   * Initialize Resource Loading observer
   */
  private initializeResourceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.resourceObserver?.disconnect();
        this.resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === 'resource' &&
              entry.name.includes('assets/')
            ) {
              const resourceEntry = entry as PerformanceResourceTiming;
              const chunkName = this.extractChunkName(entry.name);
              const loadTime =
                resourceEntry.responseEnd - resourceEntry.requestStart;
              const size = resourceEntry.transferSize || 0;
              const cached =
                resourceEntry.transferSize === 0 &&
                resourceEntry.decodedBodySize > 0;

              this.trackBundleLoading(chunkName, loadTime, size, cached);
            }
          }
        });

        this.resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        logWarn(
          'Could not initialize Resource Observer',
          { error },
          'webVitals',
        );
      }
    }
  }

  /**
   * Extract chunk name from asset URL
   */
  private extractChunkName(url: string): string {
    const match = url.match(/assets\/([^-]+)/);
    if (match) {
      return match[1];
    }
    // Fallback: extract filename from path
    const filename = url.split('/').pop() || 'unknown';
    return filename;
  }

  /**
   * Send metrics to analytics service (placeholder)
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // In production, send to your analytics service
    // For now, we just use the professional logger
    this.logger.info('Performance metric collected', {
      metric: metric.name,
      value: metric.value,
      threshold: metric.threshold,
      url: metric.url,
    });
  }

  /**
   * Get current performance summary
   */
  public getPerformanceSummary(): {
    coreWebVitals: PerformanceMetric[];
    routeTransitions: RouteTransitionMetric[];
    bundleMetrics: BundleLoadingMetric[];
    overallScore: number;
  } {
    const coreWebVitals = Array.from(this.metrics.values());

    // Calculate overall performance score (0-100)
    const scores = coreWebVitals.map((metric) => {
      switch (metric.threshold) {
        case 'good':
          return 100;
        case 'needs-improvement':
          return 65;
        case 'poor':
          return 25;
        default:
          return 0;
      }
    });

    const overallScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum: number, score: number) => sum + score, 0) /
              scores.length,
          )
        : 100; // Default to 100 for perfect score when no metrics yet

    return {
      coreWebVitals,
      routeTransitions: [...this.routeTransitions],
      bundleMetrics: [...this.bundleMetrics],
      overallScore,
    };
  }

  /**
   * Clear all collected metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.routeTransitions.length = 0;
    this.bundleMetrics.length = 0;

    logInfo('Performance metrics cleared', {}, 'webVitals');
  }

  /**
   * Stop monitoring and detach observers
   */
  public stop(): void {
    this.isTracking = false;
    this.isInitialized = false;
    this.navigationCleanup?.();
    this.navigationCleanup = null;
    this.resourceObserver?.disconnect();
    this.resourceObserver = null;
    logInfo('Web Vitals monitoring stopped', {}, 'webVitals');
  }
}

// Export singleton instance
export const webVitalsService = new WebVitalsService();

// Export convenience functions
export const initializeWebVitals = () => webVitalsService.initialize();
export const trackRouteTransition = (
  from: string,
  to: string,
  startTime: number,
) => webVitalsService.trackRouteTransition(from, to, startTime);
export const trackBundleLoading = (
  chunkName: string,
  loadTime: number,
  size: number,
  cached?: boolean,
) => webVitalsService.trackBundleLoading(chunkName, loadTime, size, cached);
export const getPerformanceSummary = () =>
  webVitalsService.getPerformanceSummary();
export const clearPerformanceMetrics = () => webVitalsService.clearMetrics();
export const stopWebVitals = () => webVitalsService.stop();
