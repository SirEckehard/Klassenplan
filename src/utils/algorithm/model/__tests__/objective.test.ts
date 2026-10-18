// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The one score of a plan (decision 0031). The refinement keeps a running
 * score and trusts every swap's delta; these tests hold the delta to the
 * score exactly, and pin the terms the review of 2026-10-18 found wrong.
 */
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  Student,
} from '@/types';
import { createRng, randomInt } from '../../rng';
import { shuffleArray } from '../../shuffle';
import arrangeTables from '../../autoArrange';
import { DEFAULT_MIX_WEIGHTS, neutralSettings } from '../../../mixSettings';
import { genderExcess } from '../criteria';
import {
  buildModelContext,
  occupantsOf,
  placementCost,
  scoreArrangement,
  swapDelta,
} from '../objective';

const boardRight: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};
const windowLeft: ClassroomFeature = {
  id: 'window',
  type: 'window',
  x: 0,
  y: 100,
  width: 20,
  height: 160,
  anchor: 'left',
  movable: false,
};

const roomOf = (tables: ClassroomTable[]): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [boardRight, windowLeft],
});

const student = (id: string, extra: Partial<Student> = {}): Student =>
  ({
    id,
    name: id,
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    ...extra,
  }) as Student;

const settings = (extra: Partial<MixSettings>): MixSettings => ({
  ...neutralSettings,
  ...extra,
});

describe('swapDelta and placementCost', () => {
  const rng = createRng(42);
  const roles = ['mediator', 'leader', 'loner', 'socialHub'] as const;
  const languages = ['native', 'fluent', 'intermediate', 'beginner', 'daz'];
  const genders = ['boy', 'girl', 'diverse', undefined] as const;
  const classOf = (count: number): Student[] =>
    Array.from({ length: count }, (_, index) =>
      student(`s${index}`, {
        gender: genders[index % 4],
        restless: rng() < 0.3,
        shy: rng() < 0.2,
        concentrationIssues: rng() < 0.3,
        needsFrontSeat: rng() < 0.15,
        ...(index % 5 === 0
          ? { performanceStrong: true as const }
          : index % 5 === 1
            ? { performanceWeak: true as const }
            : {}),
        prefersWindow: rng() < 0.2,
        height:
          index % 7 === 0 ? 'small' : index % 7 === 1 ? 'tall' : undefined,
        languageSkill: languages[index % 5] as Student['languageSkill'],
        socialRole: index % 3 === 0 ? roles[index % 4] : undefined,
        wishPartnerIds: [`s${(index + 3) % count}`, `s${(index + 7) % count}`],
        avoidPartnerIds: index % 4 === 0 ? [`s${(index + 5) % count}`] : [],
      }),
    );

  const rooms: Array<[string, ClassroomTable[]]> = [
    ['double desks', arrangeTables('double', 14)],
    [
      'single desks close together',
      arrangeTables('single', 24).map((table, index) => ({
        ...table,
        y: table.y - (index % 4) * 30,
      })),
    ],
    ['group tables', arrangeTables('group4', 7)],
    [
      'turned and mixed tables',
      arrangeTables('group6', 5).map((table, index) =>
        index % 2 ? { ...table, rotation: 90 } : table,
      ),
    ],
  ];

  it.each(rooms)('is exact in a room of %s', (_, tables) => {
    const scene = roomOf(tables);
    const students = classOf(22);
    const context = buildModelContext({
      scene,
      students,
      settings: settings({
        ...DEFAULT_MIX_WEIGHTS,
        homogeneousPerformanceGroups: 0,
      }),
      previousPairs: new Map([
        ['s0::s3', 1.6],
        ['s1::s2', 0.5],
      ]),
      usable: (_table, seat) => seat < 2,
    });
    const size = context.layout.size;

    for (let trial = 0; trial < 20; trial++) {
      const occupants = new Int32Array(size).fill(-1);
      shuffleArray([...Array(size).keys()], rng)
        .slice(0, students.length)
        .forEach((seat, index) => {
          occupants[seat] = index;
        });

      for (let step = 0; step < 30; step++) {
        const a = randomInt(rng, size);
        const b = randomInt(rng, size);
        const before = scoreArrangement(context, occupants);
        const delta = swapDelta(context, occupants, a, b);
        const held = occupants[a]!;
        occupants[a] = occupants[b]!;
        occupants[b] = held;
        expect(scoreArrangement(context, occupants) - before).toBeCloseTo(
          delta,
          9,
        );
      }

      const empty = occupants.indexOf(-1);
      const seated = occupants.findIndex((occupant) => occupant >= 0);
      if (empty >= 0 && seated >= 0) {
        const moving = occupants[seated]!;
        occupants[seated] = -1;
        const before = scoreArrangement(context, occupants);
        const cost = placementCost(context, occupants, moving, empty);
        occupants[empty] = moving;
        expect(scoreArrangement(context, occupants) - before).toBeCloseTo(
          cost,
          9,
        );
      }
    }
  });
});

describe('the terms', () => {
  // Two double desks along the board's wall, seats 1 and 2 directly beside.
  const twoDesks = roomOf([
    {
      x: 600,
      y: 100,
      width: 55,
      height: 130,
      rotation: 0,
      seatCount: 2,
      locked: false,
      zIndex: 0,
      templateType: 'double',
    },
    {
      x: 600,
      y: 260,
      width: 55,
      height: 130,
      rotation: 0,
      seatCount: 2,
      locked: false,
      zIndex: 1,
      templateType: 'double',
    },
  ]);

  const scoreOf = (
    weights: Partial<MixSettings>,
    arrangement: (Student | null)[][],
    students: Student[],
  ) => {
    const context = buildModelContext({
      scene: twoDesks,
      students,
      settings: settings(weights),
      previousPairs: new Map(),
    });
    return scoreArrangement(context, occupantsOf(context, arrangement));
  };

  it('weighs a distractible student beside a restless one the same both ways', () => {
    const restless = student('r', { restless: true });
    const distractible = student('c', { concentrationIssues: true });
    const x = student('x');
    const y = student('y');
    const students = [restless, distractible, x, y];
    const weights = { avoidConcentrationNearRestless: 5 };

    const one = scoreOf(
      weights,
      [
        [x, distractible],
        [restless, y],
      ],
      students,
    );
    const other = scoreOf(
      weights,
      [
        [x, restless],
        [distractible, y],
      ],
      students,
    );

    expect(one).toBeGreaterThan(0);
    expect(other).toBe(one);
  });

  it('does not charge a weak student for a seat partner of neither level', () => {
    const weakA = student('a', { performanceWeak: true });
    const weakB = student('b', { performanceWeak: true });
    const n1 = student('n1');
    const n2 = student('n2');
    const students = [weakA, weakB, n1, n2];
    const weights = { peerTutoring: 8 };

    const apart = scoreOf(
      weights,
      [
        [weakA, n1],
        [weakB, n2],
      ],
      students,
    );
    const together = scoreOf(
      weights,
      [
        [weakA, weakB],
        [n1, n2],
      ],
      students,
    );

    expect(apart).toBe(0);
    expect(together).toBeGreaterThan(apart);
  });

  it('counts divers as a gender of its own', () => {
    const d1 = student('d1', { gender: 'diverse' });
    const d2 = student('d2', { gender: 'diverse' });
    const boy = student('b', { gender: 'boy' });
    const girl = student('g', { gender: 'girl' });
    const students = [d1, d2, boy, girl];
    const weights = { preferGenderMix: 5 };

    const mixed = scoreOf(
      weights,
      [
        [d1, boy],
        [d2, girl],
      ],
      students,
    );
    const together = scoreOf(
      weights,
      [
        [d1, d2],
        [boy, girl],
      ],
      students,
    );

    expect(together).toBeGreaterThan(mixed);
    // 3 boys, 2 girls and one diverse student: nobody holds more than half.
    expect(genderExcess([3, 2, 1])).toBe(0);
    expect(genderExcess([4, 2, 0])).toBe(1);
    expect(genderExcess([2, 0, 0])).toBe(1);
  });

  it('leaves a student without a stated gender out of the balance', () => {
    const boy = student('b', { gender: 'boy' });
    const unknown = student('u');
    const students = [boy, unknown, student('x'), student('y')];

    expect(
      scoreOf(
        { preferGenderMix: 5 },
        [
          [boy, unknown],
          [null, null],
        ],
        students,
      ),
    ).toBe(0);
  });
});
