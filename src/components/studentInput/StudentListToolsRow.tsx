// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { menuSurfaceClass, quietIconButtonClass } from '@/utils';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import StudentListToolbar from '@/components/studentInput/StudentListToolbar';
import StudentBulkEditBar from '@/components/studentInput/StudentBulkEditBar';
import StudentListFilterControls from '@/components/studentInput/StudentListFilterControls';
import type { StudentListView } from '@/components/studentInput/hooks/useStudentListView';
import type { StudentSelection } from '@/components/studentInput/hooks/useStudentSelection';

interface StudentListToolsRowProps {
  listView: StudentListView;
  selection: StudentSelection;
  selectedStudents: Student[];
  totalCount: number;
  onBulkApply: (patch: Partial<Student>) => void;
  onDeleteSelected: () => void;
}

/**
 * Second row of the class workbench.
 *
 * Selecting students switches the row's mode instead of adding a fourth bar
 * below it: the browse controls collapse into a popover and the bulk controls
 * take the line. That keeps the chrome above the list at a constant height, so
 * the list never jumps while the teacher ticks boxes.
 */
export default function StudentListToolsRow({
  listView,
  selection,
  selectedStudents,
  totalCount,
  onBulkApply,
  onDeleteSelected,
}: StudentListToolsRowProps) {
  const { t } = useTranslation('students');
  const selectionActive = selection.selectedCount > 0;

  // Both modes share the same minimum height (the flag chips' 44px), so
  // entering and leaving the selection cannot shift the list below.
  const rowClass = `flex min-h-11 flex-wrap items-center gap-2 rounded-xl px-3 py-2 ${
    selectionActive ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'bg-transparent'
  }`;

  if (!selectionActive) {
    return (
      <div className={rowClass}>
        <StudentListToolbar
          query={listView.query}
          onQueryChange={listView.setQuery}
          sortMode={listView.sortMode}
          onSortModeChange={listView.setSortMode}
          filterMode={listView.filterMode}
          onFilterModeChange={listView.setFilterMode}
          visibleCount={listView.visibleStudents.length}
          totalCount={totalCount}
          isNarrowed={listView.isNarrowed}
          onClear={listView.clear}
        />
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={t('bulkEdit.regionLabel', 'Mehrfachbearbeitung')}
      className={rowClass}
    >
      <StudentBulkEditBar
        selectedStudents={selectedStudents}
        onApply={onBulkApply}
        onDeleteSelected={onDeleteSelected}
        onClearSelection={selection.clear}
        filterSlot={
          <FilterPopoverButton listView={listView} totalCount={totalCount} />
        }
      />
    </div>
  );
}

/**
 * Search, filter and sort behind a single button while the bulk controls own
 * the row. The badge counts the constraints that currently hide students, so a
 * filtered list can never be mistaken for the whole class.
 */
function FilterPopoverButton({
  listView,
  totalCount,
}: {
  listView: StudentListView;
  totalCount: number;
}) {
  const { t } = useTranslation('students');
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);

  // Sort is left out on purpose: it reorders, it does not hide, and
  // `listView.clear` does not reset it either.
  const activeCount =
    (listView.query.trim() ? 1 : 0) + (listView.filterMode !== 'all' ? 1 : 0);

  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  // The popover carries `role="dialog"`, which parks the global Escape
  // shortcut in StudentInput (it would otherwise drop the whole selection).
  // Closing on Escape is therefore this component's job.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      setOpen(false);
      anchorRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const label = t('listToolbar.filterPopover', 'Suche und Filter');
  const accessibleName =
    activeCount > 0
      ? `${label} — ${t('listToolbar.activeFilters', {
          count: activeCount,
          defaultValue: '{{count}} Einschränkungen aktiv',
        })}`
      : label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        className={`${quietIconButtonClass} relative h-9 w-9`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={accessibleName}
        title={accessibleName}
      >
        <MagnifyingGlassIcon size={16} aria-hidden />
        {activeCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-none text-white"
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          <div
            role="dialog"
            aria-label={label}
            className={`${menuSurfaceClass} flex w-72 flex-col gap-3 p-3`}
          >
            <StudentListFilterControls
              layout="stacked"
              query={listView.query}
              onQueryChange={listView.setQuery}
              filterMode={listView.filterMode}
              onFilterModeChange={listView.setFilterMode}
              sortMode={listView.sortMode}
              onSortModeChange={listView.setSortMode}
            />
            {listView.isNarrowed && (
              <span className="flex items-center justify-between gap-1 text-sm text-gray-500 dark:text-gray-400">
                {t('listToolbar.countNarrowed', {
                  visible: listView.visibleStudents.length,
                  total: totalCount,
                  defaultValue: '{{visible}} von {{total}}',
                })}
                <button
                  type="button"
                  onClick={listView.clear}
                  className={`${quietIconButtonClass} h-7 w-7`}
                  aria-label={t(
                    'listToolbar.clear',
                    'Suche und Filter zurücksetzen',
                  )}
                  title={t(
                    'listToolbar.clear',
                    'Suche und Filter zurücksetzen',
                  )}
                >
                  <XIcon size={14} aria-hidden />
                </button>
              </span>
            )}
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}
