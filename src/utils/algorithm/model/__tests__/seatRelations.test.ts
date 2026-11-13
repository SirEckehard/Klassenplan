// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Who counts as next to whom (decision 0031): the seat partner, at a group
 * table the seat round the corner, across the table and further away, and at
 * another table only the seat directly beside, in front or behind — read
 * relative to the board, with no aisle in between.
 */
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  TableTemplateType,
} from '@/types';
import { getTablePresets } from '@/utils';
import {
  calculateSeatLayout,
  determineSeatEdge,
} from '@/utils/math/positionCalculations';
import { getSeatPositions, seatPairsFor } from '@/utils/math/seatGeometry';
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

const group = (
  templateType: 'group4' | 'group6',
  x: number,
  y: number,
  rotation = 0,
): ClassroomTable => ({
  x,
  y,
  width: templateType === 'group4' ? 110 : 165,
  height: 130,
  rotation,
  seatCount: templateType === 'group4' ? 4 : 6,
  locked: false,
  zIndex: 0,
  templateType,
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
      scene([double(300, 100), group('group4', 500, 100)]),
    );

    expect(kindBetween(layout, [0, 0], [0, 1])).toBe('partner');
    expect(kindBetween(layout, [1, 0], [1, 1])).toBe('partner');
    expect(kindBetween(layout, [1, 2], [1, 3])).toBe('partner');
  });

  it('reads a table of four as across and diagonal', () => {
    // 0 1 on top, 2 3 below: 0 faces 2, 1 faces 3.
    const layout = getSeatLayout(scene([group('group4', 400, 200)]));

    expect(kindBetween(layout, [0, 0], [0, 2])).toBe('opposite');
    expect(kindBetween(layout, [0, 1], [0, 3])).toBe('opposite');
    expect(kindBetween(layout, [0, 0], [0, 3])).toBe('table');
    expect(kindBetween(layout, [0, 1], [0, 2])).toBe('table');
  });

  it('reads a table of six as partners, corners, across and further away', () => {
    // 0 1 at the head, 4 5 along the top, 2 3 along the bottom.
    const layout = getSeatLayout(scene([group('group6', 400, 200)]));
    const kinds = new Map<string, string | null>();
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        kinds.set(`${a}-${b}`, kindBetween(layout, [0, a], [0, b]));
      }
    }

    expect(Object.fromEntries(kinds)).toEqual({
      '0-1': 'partner',
      '2-3': 'partner',
      '4-5': 'partner',
      '0-4': 'corner',
      '1-2': 'corner',
      '2-4': 'opposite',
      '3-5': 'opposite',
      '0-2': 'table',
      '0-3': 'table',
      '0-5': 'table',
      '1-3': 'table',
      '1-4': 'table',
      '1-5': 'table',
      '2-5': 'table',
      '3-4': 'table',
    });
  });

  it('reads a turned group table as an upright one', () => {
    const upright = getSeatLayout(scene([group('group6', 400, 200)]));
    for (const rotation of [45, 90, 180]) {
      const turned = getSeatLayout(
        scene([group('group6', 400, 200, rotation)]),
      );
      for (let a = 0; a < 6; a++) {
        for (let b = a + 1; b < 6; b++) {
          expect(kindBetween(turned, [0, a], [0, b])).toBe(
            kindBetween(upright, [0, a], [0, b]),
          );
        }
      }
    }
  });

  it('keeps the pair and the rest of a table whose seat count no template knows', () => {
    const layout = getSeatLayout(
      scene([{ ...group('group6', 400, 200), seatCount: 5 }]),
    );
    for (let a = 0; a < 5; a++) {
      for (let b = a + 1; b < 5; b++) {
        expect(kindBetween(layout, [0, a], [0, b])).toBe(
          (a === 0 && b === 1) || (a === 2 && b === 3) ? 'partner' : 'table',
        );
      }
    }
  });

  it('pairs by index exactly the seats side by side at one edge in every template', () => {
    // The partners follow the index everywhere; the templates must seat them
    // side by side, or a pair would weigh as partners where it is not.
    const presets = getTablePresets();
    for (const type of Object.keys(presets) as TableTemplateType[]) {
      const table = { ...presets[type], templateType: type };
      const layout = calculateSeatLayout(table);
      const edge = (seat: number) =>
        determineSeatEdge(
          type,
          layout.positions[seat]!,
          layout,
          table.seatCount,
        );
      const partners = new Set(
        seatPairsFor(table.seatCount).map(([a, b]) => `${a}-${b}`),
      );
      for (let a = 0; a < table.seatCount; a++) {
        for (let b = a + 1; b < table.seatCount; b++) {
          const pa = layout.positions[a]!;
          const pb = layout.positions[b]!;
          const sideBySide =
            edge(a) === edge(b) &&
            Math.abs(pa.col - pb.col) + Math.abs(pa.row - pb.row) === 1;
          expect(sideBySide, `${type} ${a}-${b}`).toBe(
            partners.has(`${a}-${b}`),
          );
        }
      }
    }
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

  describe('tables pushed together', () => {
    const groupOf = (layout: SeatLayout, [table, seat]: [number, number]) =>
      layout.groupOf[layout.offsets[table]! + seat];

    it('reads a desk turned against the side of another as round the corner', () => {
      // A desk facing the board on the right, and one turned a quarter with
      // its left seat against the first desk's front seat: an L.
      const layout = getSeatLayout(
        scene([double(300, 100), double(392.5, 62.5, 90)]),
      );

      expect(kindBetween(layout, [0, 0], [1, 1])).toBe('corner');
      expect(groupOf(layout, [0, 0])).toBe(groupOf(layout, [1, 0]));
      expect(layout.groups).toHaveLength(1);
    });

    it('reads two desks pushed together face to face as a table of four', () => {
      const layout = getSeatLayout(
        scene([double(300, 100), double(355, 100, 180)]),
      );

      expect(kindBetween(layout, [0, 0], [1, 1])).toBe('opposite');
      expect(kindBetween(layout, [0, 1], [1, 0])).toBe('opposite');
      expect(layout.groups).toHaveLength(1);
    });

    it('reads the seats at the join of desks in a row as neighbours, the desks as desks', () => {
      const layout = getSeatLayout(
        scene([double(600, 100), double(600, 230), double(600, 360)]),
      );

      expect(kindBetween(layout, [0, 1], [1, 0])).toBe('partner');
      expect(kindBetween(layout, [1, 1], [2, 0])).toBe('partner');
      expect(kindBetween(layout, [0, 0], [1, 0])).toBeNull();
      expect(layout.groups).toHaveLength(3);
    });

    it('keeps desks a little apart desks of their own', () => {
      const layout = getSeatLayout(
        scene([double(300, 100), double(407.5, 62.5, 90)]),
      );

      expect(kindBetween(layout, [0, 0], [1, 1])).not.toBe('corner');
      expect(layout.groups).toHaveLength(2);
    });
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

describe('the seat to the left (decision 0043)', () => {
  /** The flat index of the seat of `table` whose position passes `pick`. */
  const seatWhere = (
    room: ClassroomScene,
    table: number,
    pick: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean,
  ): [number, number] => {
    const layout = getSeatLayout(room);
    const first = layout.offsets[table]!;
    const positions = getSeatPositions(room);
    const a = positions.get(`${table}-0`)!;
    const b = positions.get(`${table}-1`)!;
    return pick(a, b) ? [first, first + 1] : [first + 1, first];
  };

  // A double desk's chairs stand at its left edge before it turns: at 0° the
  // students face the board on the right, so their left is up the room.
  it.each([
    [0, 'the seat higher up', (a: Pos, b: Pos) => a.y < b.y],
    [90, 'the seat further right', (a: Pos, b: Pos) => a.x > b.x],
    [180, 'the seat lower down', (a: Pos, b: Pos) => a.y > b.y],
    [270, 'the seat further left', (a: Pos, b: Pos) => a.x < b.x],
  ])('turned %i°, a desk has %s to the left', (rotation, _, isLeft) => {
    const room = scene([double(400, 200, rotation)]);
    const layout = getSeatLayout(room);
    const [left, right] = seatWhere(room, 0, isLeft);

    expect(layout.leftOf[right]).toBe(left);
    expect(layout.leftOf[left]).toBe(-1);
    expect(layout.rightOf[left]).toEqual([right]);
  });

  it('reads a group table side by side, never round a corner or across', () => {
    // 0 1 on top facing down, 2 3 below facing up: a student facing down
    // has their left towards the right of the room.
    const layout = getSeatLayout(scene([group('group4', 400, 200)]));

    expect(Array.from(layout.leftOf)).toEqual([1, -1, -1, 2]);
  });

  it('reads a table of six along each side', () => {
    // 0 1 at the head, 4 5 along the top, 2 3 along the bottom.
    const layout = getSeatLayout(scene([group('group6', 400, 200)]));
    const positions = getSeatPositions(scene([group('group6', 400, 200)]));
    const lower = (a: number, b: number) =>
      positions.get(`0-${a}`)!.y > positions.get(`0-${b}`)!.y;

    expect(layout.leftOf[lower(0, 1) ? 0 : 1]).toBe(lower(0, 1) ? 1 : 0);
    for (const seat of [0, 1]) {
      expect([2, 3, 4, 5]).not.toContain(layout.leftOf[seat]);
    }
    expect(layout.leftOf[4]).toBe(5);
    expect(layout.leftOf[3]).toBe(2);
  });

  it('gives a single desk on its own nobody to the left', () => {
    const layout = getSeatLayout(scene([single(400, 200)]));

    expect(Array.from(layout.leftOf)).toEqual([-1]);
  });

  it('reaches across desks pushed together, not across an aisle', () => {
    // Two turned desks end to end, the third behind an aisle.
    const room = scene([
      double(400, 200, 90),
      double(530, 200, 90),
      double(760, 200, 90),
    ]);
    const layout = getSeatLayout(room);
    const positions = getSeatPositions(room);
    const x = (table: number, seat: number) =>
      positions.get(`${table}-${seat}`)!.x;
    const flat = (table: number, seat: number) => layout.offsets[table]! + seat;
    // Facing down the room, a student's left is to the right.
    const rightmost = (table: number) => (x(table, 0) > x(table, 1) ? 0 : 1);
    const leftmost = (table: number) => 1 - rightmost(table);

    expect(layout.leftOf[flat(0, rightmost(0))]).toBe(flat(1, leftmost(1)));
    expect(layout.leftOf[flat(1, rightmost(1))]).toBe(-1);
  });
});

type Pos = { x: number; y: number };
