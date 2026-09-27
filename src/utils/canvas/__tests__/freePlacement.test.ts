// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassroomFeature, ClassroomTable } from '@/types';
import {
  collectRoomObstacles,
  featureFootprint,
  findFreeSpot,
  findFreeWallSpot,
} from '../freePlacement';

const ROOM = { width: 900, height: 600 };

const table = (overrides: Partial<ClassroomTable> = {}): ClassroomTable => ({
  x: 0,
  y: 0,
  width: 120,
  height: 60,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
  ...overrides,
});

const feature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'f',
  type: 'cabinet',
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  anchor: 'free',
  movable: true,
  rotation: 0,
  ...overrides,
});

describe('findFreeSpot', () => {
  it('puts the first thing in the middle of an empty room', () => {
    expect(findFreeSpot({ width: 120, height: 60 }, [], ROOM)).toEqual({
      x: 390,
      y: 270,
    });
  });

  it('keeps its distance to what already stands there', () => {
    const obstacles = collectRoomObstacles([table({ x: 390, y: 270 })], []);
    const spot = findFreeSpot({ width: 120, height: 60 }, obstacles, ROOM, {
      gap: 20,
    });

    expect(spot).not.toBeNull();
    const { x, y } = spot!;
    const clearOfTable =
      x + 120 + 20 <= 390 ||
      x >= 390 + 120 + 20 ||
      y + 60 + 20 <= 270 ||
      y >= 270 + 60 + 20;
    expect(clearOfTable).toBe(true);
  });

  it('stays inside the room with its margin', () => {
    const spot = findFreeSpot({ width: 860, height: 560 }, [], ROOM, {
      margin: 20,
    });
    expect(spot).toEqual({ x: 20, y: 20 });
  });

  it('finds nothing in a room without space left', () => {
    const wall = [{ x: 0, y: 0, width: 900, height: 600 }];
    expect(findFreeSpot({ width: 120, height: 60 }, wall, ROOM)).toBeNull();
  });
});

describe('collectRoomObstacles', () => {
  it('counts a table as it stands, turned', () => {
    const [box] = collectRoomObstacles(
      [table({ x: 100, y: 100, width: 120, height: 60, rotation: 90 })],
      [],
    );
    // Turned a quarter round its centre (160, 130): 60 wide, 120 high.
    expect(box).toEqual({ x: 130, y: 70, width: 60, height: 120 });
  });

  it('leaves hidden room elements out', () => {
    expect(
      collectRoomObstacles([], [feature({ visible: false })]),
    ).toHaveLength(0);
  });
});

describe('featureFootprint', () => {
  it('turns a free element about its centre', () => {
    expect(
      featureFootprint(
        feature({ x: 0, y: 0, width: 100, height: 40, rotation: 90 }),
      ),
    ).toEqual({ x: 30, y: -30, width: 40, height: 100 });
  });

  // A window's angle only turns its icon; its box is drawn as stored.
  it('keeps the box of an element on a wall', () => {
    expect(
      featureFootprint(
        feature({
          type: 'window',
          anchor: 'top',
          movable: false,
          x: 200,
          y: 0,
          width: 90,
          height: 12,
          rotation: -90,
        }),
      ),
    ).toEqual({ x: 200, y: 0, width: 90, height: 12 });
  });
});

describe('findFreeWallSpot', () => {
  /** A 90-wide window on whichever wall the point is on. */
  const windowAt = ({ x, y }: { x: number; y: number }) =>
    y === 0 || y === ROOM.height
      ? { x: x - 45, y: y === 0 ? 0 : ROOM.height - 12, width: 90, height: 12 }
      : { x: x === 0 ? 0 : ROOM.width - 12, y: y - 45, width: 12, height: 90 };

  it('starts in the middle of the top wall', () => {
    expect(findFreeWallSpot(windowAt, [], ROOM)).toEqual({ x: 450, y: 0 });
  });

  it('moves along the wall past what already hangs there', () => {
    const spot = findFreeWallSpot(
      windowAt,
      [{ x: 405, y: 0, width: 90, height: 12 }],
      ROOM,
      { gap: 10 },
    );
    expect(spot?.y).toBe(0);
    expect(Math.abs((spot?.x ?? 0) - 450)).toBeGreaterThanOrEqual(100);
  });

  it('goes on to the next wall once one is full', () => {
    const topFull = [{ x: 0, y: 0, width: 900, height: 12 }];
    expect(findFreeWallSpot(windowAt, topFull, ROOM)).toEqual({
      x: 900,
      y: 300,
    });
  });
});
