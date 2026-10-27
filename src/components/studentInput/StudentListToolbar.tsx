// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import StudentListFilterControls from '@/components/studentInput/StudentListFilterControls';
import StudentListNarrowedCount from '@/components/studentInput/StudentListNarrowedCount';
import type {
  StudentFilterMode,
  StudentSortMode,
} from '@/components/studentInput/hooks/useStudentListView';

interface StudentListToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onQuerySubmit?: () => void;
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
 * five students a search field is noise. It stays while students are
 * ticked: the inspector edits them, on a phone in the sheet from the status
 * bar's switch, so the row above the list never changes its height. On a
 * phone it is one line, the search and a button for the filter and the sort.
 */
export default function StudentListToolbar({
  query,
  onQueryChange,
  onQuerySubmit,
  sortMode,
  onSortModeChange,
  filterMode,
  onFilterModeChange,
  visibleCount,
  totalCount,
  isNarrowed,
  onClear,
}: StudentListToolbarProps) {
  const isPhone = useIsPhone();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StudentListFilterControls
        layout={isPhone ? 'phone' : 'inline'}
        query={query}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        filterMode={filterMode}
        onFilterModeChange={onFilterModeChange}
        sortMode={sortMode}
        onSortModeChange={onSortModeChange}
      />

      {/* A phone's row is the search alone; the list's head says it there. */}
      {isNarrowed && !isPhone && (
        <StudentListNarrowedCount
          visibleCount={visibleCount}
          totalCount={totalCount}
          onClear={onClear}
        />
      )}
    </div>
  );
}
