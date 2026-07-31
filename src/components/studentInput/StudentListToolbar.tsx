// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  SortAscendingIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  inputFieldClass,
  quietIconButtonClass,
  selectFieldClass,
} from '@/utils';
import {
  STUDENT_FILTER_MODES,
  type StudentFilterMode,
  type StudentSortMode,
} from '@/components/studentInput/hooks/useStudentListView';

interface StudentListToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  sortMode: StudentSortMode;
  onSortModeChange: (mode: StudentSortMode) => void;
  filterMode: StudentFilterMode;
  onFilterModeChange: (mode: StudentFilterMode) => void;
  /** Number of students currently shown, and the class total. */
  visibleCount: number;
  totalCount: number;
  isNarrowed: boolean;
  onClear: () => void;
  /** Select-all checkbox state for the visible students. */
  allVisibleSelected: boolean;
  onToggleAllVisible: () => void;
}

/**
 * Search, filter, sort and select-all above the class list.
 *
 * Only rendered once the class is large enough for any of it to matter — for
 * five students a search field is noise.
 */
export default function StudentListToolbar({
  query,
  onQueryChange,
  sortMode,
  onSortModeChange,
  filterMode,
  onFilterModeChange,
  visibleCount,
  totalCount,
  isNarrowed,
  onClear,
  allVisibleSelected,
  onToggleAllVisible,
}: StudentListToolbarProps) {
  const { t } = useTranslation('students');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2">
        <span className="sr-only">
          {t('listToolbar.searchLabel', 'Schüler suchen')}
        </span>
        <span className="relative">
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
            className={`${inputFieldClass} w-48 pl-9`}
          />
        </span>
      </label>

      <label className="flex items-center gap-2">
        <span className="sr-only">
          {t('listToolbar.filterLabel', 'Nach Merkmal filtern')}
        </span>
        <select
          value={filterMode}
          onChange={(event) =>
            onFilterModeChange(event.target.value as StudentFilterMode)
          }
          className={`${selectFieldClass} w-auto`}
          title={t('listToolbar.filterLabel', 'Nach Merkmal filtern')}
        >
          {STUDENT_FILTER_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`listToolbar.filters.${mode}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="sr-only">
          {t('listToolbar.sortLabel', 'Sortierung')}
        </span>
        <span className="relative">
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
            className={`${selectFieldClass} w-auto pl-9`}
            title={t('listToolbar.sortLabel', 'Sortierung')}
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

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={onToggleAllVisible}
          className="h-4 w-4 cursor-pointer accent-blue-600"
        />
        {t('listToolbar.selectAll', 'Alle auswählen')}
      </label>

      {isNarrowed && (
        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          {t('listToolbar.countNarrowed', {
            visible: visibleCount,
            total: totalCount,
            defaultValue: '{{visible}} von {{total}}',
          })}
          <button
            type="button"
            onClick={onClear}
            className={`${quietIconButtonClass} h-7 w-7`}
            aria-label={t('listToolbar.clear', 'Suche und Filter zurücksetzen')}
            title={t('listToolbar.clear', 'Suche und Filter zurücksetzen')}
          >
            <XIcon size={14} aria-hidden />
          </button>
        </span>
      )}
    </div>
  );
}
