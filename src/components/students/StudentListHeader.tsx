// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { TrashIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { cardSurfaceClass, dangerIconButtonClass } from '@/utils';

/**
 * Ordered column descriptors for the compact student row.
 *
 * The order MUST mirror the icon order rendered by StudentRow (compact view):
 * GenderSelector → HeightSelector → LanguageSkillSelector →
 * SpecialNeedsToggles (STUDENT_FLAGS order: strong, weak, front, restless,
 * shy, distracted) → SocialRoleSelector → PartnerSelector →
 * AvoidPartnerSelector → StudentPreferenceToggles (window, door).
 *
 * `label` is a short, column-width-friendly heading; `full` is the spelled-out
 * meaning shown on hover (title).
 */
const COLUMNS: { key: string; label: string; full: string }[] = [
  { key: 'gender', label: 'listHeader.gender', full: 'listHeader.genderFull' },
  { key: 'height', label: 'listHeader.height', full: 'listHeader.heightFull' },
  {
    key: 'language',
    label: 'listHeader.language',
    full: 'listHeader.languageFull',
  },
  { key: 'strong', label: 'listHeader.strong', full: 'listHeader.strongFull' },
  { key: 'weak', label: 'listHeader.weak', full: 'listHeader.weakFull' },
  { key: 'front', label: 'listHeader.front', full: 'listHeader.frontFull' },
  {
    key: 'restless',
    label: 'listHeader.restless',
    full: 'listHeader.restlessFull',
  },
  { key: 'shy', label: 'listHeader.shy', full: 'listHeader.shyFull' },
  {
    key: 'distracted',
    label: 'listHeader.distracted',
    full: 'listHeader.distractedFull',
  },
  { key: 'role', label: 'listHeader.role', full: 'listHeader.roleFull' },
  { key: 'wish', label: 'listHeader.wish', full: 'listHeader.wishFull' },
  { key: 'avoid', label: 'listHeader.avoid', full: 'listHeader.avoidFull' },
  { key: 'window', label: 'listHeader.window', full: 'listHeader.windowFull' },
  { key: 'door', label: 'listHeader.door', full: 'listHeader.doorFull' },
];

/**
 * StudentListHeader
 *
 * Sticky column-header row for the compact student list. Each label sits
 * directly above its icon column because it mirrors the row's icon layout:
 * a right-justified, wrapping flex row of fixed-width (w-11 / 44px) cells with
 * gap-2, plus a trailing spacer matching the (narrower) delete button. Right
 * alignment + identical cell widths keep the labels tracking the icons even
 * when the row wraps to multiple lines on narrow screens.
 *
 * Rendered as the first, sticky child inside the scroll container so it shares
 * the rows' content width (no scrollbar offset) and stays visible while
 * scrolling. Marked aria-hidden: every control below already carries its own
 * accessible name.
 */
export default function StudentListHeader() {
  const { t } = useTranslation('students');

  return (
    <div
      className={`${cardSurfaceClass} sticky top-0 z-10 hidden bg-white! px-3 py-1.5 lg:block dark:bg-gray-950!`}
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        {COLUMNS.map((column) => (
          <span
            key={column.key}
            title={t(column.full)}
            className="w-11 shrink-0 truncate text-center text-[10px] font-medium leading-tight tracking-tight text-gray-500 dark:text-gray-400"
          >
            {t(column.label)}
          </span>
        ))}
        {/* Invisible clone of the delete (trash) icon button: occupies the exact
            same width as the real button in each row so the preceding labels stay
            aligned over their icons (not over delete), without a magic number. */}
        <span
          aria-hidden="true"
          className={`${dangerIconButtonClass} invisible shrink-0`}
        >
          <TrashIcon size={14} />
        </span>
      </div>
    </div>
  );
}
