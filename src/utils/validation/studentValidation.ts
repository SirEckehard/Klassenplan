// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import i18n from '@/i18n';
import type { Student } from '@/types';

/**
 * Validation result for student data completeness
 */
export interface StudentValidationResult {
  isValid: boolean;
  hasEmptyNames: boolean;
  hasMissingGender: boolean;
  emptyNameCount: number;
  missingGenderCount: number;
}

/**
 * Validates that all students have complete data (name and gender)
 * @param students Array of students to validate
 * @returns Validation result object
 */
export function validateStudentsComplete(
  students: Student[],
): StudentValidationResult {
  let emptyNameCount = 0;
  let missingGenderCount = 0;

  for (const student of students) {
    const hasEmptyName = !student.name || student.name.trim() === '';
    const hasMissingGender = student.gender === undefined;

    if (hasEmptyName) emptyNameCount++;
    if (hasMissingGender) missingGenderCount++;
  }

  return {
    isValid: emptyNameCount === 0,
    hasEmptyNames: emptyNameCount > 0,
    hasMissingGender: missingGenderCount > 0,
    emptyNameCount,
    missingGenderCount,
  };
}

/**
 * Get a user-friendly error message for missing student names.
 *
 * Returns a translated sentence rather than a key: the toast pipeline does not
 * interpolate, and the count has to be part of the message.
 * @param result Validation result from validateStudentsComplete
 * @returns Error message string (empty string when no blocking issue exists)
 */
export function getStudentValidationMessage(
  result: StudentValidationResult,
): string {
  if (!result.hasEmptyNames) return '';

  const missingNames = i18n.t('students:validation.missingNames', {
    count: result.emptyNameCount,
  });
  return `${missingNames} ${i18n.t('students:validation.genderOptional')}`;
}

/**
 * Provide an informational hint for optional gender fields.
 * @param result Validation result from validateStudentsComplete
 * @returns Informational message string (empty string when no hint is needed)
 */
export function getStudentGenderHintMessage(
  result: StudentValidationResult,
): string {
  if (!result.hasMissingGender) return '';

  return i18n.t('students:validation.genderHint', {
    count: result.missingGenderCount,
  });
}
