// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { __setFeatureFlagEnvironmentForTesting } from '@/config/featureFlags';
import {
  PerformanceMonitoringProvider,
  usePerformanceMonitoring,
} from '@/hooks/usePerformanceMonitoring';

const { initializeMock, clearMetricsMock, stopMock } = vi.hoisted(() => ({
  initializeMock: vi.fn(),
  clearMetricsMock: vi.fn(),
  stopMock: vi.fn(),
}));

vi.mock('@/utils/performance/webVitals', () => ({
  webVitalsService: {
    initialize: initializeMock,
    clearMetrics: clearMetricsMock,
    stop: stopMock,
  },
  getPerformanceSummary: vi.fn(() => ({
    coreWebVitals: [],
    routeTransitions: [],
    bundleMetrics: [],
    overallScore: 0,
    isTracking: false,
    lastUpdate: 0,
  })),
  trackRouteTransition: vi.fn(),
  trackBundleLoading: vi.fn(),
}));

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    initializeMock.mockClear();
    clearMetricsMock.mockClear();
    __setFeatureFlagEnvironmentForTesting({ MODE: 'development' });
  });

  afterEach(() => {
    __setFeatureFlagEnvironmentForTesting(null);
  });

  it('initializes web vitals when the flag is enabled', async () => {
    renderHook(() => usePerformanceMonitoring(), {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <PerformanceMonitoringProvider>
            {children}
          </PerformanceMonitoringProvider>
        </MemoryRouter>
      ),
    });

    await waitFor(() => expect(initializeMock).toHaveBeenCalledTimes(1));
  });

  it('skips initialization when the performance dashboard flag is disabled', async () => {
    __setFeatureFlagEnvironmentForTesting({
      VERCEL_ENV: 'production',
      VITE_FLAG_PERFORMANCE_DASHBOARD: '0',
    });

    const { result, unmount } = renderHook(() => usePerformanceMonitoring(), {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <PerformanceMonitoringProvider>
            {children}
          </PerformanceMonitoringProvider>
        </MemoryRouter>
      ),
    });

    expect(initializeMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.performanceState.isTracking).toBe(false),
    );

    act(() => {
      result.current.clearPerformanceData();
    });

    expect(clearMetricsMock).toHaveBeenCalledTimes(1);
    unmount();
  });
});
