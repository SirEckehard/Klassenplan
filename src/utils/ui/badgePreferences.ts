// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The badge preferences of the canvas: which badges the seats show, and what
 * pointing at one does.
 *
 * This module imports nothing, and that is its reason to exist. The
 * preferences provider (`CanvasPreferencesContext`) wraps every page, so
 * whatever it imports is downloaded before the start page renders. The badge
 * definitions next door (`seatBadges`, `studentAppearance`) bring about fifteen
 * icons with them, which once pushed the initial payload past its budget
 * (`npm run check:bundle`). Keep new imports out of here.
 */

/**
 * What the seats in the editor show: every badge, only those whose mix
 * criterion is on, or none.
 */
export type BadgeDisplayMode = 'all' | 'active' | 'off';

export const BADGE_DISPLAY_MODES: readonly BadgeDisplayMode[] = [
  'all',
  'active',
  'off',
];

/**
 * What pointing at a badge does: explain it in a tooltip, and mark everyone
 * who shares it. Both on unless the teacher switches them off.
 */
export type BadgeHoverSettings = { tooltip: boolean; highlight: boolean };

export const DEFAULT_BADGE_HOVER: BadgeHoverSettings = {
  tooltip: true,
  highlight: true,
};

/** A stored value read back safely: anything but `false` keeps the default. */
export function normalizeBadgeHover(value: unknown): BadgeHoverSettings {
  const record =
    value && typeof value === 'object'
      ? (value as Partial<Record<keyof BadgeHoverSettings, unknown>>)
      : {};
  return {
    tooltip: record.tooltip !== false,
    highlight: record.highlight !== false,
  };
}
