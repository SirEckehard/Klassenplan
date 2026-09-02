// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { mutedIconButtonClass } from '@/utils';

// Tokens for student-specific button styles used in gender and special needs selectors
export const genderButtonTokens = {
  compactBaseClass: `${mutedIconButtonClass} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  compactStyleMap: {
    boy: 'border-emerald-400! bg-emerald-200! text-gray-900! dark:border-emerald-500! dark:bg-emerald-500/20! dark:text-emerald-100!',
    girl: 'border-purple-400! bg-purple-200! text-gray-900! dark:border-purple-500! dark:bg-purple-500/20! dark:text-purple-100!',
    diverse:
      'border-sky-400! bg-sky-200! text-gray-900! dark:border-sky-500! dark:bg-sky-500/20! dark:text-sky-100!',
  },
  compactNeutralClass:
    'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
  compactIconColorMap: {
    boy: 'text-emerald-700 dark:text-emerald-200',
    girl: 'text-purple-700 dark:text-purple-200',
    diverse: 'text-sky-700 dark:text-sky-200',
  },
  detailedBaseClass: `${mutedIconButtonClass} flex min-h-11 w-full items-center justify-start gap-2 px-3 py-2 text-xs font-semibold`,
  detailedActiveStyleMap: {
    boy: 'border-emerald-500! bg-emerald-200! text-gray-900! dark:border-emerald-500! dark:bg-emerald-500/20! dark:text-emerald-100!',
    girl: 'border-purple-500! bg-purple-200! text-gray-900! dark:border-purple-500! dark:bg-purple-500/20! dark:text-purple-100!',
    diverse:
      'border-sky-500! bg-sky-200! text-gray-900! dark:border-sky-500! dark:bg-sky-500/20! dark:text-sky-100!',
  },
  detailedInactiveClass: 'text-gray-700! dark:text-gray-200!',
} as const;

export const specialNeedsButtonTokens = {
  compactBaseClass: `${mutedIconButtonClass} flex min-h-11 min-w-11 shrink-0 items-center justify-center px-3 text-xs font-semibold`,
  // Bulk bar only: eight of these sit in a single row that has to fit a 1280px
  // layout, so they drop to 36px where a mouse points at them and keep the
  // 44px touch target where a finger does. No `px-3` — with an icon-only chip
  // the padding, not `min-w`, would decide the width.
  bulkBaseClass: `${mutedIconButtonClass} flex min-h-9 min-w-9 shrink-0 items-center justify-center text-xs font-semibold pointer-coarse:min-h-11 pointer-coarse:min-w-11`,
  detailedBaseClass: `${mutedIconButtonClass} flex min-h-11 w-full items-center justify-start gap-2 px-3 pr-9 py-2 text-xs font-semibold leading-4`,
  activeStateClass:
    'border-amber-600! bg-amber-300! text-amber-600! dark:border-amber-300! dark:bg-amber-300/20! dark:text-amber-300!',
  inactiveStateClass: 'text-gray-700! dark:text-gray-200!',
  // Bulk editing only: some of the selected students carry the flag, others do
  // not. Dashed and washed out so it never reads as a plain active toggle.
  mixedStateClass:
    'border-dashed! border-amber-600! bg-amber-100! text-amber-600! dark:border-amber-300! dark:bg-amber-300/10! dark:text-amber-300!',
} as const;

export const heightButtonTokens = {
  compactBaseClass: `${mutedIconButtonClass} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  compactStyleMap: {
    small:
      'border-blue-400! bg-blue-300/40! text-gray-900! dark:border-blue-200/60! dark:bg-blue-600/20! dark:text-blue-100!',
    medium:
      'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
    tall: 'border-orange-500! bg-orange-200! text-gray-900! dark:border-orange-500! dark:bg-orange-500/20! dark:text-orange-100!',
  },
  compactNeutralClass:
    'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
  compactIconColorMap: {
    small: 'text-blue-400 dark:text-blue-200/60',
    medium: 'text-gray-900 dark:text-white',
    tall: 'text-orange-500 dark:text-orange-500',
  },
  dropdownOptionBaseClass:
    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition',
  dropdownActiveStyleMap: {
    small:
      'border-blue-400! bg-blue-200/50! text-gray-900! hover:bg-blue-200! dark:border-blue-200/50! dark:bg-blue-600/20! dark:text-blue-100! dark:hover:bg-blue-600/30!',
    medium:
      'border-gray-500! bg-gray-300/30! text-gray-900! hover:bg-gray-300/40! dark:border-gray-500! dark:bg-gray-500/30! dark:text-gray-100! dark:hover:bg-gray-500/40!',
    tall: 'border-orange-500! bg-orange-200! text-gray-900! hover:bg-orange-300! dark:border-orange-500! dark:bg-orange-500/20! dark:text-orange-100! dark:hover:bg-orange-500/30!',
  },
  dropdownInactiveStyleMap: {
    small:
      'text-gray-700! hover:bg-blue-200! dark:text-gray-200! dark:hover:bg-blue-600/30!',
    medium:
      'text-gray-900! hover:bg-gray-300/40! dark:text-gray-100! dark:hover:bg-gray-500/40!',
    tall: 'text-gray-700! hover:bg-orange-300! dark:text-gray-200! dark:hover:bg-orange-500/30!',
  },
  dropdownIconColorMap: {
    small: 'text-blue-400 dark:text-blue-200/50',
    medium: 'text-gray-900 dark:text-white',
    tall: 'text-orange-500 dark:text-orange-500',
  },
  detailedBaseClass: `${mutedIconButtonClass} flex min-h-11 w-full items-center justify-start gap-2 px-3 py-2 text-xs font-semibold`,
  detailedActiveStyleMap: {
    small:
      'border-blue-400! bg-blue-200/50! text-gray-900! dark:border-blue-200/50! dark:bg-blue-600/20! dark:text-blue-100!',
    medium:
      'border-gray-500! bg-gray-300/70! text-gray-900! dark:border-gray-500! dark:bg-gray-500/30! dark:text-gray-100!',
    tall: 'border-orange-500! bg-orange-200! text-gray-900! dark:border-orange-500! dark:bg-orange-500/20! dark:text-orange-100!',
  },
  detailedInactiveClass: 'text-gray-700! dark:text-gray-200!',
  detailedIconColorMap: {
    small: 'text-blue-400 dark:text-blue-200/50',
    medium: 'text-gray-900 dark:text-white',
    tall: 'text-orange-500 dark:text-orange-500',
  },
} as const;

export const partnerButtonTokens = {
  baseClass: `${mutedIconButtonClass} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  activeStateClass:
    'border-green-400! bg-green-200! text-gray-900! dark:border-green-500! dark:bg-green-500/20! dark:text-green-100!',
  // Neutral style matching unselected gender icon
  inactiveStateClass:
    'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
  iconClass: 'text-green-400 dark:text-green-500',
  dropdownResetClass:
    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-gray-600 transition hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-800',
  dropdownOptionBaseClass:
    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-green-300 dark:hover:bg-green-500/60',
  dropdownActiveClass:
    'border-green-400 bg-green-200 text-gray-900 dark:border-green-500 dark:bg-green-500/20 dark:text-green-100',
  dropdownInactiveClass: 'text-gray-900 dark:text-green-100',
} as const;

export const avoidPartnerButtonTokens = {
  baseClass: `${mutedIconButtonClass} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  activeStateClass:
    'border-rose-400! bg-rose-200! text-gray-900! dark:border-rose-500! dark:bg-rose-500/20! dark:text-rose-100!',
  // Neutral style matching unselected gender icon
  inactiveStateClass:
    'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
  iconClass: 'text-rose-500 dark:text-rose-500',
  dropdownResetClass:
    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-gray-600 transition hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-800',
  dropdownOptionBaseClass:
    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-rose-300 dark:hover:bg-rose-500/30',
  dropdownActiveClass:
    'border border-rose-400 bg-rose-200 text-rose-800 dark:border-rose-500 dark:bg-rose-500/20 dark:text-rose-100',
  dropdownInactiveClass: 'text-gray-900 dark:text-rose-100',
} as const;

export const iconWithLabelTokens = {
  baseClass:
    'flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium leading-tight transition-all',
  defaultVariant: {
    active:
      'border-blue-400 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30',
    inactive:
      'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700',
  },
  dangerVariant: {
    active:
      'border-rose-400 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:border-rose-500 dark:bg-rose-500/20 dark:text-rose-200 dark:hover:bg-rose-500/30',
    inactive:
      'border-gray-200 bg-white text-gray-500 hover:border-rose-300 hover:bg-rose-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-rose-600 dark:hover:bg-rose-900/20',
  },
} as const;

export const languageSkillButtonTokens = {
  compactBaseClass: `${mutedIconButtonClass} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  compactStyleMap: {
    native:
      'border-emerald-500! bg-emerald-200! text-gray-900! dark:border-emerald-500! dark:bg-emerald-500/20! dark:text-emerald-100!',
    fluent:
      'border-blue-500! bg-blue-200! text-gray-900! dark:border-blue-500! dark:bg-blue-500/20! dark:text-blue-100!',
    intermediate:
      'border-yellow-500! bg-yellow-200! text-gray-900! dark:border-yellow-500! dark:bg-yellow-500/20! dark:text-yellow-100!',
    beginner:
      'border-orange-500! bg-orange-200! text-gray-900! dark:border-orange-500! dark:bg-orange-500/20! dark:text-orange-100!',
    daz: 'border-rose-500! bg-rose-200! text-gray-900! dark:border-rose-500! dark:bg-rose-500/20! dark:text-rose-100!',
  },
  compactNeutralClass:
    'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
  compactIconColorMap: {
    native: 'text-emerald-600 dark:text-emerald-300',
    fluent: 'text-blue-600 dark:text-blue-300',
    intermediate: 'text-yellow-600 dark:text-yellow-300',
    beginner: 'text-orange-600 dark:text-orange-300',
    daz: 'text-rose-600 dark:text-rose-300',
  },
  dropdownOptionBaseClass:
    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition',
  dropdownActiveStyleMap: {
    native:
      'border-emerald-500! bg-emerald-200/50! text-gray-900! hover:bg-emerald-200! dark:border-emerald-500! dark:bg-emerald-500/20! dark:text-emerald-100! dark:hover:bg-emerald-500/30!',
    fluent:
      'border-blue-500! bg-blue-200/50! text-gray-900! hover:bg-blue-200! dark:border-blue-500! dark:bg-blue-500/20! dark:text-blue-100! dark:hover:bg-blue-500/30!',
    intermediate:
      'border-yellow-500! bg-yellow-200/50! text-gray-900! hover:bg-yellow-200! dark:border-yellow-500! dark:bg-yellow-500/20! dark:text-yellow-100! dark:hover:bg-yellow-500/30!',
    beginner:
      'border-orange-500! bg-orange-200/50! text-gray-900! hover:bg-orange-200! dark:border-orange-500! dark:bg-orange-500/20! dark:text-orange-100! dark:hover:bg-orange-500/30!',
    daz: 'border-rose-500! bg-rose-200/50! text-gray-900! hover:bg-rose-200! dark:border-rose-500! dark:bg-rose-500/20! dark:text-rose-100! dark:hover:bg-rose-500/30!',
  },
  dropdownInactiveStyleMap: {
    native:
      'text-gray-700! hover:bg-emerald-200! dark:text-gray-200! dark:hover:bg-emerald-500/30!',
    fluent:
      'text-gray-700! hover:bg-blue-200! dark:text-gray-200! dark:hover:bg-blue-500/30!',
    intermediate:
      'text-gray-700! hover:bg-yellow-200! dark:text-gray-200! dark:hover:bg-yellow-500/30!',
    beginner:
      'text-gray-700! hover:bg-orange-200! dark:text-gray-200! dark:hover:bg-orange-500/30!',
    daz: 'text-gray-700! hover:bg-rose-200! dark:text-gray-200! dark:hover:bg-rose-500/30!',
  },
  dropdownIconColorMap: {
    native: 'text-emerald-600 dark:text-emerald-300',
    fluent: 'text-blue-600 dark:text-blue-300',
    intermediate: 'text-yellow-600 dark:text-yellow-300',
    beginner: 'text-orange-600 dark:text-orange-300',
    daz: 'text-rose-600 dark:text-rose-300',
  },
} as const;

export const socialRoleButtonTokens = {
  compactBaseClass: `${mutedIconButtonClass} min-h-11 min-w-11 gap-2 px-3 text-xs font-semibold`,
  compactStyleMap: {
    mediator:
      'border-teal-500! bg-teal-200! text-gray-900! dark:border-teal-500! dark:bg-teal-500/20! dark:text-teal-100!',
    leader:
      'border-amber-500! bg-amber-200! text-gray-900! dark:border-amber-500! dark:bg-amber-500/20! dark:text-amber-100!',
    loner:
      'border-slate-500! bg-slate-200! text-gray-900! dark:border-slate-400! dark:bg-slate-500/20! dark:text-slate-100!',
    socialHub:
      'border-pink-500! bg-pink-200! text-gray-900! dark:border-pink-500! dark:bg-pink-500/20! dark:text-pink-100!',
  },
  compactNeutralClass:
    'border-gray-200! bg-white! text-gray-600! hover:bg-gray-100! dark:border-gray-600! dark:bg-gray-900! dark:text-gray-200! dark:hover:bg-gray-800/70!',
  compactIconColorMap: {
    mediator: 'text-teal-600 dark:text-teal-300',
    leader: 'text-amber-600 dark:text-amber-300',
    loner: 'text-slate-600 dark:text-slate-300',
    socialHub: 'text-pink-600 dark:text-pink-300',
  },
  dropdownOptionBaseClass:
    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition',
  dropdownActiveStyleMap: {
    mediator:
      'border-teal-500! bg-teal-200/50! text-gray-900! hover:bg-teal-200! dark:border-teal-500! dark:bg-teal-500/20! dark:text-teal-100! dark:hover:bg-teal-500/30!',
    leader:
      'border-amber-500! bg-amber-200/50! text-gray-900! hover:bg-amber-200! dark:border-amber-500! dark:bg-amber-500/20! dark:text-amber-100! dark:hover:bg-amber-500/30!',
    loner:
      'border-slate-500! bg-slate-200/50! text-gray-900! hover:bg-slate-200! dark:border-slate-400! dark:bg-slate-500/20! dark:text-slate-100! dark:hover:bg-slate-500/30!',
    socialHub:
      'border-pink-500! bg-pink-200/50! text-gray-900! hover:bg-pink-200! dark:border-pink-500! dark:bg-pink-500/20! dark:text-pink-100! dark:hover:bg-pink-500/30!',
  },
  dropdownInactiveStyleMap: {
    mediator:
      'text-gray-700! hover:bg-teal-200! dark:text-gray-200! dark:hover:bg-teal-500/30!',
    leader:
      'text-gray-700! hover:bg-amber-200! dark:text-gray-200! dark:hover:bg-amber-500/30!',
    loner:
      'text-gray-700! hover:bg-slate-200! dark:text-gray-200! dark:hover:bg-slate-500/30!',
    socialHub:
      'text-gray-700! hover:bg-pink-200! dark:text-gray-200! dark:hover:bg-pink-500/30!',
  },
  dropdownIconColorMap: {
    mediator: 'text-teal-600 dark:text-teal-300',
    leader: 'text-amber-600 dark:text-amber-300',
    loner: 'text-slate-600 dark:text-slate-300',
    socialHub: 'text-pink-600 dark:text-pink-300',
  },
} as const;
