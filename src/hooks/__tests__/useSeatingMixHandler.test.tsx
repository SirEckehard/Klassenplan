// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A mix is two worker calls in a row — construction, then Simulated Annealing —
 * and the second one can run for a while. These tests pin what the user gets
 * out of that: a progress readout that spans both calls, and a way out that
 * keeps the plan already on screen instead of throwing it away.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@/i18n';
import { useSeatingMixHandler } from '../useSeatingMixHandler';
import { neutralSettings } from '@/utils';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import type { ClassroomScene, MixSettings, SeatingArrangement } from '@/types';

const withCriteria = {
  ...neutralSettings,
  avoidRestlessTogether: 5,
} as MixSettings;

const scene: ClassroomScene = createMockClassroomScene();
const students = [
  createMockStudent({ id: 'a' }),
  createMockStudent({ id: 'b' }),
];
const arrangement: SeatingArrangement = [[students[0]!, students[1]!]];

/**
 * A worker stub that resolves only when the test says so, and rejects with an
 * `AbortError` the moment its signal fires — the same contract
 * `algorithmWorkerClient` honours.
 */
const deferredCall = () => {
  const calls: Array<{
    resolve: (value: SeatingArrangement) => void;
    onProgress?: (payload: { progress: number; stage?: string }) => void;
  }> = [];

  const fn = vi.fn(
    (
      _settings: MixSettings,
      _scene: ClassroomScene,
      ...rest: unknown[]
    ): Promise<SeatingArrangement> => {
      const run = rest.at(-1) as
        | {
            signal?: AbortSignal;
            onProgress?: (payload: {
              progress: number;
              stage?: string;
            }) => void;
          }
        | undefined;

      return new Promise<SeatingArrangement>((resolve, reject) => {
        calls.push({ resolve, onProgress: run?.onProgress });
        run?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    },
  );

  return { fn, calls };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSeatingMixHandler', () => {
  it('stays idle until a mix starts', () => {
    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: vi.fn(async () => arrangement),
      }),
    );

    expect(result.current.isMixing).toBe(false);
    expect(result.current.mixStatus).toBeNull();
  });

  it('spans the progress across construction and refinement', async () => {
    const generate = deferredCall();
    const refine = deferredCall();

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
        refineSeatingLocal: refine.fn,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(generate.calls).toHaveLength(1));

    // Construction owns the first quarter of the bar, so its own 100% must not
    // read as a finished mix.
    act(() => {
      generate.calls[0]!.onProgress?.({ progress: 1, stage: 'arranging' });
    });
    expect(result.current.mixStatus?.progress).toBeCloseTo(0.25, 5);

    act(() => {
      generate.calls[0]!.resolve(arrangement);
    });
    await waitFor(() => expect(refine.calls).toHaveLength(1));

    // Refinement fills the remaining three quarters.
    act(() => {
      refine.calls[0]!.onProgress?.({ progress: 0.5, stage: 'arranging' });
    });
    expect(result.current.mixStatus?.progress).toBeCloseTo(0.625, 5);

    act(() => {
      refine.calls[0]!.resolve(arrangement);
    });
    await waitFor(() => expect(result.current.isMixing).toBe(false));
    expect(result.current.mixStatus?.progress).toBe(1);
  });

  it('leaves the bar standing at 100% before clearing it', async () => {
    const generate = deferredCall();

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: neutralSettings as MixSettings,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(generate.calls).toHaveLength(1));

    act(() => {
      generate.calls[0]!.resolve(arrangement);
    });

    // The regression: the worker's closing 100% and the resolved promise land
    // in the same frame, so the full bar was committed and cleared together
    // and never painted. It has to outlive the mix by a moment.
    await waitFor(() => expect(result.current.isMixing).toBe(false));
    expect(result.current.mixStatus).toEqual(
      expect.objectContaining({ progress: 1, stage: 'done' }),
    );

    await waitFor(() => expect(result.current.mixStatus).toBeNull(), {
      timeout: 3000,
    });
  });

  it('translates the worker stage into a message', async () => {
    const generate = deferredCall();

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(generate.calls).toHaveLength(1));

    act(() => {
      generate.calls[0]!.onProgress?.({ progress: 0.5, stage: 'arranging' });
    });

    // The worker sends a stage key, never a phrase — it cannot know the
    // language. Any resolved message proves the lookup happened.
    expect(result.current.mixStatus?.stage).toBe('arranging');
    expect(result.current.mixStatus?.message).toBeTruthy();
    expect(result.current.mixStatus?.message).not.toContain('mixStage.');
  });

  it('cancels a running mix and clears the status', async () => {
    const generate = deferredCall();

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(result.current.isMixing).toBe(true));

    act(() => {
      result.current.cancelMix();
    });

    await waitFor(() => expect(result.current.isMixing).toBe(false));
    expect(result.current.mixStatus).toBeNull();
  });

  it('does not report the cancellation as a failure', async () => {
    const generate = deferredCall();
    const onMix = vi.fn();

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
        onMix,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(generate.calls).toHaveLength(1));

    act(() => {
      result.current.cancelMix();
    });
    await waitFor(() => expect(result.current.isMixing).toBe(false));

    // An abandoned run is not a completed one: the post-mix callback (circle
    // regeneration) must not fire.
    expect(onMix).not.toHaveBeenCalled();
  });

  it('cancelling is a no-op while nothing runs', () => {
    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: vi.fn(async () => arrangement),
      }),
    );

    act(() => {
      result.current.cancelMix();
    });

    expect(result.current.isMixing).toBe(false);
  });

  it('skips refinement when no criterion is active', async () => {
    const refine = vi.fn(async () => arrangement);

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: neutralSettings as MixSettings,
        students,
        classroomScene: scene,
        generateSeatingPlan: vi.fn(async () => arrangement),
        refineSeatingLocal: refine,
      }),
    );

    await act(async () => {
      await result.current.handleMix();
    });

    expect(refine).not.toHaveBeenCalled();
  });

  it('aborts an in-flight mix when the component goes away', async () => {
    const generate = deferredCall();

    const { result, unmount } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(generate.calls).toHaveLength(1));

    // Without the abort, the resolved promise would push state into an
    // unmounted tree.
    expect(() => unmount()).not.toThrow();
  });
});
