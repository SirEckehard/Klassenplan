// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeaturePaletteDrag } from '@/hooks/canvas/useFeaturePaletteDrag';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import type {
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomTable,
} from '@/types';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  type AlignmentGuide,
} from '@/utils';

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

const makeTable = (
  overrides: Partial<ClassroomTable> = {},
): ClassroomTable => ({
  x: 112,
  y: 300,
  width: 55,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
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

const windowTemplate: FeatureTemplate = {
  type: 'window',
  label: 'Fenster',
  width: 12,
  height: 160,
  movable: false,
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

describe('useFeaturePaletteDrag alignment guides', () => {
  let features: ClassroomFeature[];
  let setSceneFeatures: ReturnType<typeof vi.fn>;
  let setActiveAlignmentGuides: ReturnType<
    typeof vi.fn<(guides: AlignmentGuide[] | null) => void>
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
    setActiveAlignmentGuides = vi.fn();
  });

  const renderPaletteDragHook = (enabled = true) =>
    renderHook(() =>
      useFeaturePaletteDrag({
        featureTemplateMap: new Map<ClassroomFeatureType, FeatureTemplate>([
          ['podium', podiumTemplate],
          ['window', windowTemplate],
        ]),
        sceneFeatures: features,
        runSceneTransaction: vi.fn() as never,
        setSceneFeatures: setSceneFeatures as unknown as React.Dispatch<
          React.SetStateAction<ClassroomFeature[]>
        >,
        snapshot: vi.fn(),
        snapToGrid: false,
        classroomWidth: CLASSROOM_WIDTH,
        classroomHeight: CLASSROOM_HEIGHT,
        selectedFeatureIds: [],
        selectedTableIds: [],
        sceneTables: [makeTable()],
        updateSceneTables: vi.fn(),
        commitScene: vi.fn(),
        toSceneCoordinates,
        sceneToClient,
        canvasRef,
        selectFeature: vi.fn(),
        alignmentGuidesEnabled: enabled,
        setActiveAlignmentGuides,
      }),
    );

  const dragFeatureTo = (
    result: ReturnType<typeof renderPaletteDragHook>['result'],
    feature: ClassroomFeature,
    clientX: number,
    clientY: number,
  ) => {
    act(() => {
      result.current.handleFeaturePointerDown(
        feature,
        makePointerEvent<SVGRectElement>(),
      );
    });
    // First move only crosses the drag threshold (the grab offset is taken
    // from this event); the second move performs the actual displacement.
    act(() => {
      dispatchWindowPointerEvent('pointermove', {
        pointerId: 1,
        clientX: 200,
        clientY: 80,
      });
    });
    act(() => {
      dispatchWindowPointerEvent('pointermove', {
        pointerId: 1,
        clientX,
        clientY,
      });
    });
  };

  it('publishes guides while a movable feature aligns and clears on release', () => {
    const { result } = renderPaletteDragHook();

    // The drag starts at (200, 80) with grab offset (100, 30); moving to
    // (210, 80) places the podium's left edge at 110 — within snap range of
    // the table edge at 112.
    dragFeatureTo(result, features[0], 210, 80);

    expect(setActiveAlignmentGuides).toHaveBeenCalledWith(
      expect.arrayContaining([
        { orientation: 'vertical', position: 112, kind: 'edge' },
      ]),
    );

    act(() => {
      dispatchWindowPointerEvent('pointerup', {
        pointerId: 1,
        clientX: 200,
        clientY: 80,
      });
    });
    expect(setActiveAlignmentGuides).toHaveBeenLastCalledWith(null);
  });

  it('never publishes guides for wall-anchored features', () => {
    features = [
      makeFeature({
        id: 'window-1',
        type: 'window',
        x: 0,
        y: 90,
        width: 12,
        height: 160,
        anchor: 'left',
        movable: false,
      }),
    ];
    const { result } = renderPaletteDragHook();

    dragFeatureTo(result, features[0], 200, 80);

    const nonNullCalls = setActiveAlignmentGuides.mock.calls.filter(
      ([guides]) => guides !== null,
    );
    expect(nonNullCalls).toEqual([]);
  });

  it('does not compute anything while the toggle is off', () => {
    const { result } = renderPaletteDragHook(false);

    dragFeatureTo(result, features[0], 200, 80);

    expect(setActiveAlignmentGuides).not.toHaveBeenCalled();
  });
});
