// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { SeatingArrangement } from '@/types';

/**
 * Immutably appends new seat arrays to a seating arrangement.
 *
 * This utility function creates a new seating arrangement by adding seat arrays
 * for newly created tables. It follows React's immutability principle by returning
 * a new array instead of mutating the existing one.
 *
 * @param currentSeating - The current seating arrangement (array of seat arrays)
 * @param tables - Array of tables to add seats for (must have seatCount property)
 * @returns A new seating arrangement with appended seat arrays (filled with null)
 *
 * @example
 * ```typescript
 * const currentSeating = [[student1, student2], [student3, null]];
 * const newTables = [{ seatCount: 4 }, { seatCount: 2 }];
 * const updatedSeating = addSeatingForTables(currentSeating, newTables);
 * // Result: [[student1, student2], [student3, null], [null, null, null, null], [null, null]]
 * ```
 */
export function addSeatingForTables(
  currentSeating: SeatingArrangement,
  tables: Array<{ seatCount: number }>,
): SeatingArrangement {
  // Create new seat arrays for each table
  const newSeatArrays = tables.map((table) =>
    Array(table.seatCount).fill(null),
  );

  // Return new array with appended seat arrays
  return [...currentSeating, ...newSeatArrays];
}
