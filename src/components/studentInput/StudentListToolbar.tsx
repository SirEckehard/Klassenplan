// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { XIcon } from '@phosphor-icons/react';
import { quietIconButtonClass } from '@/utils';
import StudentListFilterControls from '@/components/studentInput/StudentListFilterControls';
import type {
  StudentFilterMode,
  StudentSortMode,
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
}

/**
 * Browse row of the class workbench: search, filter and sort.
 *
 * Select-all is not here but in the list's sticky header, directly above the
 * row checkboxes it controls.
 *
 * Only rendered once the class is large enough for any of it to matter — for
 * five students a search field is noise. While students are selected the
 * workbench swaps this row for the bulk controls, which reach the same three
 * controls through a popover (see `StudentListToolsRow`).
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
}: StudentListToolbarProps) {
  const { t } = useTranslation('students');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StudentListFilterControls
        query={query}
        onQueryChange={onQueryChange}
        filterMode={filterMode}
        onFilterModeChange={onFilterModeChange}
        sortMode={sortMode}
        onSortModeChange={onSortModeChange}
      />

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
