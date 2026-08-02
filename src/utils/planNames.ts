// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { formatDateAndTime } from './dateTimeFormat';

/**
 * Generates a localized timestamp-based name for seating plans.
 *
 * The name is a display string that gets stored verbatim, so it stays in the
 * language it was created in — renaming a plan is the user's call, not ours.
 *
 * @param date Optional date instance to base the timestamp on.
 * @returns Formatted plan name including the localized timestamp.
 */
export function createTimestampPlanName(date: Date = new Date()): string {
  return `Plan ${formatDateAndTime(date)}`;
}
