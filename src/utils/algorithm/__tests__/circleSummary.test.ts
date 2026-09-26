// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The circle's inspector and its arcs say who sits beside whom. A drag swaps
 * two entries of the layout without touching the neighbour lists written when
 * the circle was built, so these tests pin that everything is read off the
 * order itself — and that the ring closes between the last seat and the first.
 */
import { describe, expect, it } from 'vitest';
import { summarizeCircle } from '../circleSummary';
import { swapCircleStudents } from '@/services/circleLayoutService';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';

const ring = (
  students: Student[],
  tablePairs: Array<[string, string]> = [],
): CircleLayout => ({
  students: students.map((student, index) => ({
    student,
    angle: (360 / students.length) * index,
    x: 0,
    y: 0,
    preservedNeighbors: [],
    lostNeighbors: [],
    newNeighbors: [],
  })),
  radius: { horizontal: 200, vertical: 150 },
  center: { x: 450, y: 300 },
  preservedNeighborhoods: 0,
  totalOriginalNeighborhoods: tablePairs.length,
  newNeighborhoods: 0,
  preservationRate: 0,
  mode: 'preserve-neighbors',
  timestamp: 0,
  neighborhoodPairs: tablePairs.map(([student1Id, student2Id]) => ({
    student1Id,
    student2Id,
    strength: 0.5,
    preserved: false,
  })),
});

const student = (id: string, overrides: Partial<Student> = {}) =>
  createMockStudent({ id, name: id.toUpperCase(), ...overrides });

describe('summarizeCircle', () => {
  describe('table neighbours', () => {
    it('reads them off the current order, not the lists stored at build time', () => {
      const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map((id) =>
        student(id),
      );
      const layout = ring(
        [a, b, c, d, e],
        [
          ['a', 'b'],
          ['c', 'd'],
        ],
      );
      // What the circle was built with: both pairs side by side.
      layout.students[0].preservedNeighbors = ['b'];
      layout.students[1].preservedNeighbors = ['a'];

      expect(summarizeCircle(layout).tableNeighbors).toEqual({
        total: 2,
        kept: [
          ['a', 'b'],
          ['c', 'd'],
        ],
        separated: [],
      });

      // A drag puts B where C sat: A, C, B, D, E.
      const moved = swapCircleStudents(layout, 'b', 2);
      expect(moved.students[0].preservedNeighbors).toEqual(['b']);
      expect(summarizeCircle(moved).tableNeighbors).toEqual({
        total: 2,
        kept: [],
        separated: [
          ['a', 'b'],
          ['c', 'd'],
        ],
      });
    });

    it('counts the last seat and the first as neighbours', () => {
      const students = ['a', 'b', 'c', 'd'].map((id) => student(id));
      const summary = summarizeCircle(ring(students, [['d', 'a']]));
      expect(summary.tableNeighbors.kept).toEqual([['a', 'd']]);
    });

    it('skips pairs with somebody outside the circle and counts a pair once', () => {
      const students = ['a', 'b', 'c'].map((id) => student(id));
      const summary = summarizeCircle(
        ring(students, [
          ['a', 'b'],
          ['b', 'a'],
          ['c', 'gone'],
        ]),
      );
      expect(summary.tableNeighbors.total).toBe(1);
    });
  });
});
