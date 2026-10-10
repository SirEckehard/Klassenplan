// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A mix is one session (decision 0027): the construction and its refinement
 * decide by the same tables' targets and the same earlier pairs, weighed by
 * recency and kind.
 */
import { describe, expect, it } from 'vitest';
import type { ClassroomScene, MixResult, Student } from '@/types';
import { createMockStudent, createMockTable } from '@/__tests__/utils';
import { DEFAULT_MIX_WEIGHTS } from '@/utils';
import { createRng } from '../rng';
import {
  generateSeatingPlan,
  refineSeatingLocal,
  runMixSession,
} from '../seatingAlgorithm';

/** Rows of double desks under a board on the top wall, far enough apart. */
const room = (
  count: number,
  patch: (
    index: number,
  ) => Partial<ReturnType<typeof createMockTable>> = () => ({}),
): ClassroomScene => ({
  totalStudents: count * 2,
  tables: Array.from({ length: count }, (_, index) => ({
    ...createMockTable({
      x: 120 + (index % 3) * 260,
      y: 120 + Math.floor(index / 3) * 160,
      width: 120,
      height: 60,
      zIndex: index,
    }),
    ...patch(index),
  })),
  features: [
    {
      id: 'board-1',
      type: 'board',
      x: 300,
      y: 0,
      width: 300,
      height: 20,
      anchor: 'top',
      movable: true,
    },
  ],
});

const tableIds = (seating: (Student | null)[][]) =>
  seating.map((table) =>
    table
      .filter(Boolean)
      .map((student) => student!.id)
      .sort()
      .join('+'),
  );

describe('runMixSession', () => {
  it('keeps the tables as full as the construction drew them', () => {
    // A table out of the mix makes the even spread a draw: 13 students over
    // eight double desks leave three of them with one student.
    const scene = room(9, (index) => (index === 8 ? { inactive: true } : {}));
    const students = Array.from({ length: 13 }, (_, index) =>
      createMockStudent({
        id: `s${index}`,
        name: `S${index}`,
        gender: index % 2 === 0 ? 'girl' : 'boy',
        restless: index % 3 === 1,
      }),
    );
    const settings = { ...DEFAULT_MIX_WEIGHTS, avoidRestlessTogether: 10 };

    for (const seed of [1, 2, 3, 4, 5]) {
      const constructed = generateSeatingPlan(
        students,
        [],
        [],
        {},
        settings,
        scene,
        undefined,
        { rng: createRng(seed) },
      );
      const mixed = runMixSession(
        students,
        [],
        [],
        {},
        settings,
        scene,
        undefined,
        { rng: createRng(seed), refine: { useAnnealing: true } },
      );

      const count = (seating: (Student | null)[][]) =>
        seating.map((table) => table.filter(Boolean).length);
      expect(count(mixed)).toEqual(count(constructed));
    }
  });

  it('keeps the pairs of the plan on screen apart in both phases', () => {
    const [ada, ben, cem, dua] = ['ada', 'ben', 'cem', 'dua'].map((id) =>
      createMockStudent({ id, name: id }),
    );
    const onScreen = [
      [ada!, ben!],
      [cem!, dua!],
    ];
    const lastMix: MixResult = {
      id: 1,
      timestamp: '2026-10-10T08:00:00.000Z',
      seating: onScreen,
      mixSettings: DEFAULT_MIX_WEIGHTS,
    };

    for (const seed of [1, 2, 3]) {
      const mixed = runMixSession(
        [ada!, ben!, cem!, dua!],
        [],
        [lastMix],
        {},
        { avoidPreviousPairs: 10 },
        room(2),
        onScreen,
        { rng: createRng(seed), refine: { useAnnealing: true } },
      );

      expect(tableIds(mixed)).not.toContain('ada+ben');
      expect(tableIds(mixed)).not.toContain('cem+dua');
    }
  });
});

describe('refineSeatingLocal with a session', () => {
  // Two girls and two boys: keeping Ada beside Ben keeps both desks mixed,
  // and the only other mixed pairing sat together just now.
  const ada = createMockStudent({ id: 'ada', name: 'Ada', gender: 'girl' });
  const ben = createMockStudent({ id: 'ben', name: 'Ben', gender: 'boy' });
  const cem = createMockStudent({ id: 'cem', name: 'Cem', gender: 'girl' });
  const dua = createMockStudent({ id: 'dua', name: 'Dua', gender: 'boy' });
  const start = [
    [ada, ben],
    [cem, dua],
  ];
  const refineWith = (adaBen: number) =>
    refineSeatingLocal(
      [ada, ben, cem, dua],
      [],
      [],
      {},
      start,
      { avoidPreviousPairs: 10, preferGenderMix: 1 },
      room(2),
      {
        // As the app refines: the greedy pass refuses any swap that unmixes
        // the room's genders, whatever the pairs.
        useAnnealing: true,
        rng: createRng(7),
        session: {
          targets: [2, 2],
          previousPairs: new Map([
            ['ada::ben', adaBen],
            ['ada::dua', 1],
            ['ben::cem', 1],
          ]),
        },
      },
    );

  it('weighs an earlier pair by how long ago it sat together', () => {
    // Long ago: a mixed desk is worth more than keeping that pair apart.
    expect(tableIds(refineWith(0.25)).sort()).toEqual(['ada+ben', 'cem+dua']);
    // Just now: the pair goes apart, though both desks lose their mix.
    expect(tableIds(refineWith(1)).sort()).toEqual(['ada+cem', 'ben+dua']);
  });
});
