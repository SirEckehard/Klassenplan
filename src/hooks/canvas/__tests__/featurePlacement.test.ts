// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  rotateFeatureForAnchor,
  placeFixedFeatureBase,
  placeMovableFeatureBase,
  type FeaturePaletteItem,
} from '@/hooks/canvas/useFeaturePaletteDrag';
import type { ClassroomFeature } from '@/types';
import {
  CABINET_WIDTH,
  CABINET_HEIGHT,
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

describe('placeMovableFeatureBase', () => {
  const cabinetTemplate: FeaturePaletteItem = {
    type: 'cabinet',
    label: 'Schrank',
    icon: null,
    width: CABINET_WIDTH, // 100
    height: CABINET_HEIGHT, // 40
    movable: true,
    allowMultiple: true,
  };

  const place = (desiredX: number, desiredY: number, rotation?: number) =>
    placeMovableFeatureBase(
      cabinetTemplate,
      desiredX,
      desiredY,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
      rotation,
    );

  it('clamps an unrotated cabinet to the classroom bounds', () => {
    expect(place(-500, -500)).toMatchObject({ x: 0, y: 0 });
    expect(place(5000, 5000)).toMatchObject({
      x: CLASSROOM_WIDTH - CABINET_WIDTH,
      y: CLASSROOM_HEIGHT - CABINET_HEIGHT,
    });
  });

  it('lets a 90°-rotated cabinet sit flush against all four walls', () => {
    // Rotated footprint is 40 wide × 100 tall around the center, so the
    // stored (unrotated) top-left is offset by ±30 from the visual edge.
    expect(place(-500, 300, 90).x).toBe(-30);
    expect(place(5000, 300, 90).x).toBe(CLASSROOM_WIDTH - CABINET_WIDTH + 30);
    expect(place(300, -500, 90).y).toBe(30);
    expect(place(300, 5000, 90).y).toBe(CLASSROOM_HEIGHT - CABINET_HEIGHT - 30);
  });

  it('uses the rotated bounding box for diagonal rotations', () => {
    const halfExtent = ((CABINET_WIDTH + CABINET_HEIGHT) * Math.SQRT2) / 4;
    const flushLeft = place(-500, 300, 45);
    expect(flushLeft.x + CABINET_WIDTH / 2).toBeCloseTo(halfExtent, 5);
    const flushBottom = place(300, 5000, 45);
    expect(flushBottom.y + CABINET_HEIGHT / 2).toBeCloseTo(
      CLASSROOM_HEIGHT - halfExtent,
      5,
    );
  });

  it('treats 180°/270° like 0°/90°', () => {
    expect(place(-500, -500, 180)).toMatchObject(place(-500, -500, 0));
    expect(place(-500, 300, 270).x).toBe(place(-500, 300, 90).x);
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
