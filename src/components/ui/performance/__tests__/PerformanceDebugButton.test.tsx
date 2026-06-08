import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PerformanceDebugButton from '../PerformanceDebugButton';
import { __setFeatureFlagEnvironmentForTesting } from '@/config/featureFlags';

vi.mock('@/hooks/usePerformanceMonitoring', () => ({
  usePerformanceMonitoring: vi.fn(() => ({
    performanceState: { overallScore: 92, isTracking: true },
  })),
}));

const { toggleDashboard, mockUsePerformanceDashboard } = vi.hoisted(() => {
  const toggle = vi.fn();
  const mock = vi.fn(() => ({
    isOpen: false,
    isDevMode: true,
    hasManualOverride: false,
    isDashboardAvailable: true,
    openDashboard: toggle,
    closeDashboard: toggle,
    toggleDashboard: toggle,
  }));

  return { toggleDashboard: toggle, mockUsePerformanceDashboard: mock };
});

vi.mock('@/hooks/usePerformanceDashboard', () => ({
  usePerformanceDashboard: mockUsePerformanceDashboard,
}));

describe('PerformanceDebugButton', () => {
  beforeEach(() => {
    __setFeatureFlagEnvironmentForTesting({ MODE: 'development' });
  });

  afterEach(() => {
    cleanup();
    toggleDashboard.mockClear();
    mockUsePerformanceDashboard.mockReset();
    __setFeatureFlagEnvironmentForTesting(null);
  });

  it('renders the debug button when the flag is enabled', () => {
    render(<PerformanceDebugButton />);

    expect(
      screen.getByRole('button', { name: /Performance Dashboard/i }),
    ).toBeInTheDocument();
  });

  it('does not render when the performance dashboard flag is disabled', () => {
    mockUsePerformanceDashboard.mockReturnValueOnce({
      isOpen: false,
      isDevMode: false,
      hasManualOverride: false,
      isDashboardAvailable: false,
      openDashboard: toggleDashboard,
      closeDashboard: toggleDashboard,
      toggleDashboard,
    });

    render(<PerformanceDebugButton />);

    expect(
      screen.queryByRole('button', { name: /Performance Dashboard/i }),
    ).not.toBeInTheDocument();
  });

  it('renders when manual override enables the dashboard in production mode', () => {
    mockUsePerformanceDashboard.mockReturnValueOnce({
      isOpen: false,
      isDevMode: false,
      hasManualOverride: true,
      isDashboardAvailable: true,
      openDashboard: toggleDashboard,
      closeDashboard: toggleDashboard,
      toggleDashboard,
    });

    render(<PerformanceDebugButton />);

    expect(
      screen.getByRole('button', { name: /Performance Dashboard/i }),
    ).toBeInTheDocument();
  });
});
