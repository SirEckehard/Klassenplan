// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { dataFamilyClass, mutedIconButtonClass } from '@/utils';

/**
 * The two student controls that are not a switch or a chip group: the wish
 * partner and the distance wish, which both open a list of classmates.
 *
 * Both belong to the Soziales family, and both wear its colour when they are
 * set — an icon and the relation's name tell them apart, which is how every
 * other piece of pedagogy in this interface is read (docs/DESIGNSYSTEM.md
 * § 4). Nothing here paints a raw palette colour any more; the family tokens
 * bring their own dark mode.
 */
const partnerControl = {
  baseClass: `${mutedIconButtonClass} ${dataFamilyClass.social} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  activeStateClass:
    'border-(--data-chip-accent)! bg-(--data-chip-surface)! text-(--data-chip-text)!',
  inactiveStateClass:
    'border-(--border-card)! bg-(--surface-card)! text-(--text-muted)! hover:bg-(--surface-sunken)!',
  iconClass: 'text-(--data-chip-accent)',
  dropdownResetClass:
    'flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs text-(--text-muted) transition hover:bg-(--surface-sunken)',
  dropdownOptionBaseClass:
    'flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition hover:bg-(--surface-sunken)',
  dropdownActiveClass: 'bg-(--data-chip-surface) text-(--data-chip-text)',
  dropdownInactiveClass: 'text-(--text-page)',
} as const;

export const partnerButtonTokens = partnerControl;

export const avoidPartnerButtonTokens = partnerControl;

/**
 * The bulk bar's flag chips — the one place a student attribute is still set
 * for many students at once.
 *
 * Setting a flag is an action, so the chip takes the accent that means "you
 * did this" rather than the flag's own family: what the flag *is* stays with
 * its icon and its tooltip.
 */
export const specialNeedsButtonTokens = {
  // Eight of these sit in a single row that has to fit a 1280px layout, so
  // they drop to 36px where a mouse points at them and keep the 44px touch
  // target where a finger does. No `px-3` — with an icon-only chip the
  // padding, not `min-w`, would decide the width.
  bulkBaseClass: `${mutedIconButtonClass} flex min-h-9 min-w-9 shrink-0 items-center justify-center text-xs font-semibold pointer-coarse:min-h-11 pointer-coarse:min-w-11`,
  activeStateClass:
    'border-(--border-option-selected)! bg-(--surface-option-selected)! text-(--text-badge)!',
  inactiveStateClass: 'text-(--text-page)!',
  // Bulk editing only: some of the selected students carry the flag, others do
  // not. Dashed so it never reads as a plain active toggle.
  mixedStateClass:
    'border-dashed! border-(--border-option-selected)! bg-(--surface-card)! text-(--text-badge)!',
} as const;
