// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  FileArrowDownIcon,
  FileArrowUpIcon,
  GraphIcon,
  ListBulletsIcon,
  PrinterIcon,
  SquaresFourIcon,
  TableIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';
import {
  MAX_STUDENTS,
  MAX_STUDENT_NAME_LENGTH,
  inputFieldClass,
  menuItemClass,
  menuSurfaceClass,
  primaryButtonClass,
} from '@/utils';
import { downloadCsvTemplate } from '@/utils/csv/csvTemplateDownload';
import { openCsvFormatHelp } from '@/utils/ui/csvFormatHelp';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/** Which of the three ways into the class data is on screen. */
export type ClassViewMode = 'list' | 'focus' | 'relations';

type Props = {
  density: ToolRailDensity;
  /** Without a class there is nothing to insert into and nothing to look at. */
  hasActiveClass: boolean;
  studentCount: number;
  view: ClassViewMode;
  onViewChange: (view: ClassViewMode) => void;
  newStudentName: string;
  onNewStudentNameChange: (value: string) => void;
  onAddStudent: () => void;
  isAddStudentDisabled: boolean;
  placeholderCount: string;
  onPlaceholderCountChange: (value: string) => void;
  /**
   * Creates the placeholders; true once there are some, which closes the
   * panel — the first of them opens in the inspector to be named.
   */
  onCreatePlaceholders: () => boolean;
  onImportCsv: (file: File) => Promise<unknown>;
  onExportCsv: () => void;
  /** Opens the export page on the note list: the class with room to write. */
  onPrintList: () => void;
  onLoadDemoClass?: () => void;
  isDemoClassLoading?: boolean;
  hasDemoClass?: boolean;
};

/** A panel that asks for a value: a name, a number of placeholders. */
const panelClass = `${menuSurfaceClass} flex flex-col gap-3 p-3`;
const panelLabelClass = 'text-xs font-medium text-(--text-muted)';
/** A panel that offers a choice of actions: a dropdown menu, icon and word. */
const menuClass = `${menuSurfaceClass} p-1`;
const menuIconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

/**
 * The class layer's toolbar: how to look at the students, who joins the class
 * — added one by one or as placeholders — and, under "Verwalten", the class
 * list as a file and the class on paper with room to write (the export page's
 * note list).
 * The backup and the class tools are in the foot every rail shares
 * (`ToolRail`).
 *
 * In the rail each control has a fixed place, so the row above the list keeps
 * to search, filter and sort however much the class layer learns; the ones
 * that need a value — a name, a number of placeholders — ask for it in a
 * small panel instead of taking up room permanently.
 */
export default function ClassToolPanel({
  density,
  hasActiveClass,
  studentCount,
  view,
  onViewChange,
  newStudentName,
  onNewStudentNameChange,
  onAddStudent,
  isAddStudentDisabled,
  placeholderCount,
  onPlaceholderCountChange,
  onCreatePlaceholders,
  onImportCsv,
  onExportCsv,
  onPrintList,
  onLoadDemoClass,
  isDemoClassLoading = false,
  hasDemoClass = false,
}: Props) {
  const { t } = useTranslation(['students', 'generator']);
  const hasStudents = studentCount > 0;
  // The file picker is opened from a menu row: a hidden input inside a label
  // could not be reached with the keyboard.
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <ToolRail density={density}>
      <ToolRailGroup
        title={t('generator:toolRail.view')}
        data-tour={TOUR_ANCHORS.classViews}
      >
        <ToolRailButton
          icon={<ListBulletsIcon size={18} />}
          label={t('students:focusMode.listMode')}
          active={view === 'list'}
          disabled={!hasStudents}
          onClick={() => onViewChange('list')}
        />
        <ToolRailButton
          icon={<SquaresFourIcon size={18} />}
          label={t('students:focusMode.title')}
          active={view === 'focus'}
          disabled={!hasStudents}
          onClick={() => onViewChange('focus')}
        />
        <ToolRailButton
          icon={<GraphIcon size={18} />}
          label={t('students:relations.title')}
          active={view === 'relations'}
          disabled={!hasStudents}
          onClick={() => onViewChange('relations')}
        />
      </ToolRailGroup>

      {/* Who joins the class, one at a time or as placeholders — as the
          room adds its tables and "Bibliothek" its classes. */}
      <ToolRailGroup title={t('generator:toolRail.add')}>
        <ToolRailButton
          icon={<UserPlusIcon size={18} />}
          label={t('students:studentList.addStudent')}
          disabled={!hasActiveClass}
          data-tour={TOUR_ANCHORS.addStudents}
          panel={() => (
            <div className={panelClass}>
              <label className="flex flex-col gap-1">
                <span className={panelLabelClass}>
                  {t('students:studentList.addMenu.singleLabel')}
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStudentName}
                    maxLength={MAX_STUDENT_NAME_LENGTH}
                    onChange={(event) =>
                      onNewStudentNameChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onAddStudent();
                      }
                    }}
                    placeholder={t(
                      'students:studentList.addMenu.namePlaceholder',
                    )}
                    className={`${inputFieldClass} flex-1`}
                  />
                  {/* Stays open after an add so a whole class can be typed in
                      one go; focus stays in the field for the next name. */}
                  <button
                    type="button"
                    onClick={onAddStudent}
                    disabled={isAddStudentDisabled}
                    className={`${primaryButtonClass} h-9 w-9 shrink-0 p-0!`}
                    title={t('students:studentList.addStudent')}
                    aria-label={t('students:studentList.addStudent')}
                  >
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </label>
            </div>
          )}
        />

        <ToolRailButton
          icon={<UsersThreeIcon size={18} />}
          label={t('students:studentList.createPlaceholders')}
          // A full class has no room for one more.
          disabled={!hasActiveClass || studentCount >= MAX_STUDENTS}
          panel={(close) => (
            <div className={panelClass}>
              <label className="flex flex-col gap-1">
                <span className={panelLabelClass}>
                  {t('students:studentList.createPlaceholders')}
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, MAX_STUDENTS - studentCount)}
                    value={placeholderCount}
                    onChange={(event) =>
                      onPlaceholderCountChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (onCreatePlaceholders()) close();
                      }
                    }}
                    placeholder={t(
                      'students:studentList.placeholderCountPlaceholder',
                    )}
                    className={`${inputFieldClass} w-20`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (onCreatePlaceholders()) close();
                    }}
                    className={`${primaryButtonClass} h-9 w-9 shrink-0 p-0!`}
                    title={t('students:studentList.createPlaceholders')}
                    aria-label={t('students:studentList.createPlaceholders')}
                  >
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
                <span className="text-xs text-(--text-muted)">
                  {t('students:studentList.addMenu.placeholderHint')}
                </span>
              </label>
            </div>
          )}
        />
      </ToolRailGroup>

      {/* The class list as a file, in and out side by side, and on paper. */}
      <ToolRailGroup title={t('generator:toolRail.manage')}>
        <ToolRailButton
          icon={<FileArrowUpIcon size={18} />}
          label={t('students:csv.import')}
          disabled={!hasActiveClass}
          panel={(close) => (
            <div className={menuClass}>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className={menuItemClass}
              >
                <FileArrowUpIcon className={menuIconClass} aria-hidden="true" />
                {t('students:csv.import')}
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                tabIndex={-1}
                aria-hidden="true"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  close();
                  await onImportCsv(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  close();
                  downloadCsvTemplate();
                }}
                className={menuItemClass}
              >
                <FileArrowDownIcon
                  className={menuIconClass}
                  aria-hidden="true"
                />
                {t('students:csv.templateLink')}
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  openCsvFormatHelp();
                }}
                className={menuItemClass}
              >
                <TableIcon className={menuIconClass} aria-hidden="true" />
                {t('students:csv.formatHelp')}
              </button>
              {/* Last on purpose: every other option fills this class, the
                  sample class is created as a class of its own. */}
              {onLoadDemoClass && (
                <>
                  <div
                    className="my-1 h-px bg-(--border-card)"
                    role="separator"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onLoadDemoClass();
                    }}
                    disabled={isDemoClassLoading}
                    aria-busy={isDemoClassLoading || undefined}
                    className={`${menuItemClass} disabled:cursor-wait disabled:opacity-70`}
                  >
                    <UsersThreeIcon
                      className={menuIconClass}
                      aria-hidden="true"
                    />
                    {isDemoClassLoading
                      ? t('generator:demoClass.loading')
                      : hasDemoClass
                        ? t('generator:demoClass.switchButton')
                        : t('generator:demoClass.button')}
                  </button>
                  <p className="px-3 pt-0.5 pb-2 text-xs text-(--text-muted)">
                    {hasDemoClass
                      ? t('generator:demoClass.addMenuSwitchHint')
                      : t('generator:demoClass.addMenuHint')}
                  </p>
                </>
              )}
            </div>
          )}
        />

        <ToolRailButton
          icon={<FileArrowDownIcon size={18} />}
          label={t('students:csv.export')}
          disabled={!hasStudents}
          onClick={onExportCsv}
        />
        <ToolRailButton
          icon={<PrinterIcon size={18} />}
          label={t('students:studentList.printList')}
          title={t('students:studentList.printListTitle')}
          disabled={!hasStudents}
          onClick={onPrintList}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}
