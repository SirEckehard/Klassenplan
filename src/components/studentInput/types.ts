// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';
import type { NameColumnMode } from '@/utils/data/csvUtils';

export type StudentInputProps = {
  students: Student[];
  addStudent: (
    name: string,
    gender?: 'boy' | 'girl' | 'diverse',
    restless?: boolean,
    shy?: boolean,
    concentrationIssues?: boolean,
    needsFrontSeat?: boolean,
  ) => Student;
  addBulkPlaceholderStudents: (count: number) => Student[];
  removeStudent: (id: string) => void;
  /** Remove a whole selection as one undo step and one store write. */
  removeStudents: (ids: string[]) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  /** Apply one patch to a whole selection as one undo step and one store write. */
  updateStudents: (ids: string[], patch: Partial<Student>) => void;
  importCsv: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
  downloadStudentsCsv: () => void;
  onProceedToLayout: () => void;
  onProceedToPlan: () => void;
};
