// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect } from 'vitest';
import {
  validateStudentsComplete,
  getStudentValidationMessage,
  getStudentGenderHintMessage,
} from '../studentValidation';
import type { Student } from '../../../types';

describe('validateStudentsComplete', () => {
  test('returns valid for complete students', () => {
    const students: Student[] = [
      {
        id: '1',
        name: 'Alice',
        gender: 'girl',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
      {
        id: '2',
        name: 'Bob',
        gender: 'boy',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
    ];

    const result = validateStudentsComplete(students);

    expect(result.isValid).toBe(true);
    expect(result.hasEmptyNames).toBe(false);
    expect(result.hasMissingGender).toBe(false);
    expect(result.emptyNameCount).toBe(0);
    expect(result.missingGenderCount).toBe(0);
  });

  test('detects empty names', () => {
    const students: Student[] = [
      {
        id: '1',
        name: '',
        gender: 'girl',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
      {
        id: '2',
        name: '   ',
        gender: 'boy',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
    ];

    const result = validateStudentsComplete(students);

    expect(result.isValid).toBe(false);
    expect(result.hasEmptyNames).toBe(true);
    expect(result.hasMissingGender).toBe(false);
    expect(result.emptyNameCount).toBe(2);
    expect(result.missingGenderCount).toBe(0);
  });

  test('detects missing gender without blocking validation', () => {
    const students: Student[] = [
      {
        id: '1',
        name: 'Alice',
        gender: undefined,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
      {
        id: '2',
        name: 'Bob',
        gender: undefined,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
    ];

    const result = validateStudentsComplete(students);

    expect(result.isValid).toBe(true);
    expect(result.hasEmptyNames).toBe(false);
    expect(result.hasMissingGender).toBe(true);
    expect(result.emptyNameCount).toBe(0);
    expect(result.missingGenderCount).toBe(2);
  });

  test('detects both empty names and missing gender', () => {
    const students: Student[] = [
      {
        id: '1',
        name: '',
        gender: undefined,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
      {
        id: '2',
        name: 'Bob',
        gender: 'boy',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
    ];

    const result = validateStudentsComplete(students);

    expect(result.isValid).toBe(false);
    expect(result.hasEmptyNames).toBe(true);
    expect(result.hasMissingGender).toBe(true);
    expect(result.emptyNameCount).toBe(1);
    expect(result.missingGenderCount).toBe(1);
  });

  test('handles empty array', () => {
    const result = validateStudentsComplete([]);

    expect(result.isValid).toBe(true);
    expect(result.hasEmptyNames).toBe(false);
    expect(result.hasMissingGender).toBe(false);
    expect(result.emptyNameCount).toBe(0);
    expect(result.missingGenderCount).toBe(0);
  });

  test('counts multiple issues correctly', () => {
    const students: Student[] = [
      {
        id: '1',
        name: '',
        gender: undefined,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
      {
        id: '2',
        name: '',
        gender: 'boy',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
      {
        id: '3',
        name: 'Charlie',
        gender: undefined,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: null,
        performanceStrong: false,
        performanceWeak: false,
      },
    ];

    const result = validateStudentsComplete(students);

    expect(result.isValid).toBe(false);
    expect(result.hasEmptyNames).toBe(true);
    expect(result.hasMissingGender).toBe(true);
    expect(result.emptyNameCount).toBe(2);
    expect(result.missingGenderCount).toBe(2);
  });
});

describe('getStudentValidationMessage', () => {
  test('returns empty string for valid students', () => {
    const result = {
      isValid: true,
      hasEmptyNames: false,
      hasMissingGender: false,
      emptyNameCount: 0,
      missingGenderCount: 0,
    };

    const message = getStudentValidationMessage(result);

    expect(message).toBe('');
  });

  test('returns message for single student with empty name', () => {
    const result = {
      isValid: false,
      hasEmptyNames: true,
      hasMissingGender: false,
      emptyNameCount: 1,
      missingGenderCount: 0,
    };

    const message = getStudentValidationMessage(result);

    // Messages come from i18n, so match both locales instead of a fixed string.
    expect(message).toMatch(/fehlenden Namen|missing name/i);
    // The optional-gender sentence was dropped: the toast only asks for names.
    expect(message).not.toMatch(/optional/i);
  });

  test('returns message for multiple students with empty names', () => {
    const result = {
      isValid: false,
      hasEmptyNames: true,
      hasMissingGender: false,
      emptyNameCount: 3,
      missingGenderCount: 0,
    };

    const message = getStudentValidationMessage(result);

    expect(message).toContain('3');
    expect(message).toMatch(/fehlenden Namen|missing names/i);
  });

  test('returns message for single student with missing gender', () => {
    const result = {
      isValid: true,
      hasEmptyNames: false,
      hasMissingGender: true,
      emptyNameCount: 0,
      missingGenderCount: 1,
    };

    const message = getStudentValidationMessage(result);

    expect(message).toBe('');
  });

  test('returns message for multiple students with missing gender', () => {
    const result = {
      isValid: true,
      hasEmptyNames: false,
      hasMissingGender: true,
      emptyNameCount: 0,
      missingGenderCount: 5,
    };

    const message = getStudentValidationMessage(result);

    expect(message).toBe('');
  });

  test('returns combined message for both issues', () => {
    const result = {
      isValid: false,
      hasEmptyNames: true,
      hasMissingGender: true,
      emptyNameCount: 2,
      missingGenderCount: 3,
    };

    const message = getStudentValidationMessage(result);

    // Only the blocking issue (empty names) is reported; gender stays optional.
    expect(message).toContain('2');
    expect(message).not.toContain('3');
  });
});

describe('getStudentGenderHintMessage', () => {
  test('returns empty string when no gender is missing', () => {
    const result = {
      isValid: true,
      hasEmptyNames: false,
      hasMissingGender: false,
      emptyNameCount: 0,
      missingGenderCount: 0,
    };

    const message = getStudentGenderHintMessage(result);

    expect(message).toBe('');
  });

  test('returns hint for single missing gender', () => {
    const result = {
      isValid: true,
      hasEmptyNames: false,
      hasMissingGender: true,
      emptyNameCount: 0,
      missingGenderCount: 1,
    };

    const message = getStudentGenderHintMessage(result);

    expect(message).toMatch(/Geschlechtsangabe|gender information/i);
    expect(message).toMatch(/optional/i);
  });

  test('returns hint for multiple missing genders', () => {
    const result = {
      isValid: true,
      hasEmptyNames: false,
      hasMissingGender: true,
      emptyNameCount: 0,
      missingGenderCount: 4,
    };

    const message = getStudentGenderHintMessage(result);

    expect(message).toContain('4');
    expect(message).toMatch(/Geschlechtsangaben|gender information/i);
  });
});
