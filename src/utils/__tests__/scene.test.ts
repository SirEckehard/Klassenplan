// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { hasShapeMismatch } from '../math/scene';
import type { ClassroomScene, SeatingArrangement } from '../../types';

describe('hasShapeMismatch', () => {
  const scene: ClassroomScene = {
    tables: [
      {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
        templateType: 'double',
      },
      {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        rotation: 0,
        seatCount: 4,
        locked: false,
        zIndex: 1,
        templateType: 'group4',
      },
    ],
    totalStudents: 6,
  };

  it('returns false when seating matches table capacities', () => {
    const seating: SeatingArrangement = [
      [null, null],
      [null, null, null, null],
    ];
    expect(hasShapeMismatch(scene, seating)).toBe(false);
  });

  it('returns true when seating lengths differ from table capacities', () => {
    const seating: SeatingArrangement = [[null], [null, null]];
    expect(hasShapeMismatch(scene, seating)).toBe(true);
  });
});
