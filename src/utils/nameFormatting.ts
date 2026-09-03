// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Name formatting utilities for student display in various contexts
 * Provides intelligent truncation while maintaining readability
 */

export type DisplayContext = 'table' | 'circle' | 'pdf' | 'full';

/**
 * Context-specific maximum lengths for student names
 */
const MAX_LENGTHS: Record<DisplayContext, number> = {
  table: 12, // Small rectangles in seating plan allow longer names
  circle: 12, // Larger circles in circle view
  pdf: 15, // PDF export with better print quality
  full: Infinity, // No truncation for full name display
};

/**
 * Intelligently truncates a student name while preserving readability
 *
 * @param name - Full student name
 * @param maxLength - Maximum allowed character length
 * @returns Truncated name that fits within maxLength
 */
function truncateStudentName(name: string, maxLength: number): string {
  const trimmedName = name.trim();

  // If name already fits, return as-is
  if (trimmedName.length <= maxLength) {
    return trimmedName;
  }

  // Handle complex names with both hyphens and spaces (e.g., "Jan-Patrick Schmidt")
  if (trimmedName.includes('-') && trimmedName.includes(' ')) {
    const parts = trimmedName.split(' ');
    const hyphenatedFirst = parts[0];
    const lastName = parts[parts.length - 1];

    // First, try to shorten the hyphenated part and add last initial
    if (hyphenatedFirst.includes('-')) {
      const [hFirst, hSecond] = hyphenatedFirst.split('-');

      // Try various combinations
      const lastInitial = lastName.charAt(0);
      const secondInitial = hSecond.charAt(0);
      const combinations = [
        `${hyphenatedFirst} ${lastInitial}`, // Full hyphen + initial
        `${hFirst}-${secondInitial} ${lastInitial}`, // Shorten second part of hyphen + initial
        `${hFirst.charAt(0)}-${hSecond} ${lastInitial}`, // Shorten first part of hyphen + initial
        `${hFirst.charAt(0)}-${secondInitial} ${lastInitial}`, // Shorten both parts + initial
        `${hFirst}-${secondInitial}`, // Just the shortened hyphenated name
        `${hFirst.charAt(0)}-${hSecond}`, // Alternative hyphen shortening
        `${hFirst.charAt(0)}-${secondInitial}`, // Both parts shortened
      ];

      for (const combo of combinations) {
        if (combo.length <= maxLength) {
          return combo;
        }
      }
    }
  }

  // Handle simple hyphenated names (e.g., "Jan-Patrick" -> "Jan-P")
  if (trimmedName.includes('-') && !trimmedName.includes(' ')) {
    const parts = trimmedName.split('-');
    if (parts.length === 2) {
      const [first, second] = parts;

      // Try shortening the second part first (more readable)
      const shortened2 = `${first}-${second.charAt(0)}`;
      if (shortened2.length <= maxLength) {
        return shortened2;
      }

      // Try shortening the first part
      const shortened1 = `${first.charAt(0)}-${second}`;
      if (shortened1.length <= maxLength) {
        return shortened1;
      }

      // If both are too long, shorten both
      return `${first.charAt(0)}-${second.charAt(0)}`;
    }
  }

  // Handle names with spaces (first name + last name/initial)
  if (trimmedName.includes(' ')) {
    const parts = trimmedName.split(' ');
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    // Keep existing abbreviations intact (e.g., "Claudia H.")
    if (lastName.length <= 2 && lastName.endsWith('.')) {
      const withAbbr = `${firstName} ${lastName}`;
      if (withAbbr.length <= maxLength) {
        return withAbbr;
      }
      // If still too long, shorten first name
      return `${firstName.substring(0, maxLength - lastName.length - 1)} ${lastName}`;
    }

    // Try: "FirstName L"
    const withLastInitial = `${firstName} ${lastName.charAt(0)}`;
    if (withLastInitial.length <= maxLength) {
      return withLastInitial;
    }

    // If first name is still too long, truncate it
    const maxFirstNameLength = maxLength - 2; // " L"
    return `${firstName.substring(0, maxFirstNameLength)} ${lastName.charAt(0)}`;
  }

  // Single name truncation (preserve readability with clean cut)
  if (maxLength <= 3) {
    return trimmedName.substring(0, maxLength);
  }

  // For longer names, cut without adding a trailing period
  const cutLength = maxLength;
  return trimmedName.substring(0, cutLength);
}

/**
 * Gets display name for a student based on context
 *
 * @param name - Full student name
 * @param context - Display context (table, circle, pdf, or full)
 * @returns Appropriately formatted name for the context
 */
export function getDisplayName(name: string, context: DisplayContext): string {
  // Return full name without truncation for 'full' context
  if (context === 'full') {
    return name.trim();
  }

  const maxLength = MAX_LENGTHS[context];
  return truncateStudentName(name, maxLength);
}

/**
 * Gets the full name for tooltip/title display
 * Ensures consistent formatting across components
 *
 * @param name - Student name
 * @returns Clean full name for tooltips
 */
export function getTooltipName(name: string): string {
  return name.trim();
}

/**
 * Checks if a name will be truncated in a given context
 *
 * @param name - Full student name
 * @param context - Display context (table, circle, pdf, or full)
 * @returns True if name will be truncated, false otherwise
 */
export function isNameTruncated(
  name: string,
  context: DisplayContext = 'table',
): boolean {
  if (context === 'full') {
    return false;
  }
  const trimmedName = name.trim();
  const maxLength = MAX_LENGTHS[context];
  return trimmedName.length > maxLength;
}

/**
 * Gets a preview of how a name will be displayed after truncation
 *
 * @param name - Full student name
 * @param context - Display context (defaults to 'table')
 * @returns Object with full name, truncated name, and whether truncation occurred
 */
export function getNamePreview(
  name: string,
  context: DisplayContext = 'table',
): { full: string; truncated: string; isTruncated: boolean } {
  const full = name.trim();
  const truncated = getDisplayName(name, context);
  return {
    full,
    truncated,
    isTruncated: truncated !== full,
  };
}

/**
 * Uniform name display modes for the seating plan export.
 *
 * Unlike the context-based truncation above — which only shortens names that do
 * not fit and therefore mixes full names and abbreviations on one sheet — these
 * modes apply the same rule to every student, which is what makes a printed
 * plan readable at a glance. `undefined` keeps the context default (used by the
 * editor, where names are only shortened on overflow).
 *
 * - `firstName`: first name only ("Anna Meier" -> "Anna")
 * - `firstNameInitial`: first name plus last initial ("Anna Meier" -> "Anna M.")
 * - `full`: complete name, never shortened
 */
export type NameDisplayMode = 'firstName' | 'firstNameInitial' | 'full';

/**
 * Splits a name into its first name and the initial of its last name.
 *
 * The student model stores one free-text `name`, so the split is a heuristic:
 * the first whitespace-separated token is the first name, the last one the last
 * name. Middle names therefore drop out ("Anna Maria Meier" -> "Anna M."), and
 * name particles are skipped implicitly because only the final token is read
 * ("Anna von Berg" -> "Anna B.").
 */
function splitStudentName(name: string): {
  firstName: string;
  lastInitial: string | null;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastInitial: null };
  }

  const [firstName, ...rest] = parts;
  const lastPart = rest[rest.length - 1];
  if (!lastPart) {
    return { firstName, lastInitial: null };
  }

  // Array.from keeps surrogate pairs intact, so a name starting with an
  // astral-plane character does not turn into half a code point.
  const initial = Array.from(lastPart)[0];
  if (!initial) {
    return { firstName, lastInitial: null };
  }

  return { firstName, lastInitial: `${initial.toLocaleUpperCase()}.` };
}

/**
 * Applies a display mode to a name, without any length-based truncation.
 *
 * @param name - Full student name
 * @param mode - Display mode to apply
 * @returns The name rewritten for the mode (may still exceed a seat's width)
 */
export function applyNameDisplayMode(
  name: string,
  mode: NameDisplayMode,
): string {
  const trimmedName = name.trim();
  if (mode === 'full') {
    return trimmedName;
  }

  const { firstName, lastInitial } = splitStudentName(trimmedName);
  if (!firstName) {
    return trimmedName;
  }
  if (mode === 'firstName' || !lastInitial) {
    return firstName;
  }

  return `${firstName} ${lastInitial}`;
}

/**
 * Gets the display name for a context, honouring an explicit display mode.
 *
 * The context truncation still runs after the mode has been applied, so an
 * unusually long first name cannot overflow its seat. `full` keeps the whole
 * name (the seat label font scales down instead), and an undefined mode falls
 * back to the plain context behaviour.
 *
 * @param name - Full student name
 * @param context - Display context (table, circle, pdf, or full)
 * @param mode - Uniform display mode, or undefined for the context default
 * @returns Formatted name ready for rendering
 */
export function getDisplayNameForMode(
  name: string,
  context: DisplayContext,
  mode?: NameDisplayMode,
): string {
  if (!mode) {
    return getDisplayName(name, context);
  }
  if (mode === 'full') {
    return getDisplayName(name, 'full');
  }

  const shortened = applyNameDisplayMode(name, mode);
  if (!isNameTruncated(shortened, context)) {
    return shortened;
  }

  // One character over the limit: dropping the initial's period keeps the first
  // name whole ("Konstantin S" instead of "Konstanti S."), which reads better
  // than cutting into the name the label is meant to identify.
  if (mode === 'firstNameInitial' && shortened.endsWith('.')) {
    const withoutPeriod = shortened.slice(0, -1);
    if (!isNameTruncated(withoutPeriod, context)) {
      return withoutPeriod;
    }
  }

  return getDisplayName(shortened, context);
}

/**
 * Counts the names whose first name is shared with at least one other name in
 * the list — those students would carry the same label in `firstName` mode.
 *
 * @param names - Full student names
 * @returns Number of names affected by a collision (0 when all are unique)
 */
export function countAmbiguousFirstNames(names: string[]): number {
  const occurrences = new Map<string, number>();
  for (const name of names) {
    const firstName = applyNameDisplayMode(
      name,
      'firstName',
    ).toLocaleLowerCase();
    if (!firstName) continue;
    occurrences.set(firstName, (occurrences.get(firstName) ?? 0) + 1);
  }

  let ambiguous = 0;
  for (const count of occurrences.values()) {
    if (count > 1) ambiguous += count;
  }
  return ambiguous;
}
