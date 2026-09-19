// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  ArchiveIcon,
  FileArrowDownIcon,
  FileArrowUpIcon,
  GameControllerIcon,
  GraphIcon,
  ListBulletsIcon,
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
  inputFieldClass,
  menuSurfaceClass,
  primaryButtonClass,
  successIconButtonClass,
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
  onCreatePlaceholders: () => void;
  onImportCsv: (file: File) => Promise<unknown>;
  onExportCsv: () => void;
  onCreateBackup: () => void;
  onPlayNameGame: () => void;
  onLoadDemoClass?: () => void;
  isDemoClassLoading?: boolean;
  hasDemoClass?: boolean;
};

const panelClass = `${menuSurfaceClass} flex flex-col gap-3 p-3`;
const panelLabelClass = 'text-xs font-medium text-(--text-muted)';
const panelOptionClass =
  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-(--surface-sunken) focus-within:ring-2 focus-within:ring-(--focus-ring-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)';

/**
 * The class layer's toolbar: how students get in, how to look at them, and
 * what to do with the class as a whole.
 *
 * These controls used to share one row above the list with the class switcher
 * and the search field, which meant the row grew a control every time the
 * class layer learnt something new. In the rail each has a fixed place, and
 * the ones that need a value — a name, a number of placeholders — ask for it
 * in a small panel instead of taking up the row permanently.
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
  onCreateBackup,
  onPlayNameGame,
  onLoadDemoClass,
  isDemoClassLoading = false,
  hasDemoClass = false,
}: Props) {
  const { t } = useTranslation(['students', 'generator']);
  const hasStudents = studentCount > 0;

  return (
    <ToolRail density={density}>
      <ToolRailGroup title={t('students:toolRail.insert')}>
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
                    className={`${successIconButtonClass} h-9 w-9 shrink-0 p-0!`}
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
          icon={<FileArrowUpIcon size={18} />}
          label={t('students:csv.import')}
          disabled={!hasActiveClass}
          panel={(close) => (
            <div className={panelClass}>
              <label className={panelOptionClass}>
                <FileArrowUpIcon size={16} aria-hidden="true" />
                {t('students:csv.import')}
                <input
                  type="file"
                  accept=".csv"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    close();
                    await onImportCsv(file);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  close();
                  downloadCsvTemplate();
                }}
                className={panelOptionClass}
              >
                <FileArrowDownIcon size={16} aria-hidden="true" />
                {t('students:csv.templateLink')}
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  openCsvFormatHelp();
                }}
                className={panelOptionClass}
              >
                <TableIcon size={16} aria-hidden="true" />
                {t('students:csv.formatHelp')}
              </button>
              {/* Last on purpose: every other option fills this class, the
                  sample class is created as a class of its own. */}
              {onLoadDemoClass && (
                <>
                  <div className="h-px bg-(--border-card)" role="separator" />
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onLoadDemoClass();
                    }}
                    disabled={isDemoClassLoading}
                    aria-busy={isDemoClassLoading || undefined}
                    className={`${panelOptionClass} disabled:cursor-wait disabled:opacity-70`}
                  >
                    <UsersThreeIcon size={16} aria-hidden="true" />
                    {isDemoClassLoading
                      ? t('generator:demoClass.loading')
                      : hasDemoClass
                        ? t('generator:demoClass.switchButton')
                        : t('generator:demoClass.button')}
                  </button>
                  <span className="px-3 text-xs text-(--text-muted)">
                    {hasDemoClass
                      ? t('generator:demoClass.addMenuSwitchHint')
                      : t('generator:demoClass.addMenuHint')}
                  </span>
                </>
              )}
            </div>
          )}
        />

        <ToolRailButton
          icon={<UsersThreeIcon size={18} />}
          label={t('students:studentList.createPlaceholders')}
          disabled={!hasActiveClass}
          panel={() => (
            <div className={panelClass}>
              <label className="flex flex-col gap-1">
                <span className={panelLabelClass}>
                  {t('students:studentList.createPlaceholders')}
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={placeholderCount}
                    onChange={(event) =>
                      onPlaceholderCountChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onCreatePlaceholders();
                      }
                    }}
                    placeholder={t(
                      'students:studentList.placeholderCountPlaceholder',
                    )}
                    className={`${inputFieldClass} w-20`}
                  />
                  <button
                    type="button"
                    onClick={onCreatePlaceholders}
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

      <ToolRailGroup title={t('students:toolRail.view')}>
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

      <ToolRailGroup title={t('students:toolRail.manage')} atEnd>
        <ToolRailButton
          icon={<GameControllerIcon size={18} />}
          label={t('students:studentInput.nameGameButton')}
          title={t('students:studentInput.nameGameTitle')}
          disabled={!hasStudents}
          onClick={onPlayNameGame}
        />
        <ToolRailButton
          icon={<FileArrowDownIcon size={18} />}
          label={t('students:csv.export')}
          disabled={!hasStudents}
          onClick={onExportCsv}
        />
        <ToolRailButton
          icon={<ArchiveIcon size={18} />}
          label={t('generator:storage.exportBackup')}
          onClick={onCreateBackup}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}
