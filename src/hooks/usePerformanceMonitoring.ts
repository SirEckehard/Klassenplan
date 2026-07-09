// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
  useContext,
} from 'react';
import { useLocation } from 'react-router-dom';
import type {
  PerformanceMetric,
  RouteTransitionMetric,
  BundleLoadingMetric,
} from '@/utils/performance/webVitals';
import {
  logInfo,
  logWarn,
  isFeatureEnabled,
  getFeatureFlagSnapshot,
} from '@/utils';

type WebVitalsModule = typeof import('@/utils/performance/webVitals');

// The provider mounts on every page, but monitoring only starts behind the
// performanceDashboard flag. A static import would anchor web-vitals in the
// entry chunk for all users, so the module is pulled in on demand instead.
// web-vitals registers its PerformanceObservers with `buffered: true`, so
// metrics emitted before this resolves (FCP, LCP) are still reported.
let webVitalsModule: WebVitalsModule | null = null;
let webVitalsPromise: Promise<WebVitalsModule> | null = null;

const loadWebVitals = (): Promise<WebVitalsModule> => {
  webVitalsPromise ??= import('@/utils/performance/webVitals').then(
    (module) => {
      webVitalsModule = module;
      return module;
    },
  );

  return webVitalsPromise;
};

export interface PerformanceState {
  coreWebVitals: PerformanceMetric[];
  routeTransitions: RouteTransitionMetric[];
  bundleMetrics: BundleLoadingMetric[];
  overallScore: number;
  isTracking: boolean;
  lastUpdate: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
  lastRender: number;
}

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface PerformanceMonitoringContextValue {
  performanceState: PerformanceState;
  renderMetrics: ComponentRenderMetric[];
  memoryMetrics: MemoryMetric[];
  startMonitoring: () => void;
  stopMonitoring: () => void;
  trackComponentRender: (componentName: string, renderTime: number) => void;
  measureComponentRender: (componentName: string) => {
    start: () => number;
    end: (startTime: number) => number;
  };
  trackMemoryUsage: () => MemoryMetric | null;
  updatePerformanceState: () => void;
  clearPerformanceData: () => void;
  getPerformanceInsights: () => string[];
  isMonitoring: boolean;
  lastUpdate: number;
}

const PerformanceMonitoringContext =
  createContext<PerformanceMonitoringContextValue | null>(null);

interface PerformanceMonitoringProviderProps {
  children: React.ReactNode;
}

const mapFeatureFlags = () =>
  getFeatureFlagSnapshot().map(({ name, value, source }) => ({
    name,
    value,
    source,
  }));

/**
 * Custom hook for comprehensive performance monitoring
 */
function usePerformanceMonitoringInternal(): PerformanceMonitoringContextValue {
  const location = useLocation();
  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    coreWebVitals: [],
    routeTransitions: [],
    bundleMetrics: [],
    overallScore: 0,
    isTracking: false,
    lastUpdate: 0,
  });

  // Component render tracking
  const [renderMetrics, setRenderMetrics] = useState<
    Map<string, ComponentRenderMetric>
  >(new Map());
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetric[]>([]);

  // Refs for route transition tracking
  const previousLocationRef = useRef<string>(location.pathname);
  const routeTransitionStartRef = useRef<number>(0);
  const transitionFromRef = useRef<string>(location.pathname);
  // Capture navigation start to measure full transition duration
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const captureTransitionStart = (fromPath?: string) => {
      if (routeTransitionStartRef.current !== 0) {
        return;
      }
      routeTransitionStartRef.current = performance.now();
      transitionFromRef.current =
        typeof fromPath === 'string' ? fromPath : previousLocationRef.current;
    };

    const navigationTarget = (window as Window & { navigation?: EventTarget })
      .navigation;

    if (navigationTarget) {
      const handleNavigate = () => {
        captureTransitionStart();
      };

      navigationTarget.addEventListener('navigate', handleNavigate);

      return () => {
        navigationTarget.removeEventListener('navigate', handleNavigate);
      };
    }

    const resolvePath = (url?: string | URL | null) => {
      if (url instanceof URL) {
        return url.pathname;
      }

      if (typeof url === 'string') {
        try {
          return new URL(url, window.location.href).pathname;
        } catch {
          return url;
        }
      }

      return window.location.pathname;
    };

    const patchHistoryMethod = (
      method: 'pushState' | 'replaceState',
    ): (() => void) | null => {
      const original = history[method];

      if (typeof original !== 'function') {
        return null;
      }

      const patched = (
        data: unknown,
        unused: string,
        url?: string | URL | null,
      ) => {
        const targetPath = resolvePath(url);
        if (targetPath !== previousLocationRef.current) {
          captureTransitionStart(previousLocationRef.current);
        }
        return original.apply(history, [data, unused, url]);
      };

      history[method] = patched as History['pushState'];

      return () => {
        history[method] = original;
      };
    };

    const handlePopState = () => {
      const targetPath = window.location.pathname;
      if (targetPath !== previousLocationRef.current) {
        captureTransitionStart(previousLocationRef.current);
      }
    };

    const restorePushState = patchHistoryMethod('pushState');
    const restoreReplaceState = patchHistoryMethod('replaceState');

    window.addEventListener('popstate', handlePopState);

    return () => {
      restorePushState?.();
      restoreReplaceState?.();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  /**
   * Update performance state from webVitalsService
   */
  const updatePerformanceState = useCallback(() => {
    if (!webVitalsModule) return;

    const summary = webVitalsModule.getPerformanceSummary();
    setPerformanceState((prev) => ({
      ...summary,
      isTracking: prev.isTracking,
      lastUpdate: Date.now(),
    }));
  }, []);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (!isFeatureEnabled('performanceDashboard')) {
      logInfo(
        'Performance monitoring skipped because performance dashboard flag is disabled',
        {
          flag: 'performanceDashboard',
          featureFlags: mapFeatureFlags(),
        },
        'usePerformanceMonitoring',
      );
      return;
    }

    loadWebVitals()
      .then((module) => {
        module.webVitalsService.initialize();
        setPerformanceState((prev) => ({ ...prev, isTracking: true }));
        logInfo(
          'Performance monitoring started',
          {
            featureFlags: mapFeatureFlags(),
          },
          'usePerformanceMonitoring',
        );
      })
      .catch((error: unknown) => {
        logWarn(
          'Failed to start performance monitoring',
          { error },
          'usePerformanceMonitoring',
        );
      });
  }, []);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    webVitalsModule?.webVitalsService.stop();
    setPerformanceState((prev) => ({ ...prev, isTracking: false }));
    logInfo(
      'Performance monitoring stopped',
      {
        featureFlags: mapFeatureFlags(),
      },
      'usePerformanceMonitoring',
    );
  }, []);

  /**
   * Track component render performance
   */
  const trackComponentRender = useCallback(
    (componentName: string, renderTime: number) => {
      setRenderMetrics((prev) => {
        const existing = prev.get(componentName);
        const newMetric: ComponentRenderMetric = existing
          ? {
              componentName,
              renderTime,
              renderCount: existing.renderCount + 1,
              averageRenderTime:
                (existing.averageRenderTime * existing.renderCount +
                  renderTime) /
                (existing.renderCount + 1),
              lastRender: Date.now(),
            }
          : {
              componentName,
              renderTime,
              renderCount: 1,
              averageRenderTime: renderTime,
              lastRender: Date.now(),
            };

        const newMap = new Map(prev);
        newMap.set(componentName, newMetric);

        // Log slow renders
        if (renderTime > 16) {
          // > 16ms (60fps threshold)
          logWarn(
            'Slow component render detected',
            {
              component: componentName,
              renderTime: Math.round(renderTime),
              renderCount: newMetric.renderCount,
            },
            'usePerformanceMonitoring',
          );
        }

        return newMap;
      });
    },
    [],
  );

  /**
   * Measure component render time (HOC utility)
   */
  const measureComponentRender = useCallback(
    (componentName: string) => {
      return {
        start: () => performance.now(),
        end: (startTime: number) => {
          const renderTime = performance.now() - startTime;
          trackComponentRender(componentName, renderTime);
          return renderTime;
        },
      };
    },
    [trackComponentRender],
  );

  /**
   * Track memory usage
   */
  const trackMemoryUsage = useCallback(() => {
    if (typeof performance === 'undefined') {
      return null;
    }

    if ('memory' in performance) {
      const memoryInfo = (
        performance as Performance & {
          memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        }
      ).memory;
      if (memoryInfo) {
        const memoryMetric: MemoryMetric = {
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
          jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
          timestamp: Date.now(),
        };

        setMemoryMetrics((prev) => {
          const newMetrics = [...prev, memoryMetric];
          // Keep only last 100 memory measurements
          return newMetrics.length > 100 ? newMetrics.slice(-100) : newMetrics;
        });

        // Log memory warnings
        const memoryUsagePercent =
          (memoryMetric.usedJSHeapSize / memoryMetric.jsHeapSizeLimit) * 100;
        if (memoryUsagePercent > 80) {
          logWarn(
            'High memory usage detected',
            {
              usedMB: Math.round(memoryMetric.usedJSHeapSize / 1024 / 1024),
              totalMB: Math.round(memoryMetric.totalJSHeapSize / 1024 / 1024),
              limitMB: Math.round(memoryMetric.jsHeapSizeLimit / 1024 / 1024),
              usagePercent: Math.round(memoryUsagePercent),
            },
            'usePerformanceMonitoring',
          );
        }

        return memoryMetric;
      }
    }
    return null;
  }, []);

  /**
   * Get performance insights
   */
  const getPerformanceInsights = useCallback(() => {
    const insights: string[] = [];

    // Core Web Vitals insights
    performanceState.coreWebVitals.forEach((metric) => {
      if (metric.threshold === 'poor') {
        insights.push(
          `${metric.name} is poor (${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}). Consider optimization.`,
        );
      }
    });

    // Route transition insights
    const slowTransitions = performanceState.routeTransitions.filter(
      (t) => t.duration > 300,
    );
    if (slowTransitions.length > 0) {
      insights.push(
        `${slowTransitions.length} slow route transitions detected (>300ms).`,
      );
    }

    // Component render insights
    const slowComponents = Array.from(renderMetrics.values()).filter(
      (m) => m.averageRenderTime > 16,
    );
    if (slowComponents.length > 0) {
      insights.push(
        `${slowComponents.length} components have slow render times (>16ms).`,
      );
    }

    // Memory insights
    const latestMemory = memoryMetrics[memoryMetrics.length - 1];
    if (latestMemory) {
      const memoryUsage =
        (latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit) * 100;
      if (memoryUsage > 70) {
        insights.push(`Memory usage is high (${Math.round(memoryUsage)}%).`);
      }
    }

    return insights;
  }, [performanceState, renderMetrics, memoryMetrics]);

  /**
   * Clear all performance data
   */
  const clearPerformanceData = useCallback(() => {
    webVitalsModule?.webVitalsService.clearMetrics();
    setRenderMetrics(new Map());
    setMemoryMetrics([]);
    updatePerformanceState();
    logInfo('All performance data cleared', {}, 'usePerformanceMonitoring');
  }, [updatePerformanceState]);

  // Route transition tracking
  useEffect(() => {
    if (!performanceState.isTracking) {
      previousLocationRef.current = location.pathname;
      transitionFromRef.current = location.pathname;
      routeTransitionStartRef.current = 0;
      return;
    }

    const hasLocationChanged =
      previousLocationRef.current !== location.pathname;

    if (hasLocationChanged && routeTransitionStartRef.current > 0) {
      webVitalsModule?.trackRouteTransition(
        transitionFromRef.current,
        location.pathname,
        routeTransitionStartRef.current,
      );
    }

    if (hasLocationChanged) {
      previousLocationRef.current = location.pathname;
      transitionFromRef.current = location.pathname;
      routeTransitionStartRef.current = 0;

      // Update performance state after route change
      setTimeout(updatePerformanceState, 100);
    }
  }, [location.pathname, performanceState.isTracking, updatePerformanceState]);

  // Periodic updates
  useEffect(() => {
    if (!performanceState.isTracking) return;

    const interval = setInterval(() => {
      updatePerformanceState();
      trackMemoryUsage();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [performanceState.isTracking, updatePerformanceState, trackMemoryUsage]);

  // Initialize on mount
  useEffect(() => {
    queueMicrotask(startMonitoring);
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);

  return {
    performanceState,
    renderMetrics: Array.from(renderMetrics.values()),
    memoryMetrics,
    startMonitoring,
    stopMonitoring,
    trackComponentRender,
    measureComponentRender,
    trackMemoryUsage,
    updatePerformanceState,
    clearPerformanceData,
    getPerformanceInsights,
    isMonitoring: performanceState.isTracking,
    lastUpdate: performanceState.lastUpdate,
  };
}

export function PerformanceMonitoringProvider({
  children,
}: PerformanceMonitoringProviderProps) {
  const value = usePerformanceMonitoringInternal();

  return React.createElement(
    PerformanceMonitoringContext.Provider,
    { value },
    children,
  );
}

export function usePerformanceMonitoring(): PerformanceMonitoringContextValue {
  const context = useContext(PerformanceMonitoringContext);

  if (!context) {
    throw new Error(
      'usePerformanceMonitoring must be used within a PerformanceMonitoringProvider',
    );
  }

  return context;
}

/**
 * HOC for automatic component render tracking
 */
export function withPerformanceTracking<T extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string,
): React.ComponentType<T> {
  const displayName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component';

  const PerformanceTrackedComponent: React.FC<T> = (props: T) => {
    const { measureComponentRender } = usePerformanceMonitoring();
    const measurement = useMemo(
      () => measureComponentRender(displayName),
      [measureComponentRender],
    );
    const renderStart = measurement.start();

    useLayoutEffect(() => {
      measurement.end(renderStart);
    }, [measurement, renderStart]);

    return React.createElement(WrappedComponent, props);
  };

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`;
  return PerformanceTrackedComponent;
}

/**
 * Hook for measuring async operations
 */
export function useAsyncPerformanceTracking() {
  const trackAsyncOperation = useCallback(
    async <T>(
      operationName: string,
      operation: () => Promise<T>,
    ): Promise<T> => {
      const startTime = performance.now();

      try {
        const result = await operation();
        const duration = performance.now() - startTime;

        logInfo(
          'Async operation completed',
          {
            operation: operationName,
            duration: Math.round(duration),
            performance:
              duration < 100 ? 'fast' : duration < 500 ? 'normal' : 'slow',
          },
          'useAsyncPerformanceTracking',
        );

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        logWarn(
          'Async operation failed',
          {
            operation: operationName,
            duration: Math.round(duration),
            error,
          },
          'useAsyncPerformanceTracking',
        );

        throw error;
      }
    },
    [],
  );

  return { trackAsyncOperation };
}
