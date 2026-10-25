// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  insetSeatPath,
  seatFocusInset,
  seatMarkInset,
  seatTableCorners,
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
