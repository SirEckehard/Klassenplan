// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * The pill every control in the class workbench row is cut from — the class
 * switcher, the add trigger and the search/filter/sort fields.
 *
 * The fields used to carry `input-field`, which is a *form* look: a
 * semi-transparent ground and an inset shadow, so they read as sunken next to
 * the raised pills beside them. One row of controls that all do the same kind
 * of job should not split into two visual families, so the pill wins and the
 * fields adopt it.
 *
 * Layout (height is included, width and display are not) plus `cursor-pointer`
 * and any disabled handling are the caller's to add.
 */
export const workbenchPillClass =
  'h-11 rounded-full border border-blue-200/70 bg-white px-4 text-sm text-blue-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800';

/**
 * The caret that closes a workbench pill opening a menu. Absolutely placed, so
 * the pill it sits in needs `relative` and enough right padding (`pr-9`).
 *
 * `pointer-events-none` matters for the native selects: a click on the caret
 * has to reach the select underneath, or the arrow would look dead.
 */
export const workbenchCaretClass =
  'pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-900/70 dark:text-blue-100/70';
