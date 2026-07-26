// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  ALIGNMENT_GUIDE_EPSILON,
  applyAlignmentToDelta,
  computeAlignmentSnap,
  getGroupAabb,
  getRotatedAabb,
  selectAlignmentTargets,
  type AlignmentRect,
} from '@/utils/canvas/alignmentGuides';
import type { ClassroomFeature, ClassroomTable } from '@/types';

const CANVAS = { width: 900, height: 600 };

const rect = (
  x: number,
  y: number,
  width = 55,
  height = 130,
): AlignmentRect => ({ x, y, width, height });

const makeTable = (
  overrides: Partial<ClassroomTable> = {},
): ClassroomTable => ({
  x: 100,
  y: 100,
  width: 55,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  ...overrides,
});

const makeFeature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'feature-1',
  type: 'podium',
  x: 300,
  y: 40,
  width: 90,
  height: 60,
  anchor: 'free',
  movable: true,
  ...overrides,
});

describe('getRotatedAabb', () => {
  it('returns the rect itself at 0 degrees', () => {
    expect(getRotatedAabb({ x: 10, y: 20, width: 50, height: 100 })).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 100,
    });
  });

  it('swaps extents around the center at 90 degrees', () => {
    const aabb = getRotatedAabb({
      x: 0,
      y: 0,
      width: 50,
      height: 100,
      rotation: 90,
    });
    expect(aabb).toEqual({ x: -25, y: 25, width: 100, height: 50 });
  });

  it('enlarges the box at 45 degrees while keeping the center', () => {
    const aabb = getRotatedAabb({
      x: 0,
      y: 0,
      width: 60,
      height: 60,
      rotation: 45,
    });
    const expectedSize = 60 * Math.SQRT2;
    expect(aabb.width).toBeCloseTo(expectedSize, 6);
    expect(aabb.height).toBeCloseTo(expectedSize, 6);
    expect(aabb.x + aabb.width / 2).toBeCloseTo(30, 6);
    expect(aabb.y + aabb.height / 2).toBeCloseTo(30, 6);
  });
});

describe('getGroupAabb', () => {
  it('returns null for empty input', () => {
    expect(getGroupAabb([])).toBeNull();
  });

  it('unions the boxes of all items', () => {
    const aabb = getGroupAabb([
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 100, y: 5, width: 20, height: 10 },
    ]);
    expect(aabb).toEqual({ x: 10, y: 5, width: 110, height: 55 });
  });
});

describe('computeAlignmentSnap', () => {
  it('snaps a left edge to a target left edge within tolerance', () => {
    const { offset, guides } = computeAlignmentSnap(
      rect(103, 400),
      [rect(100, 100)],
      CANVAS,
    );
    expect(offset).toEqual({ x: -3, y: 0 });
    expect(guides).toContainEqual({
      orientation: 'vertical',
      position: 100,
      kind: 'edge',
    });
  });

  it('snaps both axes independently against the same target', () => {
    const { offset } = computeAlignmentSnap(
      rect(203, 496, 100, 100),
      [rect(100, 500, 300, 40)],
      CANVAS,
    );
    // Moving centerX 253 → target centerX 250; moving top 496 → target top 500.
    expect(offset.x).toBe(-3);
    expect(offset.y).toBe(4);
  });

  it('snaps to the canvas center lines', () => {
    const { offset, guides } = computeAlignmentSnap(
      rect(424, 233, 50, 130),
      [],
      CANVAS,
    );
    // Moving centerX 449 → 450, moving centerY 298 → 300.
    expect(offset).toEqual({ x: 1, y: 2 });
    expect(guides).toContainEqual({
      orientation: 'vertical',
      position: 450,
      kind: 'canvasCenter',
    });
    expect(guides).toContainEqual({
      orientation: 'horizontal',
      position: 300,
      kind: 'canvasCenter',
    });
  });

  it('prefers the closest candidate when several are in tolerance', () => {
    const { offset } = computeAlignmentSnap(
      rect(103, 400),
      [rect(100, 100), rect(102, 100)],
      CANVAS,
    );
    expect(offset.x).toBe(-1);
  });

  it('does not snap beyond the tolerance', () => {
    const { offset, guides } = computeAlignmentSnap(
      rect(106, 400),
      [rect(100, 700)],
      CANVAS,
    );
    expect(offset).toEqual({ x: 0, y: 0 });
    expect(guides).toEqual([]);
  });

  it('snaps exactly at the tolerance boundary', () => {
    const { offset } = computeAlignmentSnap(
      rect(105, 400),
      [rect(100, 700)],
      CANVAS,
    );
    expect(offset.x).toBe(-5);
  });

  it('only reports guides that are exactly hit after the snap', () => {
    const { guides } = computeAlignmentSnap(
      rect(103, 401, 30, 130),
      [rect(100, 100)],
      CANVAS,
    );
    // x snaps left edge to 100 (guide); nothing else coincides afterwards.
    expect(guides).toEqual([
      { orientation: 'vertical', position: 100, kind: 'edge' },
    ]);
  });

  it('reports pre-existing alignment with the epsilon tolerance', () => {
    const { offset, guides } = computeAlignmentSnap(
      rect(100, 400),
      [rect(100, 100)],
      CANVAS,
      ALIGNMENT_GUIDE_EPSILON,
    );
    expect(offset).toEqual({ x: 0, y: 0 });
    expect(guides).toContainEqual({
      orientation: 'vertical',
      position: 100,
      kind: 'edge',
    });
  });

  it('dedupes coinciding guides and prefers the canvasCenter kind', () => {
    // Target right edge at 450 coincides with the vertical canvas center.
    const { guides } = computeAlignmentSnap(
      rect(452, 400),
      [rect(395, 100)],
      CANVAS,
    );
    const vertical = guides.filter(
      (guide) => guide.orientation === 'vertical' && guide.position === 450,
    );
    expect(vertical).toEqual([
      { orientation: 'vertical', position: 450, kind: 'canvasCenter' },
    ]);
  });
});

describe('applyAlignmentToDelta', () => {
  it('adjusts only the snapped axis of the delta', () => {
    const result = applyAlignmentToDelta(
      { x: 23, y: 40 },
      rect(80, 360),
      [rect(100, 100)],
      CANVAS,
    );
    // Shifted x = 103 → snap -3; shifted y = 400 → nothing in tolerance.
    expect(result.delta).toEqual({ x: 20, y: 40 });
    expect(result.guides).toContainEqual({
      orientation: 'vertical',
      position: 100,
      kind: 'edge',
    });
  });

  it('returns the delta unchanged when nothing aligns', () => {
    const result = applyAlignmentToDelta({ x: 7, y: 8 }, rect(80, 360), [], {
      width: 10_000,
      height: 10_000,
    });
    expect(result.delta).toEqual({ x: 7, y: 8 });
    expect(result.guides).toEqual([]);
  });
});

describe('selectAlignmentTargets', () => {
  it('excludes dragged tables but keeps the others', () => {
    const tables = [makeTable(), makeTable({ x: 300 })];
    const targets = selectAlignmentTargets(tables, [0], [], []);
    expect(targets).toEqual([rect(300, 100)]);
  });

  it('excludes dragged and hidden features', () => {
    const features = [
      makeFeature({ id: 'a' }),
      makeFeature({ id: 'b', x: 500 }),
      makeFeature({ id: 'c', x: 600, visible: false }),
      makeFeature({ id: 'd', x: 700, type: 'cabinet' }),
    ];
    const targets = selectAlignmentTargets([], [], features, ['a'], {
      cabinet: false,
    });
    expect(targets).toEqual([rect(500, 40, 90, 60)]);
  });

  it('uses the rotated bounding box for rotated items', () => {
    const targets = selectAlignmentTargets(
      [makeTable({ x: 0, y: 0, width: 50, height: 100, rotation: 90 })],
      [],
      [],
      [],
    );
    expect(targets).toEqual([{ x: -25, y: 25, width: 100, height: 50 }]);
  });
});
