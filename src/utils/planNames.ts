// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Generates a localized timestamp-based name for seating plans.
 *
 * @param date Optional date instance to base the timestamp on.
 * @returns Formatted plan name including the localized timestamp.
 */
export function createTimestampPlanName(date: Date = new Date()): string {
  return `Plan ${date.toLocaleString('de-DE')}`;
}
