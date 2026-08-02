// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, SortAscendingIcon } from '@phosphor-icons/react';
import { inputFieldClass, selectFieldClass } from '@/utils';
import {
  STUDENT_FILTER_MODES,
  type StudentFilterMode,
  type StudentSortMode,
} from '@/components/studentInput/hooks/useStudentListView';

interface StudentListFilterControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  filterMode: StudentFilterMode;
  onFilterModeChange: (mode: StudentFilterMode) => void;
  sortMode: StudentSortMode;
  onSortModeChange: (mode: StudentSortMode) => void;
  /**
   * `inline` renders the three controls side by side in the parent's flex row
   * (labels stay screen-reader only); `stacked` fills a popover column and
   * spells the labels out, where there is room for them.
   */
  layout?: 'inline' | 'stacked';
}

/**
 * Search, filter and sort for the class list.
 *
 * Shared by the browse toolbar and the popover the selection mode collapses
 * them into, so both offer the exact same controls instead of drifting apart.
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
  const fieldWidthClass = stacked ? 'w-full' : 'w-auto';

  const searchLabel = t('listToolbar.searchLabel', 'Schüler suchen');
  const filterLabel = t('listToolbar.filterLabel', 'Nach Merkmal filtern');
  const sortLabel = t('listToolbar.sortLabel', 'Sortierung');

  const controls = (
    <>
      <label className={labelClass}>
        <span className={captionClass}>{searchLabel}</span>
        <span className={stacked ? 'relative block' : 'relative'}>
          <MagnifyingGlassIcon
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('listToolbar.searchPlaceholder', 'Name suchen…')}
            className={`${inputFieldClass} ${stacked ? 'w-full' : 'w-48'} pl-9`}
          />
        </span>
      </label>

      <label className={labelClass}>
        <span className={captionClass}>{filterLabel}</span>
        <select
          value={filterMode}
          onChange={(event) =>
            onFilterModeChange(event.target.value as StudentFilterMode)
          }
          className={`${selectFieldClass} ${fieldWidthClass}`}
          title={filterLabel}
        >
          {STUDENT_FILTER_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`listToolbar.filters.${mode}`)}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span className={captionClass}>{sortLabel}</span>
        <span className={stacked ? 'relative block' : 'relative'}>
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
            className={`${selectFieldClass} ${fieldWidthClass} pl-9`}
            title={sortLabel}
          >
            <option value="manual">
              {t('listToolbar.sort.manual', 'Eigene Reihenfolge')}
            </option>
            <option value="name-asc">
              {t('listToolbar.sort.nameAsc', 'Name A–Z')}
            </option>
            <option value="name-desc">
              {t('listToolbar.sort.nameDesc', 'Name Z–A')}
            </option>
          </select>
        </span>
      </label>
    </>
  );

  // Inline stays a fragment so the toolbar's own flex row wraps each control
  // individually instead of moving all three at once.
  return stacked ? (
    <div className="flex flex-col gap-3">{controls}</div>
  ) : (
    controls
  );
}
