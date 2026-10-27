// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { dataFamilyClass, type DataFamily } from '@/utils';

/**
 * A student value in the inspector that opens a list rather than standing as
 * chips: the wish partner and the distance wish (a list of classmates), the
 * social role and the language level (`InspectorSelect`).
 *
 * The button wears its family's colour while a value is set — an icon and the
 * row's name tell the attributes apart, which is how every other piece of
 * pedagogy in this interface is read (docs/DESIGNSYSTEM.md § 4). Nothing here
 * paints a raw palette colour; the family tokens bring their own dark mode.
 *
 * It is shaped like the chips of `InspectorChoice` in the rows around it, so
 * the inspector reads as one list of values rather than a list with a few big
 * buttons in it.
 */
export const familyValueControl = (family: DataFamily) =>
  ({
    // As tall and as padded as `InspectorChoice`'s chips, under a mouse and
    // under a finger: every value of the student inspector — chip, partner,
    // role, language — is one size.
    baseClass: `${dataFamilyClass[family]} inline-flex min-h-7 max-w-44 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)`,
    activeStateClass:
      'border-(--data-chip-accent) bg-(--data-chip-surface) font-semibold text-(--data-chip-text)',
    inactiveStateClass:
      'border-(--border-card) bg-(--surface-card) text-(--text-muted) hover:border-(--border-option-hover)',
    caretClass: 'shrink-0 opacity-70',
    dropdownResetClass:
      'flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs text-(--text-muted) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring-primary)',
    dropdownOptionBaseClass:
      'flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring-primary)',
    dropdownActiveClass: 'bg-(--data-chip-surface) text-(--data-chip-text)',
    dropdownInactiveClass: 'text-(--text-page)',
  }) as const;

/**
 * The same value button without a family: paper with ink once a value is
 * chosen — for a choice that describes no pedagogy, such as a plan's room.
 */
export const neutralValueControl = {
  baseClass:
    'inline-flex min-h-7 max-w-44 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)',
  activeStateClass:
    'border-(--border-card) bg-(--surface-card) text-(--text-page) hover:border-(--border-option-hover)',
  inactiveStateClass:
    'border-(--border-card) bg-(--surface-card) text-(--text-muted) hover:border-(--border-option-hover)',
  caretClass: 'shrink-0 opacity-70',
} as const;

const partnerControl = familyValueControl('social');

export const partnerButtonTokens = partnerControl;

export const avoidPartnerButtonTokens = partnerControl;
