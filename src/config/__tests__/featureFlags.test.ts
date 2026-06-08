import { describe, it, expect, afterEach } from 'vitest';
import {
  isFeatureEnabled,
  featureFlags,
  getFeatureFlagSnapshot,
  getRuntimeEnvironment,
  __setFeatureFlagEnvironmentForTesting,
} from '@/config/featureFlags';

afterEach(() => {
  __setFeatureFlagEnvironmentForTesting(null);
});

describe('featureFlags', () => {
  it('uses development defaults when no override is provided', () => {
    __setFeatureFlagEnvironmentForTesting({ MODE: 'development' });

    expect(isFeatureEnabled('performanceDashboard')).toBe(true);
    expect(getRuntimeEnvironment()).toBe('development');
  });

  it('falls back to production defaults when disabled', () => {
    __setFeatureFlagEnvironmentForTesting({ VERCEL_ENV: 'production' });

    expect(featureFlags.performanceDashboard).toBe(false);
    expect(getRuntimeEnvironment()).toBe('production');
  });

  it('parses truthy and falsy environment values case-insensitively', () => {
    __setFeatureFlagEnvironmentForTesting({
      VERCEL_ENV: 'preview',
      VITE_FLAG_PERFORMANCE_DASHBOARD: 'On',
    });

    expect(isFeatureEnabled('performanceDashboard')).toBe(true);
    expect(getRuntimeEnvironment()).toBe('preview');
  });

  it('exposes snapshot metadata for diagnostics', () => {
    __setFeatureFlagEnvironmentForTesting({
      VERCEL_ENV: 'production',
      VITE_FLAG_PERFORMANCE_DASHBOARD: 'true',
    });

    const snapshot = getFeatureFlagSnapshot();
    const performanceEntry = snapshot.find(
      (entry) => entry.name === 'performanceDashboard',
    );
    expect(performanceEntry).toBeDefined();
    expect(performanceEntry?.value).toBe(true);
    expect(performanceEntry?.source).toBe('env');
    expect(performanceEntry?.environment).toBe('production');
    expect(performanceEntry?.envKey).toBe('VITE_FLAG_PERFORMANCE_DASHBOARD');
  });
});
