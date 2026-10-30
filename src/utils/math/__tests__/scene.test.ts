// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { ClassroomScene, SeatingArrangement } from '@/types';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import { hasPlanForScene, hasShapeMismatch } from '../scene';

describe('hasPlanForScene', () => {
  const ada = createMockStudent({ id: 'ada' });
  const ben = createMockStudent({ id: 'ben' });
  const twoDoubles = createMockClassroomScene(2);

  it('is a plan when a student sits at the tables as they stand', () => {
    expect(
      hasPlanForScene(twoDoubles, [
        [ada, null],
        [ben, null],
      ]),
    ).toBe(true);
  });

  it('is no plan while nobody is seated', () => {
    expect(
      hasPlanForScene(twoDoubles, [
        [null, null],
        [null, null],
      ]),
    ).toBe(false);
  });

  // The room set up anew under a plan: one table of four where two doubles
  // now stand, or more tables than the arrangement has rows.
  it.each<[string, SeatingArrangement]>([
    ['another seat count', [[ada, ben, null, null]]],
    ['fewer rows than tables', [[ada, ben]]],
  ])('is no plan for tables it was not made for (%s)', (_, seating) => {
    expect(hasPlanForScene(twoDoubles, seating)).toBe(false);
  });
});

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
