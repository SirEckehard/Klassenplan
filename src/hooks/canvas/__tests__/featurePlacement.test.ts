// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  computeFeatureDropPlacement,
  rotateFeatureForAnchor,
  placeFixedFeatureBase,
  placeMovableFeatureBase,
  type FeaturePaletteItem,
} from '@/hooks/canvas/useFeaturePaletteDrag';
import { computeTemplateDropPlacement } from '@/hooks/useTableInteraction';
import type { ClassroomFeature } from '@/types';
import {
  CABINET_WIDTH,
  CABINET_HEIGHT,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  TABLE_PRESETS,
  WHITEBOARD_WIDTH,
  WHITEBOARD_HEIGHT,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  PODIUM_WIDTH,
  PODIUM_HEIGHT,
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

describe('per-instance sizes (resized features)', () => {
  it('preserves a custom size when moving a movable feature', () => {
    const resizedSize = { width: 150, height: 80 };
    const placement = placeMovableFeatureBase(
      resizedSize,
      300,
      200,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(placement.width).toBe(150);
    expect(placement.height).toBe(80);
    expect(placement).toMatchObject({ x: 300, y: 200 });
  });

  it('preserves a custom length when re-anchoring a wall feature', () => {
    // A window stretched to 400px length on a vertical wall …
    const stretched = { width: 12, height: 400 };
    const left = placeFixedFeatureBase(
      stretched,
      2,
      CLASSROOM_HEIGHT / 2,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(left.width).toBe(12);
    expect(left.height).toBe(400);

    // … keeps its length (oriented) when dropped on a horizontal wall.
    const top = placeFixedFeatureBase(
      stretched,
      CLASSROOM_WIDTH / 2,
      2,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(top.width).toBe(400);
    expect(top.height).toBe(12);
  });
});

describe('computeFeatureDropPlacement', () => {
  const windowTemplate: FeaturePaletteItem = {
    type: 'window',
    label: 'Fenster',
    icon: null,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    movable: false,
    allowMultiple: true,
  };

  const podiumTemplate: FeaturePaletteItem = {
    type: 'podium',
    label: 'Pult',
    icon: null,
    width: PODIUM_WIDTH,
    height: PODIUM_HEIGHT,
    movable: true,
    allowMultiple: false,
  };

  it('snaps a window to the nearest wall with the anchor rotation', () => {
    const placement = computeFeatureDropPlacement(
      windowTemplate,
      2,
      CLASSROOM_HEIGHT / 2,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(placement).toMatchObject({
      x: 0,
      anchor: 'left',
      rotation: 0,
      movable: false,
    });

    const topPlacement = computeFeatureDropPlacement(
      windowTemplate,
      CLASSROOM_WIDTH / 2,
      2,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(topPlacement).toMatchObject({
      y: 0,
      anchor: 'top',
      rotation: -90,
      width: WINDOW_HEIGHT,
      height: WINDOW_WIDTH,
    });
  });

  it('centers the podium on the pointer with its default rotation', () => {
    const placement = computeFeatureDropPlacement(
      podiumTemplate,
      450,
      300,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(placement).toMatchObject({
      x: 450 - PODIUM_WIDTH / 2,
      y: 300 - PODIUM_HEIGHT / 2,
      anchor: 'free',
      rotation: 90,
      movable: true,
    });
  });
});

describe('computeTemplateDropPlacement', () => {
  it('aligns the table front edge with the drop point', () => {
    const preset = TABLE_PRESETS.double;
    const placement = computeTemplateDropPlacement(
      'double',
      300,
      300,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(placement).toEqual({
      x: 300 - preset.width,
      y: 300 - preset.height / 2,
      width: preset.width,
      height: preset.height,
      seatCount: preset.seatCount,
    });
  });

  it('snaps to the grid and clamps to the room', () => {
    const snapped = computeTemplateDropPlacement(
      'double',
      303,
      301,
      true,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(snapped.x % 5).toBe(0);
    expect(snapped.y % 5).toBe(0);

    const clamped = computeTemplateDropPlacement(
      'double',
      10,
      10,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
    );
    expect(clamped).toMatchObject({ x: 0, y: 0 });
  });

  it('lets the guide snap override the grid snap per axis', () => {
    const alignment = {
      targets: [{ x: 252, y: 500, width: 55, height: 130 }],
      canvas: { width: CLASSROOM_WIDTH, height: CLASSROOM_HEIGHT },
    };
    const aligned = computeTemplateDropPlacement(
      'double',
      303,
      301,
      true,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
      alignment,
    );
    // Grid snap alone would land at x = 250; the target edge at 252 wins.
    expect(aligned.x).toBe(252);
    expect(aligned.y).toBe(235);
  });

  it('still clamps to the room when an alignment context is given', () => {
    const clamped = computeTemplateDropPlacement(
      'double',
      10,
      10,
      false,
      CLASSROOM_WIDTH,
      CLASSROOM_HEIGHT,
      {
        targets: [{ x: 252, y: 500, width: 55, height: 130 }],
        canvas: { width: CLASSROOM_WIDTH, height: CLASSROOM_HEIGHT },
      },
    );
    expect(clamped).toMatchObject({ x: 0, y: 0 });
  });
});
