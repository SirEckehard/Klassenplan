// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { workbenchPillClass } from '@/components/students/classWorkbenchTokens';
import WorkbenchSelect from '@/components/students/WorkbenchSelect';
import StudentListViewMenu from '@/components/studentInput/StudentListViewMenu';
import {
  STUDENT_FILTER_MODES,
  STUDENT_SORT_LABEL_KEYS,
  STUDENT_SORT_MODES,
  type StudentFilterMode,
  type StudentSortMode,
} from '@/components/studentInput/hooks/useStudentListView';

interface StudentListFilterControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Enter in the search field: opens the student the search found. */
  onQuerySubmit?: () => void;
  filterMode: StudentFilterMode;
  onFilterModeChange: (mode: StudentFilterMode) => void;
  sortMode: StudentSortMode;
  onSortModeChange: (mode: StudentSortMode) => void;
  /**
   * `inline` renders the three controls side by side in the workbench row,
   * shaped like the pills they share it with (labels stay screen-reader only);
   * `phone` gives the search the line and puts the filter and the sort behind
   * one button (`StudentListViewMenu`), where three fields took three lines.
   */
  layout?: 'inline' | 'phone';
}

/**
 * Search, filter and sort for the class list.
 *
 * The two choices are the row's own dropdown, not a native `<select>` — see
 * `WorkbenchSelect` — and on a phone the rows of one menu.
 */
export default function StudentListFilterControls({
  query,
  onQueryChange,
  onQuerySubmit,
  filterMode,
  onFilterModeChange,
  sortMode,
  onSortModeChange,
  layout = 'inline',
}: StudentListFilterControlsProps) {
  const { t } = useTranslation('students');
  const phone = layout === 'phone';

  const searchField = (
    <label
      className={
        phone ? 'flex min-w-0 flex-1 items-center' : 'flex items-center gap-2'
      }
    >
      <span className="sr-only">{t('listToolbar.searchLabel')}</span>
      <span className={phone ? 'relative block w-full' : 'relative'}>
        <MagnifyingGlassIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-(--text-muted)"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !onQuerySubmit) return;
            event.preventDefault();
            onQuerySubmit();
          }}
          placeholder={t('listToolbar.searchPlaceholder')}
          className={`${workbenchPillClass} pl-10 ${phone ? 'w-full pointer-coarse:h-11' : 'w-48'}`}
        />
      </span>
    </label>
  );

  if (phone) {
    return (
      <div className="flex w-full items-center gap-2">
        {searchField}
        <StudentListViewMenu
          filterMode={filterMode}
          onFilterModeChange={onFilterModeChange}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
        />
      </div>
    );
  }

  return (
    <>
      {searchField}
      <WorkbenchSelect
        label={t('listToolbar.filterLabel')}
        value={filterMode}
        options={STUDENT_FILTER_MODES.map((mode) => ({
          value: mode,
          label: t(`listToolbar.filters.${mode}`),
        }))}
        onChange={(value) => onFilterModeChange(value as StudentFilterMode)}
        widthClass="w-36"
      />
      <WorkbenchSelect
        label={t('listToolbar.sortLabel')}
        value={sortMode}
        options={STUDENT_SORT_MODES.map((mode) => ({
          value: mode,
          label: t(STUDENT_SORT_LABEL_KEYS[mode]),
        }))}
        onChange={(value) => onSortModeChange(value as StudentSortMode)}
        widthClass="w-44"
      />
    </>
  );
}
