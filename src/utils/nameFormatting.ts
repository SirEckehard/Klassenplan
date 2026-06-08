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
