// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The colours of a table on the plan: its surface, its outline, the lines
 * between its seats, the chair dots at its edge and the ring round a seat's
 * photo there.
 *
 * Spelled out rather than CSS variables, like the seats' own colours
 * (`studentAppearance`): the exports serialise the scene's SVG, where a
 * variable does not travel, and a view picks its theme per render — an
 * export is always light, the projection's contrast mode always paper and
 * ink.
 *
 * The interface's own ramp: the light theme's ink (`--text-page`) and warm
 * furniture ink (the backdrop's icons), the dark theme's neutral grays
 * (`--text-muted`, the canvas). The table's surface sits just above the
 * canvas in the dark, so a cell without a seat is no bright patch.
 */
const TABLE_COLORS = {
  fill: { light: '#ffffff', dark: '#1c1f23' },
  stroke: { light: '#17181a', dark: '#a9acb1' },
  divider: {
    light: 'rgba(23, 24, 26, 0.14)',
    dark: 'rgba(242, 241, 238, 0.16)',
  },
  chair: { light: '#a29d93', dark: '#7c8084' },
  /** Between a seat's photo and its frame: the canvas. */
  photoHalo: { light: '#ffffff', dark: '#181a1d' },
} as const;

/** The projection's contrast mode, for a wall rather than a screen. */
const TABLE_CONTRAST_COLORS = {
  fill: '#ffffff',
  stroke: '#000000',
  chair: '#767676',
  photoHalo: '#ffffff',
} as const;

export type TableColors = {
  fill: string;
  stroke: string;
  /** None in the contrast mode, where every seat draws its own contour. */
  divider: string | null;
  chair: string;
  /** Behind a seat's photo, the table's own surface. */
  photoBackdrop: string;
  photoHalo: string;
};

/** The colours a table is drawn in, for the theme and the contrast mode. */
export function getTableColors(isDark: boolean, contrast = false): TableColors {
  if (contrast) {
    return {
      ...TABLE_CONTRAST_COLORS,
      divider: null,
      photoBackdrop: TABLE_CONTRAST_COLORS.fill,
    };
  }
  const mode = isDark ? 'dark' : 'light';
  return {
    fill: TABLE_COLORS.fill[mode],
    stroke: TABLE_COLORS.stroke[mode],
    divider: TABLE_COLORS.divider[mode],
    chair: TABLE_COLORS.chair[mode],
    photoBackdrop: TABLE_COLORS.fill[mode],
    photoHalo: TABLE_COLORS.photoHalo[mode],
  };
}
