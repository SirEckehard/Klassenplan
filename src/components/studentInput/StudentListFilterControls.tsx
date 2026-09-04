// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, SortAscendingIcon } from '@phosphor-icons/react';
import { inputFieldClass } from '@/utils';
import { workbenchPillClass } from '@/components/students/classWorkbenchTokens';
import WorkbenchSelect from '@/components/students/WorkbenchSelect';
import {
  STUDENT_FILTER_MODES,
  type StudentFilterMode,
  type StudentSortMode,
} from '@/components/studentInput/hooks/useStudentListView';

const SORT_MODES: StudentSortMode[] = ['manual', 'name-asc', 'name-desc'];

const SORT_LABEL_KEYS: Record<StudentSortMode, string> = {
  manual: 'listToolbar.sort.manual',
  'name-asc': 'listToolbar.sort.nameAsc',
  'name-desc': 'listToolbar.sort.nameDesc',
};

interface StudentListFilterControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  filterMode: StudentFilterMode;
  onFilterModeChange: (mode: StudentFilterMode) => void;
  sortMode: StudentSortMode;
  onSortModeChange: (mode: StudentSortMode) => void;
  /**
   * `inline` renders the three controls side by side in the workbench row,
   * shaped like the pills they share it with (labels stay screen-reader only);
   * `stacked` fills a popover column as ordinary form fields and spells the
   * labels out, where there is room for them.
   */
  layout?: 'inline' | 'stacked';
}

/**
 * Search, filter and sort for the class list.
 *
 * Shared by the browse toolbar and the popover the selection mode collapses
 * them into, so both offer the exact same controls instead of drifting apart.
 *
 * The two choices are the row's own dropdown inline and a native `<select>` in
 * the popover — see `WorkbenchSelect` for why the popover keeps the native one.
 */
export default function StudentListFilterControls({
  query,
  onQueryChange,
  filterMode,
  onFilterModeChange,
  sortMode,
  onSortModeChange,
  layout = 'inline',
}: StudentListFilterControlsProps) {
  const { t } = useTranslation('students');
  const stacked = layout === 'stacked';

  const labelClass = stacked
    ? 'flex flex-col gap-1'
    : 'flex items-center gap-2';
  const captionClass = stacked
    ? 'text-xs font-medium text-gray-600 dark:text-gray-300'
    : 'sr-only';

  const searchLabel = t('listToolbar.searchLabel', 'Schüler suchen');
  const filterLabel = t('listToolbar.filterLabel', 'Nach Merkmal filtern');
  const sortLabel = t('listToolbar.sortLabel', 'Sortierung');

  const filterOptions = STUDENT_FILTER_MODES.map((mode) => ({
    value: mode,
    label: t(`listToolbar.filters.${mode}`),
  }));
  const sortOptions = SORT_MODES.map((mode) => ({
    value: mode,
    label: t(SORT_LABEL_KEYS[mode]),
  }));

  const searchField = (
    <label className={labelClass}>
      <span className={captionClass}>{searchLabel}</span>
      <span className={stacked ? 'relative block' : 'relative'}>
        {/* The pill's `px-4` sits the icon a touch further in than the stacked
            field's `px-3` does. */}
        <MagnifyingGlassIcon
          size={16}
          aria-hidden
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${
            stacked ? 'left-3' : 'left-3.5'
          }`}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('listToolbar.searchPlaceholder', 'Name suchen…')}
          className={
            stacked
              ? `${inputFieldClass} w-full pl-9`
              : `${workbenchPillClass} w-48 pl-10`
          }
        />
      </span>
    </label>
  );

  if (!stacked) {
    return (
      <>
        {searchField}
        <WorkbenchSelect
          label={filterLabel}
          value={filterMode}
          options={filterOptions}
          onChange={(value) => onFilterModeChange(value as StudentFilterMode)}
          widthClass="w-36"
        />
        <WorkbenchSelect
          label={sortLabel}
          value={sortMode}
          options={sortOptions}
          onChange={(value) => onSortModeChange(value as StudentSortMode)}
          widthClass="w-44"
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {searchField}

      <label className={labelClass}>
        <span className={captionClass}>{filterLabel}</span>
        <select
          value={filterMode}
          onChange={(event) =>
            onFilterModeChange(event.target.value as StudentFilterMode)
          }
          className={`${inputFieldClass} w-full`}
          title={filterLabel}
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span className={captionClass}>{sortLabel}</span>
        <span className="relative block">
          <SortAscendingIcon
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            value={sortMode}
            onChange={(event) =>
              onSortModeChange(event.target.value as StudentSortMode)
            }
            className={`${inputFieldClass} w-full pl-9`}
            title={sortLabel}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>
    </div>
  );
}
