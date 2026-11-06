// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  insetSeatPath,
  seatDividerPath,
  seatFocusInset,
  seatMarkInset,
  seatTableCorners,
  seatTableEdgePath,
  seatTableEdges,
  tokenMarkRadius,
} from '../seatMark';

describe('seatMark', () => {
  it('names the corners a seat shares with its table', () => {
    // A table for four: two columns, two rows.
    expect(seatTableCorners(0, 0, 2, 2)).toEqual([true, false, false, false]);
    expect(seatTableCorners(1, 1, 2, 2)).toEqual([false, false, true, false]);
    // An upright double table: one column, two rows.
    expect(seatTableCorners(0, 0, 1, 2)).toEqual([true, true, false, false]);
    // A single table: every corner is the table's.
    expect(seatTableCorners(0, 0, 1, 1)).toEqual([true, true, true, true]);
    // The middle seat of a row of three touches no corner.
    expect(seatTableCorners(1, 0, 3, 1)).toEqual([false, false, false, false]);
  });

  it('names the sides a seat shares with its table', () => {
    // An upright double table: the top seat has its table's top and sides.
    expect(seatTableEdges(0, 0, 1, 2)).toEqual([true, true, false, true]);
    // The middle seat of a row of three: the table's top and bottom only.
    expect(seatTableEdges(1, 0, 3, 1)).toEqual([true, false, true, false]);
    // A single table: every side is the table's.
    expect(seatTableEdges(0, 0, 1, 1)).toEqual([true, true, true, true]);
  });

  it("draws the table's outline along a seat's outer sides, its corners the table's", () => {
    // The top seat of an upright double table: up the left side, round the
    // top corners, down the right side to the seat below.
    expect(seatTableEdgePath(55, 65, [true, true, false, true])).toBe(
      'M0 65V8A8 8 0 0 1 8 0H47A8 8 0 0 1 55 8V65',
    );
    // The middle seat of a row: two lines, no corner.
    expect(seatTableEdgePath(55, 65, [true, false, true, false])).toBe(
      'M0 0H55M55 65H0',
    );
    // A single table: the whole outline.
    expect(seatTableEdgePath(55, 65, [true, true, true, true])).toBe(
      insetSeatPath(55, 65, 0, [true, true, true, true]),
    );
    expect(seatTableEdgePath(55, 65, [false, false, false, false])).toBe('');
  });

  it("is, with no inset, the seat's outline as its table cuts it", () => {
    // Square where the seat meets its neighbour, so the seats tile the table.
    expect(insetSeatPath(55, 65, 0, [true, true, false, false])).toBe(
      'M8 0H47A8 8 0 0 1 55 8V65H0V8A8 8 0 0 1 8 0Z',
    );
  });

  it('draws each line between the seats once', () => {
    // An upright double table: one line across.
    expect(
      seatDividerPath(
        [
          { col: 0, row: 0 },
          { col: 0, row: 1 },
        ],
        1,
        2,
        55,
        65,
      ),
    ).toBe('M0 65H55');
    // A table for four: one line down and one across, each in one run.
    const four = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ];
    expect(seatDividerPath(four, 2, 2, 55, 65)).toBe('M55 0V130M0 65H110');
    // A single table has nothing to divide.
    expect(seatDividerPath([{ col: 0, row: 0 }], 1, 1, 55, 65)).toBe('');
    // A table for six with five seats: the empty cell is divided from its
    // seats, not from the table's edge.
    expect(
      seatDividerPath(
        [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
          { col: 2, row: 0 },
          { col: 0, row: 1 },
          { col: 1, row: 1 },
        ],
        3,
        2,
        50,
        60,
      ),
    ).toBe('M50 0V120M100 0V120M0 60H150');
  });

  it('keeps the ring 2 clear of the inner side of the edge, on a seat and on the circle', () => {
    expect(seatMarkInset(1)).toBe(3.75);
    expect(seatMarkInset(2.5)).toBe(4.5);
    expect(tokenMarkRadius(30, 1)).toBe(26.25);
  });

  it("puts the keyboard focus on the mark's line, or inside a mark", () => {
    expect(seatFocusInset(1, false)).toBe(3.75);
    expect(seatFocusInset(1, true)).toBe(7);
  });

  it("rounds a table's corner concentrically and the seat's own more tightly", () => {
    const path = insetSeatPath(55, 65, 3.75, [true, false, false, false]);
    // Top left: 8 - 3.75; the other corners keep the minimum of 2.
    expect(path).toBe(
      'M8 3.75H49.25A2 2 0 0 1 51.25 5.75V59.25A2 2 0 0 1 49.25 61.25H5.75A2 2 0 0 1 3.75 59.25V8A4.25 4.25 0 0 1 8 3.75Z',
    );
  });
});
