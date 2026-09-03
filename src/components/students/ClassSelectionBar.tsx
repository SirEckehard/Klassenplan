// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  CaretDownIcon,
  FileArrowDownIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
  FileArrowUpIcon,
  AddressBookTabsIcon,
} from '@phosphor-icons/react';
import type { ClassSummary, ActiveClassState } from '@/types';
import {
  cardSurfaceClass,
  menuSurfaceClass,
  primaryButtonClass,
  successIconButtonClass,
} from '@/utils';
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
 * `children` carries the list tools row, so search, filter and bulk editing
 * share this card instead of stacking their own below it.
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

      <div className="flex flex-wrap items-center gap-2">
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

        {/* Platzhalter Input (only when class is empty) */}
        {hasActiveClass &&
          studentCount === 0 &&
          onCreatePlaceholders &&
          onPlaceholderCountChange && (
            <div className="flex h-11 items-center gap-2 rounded-full border border-blue-200/70 bg-white px-3 shadow-sm dark:border-blue-900/40 dark:bg-gray-900">
              {/* Labelled inline: a bare number box next to the add-student
                  field says nothing about what the number counts. There is room
                  for the word — this pill only shows for an empty class. */}
              <span className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                {t('studentList.placeholders')}
              </span>
              <input
                type="number"
                min={1}
                max={40}
                value={placeholderCount}
                onChange={(e) => onPlaceholderCountChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCreatePlaceholders();
                  }
                }}
                placeholder={t('studentList.placeholderCountPlaceholder')}
                aria-label={t('studentList.placeholders')}
                className="h-full w-10 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={onCreatePlaceholders}
                className={`${primaryButtonClass} h-9 w-9 rounded-full p-0!`}
                title={t('studentList.createPlaceholders')}
                aria-label={t('studentList.createPlaceholders')}
              >
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

        {/* Add Student Input */}
        {hasActiveClass && onAddStudent && onNewStudentNameChange && (
          <div className="flex h-11 w-full items-center gap-2 rounded-full border border-blue-200/70 bg-white px-3 shadow-sm sm:w-auto dark:border-blue-900/40 dark:bg-gray-900">
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => onNewStudentNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAddStudent();
                }
              }}
              placeholder={t('studentList.addStudent')}
              aria-label={t('studentList.addStudent')}
              className="h-full w-full bg-transparent text-sm text-gray-800 outline-none sm:w-40 placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={onAddStudent}
              disabled={isAddStudentDisabled}
              className={`${successIconButtonClass} h-9 w-9 rounded-full p-0!`}
              title={t('studentList.addStudent')}
              aria-label={t('studentList.addStudent')}
            >
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Everything that is not a daily action sits on the right */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Undo/redo lead the group: they take back the very actions this
              row triggers, so they belong next to them rather than above the
              list they happen to change. */}
          {hasActiveClass && <StudentHistoryToolbar />}

          {hasActiveClass && onImportCsv && (
            <label className={importButtonClass} title={t('csv.import')}>
              <FileArrowUpIcon size={16} aria-hidden="true" />
              <span className="sr-only">{t('csv.import')}</span>
              <input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && onImportCsv) {
                    await onImportCsv(file);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          )}

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
      </div>

      {/* Children (Student Toolbar) */}
      {children && (
        <div className="border-t border-blue-100 pt-3 dark:border-blue-900/40">
          {children}
        </div>
      )}
    </section>
  );
}

// Style classes
const classSwitcherClass =
  'inline-flex h-11 max-w-full items-center gap-2 rounded-full border border-blue-200/70 bg-white px-4 text-sm text-blue-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';
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
const importButtonClass =
  'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-blue-200/70 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800';
const exportButtonClass =
  'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-green-200/70 bg-white text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-green-900/40 dark:bg-gray-900 dark:text-green-200 dark:hover:border-green-700 dark:hover:bg-gray-800';
