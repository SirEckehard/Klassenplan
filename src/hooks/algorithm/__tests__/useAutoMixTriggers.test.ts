import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoMixTriggers } from '../useAutoMixTriggers';
import { neutralSettings, normalizeMixSettings } from '@/utils';
import type { MixSettings } from '@/types';

describe('useAutoMixTriggers', () => {
  let mixSettings: MixSettings;

  beforeEach(() => {
    mixSettings = normalizeMixSettings(neutralSettings);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires manual trigger when enabled', () => {
    const requestRefine = vi.fn();
    const { result } = renderHook(() =>
      useAutoMixTriggers({
        requestRefine,
        mixSettings,
        step: 2,
        intelligentMix: true,
      }),
    );

    act(() => {
      result.current('manual-mix', { source: 'test' });
    });

    expect(requestRefine).toHaveBeenCalledTimes(1);
  });

  it('skips disabled triggers', () => {
    const requestRefine = vi.fn();
    const { result } = renderHook(() =>
      useAutoMixTriggers({
        requestRefine,
        mixSettings,
        step: 2,
        intelligentMix: true,
        triggers: { 'manual-mix': { enabled: false } },
      }),
    );

    act(() => {
      result.current('manual-mix');
    });

    expect(requestRefine).not.toHaveBeenCalled();
  });

  it('auto fires when configured step is entered', () => {
    const requestRefine = vi.fn();
    const { rerender } = renderHook(
      ({ currentStep }: { currentStep: number }) =>
        useAutoMixTriggers({
          requestRefine,
          mixSettings,
          step: currentStep,
          intelligentMix: true,
          triggers: { 'step-entered': { enabled: true, targetStep: 3 } },
        }),
      { initialProps: { currentStep: 1 } },
    );

    act(() => {
      rerender({ currentStep: 3 });
    });

    expect(requestRefine).toHaveBeenCalledTimes(1);
  });

  it('detects mix settings changes when enabled', () => {
    const requestRefine = vi.fn();
    const updatedSettings: MixSettings = {
      ...mixSettings,
      avoidPreviousPairs: mixSettings.avoidPreviousPairs + 1,
    };

    const { rerender } = renderHook(
      ({ settings }: { settings: MixSettings }) =>
        useAutoMixTriggers({
          requestRefine,
          mixSettings: settings,
          step: 2,
          intelligentMix: true,
          triggers: { 'mix-settings-change': { enabled: true } },
        }),
      { initialProps: { settings: mixSettings } },
    );

    act(() => {
      rerender({ settings: updatedSettings });
    });

    expect(requestRefine).toHaveBeenCalledTimes(1);
  });

  it('respects throttle configuration', () => {
    vi.useFakeTimers();
    const requestRefine = vi.fn();

    const { result } = renderHook(() =>
      useAutoMixTriggers({
        requestRefine,
        mixSettings,
        step: 2,
        intelligentMix: true,
        triggers: { 'manual-mix': { throttleMs: 1000 } },
      }),
    );

    act(() => {
      result.current('manual-mix');
      result.current('manual-mix');
    });

    expect(requestRefine).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current('manual-mix');
    });

    expect(requestRefine).toHaveBeenCalledTimes(2);
  });

  it('allows disabled intelligent mix overrides', () => {
    const requestRefine = vi.fn();
    const { result } = renderHook(() =>
      useAutoMixTriggers({
        requestRefine,
        mixSettings,
        step: 2,
        intelligentMix: false,
        triggers: {
          'ci-import': { enabled: true, requireIntelligentMix: false },
        },
      }),
    );

    act(() => {
      result.current('ci-import', { source: 'backup' });
    });

    expect(requestRefine).toHaveBeenCalledTimes(1);
  });
});
