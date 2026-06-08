// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Generate a unique base-36 identifier.
 * @returns Unique string composed of timestamp and random segment
 */
export function generateId(): string {
  // Combine timestamp and random value to ensure uniqueness
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
