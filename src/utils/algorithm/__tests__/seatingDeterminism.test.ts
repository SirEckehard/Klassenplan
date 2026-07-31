// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Determinism guarantees of the seating algorithm.
 *
 * With a seeded random source the algorithm must be a pure function of its
 * inputs. That is what makes these assertions exact instead of statistical: any
 * unintended change to placement order, scoring or the refinement heuristic
 * shows up as a different arrangement for the same seed.
 */
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  MixSettings,
  Student,
} from '@/types';
import { createRng } from '../rng';
import { generateSeatingPlan, refineSeatingLocal } from '../seatingAlgorithm';
import { generateCircleLayout } from '../circleArrangement';

/** Strong and weak performance are mutually exclusive in the type. */
const performanceFlags = (index: number) => {
  if (index % 4 === 0) return { performanceStrong: true } as const;
  if (index % 9 === 0) return { performanceWeak: true } as const;
  return {} as const;
};

const buildStudents = (count: number): Student[] =>
  Array.from({ length: count }, (_, index): Student => ({
    id: `s${index}`,
    name: `Student ${index}`,
    gender: index % 2 === 0 ? 'boy' : 'girl',
    restless: index % 5 === 0,
    shy: index % 7 === 0,
    concentrationIssues: index % 6 === 0,
    needsFrontSeat: index % 11 === 0,
    prefersWindow: index % 8 === 0,
    prefersDoor: index % 10 === 0,
    wishPartnerId: null,
    ...performanceFlags(index),
  }));

const feature = (
  id: string,
  type: ClassroomFeature['type'],
  x: number,
  y: number,
  width: number,
  height: number,
): ClassroomFeature => ({
  id,
  type,
  x,
  y,
  width,
  height,
  anchor: 'free',
  movable: true,
});

const buildScene = (tableCount: number): ClassroomScene => ({
  totalStudents: tableCount * 2,
  tables: Array.from({ length: tableCount }, (_, index) => ({
    id: `t${index}`,
    x: 100 + (index % 3) * 200,
    y: 100 + Math.floor(index / 3) * 150,
    width: 120,
    height: 60,
    rotation: 0,
    seatCount: 2,
    locked: false,
    templateType: 'double' as const,
    zIndex: index,
  })),
  features: [
    feature('board-1', 'board', 880, 200, 20, 200),
    feature('window-1', 'window', 0, 150, 20, 160),
    feature('door-1', 'door', 400, 580, 70, 20),
  ],
});

const settings: Partial<MixSettings> = {
  preferGenderMix: 5,
  avoidRestlessTogether: 6,
  avoidShyAlone: 3,
  avoidConcentrationTogether: 4,
  preferFrontForNeedsFrontSeat: 5,
  peerTutoring: 3,
  preferWindowSeats: 2,
  preferDoorSeats: 2,
};

/** Names per table/seat — the part of the result a user actually sees. */
const asNames = (seating: (Student | null)[][]): (string | null)[][] =>
  seating.map((table) => table.map((student) => student?.name ?? null));

describe('generateSeatingPlan determinism', () => {
  const students = buildStudents(16);
  const scene = buildScene(10);

  it('returns the identical plan for the same seed', () => {
    const first = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      {
        rng: createRng(4711),
      },
    );
    const second = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      { rng: createRng(4711) },
    );

    expect(asNames(first)).toEqual(asNames(second));
  });

  it('seats every student exactly once', () => {
    const plan = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      {
        rng: createRng(1),
      },
    );

    const seatedIds = plan
      .flat()
      .filter(Boolean)
      .map((s) => s!.id);
    expect(seatedIds).toHaveLength(students.length);
    expect(new Set(seatedIds).size).toBe(students.length);
  });

  it('produces different plans for different seeds', () => {
    const a = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      {
        rng: createRng(1),
      },
    );
    const b = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      {
        rng: createRng(2),
      },
    );

    // Not a hard guarantee in theory, but with 16 students over 10 tables an
    // identical result would mean the seed is not reaching the algorithm.
    expect(asNames(a)).not.toEqual(asNames(b));
  });

  it('keeps locked students on their seat', () => {
    const locked = { s3: { table: 2, seat: 1 } };
    const plan = generateSeatingPlan(
      students,
      [],
      [],
      locked,
      settings,
      scene,
      undefined,
      { rng: createRng(77) },
    );

    expect(plan[2]?.[1]?.id).toBe('s3');
  });
});

describe('refineSeatingLocal determinism', () => {
  const students = buildStudents(12);
  const scene = buildScene(8);

  const baseline = () =>
    generateSeatingPlan(students, [], [], {}, settings, scene, undefined, {
      rng: createRng(1234),
    });

  it('refines greedily to the same result for the same seed', () => {
    const start = baseline();

    const first = refineSeatingLocal(
      students,
      [],
      [],
      {},
      start,
      settings,
      scene,
      { triesPerPass: 40, passes: 2, rng: createRng(555) },
    );
    const second = refineSeatingLocal(
      students,
      [],
      [],
      {},
      start,
      settings,
      scene,
      { triesPerPass: 40, passes: 2, rng: createRng(555) },
    );

    expect(asNames(first)).toEqual(asNames(second));
  });

  it('refines with simulated annealing to the same result for the same seed', () => {
    const start = baseline();

    const first = refineSeatingLocal(
      students,
      [],
      [],
      {},
      start,
      settings,
      scene,
      { useAnnealing: true, rng: createRng(808) },
    );
    const second = refineSeatingLocal(
      students,
      [],
      [],
      {},
      start,
      settings,
      scene,
      { useAnnealing: true, rng: createRng(808) },
    );

    expect(asNames(first)).toEqual(asNames(second));
  });

  it('never loses or duplicates a student', () => {
    const refined = refineSeatingLocal(
      students,
      [],
      [],
      {},
      baseline(),
      settings,
      scene,
      { triesPerPass: 100, passes: 3, rng: createRng(9) },
    );

    const ids = refined
      .flat()
      .filter(Boolean)
      .map((s) => s!.id);
    expect(new Set(ids).size).toBe(students.length);
  });
});

describe('generateCircleLayout determinism', () => {
  it('returns the identical circle for the same seed', () => {
    const students = buildStudents(10);
    const scene = buildScene(6);

    const first = generateCircleLayout(
      students,
      scene,
      undefined,
      createRng(31),
    );
    const second = generateCircleLayout(
      students,
      scene,
      undefined,
      createRng(31),
    );

    expect(first.students.map((p) => p.student.id)).toEqual(
      second.students.map((p) => p.student.id),
    );
  });
});
