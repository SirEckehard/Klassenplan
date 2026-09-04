// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDownIcon,
  FileArrowDownIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
  AddressBookTabsIcon,
} from '@phosphor-icons/react';
import type { ClassSummary, ActiveClassState } from '@/types';
import { cardSurfaceClass, menuSurfaceClass } from '@/utils';
import AddStudentsMenu from './AddStudentsMenu';
import { workbenchPillClass } from './classWorkbenchTokens';
import FloatingDropdown from './FloatingDropdown';
import StudentHistoryToolbar from '@/components/studentInput/StudentHistoryToolbar';
import { useClickOutside } from '@/hooks/ui/useClickOutside';

type Props = {
  classSummaries: ClassSummary[];
  activeClass: ActiveClassState;
  isBusy?: boolean;
  onSelectClass: (classId: string) => void;
  onCreateClass: () => void;
  onEditClass: (classId?: string) => void;
  onDeleteClass: (classId: string) => void;
  children?: React.ReactNode;
  /**
   * True while students are ticked in the list below. The bulk controls then
   * take the whole row (see the component doc).
   */
  selectionActive?: boolean;
  // Student management controls
  studentCount: number;
  placeholderCount?: string;
  onPlaceholderCountChange?: (value: string) => void;
  onCreatePlaceholders?: () => void;
  newStudentName?: string;
  onNewStudentNameChange?: (value: string) => void;
  onAddStudent?: () => void;
  isAddStudentDisabled?: boolean;
  onImportCsv?: (file: File) => Promise<unknown>;
  onExportCsv?: () => void;
};

/**
 * ClassSelectionBar
 *
 * Top row of the class workbench: which class is open, and how to add students
 * to it.
 *
 * The active class is the switcher button rather than a heading above it — a
 * heading that only repeats what the button already says costs a whole line of
 * the space the student list needs. Everything a class itself can undergo
 * (create, rename, delete) lives in that switcher's dropdown, next to the class
 * it acts on, so no separate overflow menu is needed.
 *
 * `children` carries the list tools — search, filter and sort — inline in the
 * same row, so the card stays one line tall no matter how many controls apply.
 *
 * Selecting students switches that row's mode instead of adding a second line:
 * the bulk controls take the whole width and the class switcher, the add menu
 * and the file actions step aside for as long as the selection lasts. Nothing
 * below the card moves while the teacher ticks boxes, and the bulk bar gets the
 * room its chips need.
 */
export default function ClassSelectionBar({
  classSummaries,
  activeClass,
  isBusy = false,
  onSelectClass,
  onCreateClass,
  onEditClass,
  onDeleteClass,
  children,
  selectionActive = false,
  studentCount,
  placeholderCount = '10',
  onPlaceholderCountChange,
  onCreatePlaceholders,
  newStudentName = '',
  onNewStudentNameChange,
  onAddStudent,
  isAddStudentDisabled = false,
  onImportCsv,
  onExportCsv,
}: Props) {
  const { t } = useTranslation('students');
  const hasActiveClass = Boolean(activeClass.id);
  const dropdownAnchorRef = React.useRef<HTMLButtonElement | null>(null);
  const dropdownContainerRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownContentRef = React.useRef<HTMLDivElement | null>(null);
  const [showDropdown, setShowDropdown] = React.useState(false);

  // Normalize summaries to include active class if not in list
  const normalizedSummaries = React.useMemo(() => {
    if (!hasActiveClass) {
      return classSummaries;
    }
    const exists = classSummaries.some((entry) => entry.id === activeClass.id);
    if (exists) {
      return classSummaries;
    }
    if (!activeClass.id) {
      return classSummaries;
    }
    return [
      {
        id: activeClass.id,
        name: activeClass.name || t('classManagement.activeClass'),
        label: activeClass.label,
        notes: activeClass.notes,
        createdAt: '',
        updatedAt: '',
        lastUsedAt: activeClass.lastUsedAt,
        studentCount: 0,
      },
      ...classSummaries,
    ];
  }, [activeClass, classSummaries, hasActiveClass, t]);

  useClickOutside(
    [dropdownContainerRef, dropdownContentRef],
    () => setShowDropdown(false),
    showDropdown,
  );

  const handleEditClass = useCallback(
    (classId?: string) => {
      if (!classId && !hasActiveClass) {
        return;
      }
      setShowDropdown(false);
      onEditClass(classId ?? activeClass.id ?? undefined);
    },
    [hasActiveClass, activeClass.id, onEditClass],
  );

  const handleSelectClass = useCallback(
    (classId: string) => {
      setShowDropdown(false);
      if (!hasActiveClass || classId === activeClass.id) {
        return;
      }
      onSelectClass(classId);
    },
    [hasActiveClass, activeClass.id, onSelectClass],
  );

  const handleDeleteClass = useCallback(
    (classId: string) => {
      setShowDropdown(false);
      onDeleteClass(classId);
    },
    [onDeleteClass],
  );

  const dropdownOptions = normalizedSummaries.length
    ? normalizedSummaries
    : [
        {
          id: 'empty',
          name: t('classManagement.noClasses'),
          label: '',
          notes: '',
          createdAt: '',
          updatedAt: '',
          lastUsedAt: '',
          studentCount: 0,
        },
      ];

  const activeSummary =
    normalizedSummaries.find((entry) => entry.id === activeClass.id) ?? null;
  const dropdownLabel = activeSummary?.name ?? t('classManagement.selectClass');
  const switcherLabel = hasActiveClass
    ? `${t('classManagement.switchClass', 'Klasse wechseln')} — ${t('classManagement.activeClass')}: ${dropdownLabel}`
    : t('classManagement.noClassSelected');

  // Render dropdown menu
  const renderDropdownMenu = () => {
    if (!showDropdown) {
      return null;
    }
    return (
      <FloatingDropdown
        anchorRef={dropdownAnchorRef}
        align="left"
        portalRef={dropdownContentRef}
      >
        <div className={`${menuSurfaceClass} max-h-72 overflow-y-auto p-1`}>
          {/* Creating a class is offered above the existing ones, so the
              switcher answers both "which class?" and "a new one" — there is no
              second menu left that could hold it. */}
          <button
            type="button"
            className={dropdownCreateOptionClass}
            onClick={() => {
              setShowDropdown(false);
              onCreateClass();
            }}
            disabled={isBusy}
          >
            <PlusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('classManagement.newClass')}
          </button>
          <div
            className="my-1 h-px bg-gray-200 dark:bg-gray-700"
            role="separator"
          />

          <div role="listbox">
            {dropdownOptions.map((entry) => {
              const isOptionDisabled =
                !hasActiveClass ||
                normalizedSummaries.length === 0 ||
                entry.id === 'empty' ||
                isBusy;
              const isSelected = entry.id === activeClass.id;
              return (
                <div key={entry.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`${isSelected ? dropdownActiveOptionClass : dropdownOptionClass} group min-w-0 flex-1`}
                    onClick={() => handleSelectClass(entry.id)}
                    disabled={isOptionDisabled}
                    role="option"
                    aria-selected={isSelected}
                    title={entry.name}
                  >
                    {/* The name is clipped at the button edge so it can never
                        run under the edit/delete buttons; hovering or focusing
                        the row scrolls the full name into view. */}
                    <span className="@container block min-w-0 flex-1 truncate">
                      <span className="inline-block whitespace-nowrap group-hover:animate-marquee-label group-focus-visible:animate-marquee-label">
                        {entry.name}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={dropdownOptionActionButtonClass}
                    onClick={() => handleEditClass(entry.id)}
                    disabled={isOptionDisabled}
                    title={t('classManagement.editClass')}
                    aria-label={`${t('classManagement.editClass')} ${entry.name}`}
                  >
                    <PencilLineIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={dropdownOptionDeleteButtonClass}
                    onClick={() => handleDeleteClass(entry.id)}
                    disabled={isOptionDisabled}
                    title={t('classManagement.deleteClass')}
                    aria-label={`${t('classManagement.deleteClass')} ${entry.name}`}
                  >
                    <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </FloatingDropdown>
    );
  };

  return (
    <section
      aria-label={t('classManagement.title')}
      className={`${cardSurfaceClass} flex flex-col gap-3 rounded-2xl border border-blue-200/60 p-4 shadow-sm dark:border-blue-900/40 sm:p-5`}
    >
      {/* The switcher button below carries the same information visually. */}
      <h2 className="sr-only">{t('classManagement.title')}</h2>

      <div className="flex min-h-11 flex-wrap items-center gap-2">
        {selectionActive ? (
          /* The bulk controls take the line; the class switcher, the add menu
             and the file actions come back once the selection is cleared. */
          children
        ) : (
          <>
            {/* Class switcher — doubles as the heading of this card */}
            <div className="relative" ref={dropdownContainerRef}>
              <button
                type="button"
                ref={dropdownAnchorRef}
                className={classSwitcherClass}
                onClick={() => {
                  if (!hasActiveClass || isBusy) {
                    return;
                  }
                  setShowDropdown((prev) => !prev);
                }}
                disabled={!hasActiveClass || isBusy}
                aria-haspopup="listbox"
                aria-expanded={showDropdown}
                title={switcherLabel}
                aria-label={switcherLabel}
              >
                <AddressBookTabsIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="max-w-40 truncate font-semibold">
                  {dropdownLabel}
                </span>
                {hasActiveClass && studentCount > 0 && (
                  <span className="whitespace-nowrap text-xs font-normal text-blue-900/60 dark:text-blue-100/60">
                    ·{' '}
                    {t('classManagement.studentCount', {
                      count: studentCount,
                      defaultValue: '{{count}} Schüler',
                    })}
                  </span>
                )}
                <CaretDownIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
              {renderDropdownMenu()}
            </div>

            {/* Single names, placeholders and CSV import share one trigger.
                The inline field it replaces cost the width this row now spends
                on search, filter and sort. */}
            {hasActiveClass && onAddStudent && onNewStudentNameChange && (
              <AddStudentsMenu
                studentCount={studentCount}
                newStudentName={newStudentName}
                onNewStudentNameChange={onNewStudentNameChange}
                onAddStudent={onAddStudent}
                isAddStudentDisabled={isAddStudentDisabled}
                placeholderCount={placeholderCount}
                onPlaceholderCountChange={onPlaceholderCountChange}
                onCreatePlaceholders={onCreatePlaceholders}
                onImportCsv={onImportCsv}
              />
            )}

            {/* Search, filter and sort. Only present once the class is big
                enough for them to help — see `STUDENT_LIST_TOOLS_THRESHOLD`. */}
            {children && (
              <>
                <div
                  className="hidden h-6 w-px bg-blue-200 lg:block dark:bg-blue-900/60"
                  aria-hidden="true"
                />
                {children}
              </>
            )}

            {/* Everything that is not a daily action sits on the right */}
            <div className="flex items-center gap-2 sm:ml-auto">
              {/* Undo/redo lead the group: they take back the very actions this
                  row triggers, so they belong next to them rather than above
                  the list they happen to change. */}
              {hasActiveClass && <StudentHistoryToolbar />}

              {hasActiveClass && onExportCsv && (
                <button
                  type="button"
                  onClick={onExportCsv}
                  className={exportButtonClass}
                  title={t('csv.export')}
                  aria-label={t('csv.export')}
                >
                  <FileArrowDownIcon size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// Style classes
const classSwitcherClass = `${workbenchPillClass} inline-flex max-w-full cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`;
const dropdownOptionClass =
  'flex w-full items-center overflow-hidden rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const dropdownActiveOptionClass =
  'flex w-full items-center overflow-hidden rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-200 cursor-pointer disabled:cursor-not-allowed';
const dropdownCreateOptionClass =
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 dark:text-blue-200 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const dropdownOptionDeleteButtonClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-red-600 transition hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/40 cursor-pointer disabled:cursor-not-allowed';
const dropdownOptionActionButtonClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const exportButtonClass =
  'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-green-200/70 bg-white text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-green-900/40 dark:bg-gray-900 dark:text-green-200 dark:hover:border-green-700 dark:hover:bg-gray-800';
