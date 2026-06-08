// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { studentStore, resetStudentStore } from '../studentsStore';
import { MAX_STUDENTS } from '@/utils';
import type { Student } from '@/types';

vi.mock('@/services/csvImportService', () => ({
  importStudentsFromCsv: vi.fn(),
}));

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: {
    STUDENT_MAX_REACHED: 'STUDENT_MAX_REACHED',
  },
}));

import { importStudentsFromCsv } from '@/services/csvImportService';
import { showToast } from '@/utils/ui/toast';

describe('studentsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStudentStore();
  });

  describe('addStudent', () => {
    it('appends a new student with normalized name and defaults (happy path)', () => {
      const student = studentStore
        .getState()
        .addStudent('  Anna  ', 'girl', true, false);

      expect(student.name).toBe('Anna');
      expect(student.gender).toBe('girl');
      expect(student.restless).toBe(true);
      expect(student.shy).toBe(false);
      expect(student.id).toBeTruthy();
      expect(studentStore.getState().students).toHaveLength(1);
      expect(studentStore.getState().hasPendingStudentUpdates).toBe(true);
    });

    it('does not enforce MAX_STUDENTS by itself (caller responsibility)', () => {
      // addStudent itself has no validation; bulk-handler does.
      // Document current behavior so a future change is intentional.
      for (let i = 0; i < MAX_STUDENTS + 5; i++) {
        studentStore.getState().addStudent(`Student${i}`);
      }
      expect(studentStore.getState().students.length).toBe(MAX_STUDENTS + 5);
    });
  });

  describe('addBulkPlaceholderStudents', () => {
    it('adds requested number of placeholders within MAX_STUDENTS (happy path)', () => {
      const placeholders = studentStore
        .getState()
        .addBulkPlaceholderStudents(5);

      expect(placeholders).toHaveLength(5);
      expect(studentStore.getState().students).toHaveLength(5);
      expect(placeholders[0]!.name).toBe('');
      expect(placeholders[0]!.gender).toBeUndefined();
    });

    it('caps at MAX_STUDENTS and toasts when over limit (failure path)', () => {
      // Pre-populate near the limit
      for (let i = 0; i < MAX_STUDENTS - 2; i++) {
        studentStore.getState().addStudent(`S${i}`);
      }

      const placeholders = studentStore
        .getState()
        .addBulkPlaceholderStudents(10);

      expect(placeholders).toHaveLength(2); // only 2 slots left
      expect(studentStore.getState().students).toHaveLength(MAX_STUDENTS);
      expect(showToast).toHaveBeenCalledWith('error', 'STUDENT_MAX_REACHED');
    });

    it('returns empty array when count is non-positive', () => {
      expect(studentStore.getState().addBulkPlaceholderStudents(0)).toEqual([]);
      expect(studentStore.getState().addBulkPlaceholderStudents(-3)).toEqual([]);
      expect(studentStore.getState().students).toHaveLength(0);
    });
  });

  describe('removeStudent', () => {
    it('removes the student with the given id', () => {
      const a = studentStore.getState().addStudent('A');
      const b = studentStore.getState().addStudent('B');

      studentStore.getState().removeStudent(a.id);

      expect(studentStore.getState().students.map((s) => s.id)).toEqual([b.id]);
    });

    it('is a no-op when the id is unknown', () => {
      const a = studentStore.getState().addStudent('A');

      studentStore.getState().removeStudent('does-not-exist');

      expect(studentStore.getState().students).toHaveLength(1);
      expect(studentStore.getState().students[0]!.id).toBe(a.id);
    });
  });

  describe('updateStudent', () => {
    it('applies a generic patch (happy path)', () => {
      const s = studentStore.getState().addStudent('A');

      studentStore.getState().updateStudent(s.id, { restless: true });

      expect(studentStore.getState().students[0]!.restless).toBe(true);
    });

    it('makes performanceStrong/performanceWeak mutually exclusive', () => {
      const s = studentStore.getState().addStudent('A');

      // Setting performanceStrong=true must clear performanceWeak.
      // Cast bypasses the mutually-exclusive PerformanceFlags discriminated
      // union — the very behavior we're verifying here.
      studentStore
        .getState()
        .updateStudent(s.id, {
          performanceStrong: true,
          performanceWeak: true,
        } as unknown as Partial<Student>);
      const after1 = studentStore.getState().students[0]! as Student & {
        performanceStrong?: boolean;
        performanceWeak?: boolean;
      };
      expect(after1.performanceStrong).toBe(true);
      expect(after1.performanceWeak).toBe(false);

      // Switching to performanceWeak=true clears performanceStrong.
      studentStore
        .getState()
        .updateStudent(s.id, { performanceWeak: true });
      const after2 = studentStore.getState().students[0]! as Student & {
        performanceStrong?: boolean;
        performanceWeak?: boolean;
      };
      expect(after2.performanceStrong).toBe(false);
      expect(after2.performanceWeak).toBe(true);
    });

    it('clears both flags when explicitly set to false', () => {
      const s = studentStore.getState().addStudent('A');
      studentStore.getState().updateStudent(s.id, { performanceStrong: true });

      studentStore.getState().updateStudent(s.id, { performanceStrong: false });

      const after = studentStore.getState().students[0]! as Student & {
        performanceStrong?: boolean;
        performanceWeak?: boolean;
      };
      expect(after.performanceStrong).toBe(false);
      expect(after.performanceWeak).toBe(false);
    });

    it('is a no-op when the id is unknown (does not throw)', () => {
      const s = studentStore.getState().addStudent('A');
      const before = studentStore.getState().students;

      expect(() =>
        studentStore.getState().updateStudent('unknown', { restless: true }),
      ).not.toThrow();
      expect(studentStore.getState().students[0]!.restless).toBe(s.restless);
      expect(studentStore.getState().students.length).toBe(before.length);
    });
  });

  describe('setStudents', () => {
    it('accepts a value (happy path) and updates pending flag', () => {
      const replacement = [
        {
          id: 'a',
          name: 'A',
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        } as Student,
      ];
      studentStore.getState().setStudents(replacement);

      expect(studentStore.getState().students).toEqual(replacement);
      expect(studentStore.getState().hasPendingStudentUpdates).toBe(true);
    });

    it('is a no-op when next list is deeply equal', () => {
      const list = [
        {
          id: 'a',
          name: 'A',
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        } as Student,
      ];
      studentStore.getState().setStudents(list);
      studentStore.getState().acknowledgeStudentUpdates();

      // Re-set with deeply-equal copy → no pending-flip.
      studentStore.getState().setStudents([{ ...list[0]! }]);

      expect(studentStore.getState().hasPendingStudentUpdates).toBe(false);
    });
  });

  describe('importCsv', () => {
    it('appends imported rows on success (happy path)', async () => {
      const accepted = [
        { id: 'csv-1', name: 'Imported' } as Student,
      ];
      vi.mocked(importStudentsFromCsv).mockResolvedValueOnce(accepted);

      const file = new File(['name\nA'], 'roster.csv');
      const result = await studentStore.getState().importCsv(file);

      expect(result).toEqual(accepted);
      expect(studentStore.getState().students).toEqual(accepted);
    });

    it('returns empty array and does not modify state when service yields nothing (failure path)', async () => {
      vi.mocked(importStudentsFromCsv).mockResolvedValueOnce([]);

      const file = new File(['bad'], 'roster.csv');
      const result = await studentStore.getState().importCsv(file);

      expect(result).toEqual([]);
      expect(studentStore.getState().students).toHaveLength(0);
    });
  });

  describe('clearStudents & acknowledgeStudentUpdates', () => {
    it('clearStudents empties the list', () => {
      studentStore.getState().addStudent('A');
      studentStore.getState().addStudent('B');

      studentStore.getState().clearStudents();

      expect(studentStore.getState().students).toEqual([]);
    });

    it('acknowledgeStudentUpdates resets pending flag exactly once', () => {
      studentStore.getState().addStudent('A');
      expect(studentStore.getState().hasPendingStudentUpdates).toBe(true);

      studentStore.getState().acknowledgeStudentUpdates();
      expect(studentStore.getState().hasPendingStudentUpdates).toBe(false);

      // Calling again is a no-op (does not throw, flag stays false)
      const before = studentStore.getState();
      studentStore.getState().acknowledgeStudentUpdates();
      expect(studentStore.getState()).toBe(before);
    });
  });
});
