// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Zentrale Validierungs-Schemas für DRY-Prinzip
 * Ersetzt duplizierten Validierungscode in Components
 */

// Re-export validation constants from backupValidation
export { BACKUP_LIMITS } from './backupValidation';

/**
 * Common validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation configuration options
 */
export interface StringValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  trim?: boolean;
}

export interface NumberValidationOptions {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
}

/**
 * String validation utilities
 */
export const stringValidation = {
  /**
   * Validate string with configurable options
   */
  validate(
    value: unknown,
    options: StringValidationOptions = {},
  ): ValidationResult {
    const {
      required = false,
      minLength = 0,
      maxLength = Infinity,
      allowEmpty = true,
      trim = true,
    } = options;

    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: 'Wert muss ein Text sein',
      };
    }

    const processedValue = trim ? value.trim() : value;

    if (required && (!processedValue || processedValue.length === 0)) {
      return {
        isValid: false,
        error: 'Dieses Feld ist erforderlich',
      };
    }

    if (!allowEmpty && processedValue.length === 0) {
      return {
        isValid: false,
        error: 'Feld darf nicht leer sein',
      };
    }

    if (processedValue.length < minLength) {
      return {
        isValid: false,
        error: `Mindestens ${minLength} Zeichen erforderlich`,
      };
    }

    if (processedValue.length > maxLength) {
      return {
        isValid: false,
        error: `Maximal ${maxLength} Zeichen erlaubt`,
      };
    }

    return { isValid: true };
  },

  /**
   * Simple required string check
   */
  isRequired(value: unknown): ValidationResult {
    return this.validate(value, { required: true });
  },

  /**
   * Student name validation
   */
  validateStudentName(name: unknown): ValidationResult {
    return this.validate(name, {
      required: true,
      minLength: 1,
      maxLength: 120, // From BACKUP_LIMITS
      trim: true,
    });
  },
};

/**
 * Email validation utilities
 */
export const emailValidation = {
  // Common email regex pattern
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /**
   * Validate email address
   */
  validate(value: unknown): ValidationResult {
    const stringResult = stringValidation.validate(value, { required: true });
    if (!stringResult.isValid) {
      return stringResult;
    }

    const email = (value as string).trim();

    if (!this.EMAIL_PATTERN.test(email)) {
      return {
        isValid: false,
        error: 'Ungültige E-Mail-Adresse',
      };
    }

    return { isValid: true };
  },
};

/**
 * Number validation utilities
 */
export const numberValidation = {
  /**
   * Validate number with configurable options
   */
  validate(
    value: unknown,
    options: NumberValidationOptions = {},
  ): ValidationResult {
    const {
      required = false,
      min = -Infinity,
      max = Infinity,
      integer = false,
    } = options;

    if (value === null || value === undefined) {
      if (required) {
        return {
          isValid: false,
          error: 'Zahl ist erforderlich',
        };
      }
      return { isValid: true };
    }

    if (typeof value === 'string') {
      // Handle string inputs (from form fields)
      const trimmed = value.trim();

      if (trimmed === '' || trimmed === '-' || trimmed === '+') {
        if (required) {
          return {
            isValid: false,
            error: 'Gültige Zahl erforderlich',
          };
        }
        return { isValid: true };
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return {
          isValid: false,
          error: 'Ungültige Zahl',
        };
      }

      return this.validate(parsed, options);
    }

    if (typeof value !== 'number') {
      return {
        isValid: false,
        error: 'Wert muss eine Zahl sein',
      };
    }

    if (!Number.isFinite(value)) {
      return {
        isValid: false,
        error: 'Zahl muss endlich sein',
      };
    }

    if (integer && !Number.isInteger(value)) {
      return {
        isValid: false,
        error: 'Ganze Zahl erforderlich',
      };
    }

    if (value < min) {
      return {
        isValid: false,
        error: `Wert muss mindestens ${min} sein`,
      };
    }

    if (value > max) {
      return {
        isValid: false,
        error: `Wert darf höchstens ${max} sein`,
      };
    }

    return { isValid: true };
  },

  /**
   * Validate rotation degrees (0-360)
   */
  validateRotation(value: unknown): ValidationResult {
    return this.validate(value, {
      min: -360,
      max: 360,
      integer: false,
    });
  },

  /**
   * Validate student count against MAX_STUDENTS
   */
  validateStudentCount(count: unknown, maxStudents: number): ValidationResult {
    return this.validate(count, {
      required: true,
      min: 0,
      max: maxStudents,
      integer: true,
    });
  },
};

/**
 * Array validation utilities
 */
export const arrayValidation = {
  /**
   * Validate array length
   */
  validateLength(
    array: unknown,
    minLength = 0,
    maxLength = Infinity,
  ): ValidationResult {
    if (!Array.isArray(array)) {
      return {
        isValid: false,
        error: 'Wert muss ein Array sein',
      };
    }

    if (array.length < minLength) {
      return {
        isValid: false,
        error: `Mindestens ${minLength} Elemente erforderlich`,
      };
    }

    if (array.length > maxLength) {
      return {
        isValid: false,
        error: `Maximal ${maxLength} Elemente erlaubt`,
      };
    }

    return { isValid: true };
  },

  /**
   * Check if array is not empty
   */
  hasElements(array: unknown): ValidationResult {
    return this.validateLength(array, 1);
  },
};

/**
 * Form validation helper
 */
export const formValidation = {
  /**
   * Validate multiple fields and return aggregated errors
   */
  validateFields(
    fields: Record<
      string,
      { value: unknown; validators: (() => ValidationResult)[] }
    >,
  ): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const [fieldName, { validators }] of Object.entries(fields)) {
      for (const validator of validators) {
        const result = validator();
        if (!result.isValid) {
          errors[fieldName] = result.error || 'Ungültiger Wert';
          break; // Stop at first error per field
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};
