// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { SavedPlan } from '@/types';

/**
 * Count all occupied seats within a plan.
 * @param plan Seating plan to inspect
 * @returns Number of students or `undefined` if the plan is malformed
 */
export function countStudents(plan: SavedPlan): number | undefined {
  try {
    return plan.seating.reduce(
      (acc, table) => acc + table.filter(Boolean).length,
      0,
    );
  } catch {
    return undefined;
  }
}

/**
 * Get the number of tables in a plan.
 * @param plan Seating plan to inspect
 * @returns Table count or `undefined` when unavailable
 */
export function tableCount(plan: SavedPlan): number | undefined {
  return plan.seating?.length ?? undefined;
}

/**
 * Determine the seat count per table from a plan.
 * @param plan Seating plan to inspect
 * @returns Seats per table or `undefined` when unavailable
 */
export function seatsPerTable(plan: SavedPlan): number | undefined {
  return plan.seating?.[0]?.length ?? undefined;
}
