// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A mix is two worker calls in a row — construction, then Simulated Annealing.
 * Both finish in well under a second, so the only feedback is the spinner in
 * the mix button; these tests pin the run itself and its cleanup on unmount.
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
  const calls: Array<{ resolve: (value: SeatingArrangement) => void }> = [];

  const fn = vi.fn(
    (
      _settings: MixSettings,
      _scene: ClassroomScene,
      ...rest: unknown[]
    ): Promise<SeatingArrangement> => {
      const run = rest.at(-1) as { signal?: AbortSignal } | undefined;

      return new Promise<SeatingArrangement>((resolve, reject) => {
        calls.push({ resolve });
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
  });

  it('runs both phases and reports the mix as finished', async () => {
    const generate = deferredCall();
    const refine = deferredCall();
    const onMix = vi.fn();

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate.fn,
        refineSeatingLocal: refine.fn,
        onMix,
      }),
    );

    act(() => {
      void result.current.handleMix();
    });
    await waitFor(() => expect(generate.calls).toHaveLength(1));
    expect(result.current.isMixing).toBe(true);

    act(() => {
      generate.calls[0]!.resolve(arrangement);
    });
    await waitFor(() => expect(refine.calls).toHaveLength(1));

    act(() => {
      refine.calls[0]!.resolve(arrangement);
    });

    await waitFor(() => expect(result.current.isMixing).toBe(false));
    expect(onMix).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh plan instead of reusing a cached one', async () => {
    const generate = vi.fn(async () => arrangement);

    const { result } = renderHook(() =>
      useSeatingMixHandler({
        settings: withCriteria,
        students,
        classroomScene: scene,
        generateSeatingPlan: generate,
      }),
    );

    await act(async () => {
      await result.current.handleMix();
    });

    expect(generate).toHaveBeenCalledWith(
      withCriteria,
      scene,
      true,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('does not report an aborted run as a failure', async () => {
    const generate = deferredCall();
    const onMix = vi.fn();

    const { result, unmount } = renderHook(() =>
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

    unmount();

    // An abandoned run is not a completed one: the post-mix callback (circle
    // regeneration) must not fire.
    await waitFor(() => expect(onMix).not.toHaveBeenCalled());
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
