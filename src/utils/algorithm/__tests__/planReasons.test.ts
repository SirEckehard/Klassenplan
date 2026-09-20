// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * "Warum dieser Plan" is the one place where the app speaks about its own
 * result in sentences. A sentence that is not true of the seats below it is
 * worse than no sentence at all, so these tests pin what each reason is
 * allowed to claim against hand-built arrangements.
 */
import { describe, expect, it } from 'vitest';
import { buildPlanReasons } from '../planReasons';
import type { CriterionFulfillment } from '../seatingStatistics';
import {
  createMockClassroomScene,
  createMockStudent,
  createMockTable,
} from '@/__tests__/utils';
import type { SeatingArrangement } from '@/types';

/**
 * Two double tables at opposite ends of the room: seats of the same table are
 * neighbours, seats of the other table are not — which is what "apart" below
 * relies on.
 */
const scene = () =>
  createMockClassroomScene(2, {
    tables: [
      createMockTable({ x: 100, y: 100 }),
      createMockTable({ x: 760, y: 480, zIndex: 1 }),
    ],
  });

const ada = createMockStudent({ id: 'ada', name: 'Ada', restless: true });
const ben = createMockStudent({ id: 'ben', name: 'Ben', restless: true });
const cem = createMockStudent({ id: 'cem', name: 'Cem' });
const dia = createMockStudent({ id: 'dia', name: 'Dia' });

/** The two restless students sit at different tables. */
const apart: SeatingArrangement = [
  [ada, cem],
  [ben, dia],
];
/** …and here they do not. */
const together: SeatingArrangement = [
  [ada, ben],
  [cem, dia],
];

const restless = (percentage: number): CriterionFulfillment => ({
  key: 'avoidRestlessTogether',
  label: 'Unruhe',
  percentage,
  weight: 8,
  active: true,
  count: { fulfilled: percentage === 100 ? 1 : 0, total: 1 },
});

const build = (
  fulfillment: CriterionFulfillment[],
  arrangement: SeatingArrangement,
) => buildPlanReasons({ fulfillment, arrangement, scene: scene(), limit: 3 });

describe('buildPlanReasons', () => {
  it('names the students a met criterion worked out for', () => {
    const [reason] = build([restless(100)], apart);

    expect(reason.tone).toBe('met');
    expect(reason.named).toBe(true);
    expect(reason.studentIds).toEqual(['ada', 'ben']);
    expect(reason.fulfilled).toBe(1);
  });

  it('names the students an open criterion did not work out for', () => {
    const [reason] = build([restless(0)], together);

    expect(reason.tone).toBe('open');
    // Only the two sitting next to each other, not the whole class.
    expect(reason.studentIds).toEqual(['ada', 'ben']);
  });

  it('leaves a criterion without names when it is about tables', () => {
    const genderMix: CriterionFulfillment = {
      key: 'preferGenderMix',
      label: 'Geschlechter',
      percentage: 50,
      weight: 3,
      active: true,
      count: { fulfilled: 1, total: 2 },
    };

    const [reason] = build([genderMix], together);

    expect(reason.named).toBe(false);
    expect(reason.studentIds).toEqual([]);
    expect(reason.total).toBe(2);
  });

  it('always keeps the criterion that came off worst', () => {
    const heavy: CriterionFulfillment[] = [
      { ...restless(100), key: 'avoidRestlessTogether', weight: 9 },
      {
        key: 'considerWishPartners',
        label: 'Wunschpartner',
        percentage: 100,
        weight: 8,
        active: true,
      },
      {
        key: 'avoidConflictPartners',
        label: 'Distanzwünsche',
        percentage: 100,
        weight: 7,
        active: true,
      },
      {
        key: 'preferDoorSeats',
        label: 'Türnähe',
        percentage: 20,
        weight: 1,
        active: true,
      },
    ];

    const reasons = build(heavy, apart);

    expect(reasons).toHaveLength(3);
    expect(reasons.map((reason) => reason.key)).toContain('preferDoorSeats');
    // What worked reads first, what is open last.
    expect(reasons[reasons.length - 1].key).toBe('preferDoorSeats');
  });

  it('leaves out criteria the mix did not act on', () => {
    const inactive: CriterionFulfillment = {
      key: 'avoidShyAlone',
      label: 'Schüchternheit',
      percentage: 100,
      weight: 0,
      active: false,
    };

    expect(build([inactive], apart)).toEqual([]);
    expect(build([], apart)).toEqual([]);
  });

  it('counts the names it had to leave out', () => {
    const manyRestless: SeatingArrangement = [
      [
        { ...ada, restless: true },
        { ...ben, restless: true },
      ],
      [
        { ...cem, restless: true },
        { ...dia, restless: true },
      ],
    ];

    const [reason] = build([restless(0)], manyRestless);

    expect(reason.studentIds).toHaveLength(3);
    expect(reason.moreStudents).toBe(1);
  });
});
