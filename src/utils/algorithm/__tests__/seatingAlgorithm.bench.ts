// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Runtime of seating plan construction and refinement for realistic classes.
 *
 * Run with `npm run bench`. Deliberately not part of CI: timings depend on the
 * machine and on whatever else it is doing, so a fixed ceiling would fail at
 * random on a busy runner. The figures in docs/PERFORMANCE.md come from here.
 *
 * All inputs derive from fixed seeds, so every run measures the same work. The
 * calls mirror what the app sends to the worker: "Mischen" with criteria
 * constructs and then refines with the default tries and passes, and the app
 * always refines with annealing.
 *
 * Vitest runs this through Vite's module runner, which turns every imported
 * binding into a getter. The algorithm calls its helpers often enough that the
 * figures come out about 60 % above Vitest 4's for the same code (Vitest warns
 * about it). Compare runs under the same Vitest major only.
 */
import { test } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  LockedPositions,
  MixResult,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_PASSES,
  DEFAULT_TRIES_PER_PASS,
  MIX_HISTORY_LIMIT,
} from '@/utils';
import { createRng } from '../rng';
import { generateSeatingPlan, refineSeatingLocal } from '../seatingAlgorithm';

const CLASS_SIZES = [12, 24, 36] as const;

const BENCH_OPTIONS = { time: 500, iterations: 10, warmupIterations: 2 };

const HEIGHTS = ['small', 'medium', 'tall'] as const;
const LANGUAGE_LEVELS = [
  'native',
  'native',
  'native',
  'fluent',
  'intermediate',
  'beginner',
  'daz',
] as const;
const SOCIAL_ROLES = [
  undefined,
  undefined,
  'mediator',
  'leader',
  'loner',
  'socialHub',
] as const;

/** Strong and weak performance are mutually exclusive in the type. */
const performanceFlags = (index: number) => {
  if (index % 4 === 1) return { performanceStrong: true } as const;
  if (index % 9 === 2) return { performanceWeak: true } as const;
  return {} as const;
};

/** A class with every attribute the criteria look at, spread evenly. */
const buildStudents = (count: number): Student[] =>
  Array.from({ length: count }, (_, index): Student => ({
    id: `s${index}`,
    name: `Student ${index}`,
    gender: index % 2 === 0 ? 'boy' : 'girl',
    height: HEIGHTS[index % HEIGHTS.length],
    restless: index % 5 === 0,
    shy: index % 7 === 0,
    concentrationIssues: index % 6 === 0,
    needsFrontSeat: index % 11 === 0,
    prefersWindow: index % 8 === 0,
    prefersDoor: index % 10 === 0,
    languageSkill: LANGUAGE_LEVELS[index % LANGUAGE_LEVELS.length],
    socialRole: SOCIAL_ROLES[index % SOCIAL_ROLES.length],
    wishPartnerIds: index % 3 === 0 ? [`s${(index + 1) % count}`] : [],
    avoidPartnerIds: index % 4 === 0 ? [`s${(index + 5) % count}`] : [],
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

/** Double tables in rows of six — the most common layout for a full class. */
const buildScene = (studentCount: number): ClassroomScene => {
  const tableCount = Math.ceil(studentCount / 2);
  return {
    totalStudents: tableCount * 2,
    tables: Array.from({ length: tableCount }, (_, index) => ({
      id: `t${index}`,
      x: 60 + (index % 6) * 140,
      y: 80 + Math.floor(index / 6) * 170,
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
  };
};

interface Fixture {
  students: Student[];
  scene: ClassroomScene;
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  lockedPositions: LockedPositions;
  start: SeatingArrangement;
}

/**
 * A class in the middle of a school year: a full mix history, two saved plans
 * and two locked seats, so the repetition and lock handling do real work.
 */
const buildFixture = (size: number): Fixture => {
  const students = buildStudents(size);
  const scene = buildScene(size);
  const lockedPositions: LockedPositions = {
    s0: { table: 0, seat: 0 },
    s1: { table: 1, seat: 1 },
  };
  const construct = (seed: number, mixHistory: MixResult[] = []) =>
    generateSeatingPlan(
      students,
      [],
      mixHistory,
      lockedPositions,
      DEFAULT_MIX_WEIGHTS,
      scene,
      undefined,
      { rng: createRng(seed) },
    );

  const mixHistory: MixResult[] = Array.from(
    { length: MIX_HISTORY_LIMIT },
    (_, index) => ({
      id: index,
      timestamp: `2026-09-01T08:${String(index).padStart(2, '0')}:00.000Z`,
      seating: construct(1000 + index),
      mixSettings: DEFAULT_MIX_WEIGHTS,
    }),
  );
  const seatingHistory: SavedPlan[] = [0, 1].map((index) => ({
    id: `p${index}`,
    name: `Plan ${index}`,
    date: `2026-0${index + 3}-01`,
    seating: construct(2000 + index),
    scene,
  }));

  return {
    students,
    scene,
    seatingHistory,
    mixHistory,
    lockedPositions,
    start: construct(3000, mixHistory),
  };
};

let seed = 1;
const nextRng = () => createRng(seed++);

for (const size of CLASS_SIZES) {
  const fixture = buildFixture(size);

  const refine = (
    options: { triesPerPass: number; passes: number },
    useAnnealing: boolean,
  ) =>
    refineSeatingLocal(
      fixture.students,
      fixture.seatingHistory,
      fixture.mixHistory,
      fixture.lockedPositions,
      fixture.start,
      DEFAULT_MIX_WEIGHTS,
      fixture.scene,
      { ...options, useAnnealing, rng: nextRng() },
      fixture.start,
    );

  test(`${size} students`, async ({ bench }) => {
    await bench.compare(
      bench('construct (mix:generate)', () => {
        generateSeatingPlan(
          fixture.students,
          fixture.seatingHistory,
          fixture.mixHistory,
          fixture.lockedPositions,
          DEFAULT_MIX_WEIGHTS,
          fixture.scene,
          undefined,
          { rng: nextRng() },
        );
      }),
      bench('refine, annealing, "Mischen" tries/passes', () => {
        refine(
          { triesPerPass: DEFAULT_TRIES_PER_PASS, passes: DEFAULT_PASSES },
          true,
        );
      }),
      bench('refine, greedy, "Mischen" tries/passes', () => {
        refine(
          { triesPerPass: DEFAULT_TRIES_PER_PASS, passes: DEFAULT_PASSES },
          false,
        );
      }),
      BENCH_OPTIONS,
    );
  });
}
