// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeatureResize } from '@/hooks/canvas/useFeatureResize';
import type { ClassroomFeature } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';

const makeFeature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'feature-1',
  type: 'podium',
  x: 100,
  y: 50,
  width: 90,
  height: 60,
  anchor: 'free',
  movable: true,
  rotation: 0,
  ...overrides,
});

const makePointerEvent = (
  overrides: Partial<React.PointerEvent<SVGElement>> = {},
): React.PointerEvent<SVGElement> =>
  ({
    pointerId: 1,
    clientX: 190,
    clientY: 80,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    ...overrides,
  }) as unknown as React.PointerEvent<SVGElement>;

const dispatchWindowPointerEvent = (
  type: 'pointermove' | 'pointerup',
  init: { pointerId: number; clientX: number; clientY: number },
) => {
  const event = new Event(type);
  Object.assign(event, init);
  window.dispatchEvent(event);
};

describe('useFeatureResize', () => {
  let features: ClassroomFeature[];
  let setSceneFeatures: ReturnType<typeof vi.fn>;
  let runSceneTransaction: ReturnType<typeof vi.fn>;
  let snapshot: ReturnType<typeof vi.fn<() => void>>;
  let selectFeature: ReturnType<
    typeof vi.fn<(featureId: string, additive: boolean) => void>
  >;

  const canvasRef = {
    current: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  } as React.RefObject<SVGSVGElement>;

  // Identity conversion keeps client and scene coordinates aligned in tests.
  const toSceneCoordinates = (
    _svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => ({ x: clientX, y: clientY });

  beforeEach(() => {
    features = [makeFeature()];
    setSceneFeatures = vi.fn((updater) => {
      features = typeof updater === 'function' ? updater(features) : updater;
    });
    runSceneTransaction = vi.fn();
    snapshot = vi.fn();
    selectFeature = vi.fn();
  });

  const renderResizeHook = () =>
    renderHook(() =>
      useFeatureResize({
        sceneFeatures: features,
        setSceneFeatures: setSceneFeatures as unknown as React.Dispatch<
          React.SetStateAction<ClassroomFeature[]>
        >,
        runSceneTransaction: runSceneTransaction as never,
        snapshot,
        snapToGrid: false,
        classroomWidth: CLASSROOM_WIDTH,
        classroomHeight: CLASSROOM_HEIGHT,
        canvasRef,
        toSceneCoordinates,
        selectFeature,
      }),
    );

  it('selects the feature and applies live updates while dragging', () => {
    const { result } = renderResizeHook();

    act(() => {
      result.current.handleFeatureResizeStart(
        features[0],
        'e',
        makePointerEvent(),
      );
    });
    expect(selectFeature).toHaveBeenCalledWith('feature-1', false);

    act(() => {
      dispatchWindowPointerEvent('pointermove', {
        pointerId: 1,
        clientX: 220,
        clientY: 80,
      });
    });

    expect(setSceneFeatures).toHaveBeenCalledTimes(1);
    expect(features[0]).toMatchObject({ x: 100, width: 120, height: 60 });
    // Live updates never write to the undo stack.
    expect(snapshot).not.toHaveBeenCalled();
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });

  it('commits exactly one snapshot + transaction on pointerup', () => {
    const { result } = renderResizeHook();

    act(() => {
      result.current.handleFeatureResizeStart(
        features[0],
        'e',
        makePointerEvent(),
      );
      dispatchWindowPointerEvent('pointermove', {
        pointerId: 1,
        clientX: 240,
        clientY: 80,
      });
      dispatchWindowPointerEvent('pointerup', {
        pointerId: 1,
        clientX: 240,
        clientY: 80,
      });
    });

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(runSceneTransaction).toHaveBeenCalledTimes(1);
    const transaction = runSceneTransaction.mock.calls[0][0];
    const resultState = transaction({
      scene: { features: [] },
      tables: [],
      seating: [],
    });
    expect(resultState.features[0]).toMatchObject({ width: 140 });
    expect(resultState.scene.features[0]).toMatchObject({ width: 140 });

    // Further moves after the drag ended are ignored.
    act(() => {
      dispatchWindowPointerEvent('pointermove', {
        pointerId: 1,
        clientX: 400,
        clientY: 80,
      });
    });
    expect(features[0].width).toBe(140);
  });

  it('does not commit when the pointer never moved', () => {
    const { result } = renderResizeHook();

    act(() => {
      result.current.handleFeatureResizeStart(
        features[0],
        'e',
        makePointerEvent(),
      );
      dispatchWindowPointerEvent('pointerup', {
        pointerId: 1,
        clientX: 190,
        clientY: 80,
      });
    });

    expect(snapshot).not.toHaveBeenCalled();
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });

  it('ignores moves from other pointers', () => {
    const { result } = renderResizeHook();

    act(() => {
      result.current.handleFeatureResizeStart(
        features[0],
        'e',
        makePointerEvent({ pointerId: 1 }),
      );
      dispatchWindowPointerEvent('pointermove', {
        pointerId: 2,
        clientX: 400,
        clientY: 80,
      });
    });

    expect(setSceneFeatures).not.toHaveBeenCalled();
  });
});
