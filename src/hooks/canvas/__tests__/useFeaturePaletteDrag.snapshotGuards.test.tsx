// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeaturePaletteDrag } from '@/hooks/canvas/useFeaturePaletteDrag';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import type { ClassroomFeature, ClassroomFeatureType } from '@/types';
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

const podiumTemplate: FeatureTemplate = {
  type: 'podium',
  label: 'Podium',
  width: 90,
  height: 60,
  movable: true,
  allowMultiple: true,
};

const makePointerEvent = <T extends Element>(
  overrides: Record<string, unknown> = {},
): React.PointerEvent<T> =>
  ({
    pointerId: 1,
    clientX: 190,
    clientY: 80,
    pointerType: 'mouse',
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    currentTarget: { setPointerCapture: vi.fn() },
    ...overrides,
  }) as unknown as React.PointerEvent<T>;

const dispatchWindowPointerEvent = (
  type: 'pointermove' | 'pointerup',
  init: { pointerId: number; clientX: number; clientY: number },
) => {
  const event = new Event(type);
  Object.assign(event, init);
  window.dispatchEvent(event);
};

describe('useFeaturePaletteDrag snapshot guards', () => {
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

  // Identity conversions keep client and scene coordinates aligned in tests.
  const toSceneCoordinates = (
    _svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => ({ x: clientX, y: clientY });
  const sceneToClient = (point: { x: number; y: number }) => ({
    x: point.x,
    y: point.y,
  });

  beforeEach(() => {
    features = [makeFeature()];
    setSceneFeatures = vi.fn((updater) => {
      features = typeof updater === 'function' ? updater(features) : updater;
    });
    runSceneTransaction = vi.fn();
    snapshot = vi.fn();
    selectFeature = vi.fn();
  });

  const renderPaletteDragHook = () =>
    renderHook(() =>
      useFeaturePaletteDrag({
        featureTemplateMap: new Map<ClassroomFeatureType, FeatureTemplate>([
          ['podium', podiumTemplate],
        ]),
        sceneFeatures: features,
        runSceneTransaction: runSceneTransaction as never,
        setSceneFeatures: setSceneFeatures as unknown as React.Dispatch<
          React.SetStateAction<ClassroomFeature[]>
        >,
        snapshot,
        snapToGrid: false,
        classroomWidth: CLASSROOM_WIDTH,
        classroomHeight: CLASSROOM_HEIGHT,
        selectedFeatureIds: [],
        selectedTableIds: [],
        sceneTables: [],
        updateSceneTables: vi.fn(),
        commitScene: vi.fn(),
        toSceneCoordinates,
        sceneToClient,
        canvasRef,
        selectFeature,
      }),
    );

  describe('feature rotation', () => {
    it('does not commit when the rotate handle is clicked without movement', () => {
      const { result } = renderPaletteDragHook();

      act(() => {
        result.current.handleFeatureRotateStart(
          features[0],
          makePointerEvent<SVGElement>(),
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

    it('commits exactly one snapshot + transaction after rotating', () => {
      const { result } = renderPaletteDragHook();

      act(() => {
        // Feature center is (145, 80); moving the pointer below the center
        // rotates the feature by ~90°.
        result.current.handleFeatureRotateStart(
          features[0],
          makePointerEvent<SVGElement>(),
        );
        dispatchWindowPointerEvent('pointermove', {
          pointerId: 1,
          clientX: 145,
          clientY: 160,
        });
        dispatchWindowPointerEvent('pointerup', {
          pointerId: 1,
          clientX: 145,
          clientY: 160,
        });
      });

      // Live rotation updates the local scene state …
      expect(setSceneFeatures).toHaveBeenCalled();
      expect(features[0].rotation).toBe(90);
      // … and pointerup commits exactly once.
      expect(snapshot).toHaveBeenCalledTimes(1);
      expect(runSceneTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('feature drag', () => {
    it('does not commit when a feature is clicked without dragging', () => {
      const { result } = renderPaletteDragHook();

      act(() => {
        result.current.handleFeaturePointerDown(
          features[0],
          makePointerEvent<SVGRectElement>(),
        );
        dispatchWindowPointerEvent('pointerup', {
          pointerId: 1,
          clientX: 190,
          clientY: 80,
        });
      });

      expect(selectFeature).toHaveBeenCalledWith('feature-1', false);
      expect(snapshot).not.toHaveBeenCalled();
      expect(runSceneTransaction).not.toHaveBeenCalled();
    });

    it('commits exactly one snapshot + transaction after dragging a feature', () => {
      const { result } = renderPaletteDragHook();

      act(() => {
        result.current.handleFeaturePointerDown(
          features[0],
          makePointerEvent<SVGRectElement>({ clientX: 120, clientY: 70 }),
        );
        // Exceeds the 6px drag threshold and promotes the pending press
        // into an active drag.
        dispatchWindowPointerEvent('pointermove', {
          pointerId: 1,
          clientX: 160,
          clientY: 70,
        });
        dispatchWindowPointerEvent('pointerup', {
          pointerId: 1,
          clientX: 160,
          clientY: 70,
        });
      });

      expect(snapshot).toHaveBeenCalledTimes(1);
      expect(runSceneTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
