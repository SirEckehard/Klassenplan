// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  shallowEqual,
  useSeatingPlanSelector,
  type SeatingPlanSnapshot,
} from '@/contexts/seatingPlan/store';

export interface StudentManagementContextValue {
  students: SeatingPlanSnapshot['state']['students'];
  addStudent: SeatingPlanSnapshot['actions']['addStudent'];
  addBulkPlaceholderStudents: SeatingPlanSnapshot['actions']['addBulkPlaceholderStudents'];
  removeStudent: SeatingPlanSnapshot['actions']['removeStudent'];
  removeStudents: SeatingPlanSnapshot['actions']['removeStudents'];
  clearStudents: SeatingPlanSnapshot['actions']['clearStudents'];
  updateStudent: SeatingPlanSnapshot['actions']['updateStudent'];
  updateStudents: SeatingPlanSnapshot['actions']['updateStudents'];
  setStudents: SeatingPlanSnapshot['actions']['setStudents'];
  importCsv: SeatingPlanSnapshot['actions']['importCsv'];
  downloadStudentsCsv: SeatingPlanSnapshot['actions']['downloadStudentsCsv'];
  undoStudents: SeatingPlanSnapshot['actions']['undoStudents'];
  redoStudents: SeatingPlanSnapshot['actions']['redoStudents'];
  canUndoStudents: SeatingPlanSnapshot['state']['canUndoStudents'];
  canRedoStudents: SeatingPlanSnapshot['state']['canRedoStudents'];
}

export const StudentManagementContext =
  React.createContext<StudentManagementContextValue | null>(null);

/**
 * selectStudentManagementContext isolates student CRUD data/actions so the provider
 * can memoize a stable value without recomputing unrelated seating state.
 */
export const selectStudentManagementContext = ({
  state,
  actions,
}: SeatingPlanSnapshot): StudentManagementContextValue => ({
  students: state.students,
  addStudent: actions.addStudent,
  addBulkPlaceholderStudents: actions.addBulkPlaceholderStudents,
  removeStudent: actions.removeStudent,
  removeStudents: actions.removeStudents,
  clearStudents: actions.clearStudents,
  updateStudent: actions.updateStudent,
  updateStudents: actions.updateStudents,
  setStudents: actions.setStudents,
  importCsv: actions.importCsv,
  downloadStudentsCsv: actions.downloadStudentsCsv,
  undoStudents: actions.undoStudents,
  redoStudents: actions.redoStudents,
  canUndoStudents: state.canUndoStudents,
  canRedoStudents: state.canRedoStudents,
});

export function StudentManagementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSeatingPlanSelector(
    selectStudentManagementContext,
    shallowEqual,
  );

  return (
    <StudentManagementContext.Provider value={value}>
      {children}
    </StudentManagementContext.Provider>
  );
}

/**
 * Provides access to student management operations.
 * Use this hook for student CRUD, CSV import/export, and bulk operations.
 *
 * @returns StudentManagementContextValue with students array and management actions
 * @throws Error if used outside SeatingPlanGeneratorProvider
 *
 * @example
 * ```tsx
 * const { students, addStudent, removeStudent, importCsv } = useStudentManagementContext();
 * ```
 */
export function useStudentManagementContext(): StudentManagementContextValue {
  const context = React.useContext(StudentManagementContext);
  if (!context) {
    throw new Error(
      'useStudentManagementContext must be used within a SeatingPlanGeneratorProvider',
    );
  }
  return context;
}
