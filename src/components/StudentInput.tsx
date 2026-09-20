// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIcon, TableIcon } from '@phosphor-icons/react';

import { useStudentManagement } from '@/hooks/student/useStudentManagement';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { downloadCsvTemplate } from '@/utils/csv/csvTemplateDownload';
import { openCsvFormatHelp } from '@/utils/ui/csvFormatHelp';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { showToast } from '@/utils/ui/toast';
import {
  cardSurfaceClass,
  isFormElementFocused,
  logError,
  secondaryButtonClass,
  MAX_STUDENTS,
  NAME_GAME_MIN_PHOTOS,
  STUDENT_LIST_TOOLS_THRESHOLD,
} from '@/utils';
import type { CsvImportSelection } from '@/utils/data/csvUtils';
import type { Student } from '@/types';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanActions } from '@/contexts/seatingPlan/store';
import type { StudentInputProps } from '@/components/studentInput/types';
import ClassEmptyState from '@/components/studentInput/ClassEmptyState';
import ClassToolPanel, {
  type ClassViewMode,
} from '@/components/studentInput/ClassToolPanel';
import RelationsView from '@/components/studentInput/RelationsView';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import StudentList from '@/components/studentInput/StudentList';
import NameColumnSelectionDialog from '@/components/students/NameColumnSelectionDialog';
import { useStudentListLayout } from '@/components/studentInput/hooks/useStudentListLayout';
import { useStudentListView } from '@/components/studentInput/hooks/useStudentListView';
import { useStudentSelection } from '@/components/studentInput/hooks/useStudentSelection';
import StudentListToolsRow from '@/components/studentInput/StudentListToolsRow';
import AttributeFocusMode from '@/components/studentInput/AttributeFocusMode';
import ListScrollFab from '@/components/studentInput/ListScrollFab';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import { useCsvImportWithDialog } from '@/hooks/csv/useCsvImportWithDialog';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import { useDemoClass } from '@/hooks/onboarding/useDemoClass';

/**
 * Whether Escape is free for the selection shortcut.
 *
 * The selection checkboxes are inputs, so the usual "not while typing" guard
 * would kill the shortcut in the one spot focus actually sits after picking
 * students. Only text entry and native selects keep Escape to themselves —
 * there it already means "revert this field" or "close this dropdown".
 */
const escapeIsUnclaimed = (): boolean => {
  const active = document.activeElement;
  const onCheckbox =
    active instanceof HTMLInputElement &&
    (active.type === 'checkbox' || active.type === 'radio');

  return onCheckbox || !isFormElementFocused();
};

function StudentInput({
  students,
  addStudent,
  addBulkPlaceholderStudents,
  removeStudents,
  updateStudent,
  updateStudents,
  importCsv,
  downloadStudentsCsv,
}: StudentInputProps) {
  const { t } = useTranslation('students');
  const navigate = useLocalizedNavigate();
  const [placeholderCount, setPlaceholderCount] = useState('10');

  // Below `lg` the list flows in the page scroll (no inner scroll container);
  // at `lg+` the adaptive-viewport hook caps the inner scroll height.
  const isLgUp = useIsLgUp();
  const {
    listContainerRef,
    listMaxHeight,
    listTopRef,
    listEndRef,
    scrollHint,
    handleScrollHint,
    floatingActionOffsets,
  } = useStudentListLayout({
    isMobile: !isLgUp,
    studentCount: students.length,
    recalcKey: 0, // No longer need dynamic recalc
  });

  // Track which student card was just expanded (e.g. after bulk creation)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Student management hook
  const {
    newStudentName,
    setNewStudentName,
    lastAddedId,
    handleAddStudent,
    isAddDisabled,
  } = useStudentManagement({
    students,
    addStudent,
    onCardExpand: (id) => setExpandedCardId(id),
  });
  const { activeClass } = useClassManagementContext();
  const { triggerImport, handleExportAll } = useSeatingPlanActions();
  const handleCreateBackup = useCallback(() => {
    handleExportAll().catch((error: unknown) => {
      logError('Backup export failed', { error }, 'StudentInput');
    });
  }, [handleExportAll]);
  const { loadDemoClass, isLoadingDemoClass, hasDemoClass, isDemoClassActive } =
    useDemoClass();
  const handleLoadDemoClass = useCallback(() => {
    loadDemoClass().catch((error: unknown) => {
      logError('Failed to load the sample class', { error }, 'StudentInput');
    });
  }, [loadDemoClass]);
  const hasActiveClass = Boolean(activeClass.id);
  const formatClassName = (name?: string | null) =>
    name && name.trim().length > 0
      ? `„${name.trim()}"`
      : t('studentInput.yourClass', 'deine Klasse');

  // CSV import handler
  const handleCsvImport = useCallback(
    async (file: File, selection?: CsvImportSelection) => {
      const importedStudents = await importCsv(file, selection);
      return importedStudents;
    },
    [importCsv],
  );

  // Ambiguous files get asked about instead of guessed at: several usable name
  // columns, or an export holding more than one class.
  const {
    importState,
    analyzeCsvFile,
    handleDialogConfirm,
    handleDialogCancel,
  } = useCsvImportWithDialog(handleCsvImport);

  // Quick class setup handler
  const handleQuickClassSetup = useCallback(
    (count: number) => {
      const placeholders = addBulkPlaceholderStudents(count);
      if (placeholders.length > 0) {
        showToast(
          'success',
          t('studentInput.placeholdersCreated', {
            count,
            defaultValue:
              '{{count}} Schüler-Platzhalter erstellt. Fülle jetzt die Namen und Details aus.',
          }),
        );
        // Auto-expand first student after bulk creation
        setExpandedCardId(placeholders[0].id);
      }
    },
    [addBulkPlaceholderStudents, setExpandedCardId, t],
  );

  // Classroom setup removed - now handled in Step 2

  const handleListScrollCollapse = useCallback(() => {
    // No longer needed - collapse functionality removed
  }, []);

  const handlePlaceholderClass = useCallback(() => {
    const parsed = parseInt(placeholderCount, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_STUDENTS) {
      showToast(
        'error',
        t('quickClass.invalidCount', {
          max: MAX_STUDENTS,
          defaultValue: `Bitte gib eine Zahl zwischen 1 und ${MAX_STUDENTS} ein.`,
        }),
      );
      return;
    }
    handleQuickClassSetup(parsed);
    setPlaceholderCount('10');
  }, [handleQuickClassSetup, placeholderCount, t]);

  // Search / filter / sort and multi-select only appear once a class is big
  // enough for them to help; below that they would just be chrome.
  // Two ways into the same data: the roster answers "who is in this class",
  // the focus mode answers "who is restless" for everyone at once.
  const [listMode, setListMode] = useState<ClassViewMode>('list');
  const listView = useStudentListView(students);
  const selection = useStudentSelection(students, listView.visibleStudents);
  const showListTools = students.length >= STUDENT_LIST_TOOLS_THRESHOLD;
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // The bulk bar needs the students themselves, not just the count: its flag
  // chips show whether a flag holds for all, none or only some of them.
  const selectedStudents = useMemo(
    () => students.filter((student) => selection.selectedIds.has(student.id)),
    [students, selection.selectedIds],
  );

  // Escape drops the selection, the way it dismisses any other transient state.
  // An open dialog or menu owns the key though (Modal closes on Escape as well,
  // and so do the bulk bar's attribute menus), so the shortcut stands down
  // instead of quietly clearing the selection behind it — cancelling an overlay
  // must leave the selection intact.
  //
  // This has to listen during the capture phase: a dialog's own Escape handler
  // is a bubble listener, and React commits its close between two listeners of
  // the same event, so a bubble listener here would find the dialog already
  // gone whenever it happened to be registered second.
  useKeyboardShortcuts(
    { escape: selection.clear },
    {
      capture: true,
      preventDefault: false,
      ignoreWhileTyping: false,
      condition: () =>
        selection.selectedCount > 0 &&
        escapeIsUnclaimed() &&
        !isAnyDialogOpen(),
    },
  );

  // Both bulk paths go through the batch actions rather than a loop over the
  // single-student ones: one store write, one persist job, one undo step.
  const handleBulkApply = useCallback(
    (patch: Partial<Student>) => {
      const ids = [...selection.selectedIds];
      updateStudents(ids, patch);
      showToast(
        'success',
        t('bulkEdit.applied', {
          count: ids.length,
          defaultValue: '{{count}} Schüler aktualisiert.',
        }),
      );
    },
    [selection.selectedIds, updateStudents, t],
  );

  const handleBulkDelete = useCallback(() => {
    const ids = [...selection.selectedIds];
    removeStudents(ids);
    selection.clear();
    setBulkDeleteOpen(false);
    showToast(
      'success',
      t('bulkEdit.deleted', {
        count: ids.length,
        defaultValue: '{{count}} Schüler entfernt.',
      }),
    );
  }, [selection, removeStudents, setBulkDeleteOpen, t]);

  const photoCount = students.filter((student) => student.hasPhoto).length;
  const canPlayNameGame = photoCount >= NAME_GAME_MIN_PHOTOS;

  // The button stays clickable while inactive so it can explain the reason.
  const handleNameGameClick = useCallback(() => {
    if (!canPlayNameGame) {
      showToast(
        'info',
        t('studentInput.nameGameLockedToast', {
          min: NAME_GAME_MIN_PHOTOS,
          count: photoCount,
          defaultValue: `Für das Namensspiel brauchst du mindestens ${NAME_GAME_MIN_PHOTOS} Schüler mit Foto (aktuell: ${photoCount}). Fotos fügst du über das Porträt-Symbol neben jedem Schüler hinzu.`,
        }),
      );
      return;
    }
    navigate('/namensspiel');
  }, [canPlayNameGame, navigate, photoCount, t]);

  if (!hasActiveClass) {
    return (
      <ClassEmptyState
        onImportBackup={triggerImport}
        onLoadDemoClass={isDemoClassActive ? undefined : handleLoadDemoClass}
        isDemoClassLoading={isLoadingDemoClass}
        hasDemoClass={hasDemoClass}
      />
    );
  }

  return (
    // The direction comes from the same hook that decides whether the toolbar
    // is a rail or a phone sheet, exactly as in the room and plan layers.
    <div className={workspaceLayerClass}>
      <SmartSidebar tourAnchor={TOUR_ANCHORS.classToolbar}>
        {({ isExpanded }) => (
          <ClassToolPanel
            density={isExpanded ? 'comfortable' : 'compact'}
            hasActiveClass={hasActiveClass}
            studentCount={students.length}
            view={listMode}
            onViewChange={setListMode}
            newStudentName={newStudentName}
            onNewStudentNameChange={setNewStudentName}
            onAddStudent={handleAddStudent}
            isAddStudentDisabled={isAddDisabled}
            placeholderCount={placeholderCount}
            onPlaceholderCountChange={setPlaceholderCount}
            onCreatePlaceholders={handlePlaceholderClass}
            onImportCsv={analyzeCsvFile}
            onExportCsv={downloadStudentsCsv}
            onCreateBackup={handleCreateBackup}
            onPlayNameGame={handleNameGameClick}
            onLoadDemoClass={
              isDemoClassActive ? undefined : handleLoadDemoClass
            }
            isDemoClassLoading={isLoadingDemoClass}
            hasDemoClass={hasDemoClass}
          />
        )}
      </SmartSidebar>

      {/* The scroll anchor sits on the stage root: the list toolbar only
          appears from `STUDENT_LIST_TOOLS_THRESHOLD` students up, and the way
          back should land above the list either way. */}
      <div ref={listTopRef} className={`${workspaceStageClass} space-y-4`}>
        {showListTools && listMode === 'list' && (
          <StudentListToolsRow
            listView={listView}
            selection={selection}
            selectedStudents={selectedStudents}
            totalCount={students.length}
            onBulkApply={handleBulkApply}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
          />
        )}
        <>
          {students.length === 0 && (
            <div
              className={`${cardSurfaceClass} flex flex-col gap-4 border border-(--border-card) p-5 sm:flex-row sm:items-start sm:gap-6`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-(--border-card) bg-(--surface-sunken) text-(--text-badge)">
                <InfoIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-3 text-sm">
                <h3 className="text-lg font-semibold">
                  {t('studentInput.emptyClassTitle', {
                    className: formatClassName(activeClass.name),
                    defaultValue: `${formatClassName(activeClass.name)} ist noch leer.`,
                  })}
                </h3>
                <p className="leading-relaxed">
                  {t(
                    'studentInput.emptyClassHint',
                    'Lege Schüler an, indem du Platzhalter anlegst, sie einzeln hinzufügst oder eine bestehende CSV importierst. Alle Eingaben gelten nur für diese Klasse.',
                  )}
                </p>
                <p className="leading-relaxed">
                  {t('studentInput.emptyClassImportHint')}
                </p>
                <p className="leading-relaxed">
                  {t(
                    'studentInput.emptyClassCsvHintPrefix',
                    'Wenn du bei null anfängst, nimm diese ',
                  )}
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      downloadCsvTemplate();
                    }}
                    title={t(
                      'csv.downloadTemplate',
                      'CSV-Vorlage herunterladen',
                    )}
                    aria-label={t(
                      'csv.downloadTemplate',
                      'CSV-Vorlage herunterladen',
                    )}
                    className="font-semibold underline"
                  >
                    {t('csv.templateLink', 'CSV-Vorlage')}
                  </a>
                  {t(
                    'studentInput.emptyClassCsvHintSuffix',
                    ' und trage die Namen deiner Schüler ein. Klicke dann auf Import und lade die Datei hoch.',
                  )}
                </p>
                <p className="leading-relaxed">
                  {t('studentInput.emptyClassCsvNoDownload')}
                </p>
                <button
                  type="button"
                  onClick={openCsvFormatHelp}
                  className={`${secondaryButtonClass} gap-2`}
                >
                  <TableIcon size={18} aria-hidden="true" />
                  {t('csv.formatHelp')}
                </button>
                {/* The sample class never lands in this class: it is created
                    as a class of its own, which the prompt says. An emptied
                    sample class gets no offer to open itself. */}
                {!isDemoClassActive && (
                  <p className="leading-relaxed">
                    {hasDemoClass
                      ? t('generator:demoClass.emptyClassSwitchPrompt')
                      : t('generator:demoClass.emptyClassPrompt')}{' '}
                    <button
                      type="button"
                      onClick={handleLoadDemoClass}
                      disabled={isLoadingDemoClass}
                      className="cursor-pointer font-semibold text-(--text-badge) underline disabled:cursor-wait disabled:opacity-70"
                    >
                      {isLoadingDemoClass
                        ? t('generator:demoClass.loading')
                        : hasDemoClass
                          ? t('generator:demoClass.switchButton')
                          : t('generator:demoClass.button')}
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

          {listMode === 'focus' ? (
            <AttributeFocusMode
              students={students}
              updateStudent={updateStudent}
              onFinish={() => setListMode('list')}
            />
          ) : listMode === 'relations' ? (
            <RelationsView students={students} />
          ) : showListTools && listView.visibleStudents.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-(--text-muted)">
              {t(
                'listToolbar.noMatches',
                'Keine Schüler passen zu Suche und Filter.',
              )}
            </p>
          ) : (
            <StudentList
              students={listView.visibleStudents}
              allStudents={students}
              lastAddedId={lastAddedId}
              expandedCardId={expandedCardId}
              listContainerRef={listContainerRef}
              maxHeight={listMaxHeight}
              onScrollCollapse={handleListScrollCollapse}
              isSelected={showListTools ? selection.isSelected : undefined}
              onToggleSelected={showListTools ? selection.toggle : undefined}
              allVisibleSelected={selection.allVisibleSelected}
              someVisibleSelected={selection.selectedCount > 0}
              onToggleAllVisible={selection.toggleAllVisible}
            />
          )}
        </>

        {/* The mobile scroll affordance uses this to mean "the end of the
            list"; the Namensspiel button it used to hang on now sits in the
            toolbar with the rest of what a whole class can undergo. */}
        <div ref={listEndRef} aria-hidden="true" />
      </div>

      {students.length > 0 && (
        <ListScrollFab
          hint={scrollHint}
          onScroll={handleScrollHint}
          offsets={floatingActionOffsets}
        />
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={t('bulkEdit.deleteTitle', 'Ausgewählte Schüler entfernen')}
        message={t('bulkEdit.deleteMessage', {
          count: selection.selectedCount,
          defaultValue:
            'Möchtest du {{count}} ausgewählte Schüler wirklich entfernen? Du kannst das mit Strg/Cmd+Z rückgängig machen.',
        })}
        confirmLabel={t('bulkEdit.deleteSelected', 'Entfernen')}
        cancelLabel={t('common.cancel', 'Abbrechen')}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
      {importState.nameInfo && (
        <NameColumnSelectionDialog
          open={importState.showDialog}
          nameInfo={importState.nameInfo}
          previewData={importState.previewData}
          preset={importState.preset}
          classOptions={importState.classOptions}
          classKey={importState.classKey}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
    </div>
  );
}

// Memoize StudentInput to prevent unnecessary re-renders
export default React.memo(StudentInput);
export type { StudentInputProps } from '@/components/studentInput/types';
