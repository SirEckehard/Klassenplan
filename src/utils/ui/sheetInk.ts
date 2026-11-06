// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The greys of a printed sheet: the exports' titles, legends and notes, the
 * note list and the duty roster.
 *
 * Spelled out rather than CSS variables, like the tables' own colours
 * (`tableAppearance`): a sheet is serialised SVG, where a variable does not
 * travel, and it is always light. They are the light theme's paper-and-ink
 * ramp (`index.css`), so a sheet is drawn in the same warm greys as the
 * interface it came from.
 */
export const SHEET_INK = {
  /** Headings and the page's title: full black, for the printer. */
  ink: '#000000',
  /** Running text — a name, a note (`--text-page`). */
  text: '#17181a',
  /** A heading one step quieter than the page's title (the furniture ink). */
  textStrong: '#43464b',
  /** Labels, metadata, column heads (`--text-muted`). */
  muted: '#54565a',
  /** A rule that divides: under a head, round a block. */
  ruleStrong: '#43464b',
  /** A ruled line to write on (the tables' chair dots). */
  rule: '#a29d93',
  /** A line between rows (`--border-option-hover`). */
  ruleFaint: '#cec8bb',
  /** Every other row's ground (`--surface-sunken`). */
  zebra: '#f3f1ec',
} as const;
