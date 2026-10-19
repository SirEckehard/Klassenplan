// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { SeatingArrangement } from '@/types';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import { hasPlanForScene } from '../scene';

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
