// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassroomFeature } from '@/types';
import { moveFeaturesBy } from '../featureMovement';

const ROOM = { width: 900, height: 600 };

const feature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'c',
  type: 'cabinet',
  x: 100,
  y: 100,
  width: 100,
  height: 40,
  anchor: 'free',
  movable: true,
  rotation: 0,
  ...overrides,
});

describe('moveFeaturesBy', () => {
  it('moves a free element both ways', () => {
    const [moved] = moveFeaturesBy([feature()], ['c'], { x: 10, y: -5 }, ROOM);
    expect(moved).toMatchObject({ x: 110, y: 95 });
  });

  it('keeps a free element inside the room, turned as it stands', () => {
    const [moved] = moveFeaturesBy(
      [feature({ x: 0, y: 0, rotation: 90 })],
      ['c'],
      { x: -50, y: 0 },
      ROOM,
    );
    // Turned upright the cabinet is 40 wide, so its centre stops at 20.
    expect(moved.x + moved.width / 2).toBe(20);
  });

  it('slides an element on the top wall sideways only', () => {
    const window: ClassroomFeature = feature({
      id: 'w',
      type: 'window',
      anchor: 'top',
      movable: false,
      x: 200,
      y: 0,
      width: 90,
      height: 12,
    });
    const [sideways] = moveFeaturesBy([window], ['w'], { x: 10, y: 0 }, ROOM);
    expect(sideways).toMatchObject({ x: 210, y: 0 });

    const [down] = moveFeaturesBy([window], ['w'], { x: 0, y: 10 }, ROOM);
    expect(down).toBe(window);
  });

  it('slides an element on a side wall up and down, and not off it', () => {
    const door: ClassroomFeature = feature({
      id: 'd',
      type: 'door',
      anchor: 'right',
      movable: false,
      x: 888,
      y: 520,
      width: 12,
      height: 80,
    });
    const [moved] = moveFeaturesBy([door], ['d'], { x: 0, y: 50 }, ROOM);
    expect(moved).toMatchObject({ x: 888, y: 520 });

    const [up] = moveFeaturesBy([door], ['d'], { x: 0, y: -20 }, ROOM);
    expect(up).toMatchObject({ x: 888, y: 500 });
  });

  it('leaves unselected and immovable elements where they are', () => {
    const fixed = feature({ id: 'f', movable: false });
    const other = feature({ id: 'o' });
    const moved = moveFeaturesBy([fixed, other], ['f'], { x: 10, y: 0 }, ROOM);
    expect(moved[0]).toBe(fixed);
    expect(moved[1]).toBe(other);
  });
});
