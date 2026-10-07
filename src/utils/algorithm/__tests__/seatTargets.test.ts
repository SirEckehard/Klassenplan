// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { ClassroomScene, ClassroomTable, Student } from '@/types';
import { createMockStudent, createMockTable } from '@/__tests__/utils';
import { evenTargetsFor } from '@/utils/distribution';
import { createRng } from '../rng';
import { frontToBackTableOrder, seatTargetsFor } from '../seatTargets';
import { generateSeatingPlan, refineSeatingLocal } from '../seatingAlgorithm';

/**
 * Three rows of three double desks under a board on the top wall:
 *
 *        [   board   ]
 *   t0      t1      t2      row 1
 *   t3      t4      t5      row 2
 *   t6      t7      t8      row 3
 */
const buildScene = (
  patch: (
    table: ClassroomTable,
    index: number,
  ) => Partial<ClassroomTable> = () => ({}),
  sceneOverrides: Partial<ClassroomScene> = {},
): ClassroomScene => ({
  totalStudents: 18,
  tables: Array.from({ length: 9 }, (_, index) => {
    const table = createMockTable({
      x: 150 + (index % 3) * 240,
      y: 100 + Math.floor(index / 3) * 120,
      width: 120,
      height: 60,
      zIndex: index,
    });
    return { ...table, ...patch(table, index) };
  }),
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
  ...sceneOverrides,
});

const buildStudents = (count: number): Student[] =>
  Array.from({ length: count }, (_, index) =>
    createMockStudent({
      id: `s${index}`,
      name: `Student ${index}`,
      gender: index % 2 === 0 ? 'boy' : 'girl',
    }),
  );

const seatedTables = (seating: (Student | null)[][]): number[] =>
  seating.map((table) => table.filter(Boolean).length);

describe('seatTargetsFor', () => {
  it('takes the even path unchanged when no option is set', () => {
    const scene = buildScene();
    const students = buildStudents(13);

    expect(seatTargetsFor(students, scene, {}, createRng(7))).toEqual(
      evenTargetsFor(
        13,
        scene.tables.map((t) => t.seatCount),
        createRng(7),
      ),
    );
  });

  it('gives a table taken out of the mix nobody', () => {
    const scene = buildScene((_, index) =>
      index === 4 || index === 8 ? { inactive: true } : {},
    );

    const targets = seatTargetsFor(buildStudents(14), scene, {}, createRng(3));

    expect(targets[4]).toBe(0);
    expect(targets[8]).toBe(0);
    expect(targets.reduce((sum, n) => sum + n, 0)).toBe(14);
  });

  it('keeps a student locked to a table out of the mix there', () => {
    const scene = buildScene((_, index) =>
      index === 8 ? { inactive: true } : {},
    );
    const students = buildStudents(15);

    const targets = seatTargetsFor(
      students,
      scene,
      { s0: { table: 8, seat: 1 } },
      createRng(3),
    );

    expect(targets[8]).toBe(1);
    // The other fourteen spread over the tables of the mix.
    expect(targets.reduce((sum, n) => sum + n, 0)).toBe(15);
  });

  it('fills the tables from the board backwards', () => {
    const scene = buildScene(undefined, { fillFromFront: true });

    const targets = seatTargetsFor(buildStudents(7), scene, {}, createRng(1));

    expect(targets).toEqual([2, 2, 2, 0, 1, 0, 0, 0, 0]);
  });

  it('skips tables out of the mix when filling from the front', () => {
    const scene = buildScene(
      (_, index) => (index === 1 ? { inactive: true } : {}),
      { fillFromFront: true },
    );

    const targets = seatTargetsFor(buildStudents(5), scene, {}, createRng(1));

    expect(targets).toEqual([2, 0, 2, 0, 1, 0, 0, 0, 0]);
  });

  it('reserves the seat of a student locked at the back', () => {
    const scene = buildScene(undefined, { fillFromFront: true });

    const targets = seatTargetsFor(
      buildStudents(4),
      scene,
      { s3: { table: 7, seat: 0 } },
      createRng(1),
    );

    expect(targets).toEqual([1, 2, 0, 0, 0, 0, 0, 1, 0]);
  });

  it('ignores locks of students who are not in the class', () => {
    const scene = buildScene(undefined, { fillFromFront: true });

    const targets = seatTargetsFor(
      buildStudents(2),
      scene,
      { gone: { table: 7, seat: 0 } },
      createRng(1),
    );

    expect(targets).toEqual([0, 2, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('frontToBackTableOrder', () => {
  it('goes row by row, from the middle of the board outwards', () => {
    expect(frontToBackTableOrder(buildScene())).toEqual([
      1, 0, 2, 4, 3, 5, 7, 6, 8,
    ]);
  });

  it('counts tables a few pixels apart as one row', () => {
    const scene = buildScene((table, index) =>
      index === 0 ? { y: table.y + 12 } : {},
    );

    expect(frontToBackTableOrder(scene).slice(0, 3)).toEqual([1, 0, 2]);
  });

  it('follows a board on a side wall', () => {
    const scene = buildScene(undefined, {
      features: [
        {
          id: 'board-1',
          type: 'board',
          x: 0,
          y: 150,
          width: 20,
          height: 300,
          anchor: 'left',
          movable: true,
        },
      ],
    });

    // The left column is now the front row.
    expect(frontToBackTableOrder(scene).slice(0, 3).sort()).toEqual([0, 3, 6]);
  });
});

describe('mixing with tables out of the mix', () => {
  const settings = { preferGenderMix: 5 };

  it('leaves a table out of the mix empty', () => {
    const scene = buildScene((_, index) =>
      index === 1 || index === 4 ? { inactive: true } : {},
    );
    const students = buildStudents(14);

    const plan = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      { rng: createRng(11) },
    );
    const refined = refineSeatingLocal(
      students,
      [],
      [],
      {},
      plan,
      settings,
      scene,
      { rng: createRng(12), useAnnealing: true },
    );

    for (const seating of [plan, refined]) {
      const counts = seatedTables(seating);
      expect(counts[1]).toBe(0);
      expect(counts[4]).toBe(0);
      expect(counts.reduce((sum, n) => sum + n, 0)).toBe(14);
    }
  });

  it('seats nobody needing a front seat at a table out of the mix', () => {
    const scene = buildScene((_, index) =>
      index < 3 ? { inactive: true } : {},
    );
    const students = buildStudents(6).map((student, index) =>
      index < 2 ? { ...student, needsFrontSeat: true } : student,
    );

    const plan = generateSeatingPlan(
      students,
      [],
      [],
      {},
      { preferFrontForNeedsFrontSeat: 5 },
      scene,
      undefined,
      { rng: createRng(5) },
    );

    expect(seatedTables(plan).slice(0, 3)).toEqual([0, 0, 0]);
    const frontRow = [...plan[3]!, ...plan[4]!, ...plan[5]!];
    expect(frontRow.filter((s) => s?.needsFrontSeat)).toHaveLength(2);
  });

  it('leaves the spare seats at the back when filling from the front', () => {
    const scene = buildScene(undefined, { fillFromFront: true });
    const students = buildStudents(11);

    const plan = generateSeatingPlan(
      students,
      [],
      [],
      {},
      settings,
      scene,
      undefined,
      { rng: createRng(2) },
    );
    const refined = refineSeatingLocal(
      students,
      [],
      [],
      {},
      plan,
      settings,
      scene,
      { rng: createRng(3), useAnnealing: true },
    );

    for (const seating of [plan, refined]) {
      expect(seatedTables(seating)).toEqual([2, 2, 2, 2, 2, 1, 0, 0, 0]);
    }
  });
});
