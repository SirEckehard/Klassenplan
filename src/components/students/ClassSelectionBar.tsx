// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  FileArrowDownIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
  TrashSimpleIcon,
  FileArrowUpIcon,
  AddressBookTabsIcon,
  CardsThreeIcon,
} from '@phosphor-icons/react';
import type { ClassSummary, ActiveClassState } from '@/types';
import {
  cardSurfaceClass,
  menuSurfaceClass,
  primaryButtonClass,
  successIconButtonClass,
} from '@/utils';
import FloatingDropdown from './FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import StoragePopover from '@/components/ui/navigation/StoragePopover';

type Props = {
  classSummaries: ClassSummary[];
  activeClass: ActiveClassState;
  isBusy?: boolean;
  onSelectClass: (classId: string) => void;
  onCreateClass: () => void;
  onEditClass: (classId?: string) => void;
  onClearStudents: () => void;
  onDeleteClass: () => void;
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
 * Shows class management actions as icons with labels below each icon.
 *
 * Features:
 * - Create new class
 * - Select from existing classes (dropdown)
 * - Clear all students
 * - Delete current class
 */
export default function ClassSelectionBar({
  classSummaries,
  activeClass,
  isBusy = false,
  onSelectClass,
  onCreateClass,
  onEditClass,
  onClearStudents,
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
  const headerStatus = hasActiveClass
    ? `${t('classManagement.activeClass')}: ${dropdownLabel}`
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
        matchAnchorWidth
      >
        <div
          className={`${menuSurfaceClass} max-h-56 overflow-y-auto p-1`}
          role="listbox"
        >
          {dropdownOptions.map((entry) => {
            const isOptionDisabled =
              !hasActiveClass ||
              normalizedSummaries.length === 0 ||
              entry.id === 'empty' ||
              isBusy;
            const isSelected = entry.id === activeClass.id;
            return (
              <div key={entry.id} className="flex items-center gap-2">
                <button
                  type="button"
                  className={`${isSelected ? dropdownActiveOptionClass : dropdownOptionClass} flex-1`}
                  onClick={() => handleSelectClass(entry.id)}
                  disabled={isOptionDisabled}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{entry.name}</span>
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
              </div>
            );
          })}
        </div>
      </FloatingDropdown>
    );
  };

  return (
    <div
      className={`${cardSurfaceClass} flex flex-col gap-4 rounded-2xl border border-blue-200/60 p-4 shadow-sm dark:border-blue-900/40 sm:p-5`}
    >
      {/* Header Row: Title and Action Buttons (stacks below lg) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        {/* Left: Title */}
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-900/80 dark:text-blue-100/80">
          <AddressBookTabsIcon className="h-4 w-4" aria-hidden="true" />
          <div className="flex flex-col leading-tight">
            <span>{t('classManagement.title')}</span>
            <span className="text-[11px] font-normal normal-case text-blue-900/70 dark:text-blue-100/60">
              {headerStatus}
            </span>
          </div>
        </div>

        {/* Right: Action Buttons (own full-width row below lg) */}
        <div className="flex w-full flex-wrap items-start justify-start gap-2 lg:w-auto lg:justify-end">
          {/* Create Class */}
          <div className={iconActionColumnClass}>
            <button
              type="button"
              onClick={onCreateClass}
              className={pillPrimaryButtonClass}
              disabled={isBusy}
              title={t('classManagement.newClass')}
              aria-label={t('classManagement.newClass')}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('classManagement.newClass')}
            </span>
          </div>

          {/* Class Selector */}
          <div className={iconActionColumnClass}>
            <div className="relative" ref={dropdownContainerRef}>
              <button
                type="button"
                ref={dropdownAnchorRef}
                className={pillPrimaryButtonClass}
                onClick={() => {
                  if (!hasActiveClass || isBusy) {
                    return;
                  }
                  setShowDropdown((prev) => !prev);
                }}
                disabled={!hasActiveClass || isBusy}
                aria-haspopup="listbox"
                aria-expanded={showDropdown}
                title={t('classManagement.selectClass')}
                aria-label={t('classManagement.selectClass')}
              >
                <CardsThreeIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              {renderDropdownMenu()}
            </div>
            <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('classManagement.classes')}
            </span>
          </div>

          {/* Clear Students */}
          <div className={iconActionColumnClass}>
            <button
              type="button"
              onClick={onClearStudents}
              className={pillRemoveButtonClass}
              disabled={!hasActiveClass || isBusy}
              title={t('classManagement.clearStudents')}
              aria-label={t('classManagement.clearStudents')}
            >
              <TrashSimpleIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('classManagement.clear')}
            </span>
          </div>

          {/* Delete Class */}
          <div className={iconActionColumnClass}>
            <button
              type="button"
              onClick={onDeleteClass}
              className={pillDeleteButtonClass}
              disabled={!hasActiveClass || isBusy}
              title={t('classManagement.deleteClass')}
              aria-label={t('classManagement.deleteClass')}
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('classManagement.delete')}
            </span>
          </div>

          {/* Separator */}
          {hasActiveClass &&
            (onCreatePlaceholders ||
              onAddStudent ||
              onImportCsv ||
              onExportCsv) && (
              <div className="hidden h-11 w-px self-start bg-blue-100/80 lg:block dark:bg-blue-900/50" />
            )}

          {/* Platzhalter Input (only when class is empty) */}
          {hasActiveClass &&
            studentCount === 0 &&
            onCreatePlaceholders &&
            onPlaceholderCountChange && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-11 items-center gap-2 rounded-full border border-blue-200/70 bg-white px-3 shadow-sm dark:border-blue-900/40 dark:bg-gray-900">
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
                    placeholder="Platzhalter"
                    className="h-full w-10 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={onCreatePlaceholders}
                    className={`${primaryButtonClass} h-9 w-9 p-0! rounded-full`}
                    title={t('studentList.createPlaceholders')}
                    aria-label={t('studentList.createPlaceholders')}
                  >
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('studentList.placeholders')}
                </span>
              </div>
            )}

          {/* Add Student Input */}
          {hasActiveClass && onAddStudent && onNewStudentNameChange && (
            <div className="flex w-full flex-col items-center gap-1 sm:w-auto">
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
                  className="h-full w-full bg-transparent text-sm text-gray-800 outline-none sm:w-40 placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={onAddStudent}
                  disabled={isAddStudentDisabled}
                  className={`${successIconButtonClass} h-9 w-9 p-0! rounded-full`}
                  title={t('studentList.addStudent')}
                  aria-label={t('studentList.addStudent')}
                >
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('studentList.newStudent')}
              </span>
            </div>
          )}

          {/* CSV Import */}
          {hasActiveClass && onImportCsv && (
            <div className={iconActionColumnClass}>
              <label
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-blue-200/70 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800"
                title={t('csv.import')}
              >
                <FileArrowUpIcon size={14} aria-hidden="true" />
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
              <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
                Import
              </span>
            </div>
          )}

          {/* CSV Export */}
          {hasActiveClass && onExportCsv && (
            <div className={iconActionColumnClass}>
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-green-200/70 bg-white text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-green-900/40 dark:bg-gray-900 dark:text-green-200 dark:hover:border-green-700 dark:hover:bg-gray-800"
                title={t('csv.export')}
                aria-label={t('csv.export')}
              >
                <FileArrowDownIcon size={14} aria-hidden="true" />
                <span className="sr-only">{t('csv.export')}</span>
              </button>
              <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
                Export
              </span>
            </div>
          )}

          {/* Separator before Storage & Help */}
          {hasActiveClass && (
            <div className="hidden h-11 w-px self-start bg-blue-100/80 lg:block dark:bg-blue-900/50" />
          )}

          {/* Storage & Backup Popover */}
          {hasActiveClass && <StoragePopover viewMode="detail" />}
        </div>
      </div>

      {/* Children (Student Toolbar) */}
      {children && (
        <div className="border-t border-blue-100 pt-4 dark:border-blue-900/40">
          {children}
        </div>
      )}
    </div>
  );
}

// Style classes
// Fixed-width column so all icon buttons share equal width and stay evenly
// spaced, independent of how wide the label below each icon is.
const iconActionColumnClass = 'flex w-18 flex-col items-center gap-1';
const dropdownOptionClass =
  'w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const dropdownActiveOptionClass =
  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-200 cursor-pointer disabled:cursor-not-allowed';
const dropdownOptionActionButtonClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const pillPrimaryButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200/70 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-200 dark:hover:border-blue-700 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const pillRemoveButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900/40 dark:bg-gray-900 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';
const pillDeleteButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-200/70 bg-white text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-500 dark:hover:border-red-700 dark:hover:bg-gray-800 dark:hover:text-red-400 cursor-pointer disabled:cursor-not-allowed';
