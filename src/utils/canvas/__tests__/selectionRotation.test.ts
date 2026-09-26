// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  applyFeatureRotations,
  applyTableRotations,
  collectRotationTargets,
  isRotatableFeature,
  rotateTargets,
  rotationsChangeTargets,
} from '@/utils/canvas/selectionRotation';
import type { ClassroomFeature, ClassroomTable } from '@/types';

const table = (overrides: Partial<ClassroomTable> = {}): ClassroomTable => ({
  x: 100,
  y: 100,
  width: 130,
  height: 120,
  rotation: 0,
  seatCount: 4,
  locked: false,
  zIndex: 0,
  ...overrides,
});

const feature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'cabinet',
  type: 'cabinet',
  x: 300,
  y: 300,
  width: 120,
  height: 40,
  anchor: 'free',
  movable: true,
  rotation: 0,
  ...overrides,
});

const room = { width: 900, height: 600 };

describe('selectionRotation', () => {
  it('turns freely placed room elements, not those on a wall', () => {
    expect(isRotatableFeature(feature())).toBe(true);
    expect(
      isRotatableFeature(feature({ anchor: 'left', movable: false })),
    ).toBe(false);
    // Placed freely but fixed in place: a turn would move it after all.
    expect(isRotatableFeature(feature({ movable: false }))).toBe(false);
  });

  it('collects unlocked tables and rotatable elements with their angles', () => {
    const targets = collectRotationTargets(
      [table(), table({ locked: true }), table({ rotation: 30 })],
      [
        feature({ rotation: 90 }),
        feature({ id: 'door', type: 'door', anchor: 'left', movable: false }),
      ],
      [0, 1, 2, 2],
      ['cabinet', 'door'],
    );

    expect(targets).toEqual({
      tables: [
        { index: 0, rotation: 0 },
        { index: 2, rotation: 30 },
      ],
      features: [{ id: 'cabinet', rotation: 90 }],
    });
  });

  it('turns every target from its own angle, within one turn', () => {
    const targets = collectRotationTargets(
      [table({ rotation: 330 })],
      [feature({ rotation: 10 })],
      [0],
      ['cabinet'],
    );

    const rotations = rotateTargets(targets, (rotation) => rotation + 45);

    expect(rotations.tables).toEqual(new Map([[0, 15]]));
    expect(rotations.features).toEqual(new Map([['cabinet', 55]]));
    expect(rotationsChangeTargets(targets, rotations)).toBe(true);
    expect(
      rotationsChangeTargets(
        targets,
        rotateTargets(targets, (rotation) => rotation + 360),
      ),
    ).toBe(false);
  });

  it('sets table angles as new objects and leaves the rest as they are', () => {
    const tables = [table(), table()];

    const next = applyTableRotations(tables, new Map([[1, 90]]));

    expect(next[0]).toBe(tables[0]);
    expect(next[1]).not.toBe(tables[1]);
    expect(next[1].rotation).toBe(90);
    expect(tables[1].rotation).toBe(0);
  });

  it('turns an element around its centre where there is room', () => {
    const [turned] = applyFeatureRotations(
      [feature()],
      new Map([['cabinet', 90]]),
      room,
    );

    expect(turned).toMatchObject({ rotation: 90, x: 300, y: 300 });
  });

  it('keeps an element turned against a wall inside the room', () => {
    // Lying along the top wall; upright it reaches 60 px above its centre.
    const [turned] = applyFeatureRotations(
      [feature({ y: 0 })],
      new Map([['cabinet', 90]]),
      room,
    );

    expect(turned).toMatchObject({ rotation: 90, x: 300, y: 40 });
  });
});
