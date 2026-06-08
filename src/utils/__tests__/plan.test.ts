// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { countStudents, tableCount, seatsPerTable } from '../plan';
import {
  createMockStudent,
  createMockSavedPlan,
  createMockClassroomScene,
} from '../../__tests__/utils';

describe('plan utilities', () => {
  describe('countStudents', () => {
    it('counts students correctly in a standard plan', () => {
      const students = [
        createMockStudent({ id: 's1', name: 'Alice' }),
        createMockStudent({ id: 's2', name: 'Bob' }),
        createMockStudent({ id: 's3', name: 'Charlie' }),
      ];

      const plan = createMockSavedPlan({
        seating: [
          [students[0], students[1]], // Table 1: 2 students
          [students[2], null], // Table 2: 1 student
          [null, null], // Table 3: 0 students
        ],
      });

      expect(countStudents(plan)).toBe(3);
    });

    it('counts students correctly when all seats are filled', () => {
      const students = [
        createMockStudent({ id: 's1', name: 'Alice' }),
        createMockStudent({ id: 's2', name: 'Bob' }),
        createMockStudent({ id: 's3', name: 'Charlie' }),
        createMockStudent({ id: 's4', name: 'Diana' }),
      ];

      const plan = createMockSavedPlan({
        seating: [
          [students[0], students[1]],
          [students[2], students[3]],
        ],
      });

      expect(countStudents(plan)).toBe(4);
    });

    it('returns 0 for empty plan', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null, null],
          [null, null],
          [null, null],
        ],
      });

      expect(countStudents(plan)).toBe(0);
    });

    it('handles single student plans', () => {
      const student = createMockStudent({ id: 's1', name: 'Solo' });

      const plan = createMockSavedPlan({
        seating: [
          [student, null],
          [null, null],
        ],
      });

      expect(countStudents(plan)).toBe(1);
    });

    it('handles plans with irregular table sizes', () => {
      const students = [
        createMockStudent({ id: 's1', name: 'Alice' }),
        createMockStudent({ id: 's2', name: 'Bob' }),
        createMockStudent({ id: 's3', name: 'Charlie' }),
      ];

      const plan = createMockSavedPlan({
        seating: [
          [students[0]], // Single seat table
          [students[1], students[2], null], // Three seat table with 2 students
          [null, null], // Two seat table, empty
        ],
      });

      expect(countStudents(plan)).toBe(3);
    });

    it('returns undefined for malformed plans', () => {
      // Plan with invalid seating structure
      const malformedPlan = createMockSavedPlan({
        name: 'Malformed',
        scene: createMockClassroomScene(),
        seating: null as any, // Invalid seating
      });

      expect(countStudents(malformedPlan)).toBeUndefined();
    });

    it('handles plans with mixed data types gracefully', () => {
      const student = createMockStudent({ id: 's1', name: 'Alice' });

      const plan = createMockSavedPlan({
        seating: [
          [student, null, undefined], // Mixed null and undefined
          [null],
        ] as any,
      });

      expect(countStudents(plan)).toBe(1);
    });

    it('handles deeply nested errors gracefully', () => {
      // Plan with seating that will throw during reduce operation
      const problematicPlan = createMockSavedPlan({
        seating: {
          reduce() {
            throw new Error('Reduce error');
          },
        } as any,
      });

      expect(countStudents(problematicPlan)).toBeUndefined();
    });

    it('counts students correctly with falsy values', () => {
      const student = createMockStudent({ id: 's1', name: 'Alice' });

      const plan = createMockSavedPlan({
        seating: [[student, null, false, 0, '', undefined] as any],
      });

      // Only truthy student should be counted
      expect(countStudents(plan)).toBe(1);
    });
  });

  describe('tableCount', () => {
    it('returns correct table count for standard plan', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null, null],
          [null, null],
          [null, null],
        ],
      });

      expect(tableCount(plan)).toBe(3);
    });

    it('returns 0 for plan with no tables', () => {
      const plan = createMockSavedPlan({
        seating: [],
      });

      expect(tableCount(plan)).toBe(0);
    });

    it('returns 1 for single table plan', () => {
      const plan = createMockSavedPlan({
        seating: [[null, null]],
      });

      expect(tableCount(plan)).toBe(1);
    });

    it('handles large number of tables', () => {
      const tables = Array.from({ length: 20 }, () => [null, null]);
      const plan = createMockSavedPlan({
        seating: tables,
      });

      expect(tableCount(plan)).toBe(20);
    });

    it('returns undefined for malformed plan', () => {
      const plan = createMockSavedPlan({
        name: 'Malformed',
        scene: createMockClassroomScene(),
        seating: null as any,
      });

      expect(tableCount(plan)).toBeUndefined();
    });

    it('returns undefined when seating is undefined', () => {
      const plan = createMockSavedPlan({
        name: 'No Seating',
        scene: createMockClassroomScene(),
        seating: undefined as any,
      });

      expect(tableCount(plan)).toBeUndefined();
    });

    it('handles plans with irregular table structures', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null], // 1 seat
          [null, null], // 2 seats
          [null, null, null], // 3 seats
        ],
      });

      expect(tableCount(plan)).toBe(3);
    });
  });

  describe('seatsPerTable', () => {
    it('returns correct seat count for standard plan', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null, null],
          [null, null],
        ],
      });

      expect(seatsPerTable(plan)).toBe(2);
    });

    it('returns correct seat count for single seat tables', () => {
      const plan = createMockSavedPlan({
        seating: [[null], [null]],
      });

      expect(seatsPerTable(plan)).toBe(1);
    });

    it('returns correct seat count for larger tables', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null, null, null, null], // 4 seats
          [null, null, null, null],
        ],
      });

      expect(seatsPerTable(plan)).toBe(4);
    });

    it('returns undefined for plan with no tables', () => {
      const plan = createMockSavedPlan({
        seating: [],
      });

      expect(seatsPerTable(plan)).toBeUndefined();
    });

    it('returns undefined for malformed plan', () => {
      const plan = createMockSavedPlan({
        name: 'Malformed',
        scene: createMockClassroomScene(),
        seating: null as any,
      });

      expect(seatsPerTable(plan)).toBeUndefined();
    });

    it('returns undefined when first table is undefined', () => {
      const plan = createMockSavedPlan({
        seating: [undefined as any],
      });

      expect(seatsPerTable(plan)).toBeUndefined();
    });

    it('handles empty first table', () => {
      const plan = createMockSavedPlan({
        seating: [
          [], // Empty table
          [null, null], // Non-empty table
        ],
      });

      expect(seatsPerTable(plan)).toBe(0);
    });

    it('only considers first table for seat count', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null, null], // 2 seats (this one counts)
          [null, null, null], // 3 seats (ignored)
          [null], // 1 seat (ignored)
        ],
      });

      expect(seatsPerTable(plan)).toBe(2);
    });

    it('handles plan with mixed seat counts correctly', () => {
      const plan = createMockSavedPlan({
        seating: [
          [null, null, null, null, null], // 5 seats
          [null, null], // 2 seats
          [null], // 1 seat
        ],
      });

      // Should return seat count of first table only
      expect(seatsPerTable(plan)).toBe(5);
    });

    it('handles plans with students in seats', () => {
      const student = createMockStudent({ id: 's1', name: 'Alice' });

      const plan = createMockSavedPlan({
        seating: [
          [student, null, null], // 3 seats with 1 student
          [null, null], // 2 seats
        ],
      });

      expect(seatsPerTable(plan)).toBe(3);
    });
  });

  describe('integration tests', () => {
    it('provides consistent results across all functions', () => {
      const students = [
        createMockStudent({ id: 's1', name: 'Alice' }),
        createMockStudent({ id: 's2', name: 'Bob' }),
        createMockStudent({ id: 's3', name: 'Charlie' }),
      ];

      const plan = createMockSavedPlan({
        seating: [
          [students[0], students[1]], // 2 seats, 2 students
          [students[2], null], // 2 seats, 1 student
          [null, null], // 2 seats, 0 students
        ],
      });

      expect(countStudents(plan)).toBe(3);
      expect(tableCount(plan)).toBe(3);
      expect(seatsPerTable(plan)).toBe(2);

      // Verify consistency: students ≤ tables × seatsPerTable
      const studentCount = countStudents(plan)!;
      const tables = tableCount(plan)!;
      const seatsPerTbl = seatsPerTable(plan)!;

      expect(studentCount).toBeLessThanOrEqual(tables * seatsPerTbl);
    });

    it('handles edge case with all functions returning undefined', () => {
      const malformedPlan = createMockSavedPlan({
        name: 'Completely Malformed',
        scene: createMockClassroomScene(),
        seating: null as any,
      });

      expect(countStudents(malformedPlan)).toBeUndefined();
      expect(tableCount(malformedPlan)).toBeUndefined();
      expect(seatsPerTable(malformedPlan)).toBeUndefined();
    });

    it('handles realistic classroom scenario', () => {
      // Simulate a typical classroom with 6 tables, 4 seats each, 20 students
      const students = Array.from({ length: 20 }, (_, i) =>
        createMockStudent({ id: `s${i}`, name: `Student${i}` }),
      );

      const seating = Array.from({ length: 6 }, (_, tableIdx) => {
        const tableStudents = students.slice(tableIdx * 4, (tableIdx + 1) * 4);
        return [
          tableStudents[0] || null,
          tableStudents[1] || null,
          tableStudents[2] || null,
          tableStudents[3] || null,
        ];
      });

      const plan = createMockSavedPlan({ seating });

      expect(countStudents(plan)).toBe(20);
      expect(tableCount(plan)).toBe(6);
      expect(seatsPerTable(plan)).toBe(4);
    });
  });
});
