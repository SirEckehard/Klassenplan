// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  TableTemplateType,
} from '@/types';
import { CLASSROOM_HEIGHT, MAX_STUDENTS } from '@/utils';
import { createRng } from '@/utils/algorithm/rng';
import arrangeTables from '../autoArrange';
import {
  arrangeArrangement,
  arrangeRoom,
  arrangementCapacity,
  ROOM_ARRANGEMENTS,
} from '../arrangements';
import { getSeatLayout } from '../model/seatRelations';
import { roomProblems } from '../roomRules';

type Wall = 'right' | 'left' | 'top' | 'bottom';
const WALLS: Wall[] = ['right', 'left', 'top', 'bottom'];

/** A room whose board hangs in the middle of `wall`. */
const roomWithBoardOn = (wall: Wall): ClassroomScene => {
  const upright = wall === 'right' || wall === 'left';
  const board: ClassroomFeature = {
    id: 'board-main',
    type: 'board',
    x: wall === 'right' ? 880 : wall === 'left' ? 0 : 350,
    y: wall === 'bottom' ? 580 : wall === 'top' ? 0 : 200,
    width: upright ? 20 : 200,
    height: upright ? 200 : 20,
    anchor: wall,
    movable: false,
  };
  return { tables: [], totalStudents: 0, features: [board] };
};

const seatsOf = (tables: ClassroomTable[]) =>
  tables.reduce((sum, table) => sum + table.seatCount, 0);

/**
 * Every rule a room breaks (`roomProblems`), as lines a failure reads well
 * in; with `wall`, nobody may sit with their back to that board.
 */
const problemsOf = (tables: ClassroomTable[], wall?: Wall): string[] =>
  roomProblems(tables, { board: wall }).map(
    ({ kind, table, other }) =>
      `${kind} at table ${table}${other === undefined ? '' : ` and ${other}`}`,
  );

const KINDS: TableTemplateType[] = ['single', 'double', 'group4', 'group6'];
const SEATS: Record<TableTemplateType, number> = {
  single: 1,
  double: 2,
  group4: 4,
  group6: 6,
};

describe('arrangeTables', () => {
  // The positions "Neu einrichten" built before decision 0053, wherever the
  // rows fill.
  it.each([
    ['single', 6, '700,270 585,270 470,270 355,270 240,270 125,270'],
    [
      'single',
      24,
      '700,80 700,205 700,330 700,455 585,80 585,205 585,330 585,455 470,80 470,205 470,330 470,455 355,80 355,205 355,330 355,455 240,80 240,205 240,330 240,455 125,80 125,205 125,330 125,455',
    ],
    [
      'single',
      36,
      '700,30 700,125 700,220 700,315 700,410 700,505 585,30 585,125 585,220 585,315 585,410 585,505 470,30 470,125 470,220 470,315 470,410 470,505 355,30 355,125 355,220 355,315 355,410 355,505 240,30 240,125 240,220 240,315 240,410 240,505 125,30 125,125 125,220 125,315 125,410 125,505',
    ],
    ['double', 3, '415,45 415,235 415,425'],
    [
      'double',
      12,
      '585,45 585,235 585,425 470,45 470,235 470,425 355,45 355,235 355,425 240,45 240,235 240,425',
    ],
    [
      'double',
      18,
      '700,45 700,235 700,425 585,45 585,235 585,425 470,45 470,235 470,425 355,45 355,235 355,425 240,45 240,235 240,425 125,45 125,235 125,425',
    ],
  ] as const)(
    'keeps full rows of %s desks where they stood (%i)',
    (type, count, positions) => {
      const tables = arrangeTables(type, count);
      expect(tables.map((table) => `${table.x},${table.y}`).join(' ')).toBe(
        positions,
      );
      expect(tables.every((table) => table.rotation === 0)).toBe(true);
    },
  );

  it('puts a row that does not fill at the back, in the middle', () => {
    // 13 doubles: four rows of three and one at the back.
    const tables = arrangeTables('double', 13);
    const backmost = Math.min(...tables.map((table) => table.x));
    const back = tables.filter((table) => table.x === backmost);
    expect(back).toHaveLength(1);
    expect(back[0]!.y + back[0]!.height / 2).toBeCloseTo(
      CLASSROOM_HEIGHT / 2,
      -1,
    );
  });

  it('balances the rows of single desks instead of opening a lane for one', () => {
    // 25 singles: five rows of five, not four lanes of six and one alone.
    const tables = arrangeTables('single', 25);
    expect(new Set(tables.map((table) => table.x)).size).toBe(5);
    expect(new Set(tables.map((table) => table.y)).size).toBe(5);
  });

  it('sets group tables in even lanes', () => {
    // Six groups of four: three rows of two; four groups of six: two by two.
    const four = arrangeTables('group4', 6);
    expect(new Set(four.map((table) => table.y)).size).toBe(2);
    expect(new Set(four.map((table) => Math.round(table.x))).size).toBe(3);
    const six = arrangeTables('group6', 4);
    expect(new Set(six.map((table) => table.y)).size).toBe(2);
    expect(new Set(six.map((table) => Math.round(table.x))).size).toBe(2);
  });

  it('leaves the teacher room in front of the board', () => {
    for (const type of ['group4', 'group6'] as const) {
      const tables = arrangeTables(type, Math.ceil(MAX_STUDENTS / SEATS[type]));
      for (const table of tables) {
        expect(table.x + table.width).toBeLessThanOrEqual(775.5);
      }
    }
  });

  it('numbers the tables from the board backwards', () => {
    const tables = arrangeTables('double', 12);
    expect(tables.map((table) => table.zIndex)).toEqual(
      tables.map((_, index) => index),
    );
    const xs = tables.map((table) => table.x);
    expect(xs).toEqual([...xs].sort((a, b) => b - a));
  });

  it('turns the rows to a board on the top wall', () => {
    const tables = arrangeTables('single', 24, roomWithBoardOn('top'));
    // Facing up: the chairs below the desk.
    expect(tables.every((table) => table.rotation === 270)).toBe(true);
    // The first table is the one nearest the board.
    const ys = tables.map((table) => table.y);
    expect(ys[0]).toBe(Math.min(...ys));
  });

  it.each(WALLS)(
    'places every kind for 1 to 36 students towards a board on the %s wall',
    (wall) => {
      const scene = roomWithBoardOn(wall);
      for (let students = 1; students <= MAX_STUDENTS; students++) {
        for (const type of KINDS) {
          const count = Math.ceil(students / SEATS[type]);
          const tables = arrangeTables(type, count, scene);
          expect(tables).toHaveLength(count);
          expect(
            problemsOf(tables, wall),
            `${type}, ${students} students`,
          ).toEqual([]);
        }
      }
    },
  );
});

describe('arrangements', () => {
  it('knows how many students each one seats in the default room', () => {
    expect(
      Object.fromEntries(
        ROOM_ARRANGEMENTS.map((id) => [id, arrangementCapacity(id)]),
      ),
    ).toEqual({
      horseshoe: 36,
      herringbone: 24,
      arena: 36,
      islands: 36,
      conference: 36,
      marketplace: 36,
      walls: 36,
    });
  });

  it.each(WALLS)(
    'seats every class it has room for, towards a board on the %s wall',
    (wall) => {
      const scene = roomWithBoardOn(wall);
      for (const id of ROOM_ARRANGEMENTS) {
        const capacity = arrangementCapacity(id, scene);
        expect(capacity, id).toBeGreaterThanOrEqual(18);
        for (let students = 1; students <= capacity; students++) {
          const tables = arrangeArrangement(id, students, scene);
          expect(
            seatsOf(tables),
            `${id}, ${students} students`,
          ).toBeGreaterThanOrEqual(students);
          // No more than a table's worth of empty seats, or two for a U.
          expect(seatsOf(tables) - students, `${id}, ${students}`).toBeLessThan(
            id === 'horseshoe' || id === 'marketplace' || id === 'islands'
              ? 8
              : 6,
          );
          // Desks facing the wall turn their backs to the board on purpose.
          expect(
            problemsOf(tables, id === 'walls' ? undefined : wall),
            `${id}, ${students} students`,
          ).toEqual([]);
        }
      }
    },
  );

  it('pushes the desks of a conference table together, face to face', () => {
    const tables = arrangeArrangement('conference', 24);
    const layout = getSeatLayout({
      tables,
      totalStudents: 24,
      features: [],
    });
    // Two desks face to face are one group of four.
    expect(layout.groups.map((group) => group.length)).toEqual(
      Array(6).fill(4),
    );
  });

  it('turns the desks of the wall arrangement to the walls', () => {
    const tables = arrangeArrangement('walls', 24);
    // Every desk faces a wall: none faces the board (0°), and the desks at
    // the back wall turn their backs to it, which the rules notice.
    expect(tables.some((table) => table.rotation === 0)).toBe(false);
    expect(seatsOf(tables)).toBe(24);
    expect(
      problemsOf(tables, 'right').some((line) => line.startsWith('back')),
    ).toBe(true);
  });
});

describe('arrangeRoom', () => {
  it('sets up as many tables of a kind as the class needs', () => {
    const { tables, arrangement } = arrangeRoom('group4', 25);
    expect(tables).toHaveLength(7);
    expect(arrangement).toBeUndefined();
  });

  it('names the arrangement it built', () => {
    expect(arrangeRoom('arena', 24).arrangement).toBe('arena');
  });

  it('puts a room together at random from zones', () => {
    const { tables, arrangement, zones } = arrangeRoom(
      'random',
      30,
      undefined,
      {
        rng: createRng(7),
      },
    );
    expect(arrangement).toBeUndefined();
    expect(zones!.length).toBeGreaterThan(0);
    expect(seatsOf(tables)).toBeGreaterThanOrEqual(30);
  });
});
