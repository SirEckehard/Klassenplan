// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How good the plans of "Mischen" are, by the fulfilment the teacher reads
 * (decision 0031): six rooms, thirty seeds each, every criterion's mean
 * percentage, the weighted whole and the time per mix. Not part of the normal
 * run — it measures, it does not check:
 *
 *   MIX_QUALITY=1 npx vitest run mixQuality --silent=false
 */
import { describe, expect, it } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { createRng, type RandomSource } from '../rng';
import { shuffleArray } from '../shuffle';
import arrangeTables from '../autoArrange';
import { runMixSession } from '../seatingAlgorithm';
import {
  calculateCriteriaWeightedScore,
  calculateSeatingStatistics,
  getTopFulfilledCriteria,
} from '../seatingStatistics';
import {
  normalizeMixSettings,
  withoutUnavailableWeights,
} from '../../mixSettings';

const SEEDS = 30;

const board: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};
const windows: ClassroomFeature = {
  id: 'window',
  type: 'window',
  x: 0,
  y: 120,
  width: 20,
  height: 160,
  anchor: 'left',
  movable: false,
};

const table = (
  x: number,
  y: number,
  templateType: ClassroomTable['templateType'],
  rotation = 0,
): ClassroomTable => {
  const size = {
    single: { width: 55, height: 65, seatCount: 1 },
    double: { width: 55, height: 130, seatCount: 2 },
    group4: { width: 110, height: 130, seatCount: 4 },
    group6: { width: 165, height: 130, seatCount: 6 },
  }[templateType ?? 'double'];
  return { x, y, rotation, locked: false, zIndex: 0, templateType, ...size };
};

const scene = (tables: ClassroomTable[]): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [board, windows],
});

/** A class with every attribute, drawn from a seed so each room is the same. */
const buildClass = (count: number, rng: RandomSource): Student[] => {
  const ids = Array.from({ length: count }, (_, index) => `s${index}`);
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(rng() * items.length)]!;
  return ids.map((id, index): Student => {
    const others = ids.filter((other) => other !== id);
    const wishes =
      index % 3 === 2
        ? []
        : shuffleArray(others, rng).slice(0, 1 + (index % 2));
    return {
      id,
      name: `Student ${index}`,
      gender:
        index === 0
          ? 'diverse'
          : index === 1
            ? undefined
            : pick(['boy', 'girl'] as const),
      restless: rng() < 0.2,
      shy: rng() < 0.15,
      concentrationIssues: rng() < 0.2,
      needsFrontSeat: index % 9 === 4,
      ...(index % 6 === 0
        ? { performanceStrong: true as const }
        : index % 6 === 1 || index % 6 === 3
          ? { performanceWeak: true as const }
          : {}),
      height: index % 8 === 5 ? 'small' : index % 8 === 6 ? 'tall' : undefined,
      prefersWindow: index % 10 === 7,
      languageSkill:
        index % 9 === 3 ? 'daz' : index % 9 === 6 ? 'beginner' : 'native',
      socialRole: pick([
        'mediator',
        'leader',
        'loner',
        'socialHub',
        undefined,
        undefined,
        undefined,
        undefined,
      ] as const),
      wishPartnerIds: wishes,
      avoidPartnerIds: index % 7 === 0 ? [ids[(index + 4) % count]!] : [],
    };
  });
};

const randomArrangement = (
  room: ClassroomScene,
  students: Student[],
  rng: RandomSource,
): SeatingArrangement => {
  const seats = room.tables.flatMap((entry, tableIndex) =>
    Array.from({ length: entry.seatCount }, (_, seat) => [tableIndex, seat]),
  );
  const arrangement: SeatingArrangement = room.tables.map((entry) =>
    Array.from({ length: entry.seatCount }, () => null),
  );
  shuffleArray(seats, rng)
    .slice(0, students.length)
    .forEach(([tableIndex, seat], index) => {
      arrangement[tableIndex!]![seat!] = students[index]!;
    });
  return arrangement;
};

type Fixture = {
  name: string;
  room: ClassroomScene;
  students: number;
  history?: boolean;
  locks?: boolean;
};

const fixtures: Fixture[] = [
  {
    name: 'Einzeltische eng',
    room: scene(
      Array.from({ length: 24 }, (_, index) =>
        table(
          700 - Math.floor(index / 4) * 115,
          100 + (index % 4) * 95,
          'single',
        ),
      ),
    ),
    students: 24,
  },
  {
    name: 'Doppeltische (eingerichtet)',
    room: scene(arrangeTables('double', 14)),
    students: 26,
  },
  {
    name: 'Vierertische (eingerichtet)',
    room: scene(arrangeTables('group4', 7)),
    students: 26,
  },
  {
    name: 'Sechsertische (eingerichtet)',
    room: scene(arrangeTables('group6', 5)),
    students: 28,
  },
  {
    name: 'gemischt und gedreht',
    room: scene([
      table(650, 60, 'double', 90),
      table(650, 200, 'double', 90),
      table(650, 340, 'double', 90),
      table(380, 80, 'group6'),
      table(380, 330, 'group6'),
      table(150, 100, 'single'),
      table(150, 200, 'single'),
      table(150, 300, 'single'),
      table(150, 400, 'single'),
    ]),
    students: 20,
  },
  {
    name: 'Doppeltische mit Verlauf und Sperren',
    room: scene(
      Array.from({ length: 15 }, (_, index) =>
        table(
          120 + Math.floor(index / 3) * 150,
          60 + (index % 3) * 180,
          'double',
        ),
      ),
    ),
    students: 28,
    history: true,
    locks: true,
  },
];

describe.skipIf(!process.env.MIX_QUALITY)('mix quality', () => {
  it('measures every room', () => {
    const lines: string[] = [];
    for (const fixture of fixtures) {
      const classRng = createRng(1000 + fixture.students);
      const students = buildClass(fixture.students, classRng);
      const settings: MixSettings = withoutUnavailableWeights(
        normalizeMixSettings({ preferFrontForNeedsFrontSeat: 8 }),
        students,
      );
      const seatingHistory: SavedPlan[] = fixture.history
        ? [0, 1].map((index) => ({
            id: `plan-${index}`,
            name: `Plan ${index}`,
            date: `2026-09-0${index + 1}`,
            seating: randomArrangement(fixture.room, students, classRng),
            scene: fixture.room,
          }))
        : [];
      const lockedPositions: Record<string, { table: number; seat: number }> =
        fixture.locks
          ? { s5: { table: 7, seat: 0 }, s11: { table: 2, seat: 1 } }
          : {};

      const sums = new Map<string, number>();
      let total = 0;
      let time = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const started = performance.now();
        const seating = runMixSession(
          students,
          seatingHistory,
          lockedPositions,
          settings,
          fixture.room,
          { rng: createRng(seed), refine: true },
        );
        time += performance.now() - started;
        const criteria = getTopFulfilledCriteria(
          calculateSeatingStatistics(
            seating,
            students,
            settings,
            seatingHistory,
            fixture.room,
          ),
          settings,
        );
        for (const criterion of criteria) {
          sums.set(
            criterion.label,
            (sums.get(criterion.label) ?? 0) + criterion.percentage,
          );
        }
        total += calculateCriteriaWeightedScore(criteria);
      }
      lines.push(
        `${fixture.name}: gesamt ${(total / SEEDS).toFixed(1)} %, ${(time / SEEDS).toFixed(0)} ms je Mischung`,
      );
      for (const [label, sum] of sums) {
        lines.push(
          `  ${label.padEnd(24)} ${(sum / SEEDS).toFixed(1).padStart(6)} %`,
        );
      }
    }
    console.log(lines.join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  }, 600_000);
});
