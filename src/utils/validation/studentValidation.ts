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
 * @param result Validation result from validateStudentsComplete
 * @returns Error message string (empty string when no blocking issue exists)
 */
export function getStudentValidationMessage(
  result: StudentValidationResult,
): string {
  if (!result.hasEmptyNames) return '';

  if (result.emptyNameCount === 1) {
    return 'Bitte ergänze den fehlenden Namen. Geschlechtsangaben sind optional.';
  }

  return `Bitte ergänze die ${result.emptyNameCount} fehlenden Namen. Geschlechtsangaben sind optional.`;
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

  if (result.missingGenderCount === 1) {
    return 'Hinweis: Für eine Person wurde keine Geschlechtsangabe hinterlegt. Diese Angabe ist optional und kann jederzeit ergänzt werden.';
  }

  return `Hinweis: Für ${result.missingGenderCount} Personen wurden keine Geschlechtsangaben hinterlegt. Diese Angaben sind optional und können jederzeit ergänzt werden.`;
}
