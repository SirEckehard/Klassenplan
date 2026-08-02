// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cardSurfaceClass } from '@/utils';

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
 * scrolling.
 *
 * The select-all checkbox lives here, directly above the row checkboxes it
 * controls. It is the one interactive element in this row, so the aria-hidden
 * that silences the redundant column labels sits on those labels rather than
 * on the row. Below `lg` the labels are dropped (the rows render as labelled
 * chips there, so column headings would describe nothing) but the row itself
 * stays, carrying just the checkbox.
 */
type Props = {
  /**
   * Multi-select state for the visible students. Omitting `onToggleAllVisible`
   * hides the checkbox and its column, matching the rows.
   */
  allVisibleSelected?: boolean;
  /** True while only part of the visible students are selected. */
  someVisibleSelected?: boolean;
  onToggleAllVisible?: () => void;
};

export default function StudentListHeader({
  allVisibleSelected = false,
  someVisibleSelected = false,
  onToggleAllVisible,
}: Props) {
  const { t } = useTranslation('students');
  const showSelection = Boolean(onToggleAllVisible);
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  if (!showSelection) {
    return <ColumnLabels />;
  }

  return (
    <div
      className={`${cardSurfaceClass} sticky top-0 z-10 flex items-center gap-2 bg-white! px-3 py-1.5 dark:bg-gray-950!`}
    >
      <input
        ref={selectAllRef}
        type="checkbox"
        checked={allVisibleSelected}
        onChange={onToggleAllVisible}
        className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        aria-label={t('listToolbar.selectAll', 'Alle auswählen')}
      />
      {/* Below `lg` the checkbox is the whole row: the chip-style rows there
          have no columns for these labels to sit above. */}
      <span className="text-xs text-gray-600 lg:hidden dark:text-gray-300">
        {t('listToolbar.selectAll', 'Alle auswählen')}
      </span>
      <ColumnLabels inline />
    </div>
  );
}

/**
 * The column captions themselves — aria-hidden throughout, since every control
 * they sit above carries its own accessible name.
 */
function ColumnLabels({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation('students');

  const labels = (
    <>
      {/* Left labels mirror the row's leading cells: index number (min-w-6),
          photo avatar (w-10) and the name editor, whose pill adds px-3. */}
      <span className="min-w-6 shrink-0" aria-hidden="true" />
      <span
        title={t('listHeader.photoFull')}
        className="w-10 shrink-0 text-center text-[10px] font-medium leading-tight tracking-tight text-gray-500 dark:text-gray-400"
      >
        {t('listHeader.photo')}
      </span>
      <span
        title={t('listHeader.nameFull')}
        className="shrink-0 pl-3 text-[10px] font-medium leading-tight tracking-tight text-gray-500 dark:text-gray-400"
      >
        {t('listHeader.name')}
      </span>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {COLUMNS.map((column) => (
          <span
            key={column.key}
            title={t(column.full)}
            className="w-11 shrink-0 truncate text-center text-[10px] font-medium leading-tight tracking-tight text-gray-500 dark:text-gray-400"
          >
            {t(column.label)}
          </span>
        ))}
        {/* Label for the delete (trash) column. Same fixed width as the other
              column labels and as the row's delete button (min-w-11), so every
              preceding label stays aligned over its icon. */}
        <span
          title={t('studentList.removeStudent')}
          className="w-11 shrink-0 truncate text-center text-[10px] font-medium leading-tight tracking-tight text-gray-500 dark:text-gray-400"
        >
          {t('studentList.delete')}
        </span>
      </div>
    </>
  );

  // Inline: the labels join the selection row that already provides the sticky
  // surface. Standalone: they bring their own.
  if (inline) {
    return (
      <div
        className="hidden flex-1 items-center gap-2 lg:flex"
        aria-hidden="true"
      >
        {labels}
      </div>
    );
  }

  return (
    <div
      className={`${cardSurfaceClass} sticky top-0 z-10 hidden bg-white! px-3 py-1.5 lg:block dark:bg-gray-950!`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">{labels}</div>
    </div>
  );
}
