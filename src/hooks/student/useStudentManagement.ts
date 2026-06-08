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
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

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
  /**
   * Callback when a card should be expanded
   */
  onCardExpand?: (studentId: string) => void;
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
   * Check if add button should be disabled
   */
  isAddDisabled: boolean;
}

/**
 * Hook for managing student operations (add, validation).
 * Handles validation, toast notifications, and auto-scroll to new students.
 */
export function useStudentManagement(
  options: UseStudentManagementOptions,
): UseStudentManagementReturn {
  const { students, addStudent, onCardExpand } = options;

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

  const handleAddStudent = useCallback(() => {
    // Validate student name
    const nameValidation = stringValidation.validateStudentName(newStudentName);
    if (!nameValidation.isValid) {
      showToast('error', TOAST_MESSAGES.STUDENT_NAME_INVALID);
      return;
    }

    // Validate student count
    const countValidation = numberValidation.validateStudentCount(
      students.length + 1,
      MAX_STUDENTS,
    );
    if (!countValidation.isValid) {
      showToast('error', TOAST_MESSAGES.STUDENT_MAX_REACHED);
      return;
    }

    const name = newStudentName.trim();
    const student = addStudent(name);
    setLastAddedId(student.id);

    // Expand the card for the new student (for gender selection)
    onCardExpand?.(student.id);

    // Clear input for next entry
    setNewStudentName('');
  }, [newStudentName, students.length, addStudent, onCardExpand]);

  const isAddDisabled =
    !newStudentName.trim() || students.length >= MAX_STUDENTS;

  return {
    newStudentName,
    setNewStudentName,
    lastAddedId,
    handleAddStudent,
    isAddDisabled,
  };
}
