// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A locked student keeps their place in the circle: no drag, no shuffle and
 * no regenerated circle moves them.
 */
import { describe, expect, it } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import type { CircleLayout } from '@/types/Circle';
import {
  batchSwapCircleStudents,
  isCircleStudentLocked,
  restoreCircleLocks,
  swapCircleStudents,
  toggleCircleStudentLock,
} from '../circleLayoutService';

const circle = (ids: string[], lockedStudentIds?: string[]): CircleLayout => ({
  students: ids.map((id, index) => ({
    student: createMockStudent({ id, name: id.toUpperCase() }),
    angle: index * 90,
    x: index * 10,
    y: index * 20,
    preservedNeighbors: [],
    lostNeighbors: [],
    newNeighbors: [],
  })),
  radius: { horizontal: 200, vertical: 150 },
  center: { x: 450, y: 300 },
  preservedNeighborhoods: 0,
  totalOriginalNeighborhoods: 0,
  newNeighborhoods: 0,
  preservationRate: 0,
  mode: 'preserve-neighbors',
  timestamp: 0,
  neighborhoodPairs: [],
  lockedStudentIds,
});

const order = (layout: CircleLayout) =>
  layout.students.map((position) => position.student.id);

describe('circle locks', () => {
  it('locks a student and lets them go again', () => {
    const locked = toggleCircleStudentLock(circle(['a', 'b']), 'a');
    expect(isCircleStudentLocked(locked, 'a')).toBe(true);
    expect(
      isCircleStudentLocked(toggleCircleStudentLock(locked, 'a'), 'a'),
    ).toBe(false);
    // Nobody who is not in the circle can be locked.
    expect(
      toggleCircleStudentLock(circle(['a']), 'ghost').lockedStudentIds,
    ).toBe(undefined);
  });

  it('refuses a swap that would move a locked student', () => {
    const layout = circle(['a', 'b', 'c'], ['b']);
    expect(order(swapCircleStudents(layout, 'b', 0))).toEqual(['a', 'b', 'c']);
    expect(order(swapCircleStudents(layout, 'a', 1))).toEqual(['a', 'b', 'c']);
    expect(order(swapCircleStudents(layout, 'a', 2))).toEqual(['c', 'b', 'a']);
  });

  it('skips the swaps of a shuffle that touch a locked student', () => {
    const layout = circle(['a', 'b', 'c', 'd'], ['c']);
    const shuffled = batchSwapCircleStudents(layout, [
      { studentId: 'a', targetPosition: 2 },
      { studentId: 'a', targetPosition: 3 },
      { studentId: 'b', targetPosition: 0 },
    ]);
    expect(order(shuffled)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('puts locked students back on their places in a new circle', () => {
    const previous = circle(['a', 'b', 'c', 'd'], ['b', 'gone']);
    const regenerated = circle(['d', 'c', 'b', 'a']);
    const restored = restoreCircleLocks(regenerated, previous);

    expect(order(restored)).toEqual(['d', 'b', 'c', 'a']);
    // Every place keeps its own geometry.
    expect(restored.students[1]).toMatchObject({ angle: 90, x: 10, y: 20 });
    // Who is gone from the class is let go.
    expect(restored.lockedStudentIds).toEqual(['b']);
    // Nothing locked: the new circle as it came.
    expect(restoreCircleLocks(regenerated, circle(['a']))).toBe(regenerated);
  });
});
