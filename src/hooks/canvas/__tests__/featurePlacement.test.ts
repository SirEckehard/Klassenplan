// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  rotateFeatureForAnchor,
  placeFixedFeatureBase,
  type FeaturePaletteItem,
} from '@/hooks/canvas/useFeaturePaletteDrag';
import type { ClassroomFeature } from '@/types';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  WHITEBOARD_WIDTH,
  WHITEBOARD_HEIGHT,
} from '@/utils';

const makeFeature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'feature-1',
  type: 'whiteboard',
  x: 0,
  y: 0,
  width: WHITEBOARD_WIDTH,
  height: WHITEBOARD_HEIGHT,
  anchor: 'left',
  movable: false,
  rotation: 0,
  ...overrides,
});

describe('rotateFeatureForAnchor', () => {
  it('orients whiteboards along the wall like boards', () => {
    expect(rotateFeatureForAnchor(makeFeature(), 'left').rotation).toBe(0);
    expect(rotateFeatureForAnchor(makeFeature(), 'right').rotation).toBe(180);
    expect(rotateFeatureForAnchor(makeFeature(), 'top').rotation).toBe(-90);
    expect(rotateFeatureForAnchor(makeFeature(), 'bottom').rotation).toBe(90);
  });

  it('leaves freely placed furniture untouched', () => {
    const cabinet = makeFeature({
      type: 'cabinet',
      anchor: 'free',
      movable: true,
      rotation: 45,
    });
    expect(rotateFeatureForAnchor(cabinet, 'top')).toBe(cabinet);

    const divider = makeFeature({
      type: 'divider',
      anchor: 'free',
      movable: true,
    });
    expect(rotateFeatureForAnchor(divider, 'left')).toBe(divider);
  });
});

describe('placeFixedFeatureBase', () => {
  const whiteboardTemplate: FeaturePaletteItem = {
    type: 'whiteboard',
    label: 'Whiteboard',
    icon: null,
    width: WHITEBOARD_WIDTH,
    height: WHITEBOARD_HEIGHT,
    movable: false,
    allowMultiple: true,
  };

  it('swaps whiteboard dimensions when dropped on a horizontal wall', () => {
    const placement = placeFixedFeatureBase(
      whiteboardTemplate,
      CLASSROOM_WIDTH / 2,
      2,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(placement.anchor).toBe('top');
    expect(placement.width).toBe(WHITEBOARD_HEIGHT);
    expect(placement.height).toBe(WHITEBOARD_WIDTH);
    expect(placement.y).toBe(0);
  });

  it('keeps whiteboard dimensions on a vertical wall', () => {
    const placement = placeFixedFeatureBase(
      whiteboardTemplate,
      2,
      CLASSROOM_HEIGHT / 2,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(placement.anchor).toBe('left');
    expect(placement.width).toBe(WHITEBOARD_WIDTH);
    expect(placement.height).toBe(WHITEBOARD_HEIGHT);
    expect(placement.x).toBe(0);
  });
});
