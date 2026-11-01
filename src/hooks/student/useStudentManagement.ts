// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback } from 'react';
import type { Student } from '@/types';
import {
  MAX_STUDENTS,
  stringValidation,
  numberValidation,
  getBrowserWindow,
  getBrowserDocument,
} from '@/utils';
import { TOAST_MESSAGES } from '@/utils/ui/toast';

export interface UseStudentManagementOptions {
  /**
   * Current students array
   */
  students: Student[];
  /**
   * Function to add a student
   */
  addStudent: (
    name: string,
    gender?: 'boy' | 'girl' | 'diverse',
    restless?: boolean,
    shy?: boolean,
    concentrationIssues?: boolean,
    needsFrontSeat?: boolean,
  ) => Student;
}

export interface UseStudentManagementReturn {
  /**
   * New student name input value
   */
  newStudentName: string;
  /**
   * Update new student name
   */
  setNewStudentName: (name: string) => void;
  /**
   * ID of the last added student (for highlighting)
   */
  lastAddedId: string | null;
  /**
   * Add a new student with validation
   */
  handleAddStudent: () => void;
  /**
   * Why the last add was refused, as an i18n key, said under the field that
   * asked for it; null once the name changes (decision 0037).
   */
  addProblem: string | null;
  /**
   * Check if add button should be disabled
   */
  isAddDisabled: boolean;
}

/**
 * Hook for managing student operations (add, validation).
 * Handles validation, the refusal said under the field, and auto-scroll to
 * new students.
 */
export function useStudentManagement(
  options: UseStudentManagementOptions,
): UseStudentManagementReturn {
  const { students, addStudent } = options;

  const [newStudentName, setNewStudentName] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Scroll to and temporarily highlight the newly added student
  useEffect(() => {
    if (!lastAddedId) return;

    const browserWindow = getBrowserWindow();
    const browserDocument = getBrowserDocument();
    if (!browserWindow || !browserDocument) {
      return;
    }

    const scrollTimeout = browserWindow.setTimeout(() => {
      const el = browserDocument.getElementById(`student-${lastAddedId}`);
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 0);

    const highlightTimeout = browserWindow.setTimeout(() => {
      setLastAddedId(null);
    }, 2000);

    return () => {
      browserWindow.clearTimeout(scrollTimeout);
      browserWindow.clearTimeout(highlightTimeout);
    };
  }, [lastAddedId]);

  const [addProblem, setAddProblem] = useState<string | null>(null);
  const changeNewStudentName = useCallback((name: string) => {
    setNewStudentName(name);
    setAddProblem(null);
  }, []);

  // A refusal is said under the field, where the name was typed — a card
  // came far from it (decision 0037).
  const handleAddStudent = useCallback(() => {
    if (!newStudentName.trim()) {
      setAddProblem(TOAST_MESSAGES.STUDENT_NAME_EMPTY);
      return;
    }
    const nameValidation = stringValidation.validateStudentName(newStudentName);
    if (!nameValidation.isValid) {
      setAddProblem(TOAST_MESSAGES.STUDENT_NAME_INVALID);
      return;
    }

    // Validate student count
    const countValidation = numberValidation.validateStudentCount(
      students.length + 1,
      MAX_STUDENTS,
    );
    if (!countValidation.isValid) {
      setAddProblem(TOAST_MESSAGES.STUDENT_MAX_REACHED);
      return;
    }

    const name = newStudentName.trim();
    const student = addStudent(name);
    setLastAddedId(student.id);
    setAddProblem(null);

    // Clear input for next entry
    setNewStudentName('');
  }, [newStudentName, students.length, addStudent]);

  const isAddDisabled =
    !newStudentName.trim() || students.length >= MAX_STUDENTS;

  return {
    newStudentName,
    setNewStudentName: changeNewStudentName,
    lastAddedId,
    handleAddStudent,
    addProblem,
    isAddDisabled,
  };
}
