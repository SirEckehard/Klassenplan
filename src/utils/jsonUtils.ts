// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * JSON utilities for stable serialization.
 */

/**
 * Stringify a value while treating `null` as `undefined` (missing).
 * This ensures that objects with explicit `null` values produce the same
 * string output as objects with missing keys or `undefined` values.
 * Stringify a value while treating `null` as `undefined` (missing) and sorting object keys.
 * This ensures that:
 * 1. Objects with explicit `null` values match objects with missing/undefined values.
 * 2. Objects with the same keys in different orders match.
 */
export function stableStringify(value: unknown): string {
  const replacer = (_: string, val: unknown) => {
    if (val === null) return undefined;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = (val as Record<string, unknown>)[key];
            return sorted;
          },
          {} as Record<string, unknown>,
        );
    }
    return val;
  };
  return JSON.stringify(value, replacer);
}
