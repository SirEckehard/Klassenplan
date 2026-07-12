// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  getFeatureResizeHandles,
  getResizeCursor,
  resizeFeature,
  type FeatureFrame,
  type FeatureResizeHandle,
} from '@/utils/canvas/featureResize';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT, MIN_FEATURE_SIZE } from '@/utils';
import type { ClassroomFeature } from '@/types';

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

const frameOf = (feature: ClassroomFeature): FeatureFrame => ({
  x: feature.x,
  y: feature.y,
  width: feature.width,
  height: feature.height,
});

const resize = (
  feature: ClassroomFeature,
  handle: FeatureResizeHandle,
  sceneDelta: { x: number; y: number },
  snapToGrid = false,
) =>
  resizeFeature(feature, handle, sceneDelta, frameOf(feature), {
    snapToGrid,
    classroomWidth: CLASSROOM_WIDTH,
    classroomHeight: CLASSROOM_HEIGHT,
  });

describe('getFeatureResizeHandles', () => {
  it('exposes every edge and corner for free features', () => {
    expect(getFeatureResizeHandles(makeFeature())).toEqual([
      'nw',
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
    ]);
  });

  it('limits wall features to length handles at both ends', () => {
    expect(getFeatureResizeHandles(makeFeature({ anchor: 'left' }))).toEqual([
      'n',
      's',
    ]);
    expect(getFeatureResizeHandles(makeFeature({ anchor: 'right' }))).toEqual([
      'n',
      's',
    ]);
    expect(getFeatureResizeHandles(makeFeature({ anchor: 'top' }))).toEqual([
      'e',
      'w',
    ]);
    expect(getFeatureResizeHandles(makeFeature({ anchor: 'bottom' }))).toEqual([
      'e',
      'w',
    ]);
  });
});

describe('getResizeCursor', () => {
  it('maps unrotated handles onto the four resize cursors', () => {
    expect(getResizeCursor('e')).toBe('ew-resize');
    expect(getResizeCursor('w')).toBe('ew-resize');
    expect(getResizeCursor('n')).toBe('ns-resize');
    expect(getResizeCursor('s')).toBe('ns-resize');
    expect(getResizeCursor('se')).toBe('nwse-resize');
    expect(getResizeCursor('nw')).toBe('nwse-resize');
    expect(getResizeCursor('ne')).toBe('nesw-resize');
    expect(getResizeCursor('sw')).toBe('nesw-resize');
  });

  it('rotates the cursor with the feature', () => {
    expect(getResizeCursor('e', 90)).toBe('ns-resize');
    expect(getResizeCursor('n', 90)).toBe('ew-resize');
    expect(getResizeCursor('s', 45)).toBe('nesw-resize');
    expect(getResizeCursor('se', 90)).toBe('nesw-resize');
    expect(getResizeCursor('e', 180)).toBe('ew-resize');
    expect(getResizeCursor('e', -90)).toBe('ns-resize');
  });
});

describe('resizeFeature (free features)', () => {
  it('grows the dragged edge while the opposite edge stays fixed', () => {
    const podium = makeFeature();
    expect(resize(podium, 'e', { x: 30, y: 0 })).toEqual({
      x: 100,
      y: 50,
      width: 120,
      height: 60,
    });
    expect(resize(podium, 's', { x: 0, y: 25 })).toEqual({
      x: 100,
      y: 50,
      width: 90,
      height: 85,
    });
    expect(resize(podium, 'w', { x: -30, y: 0 })).toEqual({
      x: 70,
      y: 50,
      width: 120,
      height: 60,
    });
    expect(resize(podium, 'n', { x: 0, y: -25 })).toEqual({
      x: 100,
      y: 25,
      width: 90,
      height: 85,
    });
  });

  it('resizes both axes at once via corner handles', () => {
    const podium = makeFeature();
    expect(resize(podium, 'se', { x: 30, y: 25 })).toEqual({
      x: 100,
      y: 50,
      width: 120,
      height: 85,
    });
    expect(resize(podium, 'nw', { x: -30, y: -25 })).toEqual({
      x: 70,
      y: 25,
      width: 120,
      height: 85,
    });
  });

  it('snaps the resized dimension to the grid', () => {
    const podium = makeFeature();
    expect(resize(podium, 'e', { x: 23, y: 0 }, true).width).toBe(115);
  });

  it('clamps to the minimum feature size', () => {
    const podium = makeFeature();
    expect(resize(podium, 'e', { x: -200, y: 0 })).toEqual({
      x: 100,
      y: 50,
      width: MIN_FEATURE_SIZE,
      height: 60,
    });
  });

  it('does not force dimensions that start below the minimum up to it', () => {
    const divider = makeFeature({ type: 'divider', width: 160, height: 12 });
    // Shrinking stops at the start thickness (12), growing works normally.
    expect(resize(divider, 's', { x: 0, y: -50 }).height).toBe(12);
    expect(resize(divider, 's', { x: 0, y: 5 }).height).toBe(17);
  });

  it('clamps growth to the room bounds with the opposite edge fixed', () => {
    const podium = makeFeature();
    expect(resize(podium, 'e', { x: 10000, y: 0 })).toEqual({
      x: 100,
      y: 50,
      width: CLASSROOM_WIDTH - 100,
      height: 60,
    });
  });

  it('resizes a 90°-rotated divider along its rotated axis', () => {
    const divider = makeFeature({
      type: 'divider',
      x: 100,
      y: 200,
      width: 160,
      height: 12,
      rotation: 90,
    });
    // The local width axis points down in scene coordinates at 90°.
    const grown = resize(divider, 'e', { x: 0, y: 40 });
    expect(grown.width).toBe(200);
    expect(grown.height).toBe(12);
    expect(grown.x).toBeCloseTo(80, 6);
    expect(grown.y).toBeCloseTo(220, 6);
  });

  it('keeps the rotated footprint inside the room when growing', () => {
    const divider = makeFeature({
      type: 'divider',
      x: 100,
      y: 200,
      width: 160,
      height: 12,
      rotation: 90,
    });
    const grown = resize(divider, 'e', { x: 0, y: 10000 });
    // The fixed edge sits at scene y = 126, so the room bottom limits the
    // rotated length to 600 - 126 = 474.
    expect(grown.width).toBeCloseTo(474, 6);
    // Bottom of the rotated footprint touches the room edge.
    expect(grown.y + grown.height / 2 + grown.width / 2).toBeCloseTo(
      CLASSROOM_HEIGHT,
      6,
    );
  });
});

describe('resizeFeature (wall-anchored features)', () => {
  it('stretches a left window along the entire wall and stays flush', () => {
    const window = makeFeature({
      type: 'window',
      anchor: 'left',
      movable: false,
      x: 0,
      y: 0,
      width: 12,
      height: 160,
    });
    const stretched = resize(window, 's', { x: 0, y: 10000 });
    expect(stretched).toEqual({
      x: 0,
      y: 0,
      width: 12,
      height: CLASSROOM_HEIGHT,
    });
  });

  it('limits the along-wall growth by the fixed opposite edge', () => {
    const window = makeFeature({
      type: 'window',
      anchor: 'left',
      movable: false,
      x: 0,
      y: 90,
      width: 12,
      height: 160,
    });
    expect(resize(window, 's', { x: 0, y: 10000 })).toEqual({
      x: 0,
      y: 90,
      width: 12,
      height: CLASSROOM_HEIGHT - 90,
    });
    expect(resize(window, 'n', { x: 0, y: -50 })).toEqual({
      x: 0,
      y: 40,
      width: 12,
      height: 210,
    });
  });

  it('resizes a bottom door along its wall in both directions', () => {
    const door = makeFeature({
      type: 'door',
      anchor: 'bottom',
      movable: false,
      x: 800,
      y: CLASSROOM_HEIGHT - 12,
      width: 70,
      height: 12,
    });
    expect(resize(door, 'e', { x: 10000, y: 0 })).toEqual({
      x: 800,
      y: CLASSROOM_HEIGHT - 12,
      width: CLASSROOM_WIDTH - 800,
      height: 12,
    });
    expect(resize(door, 'w', { x: -30, y: 0 })).toEqual({
      x: 770,
      y: CLASSROOM_HEIGHT - 12,
      width: 100,
      height: 12,
    });
  });

  it('keeps a resized wall feature thickness untouched below the minimum', () => {
    const window = makeFeature({
      type: 'window',
      anchor: 'left',
      movable: false,
      x: 0,
      y: 90,
      width: 12,
      height: 160,
    });
    // Length shrinking stops at MIN_FEATURE_SIZE, thickness stays 12.
    const shrunk = resize(window, 's', { x: 0, y: -1000 });
    expect(shrunk.height).toBe(MIN_FEATURE_SIZE);
    expect(shrunk.width).toBe(12);
  });

  it('snaps wall resizes to the grid', () => {
    const window = makeFeature({
      type: 'window',
      anchor: 'left',
      movable: false,
      x: 0,
      y: 90,
      width: 12,
      height: 160,
    });
    expect(resize(window, 's', { x: 0, y: 13 }, true).height).toBe(175);
  });
});
