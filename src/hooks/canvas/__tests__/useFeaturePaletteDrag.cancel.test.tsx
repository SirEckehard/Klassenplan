// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeaturePaletteDrag } from '@/hooks/canvas/useFeaturePaletteDrag';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import type { ClassroomFeatureType } from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';

const podium: FeatureTemplate = {
  type: 'podium',
  label: 'Pult',
  width: 90,
  height: 60,
  movable: true,
  allowMultiple: true,
};

/** The room drawn at the page's origin, one scene unit to a pixel. */
const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

const paletteDown = (pointerId: number) =>
  ({
    pointerId,
    // On the toolbar, left of the room.
    clientX: -60,
    clientY: 100,
    pointerType: 'touch',
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as React.PointerEvent<Element>;

const dispatch = (
  type: 'pointermove' | 'pointerup' | 'pointercancel',
  pointerId: number,
  clientX = 300,
  clientY = 300,
) => {
  const event = new Event(type);
  Object.assign(event, { pointerId, clientX, clientY });
  act(() => {
    window.dispatchEvent(event);
  });
};

describe('useFeaturePaletteDrag – a drag the browser takes back', () => {
  let runSceneTransaction: ReturnType<typeof vi.fn<SceneTransactionRunner>>;

  beforeEach(() => {
    runSceneTransaction = vi.fn<SceneTransactionRunner>();
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 900, height: 600 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Built once per test, as the room's state would hand them down: handlers
  // that changed on every render would end the drag on every render.
  const renderPalette = () => {
    const options: Parameters<typeof useFeaturePaletteDrag>[0] = {
      rotateSelection: vi.fn(),
      featureTemplateMap: new Map<ClassroomFeatureType, FeatureTemplate>([
        ['podium', podium],
      ]),
      sceneFeatures: [],
      runSceneTransaction,
      setSceneFeatures: vi.fn(),
      snapshot: vi.fn(),
      snapToGrid: false,
      classroomWidth: CLASSROOM_WIDTH,
      classroomHeight: CLASSROOM_HEIGHT,
      selectedFeatureIds: [],
      selectedTableIds: [],
      sceneTables: [],
      updateSceneTables: vi.fn(),
      commitScene: vi.fn(),
      toSceneCoordinates: (_svg, clientX, clientY) => ({
        x: clientX,
        y: clientY,
      }),
      sceneToClient: (point) => point,
      canvasRef: { current: canvas },
      selectFeature: vi.fn(),
      alignmentGuidesEnabled: false,
      setActiveAlignmentGuides: vi.fn(),
    };
    return renderHook(() => useFeaturePaletteDrag(options));
  };

  // A swipe that scrolls the toolbar starts on an entry; the browser cancels
  // the pointer. The next finger lifted over the room used to place the
  // element the swipe had started with.
  it('places nothing once the pointer is cancelled', () => {
    const { result } = renderPalette();

    act(() =>
      result.current.handleFeatureTemplatePointerDown('podium', paletteDown(5)),
    );
    expect(result.current.featureDragPreview).not.toBeNull();

    dispatch('pointercancel', 5, -60, 140);
    expect(result.current.featureDragPreview).toBeNull();

    dispatch('pointerup', 6);
    dispatch('pointerup', 5);
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });

  it('drops only for the finger that carries the element', () => {
    const { result } = renderPalette();

    act(() =>
      result.current.handleFeatureTemplatePointerDown('podium', paletteDown(5)),
    );
    dispatch('pointerup', 7);
    expect(runSceneTransaction).not.toHaveBeenCalled();

    dispatch('pointermove', 5);
    dispatch('pointerup', 5);
    expect(runSceneTransaction).toHaveBeenCalledTimes(1);

    // Its listeners went with it: a later release over the room adds nothing.
    dispatch('pointerup', 5);
    expect(runSceneTransaction).toHaveBeenCalledTimes(1);
  });
});
