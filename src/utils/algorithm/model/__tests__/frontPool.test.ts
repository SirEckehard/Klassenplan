// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * "Vordere Plätze" by rows (decision 0031, addendum of 2026-10-19): the front
 * rows hold every student needing a front seat; below "Sehr wichtig" the row
 * behind them still counts as a front seat, while a row of the mix stays
 * behind it, and the rows further back cost steeply more.
 */
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  Student,
} from '@/types';
import { neutralSettings } from '../../../mixSettings';
import { createRng } from '../../rng';
import { generateSeatingPlan } from '../../seatingAlgorithm';
import {
  calculateSeatingStatistics,
  getTopFulfilledCriteria,
} from '../../seatingStatistics';
import { frontSeatCost } from '../criteria';
import { frontRowsOf, toleratesRowBehind } from '../frontPool';
import { getSeatLayout } from '../seatRelations';

const BOARD_RIGHT: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};

const double = (x: number, y = 100): ClassroomTable => ({
  x,
  y,
  width: 55,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

const room = (tables: ClassroomTable[]): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [BOARD_RIGHT],
});

/** One double desk per row, three rows away from the board. */
const THREE_ROWS = room([double(600), double(450), double(300)]);

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

const rowsOf = (scene: ClassroomScene, needed: number, tolerant: boolean) => {
  const layout = getSeatLayout(scene);
  const rows = frontRowsOf(scene, layout, needed, () => true, tolerant);
  const behindOfTable = (table: number) => rows.behind[layout.offsets[table]!];
  return { ...rows, behindOfTable };
};

describe('frontRowsOf', () => {
  it('counts the rows behind the front row', () => {
    const rows = rowsOf(THREE_ROWS, 2, true);

    expect([0, 1, 2].map(rows.behindOfTable)).toEqual([0, 1, 2]);
    expect(rows.tolerance).toBe(1);
  });

  it('takes as many front rows as the students needing one fill', () => {
    const rows = rowsOf(THREE_ROWS, 3, true);

    expect([0, 1, 2].map(rows.behindOfTable)).toEqual([0, 0, 1]);
    // The row behind would be the back row: no tolerance.
    expect(rows.tolerance).toBe(0);
  });

  it('grants no tolerance at "Sehr wichtig"', () => {
    expect(rowsOf(THREE_ROWS, 2, false).tolerance).toBe(0);
    expect(toleratesRowBehind(8)).toBe(false);
    expect(toleratesRowBehind(5)).toBe(true);
    expect(toleratesRowBehind(2)).toBe(true);
  });

  it('keeps the back row of a room two rows deep a back row', () => {
    expect(rowsOf(room([double(600), double(450)]), 2, true).tolerance).toBe(0);
  });

  it('puts a desk out of the mix behind every row', () => {
    const rows = rowsOf(
      room([double(600), double(450), { ...double(750), inactive: true }]),
      2,
      true,
    );

    expect(rows.behindOfTable(2)).toBe(2);
  });
});

describe('frontSeatCost', () => {
  it('costs little in the tolerated row and steeply more behind it', () => {
    const cost = (frontRows: number, frontTolerance = 1) =>
      frontSeatCost({ frontRows, frontTolerance });

    expect(cost(0)).toBe(0);
    expect(cost(1)).toBe(0.15);
    expect(cost(2)).toBe(1);
    expect(cost(3)).toBe(1.25);
    expect(cost(1, 0)).toBe(1);
  });
});

describe('front seats below "Sehr wichtig"', () => {
  const fulfilment = (
    scene: ClassroomScene,
    students: Student[],
    weights: Partial<MixSettings>,
  ) => {
    const settings = { ...neutralSettings, ...weights };
    const arrangement = generateSeatingPlan(students, [], {}, settings, scene, {
      rng: createRng(7),
    });
    const stats = calculateSeatingStatistics(
      arrangement,
      students,
      settings,
      [],
      scene,
    );
    const criteria = getTopFulfilledCriteria(stats, settings);
    return {
      arrangement,
      percentage: (key: keyof MixSettings) =>
        criteria.find((criterion) => criterion.key === key)?.percentage,
    };
  };

  // Two students needing a front seat keep a distance from each other, and
  // the front row is one desk.
  const RIVALS = [
    student('n1', { needsFrontSeat: true, avoidPartnerIds: ['n2'] }),
    student('n2', { needsFrontSeat: true }),
    student('x'),
    student('y'),
  ];

  it('lets a student sit in the second row for a stronger criterion', () => {
    const { arrangement, percentage } = fulfilment(THREE_ROWS, RIVALS, {
      preferFrontForNeedsFrontSeat: 5,
      avoidConflictPartners: 8,
    });

    expect(percentage('avoidConflictPartners')).toBe(100);
    expect(percentage('preferFrontForNeedsFrontSeat')).toBe(100);
    expect(arrangement[2]!.some((seat) => seat?.needsFrontSeat)).toBe(false);
  });

  it('counts the second row as unmet at "Sehr wichtig"', () => {
    const scene = THREE_ROWS;
    const settings = { ...neutralSettings, preferFrontForNeedsFrontSeat: 8 };
    const stats = calculateSeatingStatistics(
      [[RIVALS[0]!, RIVALS[2]!], [RIVALS[1]!, RIVALS[3]!], []],
      RIVALS,
      settings,
      [],
      scene,
    );
    const front = getTopFulfilledCriteria(stats, settings).find(
      (criterion) => criterion.key === 'preferFrontForNeedsFrontSeat',
    );

    expect(front?.percentage).toBe(50);
  });

  it('still seats a student needing a front seat in the front row', () => {
    const students = [
      student('n', { needsFrontSeat: true }),
      ...['a', 'b', 'c', 'd', 'e'].map((id) => student(id)),
    ];
    const { arrangement } = fulfilment(THREE_ROWS, students, {
      preferFrontForNeedsFrontSeat: 2,
    });

    expect(arrangement[0]!.some((seat) => seat?.id === 'n')).toBe(true);
  });
});
