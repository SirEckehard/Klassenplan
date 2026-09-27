// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  arrowDirection,
  nearestInDirection,
} from '@/utils/canvas/directionalFocus';

// Two tables of two, side by side, and a third table below the first.
//   0 1    2 3
//   4 5
const seats = [
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 120, y: 0 },
  { x: 160, y: 0 },
  { x: 0, y: 100 },
  { x: 40, y: 100 },
];

describe('nearestInDirection', () => {
  it('walks along a row and across the gap to the next table', () => {
    expect(nearestInDirection(seats[0]!, seats, 'right')).toBe(1);
    expect(nearestInDirection(seats[1]!, seats, 'right')).toBe(2);
    expect(nearestInDirection(seats[2]!, seats, 'left')).toBe(1);
  });

  it('goes down to the table below rather than sideways', () => {
    expect(nearestInDirection(seats[1]!, seats, 'down')).toBe(5);
    expect(nearestInDirection(seats[4]!, seats, 'up')).toBe(0);
  });

  it('prefers a seat in line over a nearer one off to the side', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 30, y: 25 }, // closer, but well off the row
      { x: 70, y: 0 },
    ];
    expect(nearestInDirection(points[0]!, points, 'right')).toBe(2);
  });

  it('finds nothing past the edge of the room', () => {
    expect(nearestInDirection(seats[3]!, seats, 'right')).toBe(-1);
    expect(nearestInDirection(seats[0]!, seats, 'up')).toBe(-1);
  });

  it('does not count a seat level with the current one as ahead', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0.5, y: 40 },
    ];
    expect(nearestInDirection(points[0]!, points, 'right')).toBe(-1);
  });
});

describe('arrowDirection', () => {
  it('names the four arrows and nothing else', () => {
    expect(arrowDirection('ArrowLeft')).toBe('left');
    expect(arrowDirection('ArrowDown')).toBe('down');
    expect(arrowDirection('Tab')).toBeNull();
  });
});
