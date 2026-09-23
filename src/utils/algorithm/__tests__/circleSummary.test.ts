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
import type { Gender, Student } from '@/types';
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

/** One student per letter: `b` a boy, `g` a girl, `-` nobody said. */
const byGender = (pattern: string) =>
  [...pattern].map((mark, index) =>
    student(`s${index}`, {
      gender: (
        { b: 'boy', g: 'girl', '-': undefined } as Record<
          string,
          Gender | undefined
        >
      )[mark],
    }),
  );

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

  describe('wishes', () => {
    it('names who has none of their wish partners beside them', () => {
      const students = [
        student('a', { wishPartnerIds: ['c'] }),
        student('b', { wishPartnerIds: ['a', 'd'] }),
        student('c'),
        student('d'),
        // A wish for somebody outside the circle cannot be met here.
        student('e', { wishPartnerIds: ['gone'] }),
      ];
      expect(summarizeCircle(ring(students)).wishes).toEqual({
        total: 2,
        waiting: ['a'],
      });
    });

    it('is not checked when nobody wished for anybody in the circle', () => {
      const students = [
        student('a', { wishPartnerIds: ['gone'] }),
        student('b'),
        student('c'),
      ];
      expect(summarizeCircle(ring(students)).wishes).toBeNull();
    });
  });

  describe('distance and restlessness', () => {
    it('lists neighbours of whom one asked for distance, across the join', () => {
      const students = [
        student('a'),
        student('b', { avoidPartnerIds: ['c'] }),
        student('c'),
        student('d', { avoidPartnerIds: ['a'] }),
      ];
      expect(summarizeCircle(ring(students)).distance).toEqual({
        pairs: [
          ['b', 'c'],
          ['d', 'a'],
        ],
      });
    });

    it('is not checked when nobody asked for distance', () => {
      const students = ['a', 'b', 'c'].map((id) => student(id));
      expect(summarizeCircle(ring(students)).distance).toBeNull();
    });

    it('counts two restless students in a ring of two as one pair', () => {
      const students = [
        student('a', { restless: true }),
        student('b', { restless: true }),
      ];
      expect(summarizeCircle(ring(students)).restless).toEqual({
        pairs: [['a', 'b']],
      });
    });

    it('is not checked with fewer than two restless students', () => {
      const students = [
        student('a', { restless: true }),
        student('b'),
        student('c'),
      ];
      expect(summarizeCircle(ring(students)).restless).toBeNull();
    });
  });

  describe('genders', () => {
    it('is not checked with only one gender to mix', () => {
      expect(summarizeCircle(ring(byGender('bbb-'))).gender).toBeNull();
    });

    it('calls alternating seats mixed', () => {
      expect(summarizeCircle(ring(byGender('bgbgbg'))).gender).toEqual({
        run: null,
      });
    });

    it('allows one more alike than the class makes unavoidable', () => {
      expect(summarizeCircle(ring(byGender('bbggbbgg'))).gender).toEqual({
        run: null,
      });
    });

    it('reports a longer stretch with where it starts and ends', () => {
      expect(summarizeCircle(ring(byGender('bbbggbgg'))).gender).toEqual({
        run: { length: 3, firstId: 's0', lastId: 's2' },
      });
    });

    it('finds a stretch that runs across the end of the order whole', () => {
      expect(summarizeCircle(ring(byGender('bbggbggb'))).gender).toEqual({
        run: { length: 3, firstId: 's7', lastId: 's1' },
      });
    });

    it('lets a class with few of one gender sit in longer stretches', () => {
      // Six boys and two girls: two girls can split the boys into two
      // stretches of three at best, so four in a row still counts as mixed.
      expect(summarizeCircle(ring(byGender('bbbbgbbg'))).gender).toEqual({
        run: null,
      });
      expect(summarizeCircle(ring(byGender('bbbbbgbg'))).gender).toEqual({
        run: { length: 5, firstId: 's0', lastId: 's4' },
      });
    });

    it('lets somebody without a stated gender break a stretch', () => {
      expect(summarizeCircle(ring(byGender('bb-bbg-g'))).gender).toEqual({
        run: null,
      });
    });
  });
});
