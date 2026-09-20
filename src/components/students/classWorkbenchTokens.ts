// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * The control every field above the class list is cut from — search, filter
 * and sort.
 *
 * They used to be blue-tinted pills painted by hand (`border-blue-200`,
 * `bg-white`, `dark:bg-gray-900`), which put a second blue on a surface where
 * blue means "you can act here" and left dark mode to a `dark:` variant per
 * property. They are paper with one hairline now, the same 36px row height as
 * a toolbar entry, and the tokens handle both modes.
 *
 * Layout (height is included, width and display are not) plus `cursor-pointer`
 * and any disabled handling are the caller's to add.
 */
export const workbenchPillClass =
  'h-9 rounded-lg border border-(--border-card) bg-(--surface-card) px-3 text-[13px] text-(--text-page) transition hover:border-(--border-option-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)';

/**
 * The caret that closes a workbench field opening a menu. Absolutely placed,
 * so the field it sits in needs `relative` and enough right padding (`pr-8`).
 *
 * `pointer-events-none` matters for the native selects: a click on the caret
 * has to reach the select underneath, or the arrow would look dead.
 */
export const workbenchCaretClass =
  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted)';
