// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassroomFeature, ClassroomTable } from '@/types';
import {
  featuresForTableFrame,
  frameContentBounds,
  turnBox,
} from '../presentationFrame';

const table = (x: number, y: number): ClassroomTable => ({
  x,
  y,
  width: 100,
  height: 60,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
});

const feature = (
  id: string,
  anchor: ClassroomFeature['anchor'],
  box: Pick<ClassroomFeature, 'x' | 'y' | 'width' | 'height'>,
): ClassroomFeature => ({
  id,
  type: anchor === 'free' ? 'cabinet' : 'window',
  anchor,
  movable: anchor === 'free',
  ...box,
});

// Tables from (300, 200) to (500, 400) in the 900×600 room.
const tables = [table(300, 200), table(400, 340)];

describe('featuresForTableFrame', () => {
  it('brings the board from the front wall to just above the tables', () => {
    const [board] = featuresForTableFrame(tables, [
      feature('board', 'top', { x: 350, y: 0, width: 200, height: 12 }),
    ]);

    // 24 units above the first row, its x unchanged.
    expect(board).toMatchObject({ x: 350, y: 164 });
  });

  it('keeps each wall element on its own side', () => {
    const [left, right, bottom] = featuresForTableFrame(tables, [
      feature('window', 'left', { x: 0, y: 250, width: 10, height: 80 }),
      feature('door', 'right', { x: 890, y: 280, width: 10, height: 60 }),
      feature('back', 'bottom', { x: 380, y: 590, width: 60, height: 10 }),
    ]);

    expect(left).toMatchObject({ x: 266, y: 250 });
    expect(right).toMatchObject({ x: 524, y: 280 });
    expect(bottom).toMatchObject({ x: 380, y: 424 });
  });

  it('holds a door in a far corner within the tables along its wall', () => {
    const [door] = featuresForTableFrame(tables, [
      feature('door', 'right', { x: 890, y: 520, width: 10, height: 60 }),
    ]);

    // Its centre comes to the bottom of the tables, so half of it shows.
    expect(door).toMatchObject({ x: 524, y: 370 });
  });

  it('leaves a wall element already beside the tables where it is', () => {
    const near = feature('near', 'top', {
      x: 350,
      y: 180,
      width: 100,
      height: 10,
    });

    expect(featuresForTableFrame(tables, [near])).toEqual([near]);
  });

  it('frames the desk before the first row and leaves out a corner cabinet', () => {
    const desk = feature('desk', 'free', {
      x: 360,
      y: 130,
      width: 80,
      height: 40,
    });
    const cabinet = feature('cabinet', 'free', {
      x: 780,
      y: 20,
      width: 100,
      height: 40,
    });

    expect(featuresForTableFrame(tables, [desk, cabinet])).toEqual([desk]);
  });

  it('brings the board up to the desk that stands before the tables', () => {
    const desk = feature('desk', 'free', {
      x: 360,
      y: 130,
      width: 80,
      height: 40,
    });

    const [, board] = featuresForTableFrame(tables, [
      desk,
      feature('board', 'top', { x: 350, y: 0, width: 200, height: 12 }),
    ]);

    expect(board).toMatchObject({ y: 94 });
  });

  it('draws a room without tables as it is', () => {
    const board = feature('board', 'top', {
      x: 350,
      y: 0,
      width: 200,
      height: 12,
    });

    expect(featuresForTableFrame([], [board])).toEqual([board]);
  });
});

describe('frameContentBounds', () => {
  it('boxes the tables, the room elements and any further boxes', () => {
    const board = feature('board', 'top', {
      x: 350,
      y: 100,
      width: 100,
      height: 12,
    });
    const photo = { minX: 260, minY: 250, maxX: 300, maxY: 290 };

    expect(frameContentBounds(tables, [board], [photo])).toEqual({
      minX: 260,
      minY: 100,
      maxX: 500,
      maxY: 400,
    });
  });

  it('measures a turned element by its outline', () => {
    const turned = { x: 0, y: 0, width: 100, height: 20, rotation: 90 };

    expect(frameContentBounds([], [turned])).toEqual({
      minX: 40,
      minY: -40,
      maxX: 60,
      maxY: 60,
    });
  });

  it('is null when nothing is drawn', () => {
    expect(frameContentBounds([], [])).toBeNull();
  });
});

describe('turnBox', () => {
  const box = { minX: 100, minY: 200, maxX: 300, maxY: 250 };
  const center = { x: 450, y: 300 };

  it('swaps width and height at a quarter turn', () => {
    const turned = turnBox(box, 90, center);
    expect(turned.maxX - turned.minX).toBe(50);
    expect(turned.maxY - turned.minY).toBe(200);
    // Clockwise: what lay left of the centre now lies above it.
    expect(turned.maxY).toBeLessThan(center.y);
  });

  it('mirrors the box through the centre at a half turn', () => {
    expect(turnBox(box, 180, center)).toEqual({
      minX: 600,
      minY: 350,
      maxX: 800,
      maxY: 400,
    });
  });
});
