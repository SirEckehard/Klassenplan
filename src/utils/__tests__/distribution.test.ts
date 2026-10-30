// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { evenTargetsFor } from '../distribution';

describe('evenTargetsFor', () => {
  it('spreads 27 students over 6 tables of 6 (3 × 5, 3 × 4)', () => {
    const seatCounts = Array(6).fill(6);
    const result = evenTargetsFor(27, seatCounts);
    // Check total is correct
    expect(result.reduce((sum, n) => sum + n, 0)).toBe(27);
    // Check distribution: should have 3 tables with 5 and 3 tables with 4
    const sorted = [...result].sort((a, b) => b - a);
    expect(sorted).toEqual([5, 5, 5, 4, 4, 4]);
  });

  it('fills every seat when there are enough students', () => {
    const seatCounts = Array(5).fill(6);
    expect(evenTargetsFor(30, seatCounts)).toEqual([6, 6, 6, 6, 6]);
  });

  it('spreads evenly with fewer students than seats (2 × 3, 2 × 2)', () => {
    const seatCounts = Array(4).fill(6);
    const result = evenTargetsFor(10, seatCounts);
    // Check total is correct
    expect(result.reduce((sum, n) => sum + n, 0)).toBe(10);
    // Check distribution: should have 2 tables with 3 and 2 tables with 2
    const sorted = [...result].sort((a, b) => b - a);
    expect(sorted).toEqual([3, 3, 2, 2]);
  });

  it('handles a single table', () => {
    expect(evenTargetsFor(5, [6])).toEqual([5]);
  });

  it('returns zeros without students', () => {
    const seatCounts = [2, 3];
    expect(evenTargetsFor(0, seatCounts)).toEqual([0, 0]);
  });

  it('returns an empty array without tables', () => {
    expect(evenTargetsFor(10, [])).toEqual([]);
  });

  it('never puts more students at a table than it has seats, with mixed seat counts', () => {
    const seatCounts = [1, 2, 4];
    expect(evenTargetsFor(10, seatCounts)).toEqual([1, 2, 4]);
    expect(evenTargetsFor(6, seatCounts)).toEqual([1, 2, 3]);
    const result = evenTargetsFor(5, seatCounts);
    result.forEach((r, idx) => expect(r).toBeLessThanOrEqual(seatCounts[idx]!));
  });
});
