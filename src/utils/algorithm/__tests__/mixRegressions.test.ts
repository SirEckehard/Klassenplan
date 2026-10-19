// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What the review of the mixing on 2026-10-18 found, held down (decision
 * 0031). Each case was measured before the criterion model: the refinement
 * handed back plans worse than its start, ignored neighbours at single desks,
 * froze students needing a front seat side by side, paired the weak students
 * left over, placed "random" plans by a hidden order, read directions in
 * screen coordinates and dodged one-sided wishes.
 */
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  SeatingArrangement,
  Student,
} from '@/types';
import { createRng } from '../rng';
import { shuffleArray } from '../shuffle';
import { neutralSettings } from '../../mixSettings';
import { runMixSession } from '../seatingAlgorithm';
import { seatTargetsFor } from '../seatTargets';
import { getSeatLayout, SEAT_RELATION_KINDS } from '../model/seatRelations';
import {
  buildModelContext,
  occupantsOf,
  scoreArrangement,
} from '../model/objective';

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

const table = (
  x: number,
  y: number,
  templateType: 'single' | 'double' = 'double',
): ClassroomTable => ({
  x,
  y,
  rotation: 0,
  locked: false,
  zIndex: 0,
  templateType,
  ...(templateType === 'single'
    ? { width: 55, height: 65, seatCount: 1 }
    : { width: 55, height: 130, seatCount: 2 }),
});

const room = (tables: ClassroomTable[]): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [boardRight],
});

/** 24 single desks in six rows of four, directly beside each other. */
const singles = room(
  Array.from({ length: 24 }, (_, index) =>
    table(700 - Math.floor(index / 4) * 115, 100 + (index % 4) * 95, 'single'),
  ),
);

/** 12 double desks: four rows, three along the wall, aisles between. */
const doubles = room(
  Array.from({ length: 12 }, (_, index) =>
    table(700 - Math.floor(index / 3) * 170, 60 + (index % 3) * 180),
  ),
);

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

const settings = (weights: Partial<MixSettings>): MixSettings => ({
  ...neutralSettings,
  ...weights,
});

const mix = (
  students: Student[],
  scene: ClassroomScene,
  weights: Partial<MixSettings>,
  seed: number,
  refine = true,
  lockedPositions: Record<string, { table: number; seat: number }> = {},
) =>
  runMixSession(students, [], lockedPositions, settings(weights), scene, {
    rng: createRng(seed),
    refine,
  });

const seatOf = (arrangement: SeatingArrangement, id: string) => {
  for (let tableIndex = 0; tableIndex < arrangement.length; tableIndex++) {
    const seat = arrangement[tableIndex]!.findIndex((s) => s?.id === id);
    if (seat >= 0) return { table: tableIndex, seat };
  }
  return null;
};

const relationOf = (
  scene: ClassroomScene,
  arrangement: SeatingArrangement,
  a: string,
  b: string,
) => {
  const layout = getSeatLayout(scene);
  const first = seatOf(arrangement, a);
  const second = seatOf(arrangement, b);
  if (!first || !second) return null;
  const kind =
    layout.kindBetween[
      (layout.offsets[first.table]! + first.seat) * layout.size +
        layout.offsets[second.table]! +
        second.seat
    ]!;
  return kind >= 0 ? SEAT_RELATION_KINDS[kind] : null;
};

describe('mixing after the review of 2026-10-18', () => {
  it('never refines a plan into a worse one by its own score', () => {
    const students = Array.from({ length: 22 }, (_, index) =>
      student(`s${index}`, {
        gender: index % 2 ? 'girl' : 'boy',
        restless: index % 5 === 0,
        concentrationIssues: index % 4 === 1,
      }),
    );
    const weights = {
      preferGenderMix: 2,
      avoidConcentrationTogether: 5,
      avoidConcentrationNearRestless: 5,
      avoidRestlessTogether: 5,
    };
    for (let seed = 1; seed <= 8; seed++) {
      const constructed = mix(students, doubles, weights, seed, false);
      const refined = mix(students, doubles, weights, seed, true);
      const context = buildModelContext({
        scene: doubles,
        students,
        settings: settings(weights),
        previousPairs: new Map(),
        usable: (tableIndex, seat) => Boolean(constructed[tableIndex]?.[seat]),
      });
      expect(
        scoreArrangement(context, occupantsOf(context, refined)),
      ).toBeLessThanOrEqual(
        scoreArrangement(context, occupantsOf(context, constructed)) + 1e-9,
      );
    }
  });

  it('keeps wish partners and distance wishes in view at single desks', () => {
    const students = Array.from({ length: 24 }, (_, index) =>
      student(`s${index}`),
    );
    const wishes: Array<[number, number]> = [
      [0, 1],
      [2, 3],
      [4, 5],
    ];
    const avoids: Array<[number, number]> = [
      [12, 13],
      [14, 15],
    ];
    for (const [a, b] of wishes) {
      students[a]!.wishPartnerIds = [`s${b}`];
      students[b]!.wishPartnerIds = [`s${a}`];
    }
    for (const [a, b] of avoids) {
      students[a]!.avoidPartnerIds = [`s${b}`];
      students[b]!.avoidPartnerIds = [`s${a}`];
    }
    const weights = { considerWishPartners: 8, avoidConflictPartners: 7 };
    let wishNeighbours = 0;
    let conflictNeighbours = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const plan = mix(students, singles, weights, seed);
      for (const [a, b] of wishes) {
        if (relationOf(singles, plan, `s${a}`, `s${b}`)) wishNeighbours++;
      }
      for (const [a, b] of avoids) {
        if (relationOf(singles, plan, `s${a}`, `s${b}`)) conflictNeighbours++;
      }
    }
    expect(wishNeighbours).toBe(20 * wishes.length);
    expect(conflictNeighbours).toBe(0);
  });

  it('sits a wish partner beside, not behind, relative to the board', () => {
    const students = Array.from({ length: 24 }, (_, index) =>
      student(`s${index}`),
    );
    students[0]!.wishPartnerIds = ['s1'];
    students[1]!.wishPartnerIds = ['s0'];
    const kinds: string[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const plan = mix(students, singles, { considerWishPartners: 8 }, seed);
      kinds.push(relationOf(singles, plan, 's0', 's1') ?? 'none');
    }
    expect(kinds.every((kind) => kind === 'beside')).toBe(true);
  });

  it('keeps two students needing a front seat "Sehr wichtig" in front but apart', () => {
    // One desk of the front row stands 2 px further forward.
    const scene = room(
      doubles.tables.map((entry, index) =>
        index === 1 ? { ...entry, x: entry.x + 2 } : entry,
      ),
    );
    const students = Array.from({ length: 22 }, (_, index) =>
      student(`s${index}`, { gender: index % 2 ? 'girl' : 'boy' }),
    );
    Object.assign(students[0]!, {
      needsFrontSeat: true,
      restless: true,
      avoidPartnerIds: ['s1'],
    });
    Object.assign(students[1]!, {
      needsFrontSeat: true,
      restless: true,
      avoidPartnerIds: ['s0'],
    });
    const weights = {
      preferFrontForNeedsFrontSeat: 8,
      avoidRestlessTogether: 5,
      avoidConflictPartners: 7,
    };
    for (let seed = 1; seed <= 20; seed++) {
      const plan = mix(students, scene, weights, seed);
      const front = [0, 1, 2];
      expect(front).toContain(seatOf(plan, 's0')!.table);
      expect(front).toContain(seatOf(plan, 's1')!.table);
      expect(relationOf(scene, plan, 's0', 's1')).toBeNull();
    }
  });

  it('lets a lower level of front seats give way to what weighs more', () => {
    const students = Array.from({ length: 20 }, (_, index) =>
      student(`s${index}`),
    );
    Object.assign(students[0]!, {
      needsFrontSeat: true,
      wishPartnerIds: ['s1'],
    });
    students[1]!.wishPartnerIds = ['s0'];
    // The wished partner is locked at the back.
    const locked = { s1: { table: 11, seat: 1 } };
    const atBack = (weight: number) =>
      seatOf(
        mix(
          students,
          doubles,
          { preferFrontForNeedsFrontSeat: weight, considerWishPartners: 10 },
          5,
          true,
          locked,
        ),
        's0',
      )!.table;

    expect(atBack(2)).toBe(11);
    expect([0, 1, 2]).toContain(atBack(8));
  });

  it('does not pair the weak students left over while neutral partners are free', () => {
    const students = Array.from({ length: 24 }, (_, index) =>
      student(`s${index}`, {
        ...(index < 4
          ? { performanceStrong: true as const }
          : index < 10
            ? { performanceWeak: true as const }
            : {}),
      }),
    );
    for (let seed = 1; seed <= 10; seed++) {
      const plan = mix(students, doubles, { peerTutoring: 8 }, seed);
      const weakPairs = plan.filter(
        ([a, b]) => a?.performanceWeak && b?.performanceWeak,
      ).length;
      const tutoring = plan.filter(
        ([a, b]) =>
          (a?.performanceStrong && b?.performanceWeak) ||
          (a?.performanceWeak && b?.performanceStrong),
      ).length;
      expect(weakPairs).toBe(0);
      expect(tutoring).toBe(4);
    }
  });

  it('seats students without a criterion purely at random', () => {
    const students = Array.from({ length: 20 }, (_, index) =>
      student(`s${index}`, {
        restless: index < 4,
        shy: index >= 4 && index < 6,
      }),
    );
    const runs = 1500;
    let restlessTogether = 0;
    let uniformTogether = 0;
    const perTable = new Array<number>(doubles.tables.length).fill(0);
    for (let seed = 1; seed <= runs; seed++) {
      const plan = mix(students, doubles, {}, seed, false);
      plan.forEach((desk, index) => {
        const restless = desk.filter((s) => s?.restless).length;
        if (restless >= 2) restlessTogether++;
        perTable[index] += restless;
      });

      // The same targets, students dealt out by Fisher–Yates.
      const rng = createRng(seed);
      const targets = seatTargetsFor(students, doubles, {}, rng);
      const slots = targets.flatMap((count, tableIndex) =>
        Array.from({ length: count }, () => tableIndex),
      );
      const order = shuffleArray(students, rng);
      const counts = new Array<number>(doubles.tables.length).fill(0);
      order.forEach((entry, index) => {
        if (entry.restless) counts[slots[index]!]!++;
      });
      uniformTogether += counts.filter((count) => count >= 2).length;
    }
    expect(restlessTogether / runs).toBeCloseTo(uniformTogether / runs, 1);
    const shares = perTable.map((count) => count / runs);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThan(0.12);
  });

  it('meets one-sided wishes in the construction as well', () => {
    const students = Array.from({ length: 24 }, (_, index) =>
      student(`s${index}`),
    );
    for (let index = 0; index < 12; index += 2) {
      students[index]!.wishPartnerIds = [`s${index + 1}`];
    }
    let met = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const plan = mix(
        students,
        doubles,
        { considerWishPartners: 8 },
        seed,
        false,
      );
      for (let index = 0; index < 12; index += 2) {
        if (
          relationOf(doubles, plan, `s${index}`, `s${index + 1}`) === 'partner'
        ) {
          met++;
        }
      }
    }
    expect(met / (20 * 6)).toBeGreaterThan(0.8);
  });

  it('seats every student exactly once, locks and tables out of the mix included', () => {
    const scene = room(
      doubles.tables.map((entry, index) =>
        index === 4 ? { ...entry, inactive: true } : entry,
      ),
    );
    const students = Array.from({ length: 21 }, (_, index) =>
      student(`s${index}`, {
        gender: index % 3 === 0 ? 'diverse' : index % 2 ? 'girl' : 'boy',
        restless: index % 4 === 0,
        needsFrontSeat: index % 7 === 0,
        wishPartnerIds: [`s${(index + 1) % 21}`],
      }),
    );
    const locked = { s3: { table: 4, seat: 1 }, s8: { table: 0, seat: 0 } };
    for (let seed = 1; seed <= 10; seed++) {
      const plan = mix(
        students,
        scene,
        {
          preferGenderMix: 2,
          avoidRestlessTogether: 5,
          preferFrontForNeedsFrontSeat: 8,
          considerWishPartners: 8,
        },
        seed,
        true,
        locked,
      );
      const ids = plan.flat().flatMap((s) => (s ? [s.id] : []));
      expect(ids).toHaveLength(students.length);
      expect(new Set(ids).size).toBe(students.length);
      expect(plan[4]![1]?.id).toBe('s3');
      expect(plan[4]![0]).toBeNull();
      expect(plan[0]![0]?.id).toBe('s8');
    }
  });
});
