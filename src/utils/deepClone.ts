// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Safe deep cloning utility with fallback for older browsers
 * Uses structuredClone when available, falls back to JSON method
 */

import { logWarn, logError } from './logger';

/**
 * Performs a deep clone of the given object
 * @param obj Object to clone
 * @returns Deep cloned copy of the object
 */
export function deepClone<T>(obj: T): T {
  // Use modern structuredClone if available (supported in modern browsers)
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(obj);
    } catch (error) {
      // structuredClone can fail with certain objects (functions, symbols, etc.)
      // Fall back to JSON method in such cases
      logWarn(
        'structuredClone failed, falling back to JSON method',
        { error },
        'deepClone',
      );
    }
  }

  // Fallback to JSON method for compatibility or when structuredClone fails
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    logError('Deep clone failed', { error }, 'deepClone');
    throw new Error('Failed to deep clone object', { cause: error });
  }
}
