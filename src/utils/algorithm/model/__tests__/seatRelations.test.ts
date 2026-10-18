// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Who counts as next to whom (decision 0031): the seat partner, the rest of a
 * group table, and at another table only the seat directly beside, in front
 * or behind — read relative to the board, with no aisle in between.
 */
import { describe, it, expect } from 'vitest';
import type { ClassroomFeature, ClassroomScene, ClassroomTable } from '@/types';
import arrangeTables from '../../autoArrange';
import {
  getSeatLayout,
  SEAT_RELATION_KINDS,
  type SeatLayout,
} from '../seatRelations';

const board = (x: number, y: number, width: number, height: number) =>
  ({
    id: 'board',
    type: 'board',
    x,
    y,
    width,
    height,
    anchor: 'free',
    movable: false,
  }) as ClassroomFeature;

const BOARD_RIGHT = board(880, 200, 20, 200);
const BOARD_TOP = board(350, 0, 200, 20);

const double = (x: number, y: number, rotation = 0): ClassroomTable => ({
  x,
  y,
  width: 55,
  height: 130,
  rotation,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

const single = (x: number, y: number): ClassroomTable => ({
  x,
  y,
  width: 55,
  height: 65,
  rotation: 0,
  seatCount: 1,
  locked: false,
  zIndex: 0,
  templateType: 'single',
});

const scene = (
  tables: ClassroomTable[],
  features: ClassroomFeature[] = [BOARD_RIGHT],
): ClassroomScene => ({ totalStudents: 0, tables, features });

const kindBetween = (
  layout: SeatLayout,
  [tableA, seatA]: [number, number],
  [tableB, seatB]: [number, number],
) => {
  const a = layout.offsets[tableA]! + seatA;
  const b = layout.offsets[tableB]! + seatB;
  const kind = layout.kindBetween[a * layout.size + b]!;
  return kind >= 0 ? SEAT_RELATION_KINDS[kind] : null;
};

describe('getSeatLayout', () => {
  it('pairs the seats of a double desk and of a group table by index', () => {
    const layout = getSeatLayout(
      scene([
        double(300, 100),
        {
          ...double(500, 100),
          width: 110,
          seatCount: 4,
          templateType: 'group4',
        },
      ]),
    );

    expect(kindBetween(layout, [0, 0], [0, 1])).toBe('partner');
    expect(kindBetween(layout, [1, 0], [1, 1])).toBe('partner');
    expect(kindBetween(layout, [1, 2], [1, 3])).toBe('partner');
    expect(kindBetween(layout, [1, 0], [1, 2])).toBe('table');
    expect(kindBetween(layout, [1, 1], [1, 2])).toBe('table');
  });

  it('keeps the seat partners of a turned desk partners', () => {
    for (const rotation of [0, 45, 90]) {
      const layout = getSeatLayout(scene([double(400, 200, rotation)]));
      expect(kindBetween(layout, [0, 0], [0, 1])).toBe('partner');
    }
  });

  it('reads beside and in front relative to a board on the right', () => {
    // Two desks along the board's wall, 30 px apart, and one row further from
    // the board, 60 px behind the first.
    const layout = getSeatLayout(
      scene([double(600, 100), double(600, 260), double(485, 100)]),
    );

    // Seat 1 of the first desk faces seat 0 of the second across the gap.
    expect(kindBetween(layout, [0, 1], [1, 0])).toBe('beside');
    // The desk behind: further from the board on the right.
    expect(kindBetween(layout, [2, 0], [0, 0])).toBe('ahead');
    expect(kindBetween(layout, [0, 0], [2, 0])).toBe('behind');
    // Diagonal seats are no neighbours.
    expect(kindBetween(layout, [2, 0], [0, 1])).toBeNull();
  });

  it('reads the same desks the other way round with the board on top', () => {
    // With the board on top, desks one above the other stand in one column,
    // one row behind the other; desks side by side stand in one row.
    const layout = getSeatLayout(
      scene(
        [single(400, 100), single(400, 200), single(490, 100)],
        [BOARD_TOP],
      ),
    );

    expect(kindBetween(layout, [1, 0], [0, 0])).toBe('ahead');
    expect(kindBetween(layout, [0, 0], [2, 0])).toBe('beside');
  });

  it('counts only the nearest seat in a direction, however close the desks', () => {
    // Four single desks one behind the other, 5 px apart.
    const layout = getSeatLayout(
      scene([
        single(100, 100),
        single(160, 100),
        single(220, 100),
        single(280, 100),
      ]),
    );

    expect(kindBetween(layout, [0, 0], [1, 0])).toBe('ahead');
    expect(kindBetween(layout, [0, 0], [2, 0])).toBeNull();
  });

  it('leaves an aisle between desks out', () => {
    const layout = getSeatLayout(
      scene([double(600, 100), double(600, 290), double(445, 100)]),
    );

    // 60 px along the wall is an aisle, 100 px between rows more than a chair.
    expect(kindBetween(layout, [0, 1], [1, 0])).toBeNull();
    expect(kindBetween(layout, [2, 0], [0, 0])).toBeNull();
  });

  it('finds rows but no neighbours across the aisles "Neu einrichten" leaves', () => {
    const layout = getSeatLayout(scene(arrangeTables('double', 14)));
    const kinds = new Set(
      layout.relations.flatMap((relations) =>
        relations.map((relation) => SEAT_RELATION_KINDS[relation.kind]),
      ),
    );

    expect(kinds.has('partner')).toBe(true);
    expect(kinds.has('ahead')).toBe(true);
    expect(kinds.has('beside')).toBe(false);
  });

  it('measures depth over the tables in the mix', () => {
    const layout = getSeatLayout(
      scene([
        double(700, 100),
        double(500, 100),
        { ...double(100, 100), inactive: true },
      ]),
    );

    expect(layout.depth[layout.offsets[0]!]).toBe(1);
    expect(layout.depth[layout.offsets[1]!]).toBe(0);
    // A desk behind the mix is behind the back, not the back itself.
    expect(layout.depth[layout.offsets[2]!]).toBeLessThan(0);
  });
});
