// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  GameControllerIcon,
  InfoIcon,
} from '@phosphor-icons/react';

import { useStudentManagement } from '@/hooks/student/useStudentManagement';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { downloadCsvTemplate } from '@/utils/csv/csvTemplateDownload';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { showToast } from '@/utils/ui/toast';
import {
  cardSurfaceClass,
  isFormElementFocused,
  primaryButtonClass,
  warningButtonClass,
  MAX_STUDENTS,
  NAME_GAME_MIN_PHOTOS,
  STUDENT_LIST_TOOLS_THRESHOLD,
} from '@/utils';
import { validateStudentsComplete } from '@/utils/validation';
import type { NameColumnMode } from '@/utils/data/csvUtils';
import type { Student } from '@/types';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanActions } from '@/contexts/seatingPlan/store';
import type { StudentInputProps } from '@/components/studentInput/types';
import ClassActionsPanel from '@/components/studentInput/ClassActionsPanel';
import MissingNameNotice from '@/components/studentInput/MissingNameNotice';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import StudentList from '@/components/studentInput/StudentList';
import NameColumnSelectionDialog from '@/components/students/NameColumnSelectionDialog';
import { useStudentListLayout } from '@/components/studentInput/hooks/useStudentListLayout';
import { useStudentListView } from '@/components/studentInput/hooks/useStudentListView';
import { useStudentSelection } from '@/components/studentInput/hooks/useStudentSelection';
import StudentListToolsRow from '@/components/studentInput/StudentListToolsRow';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import { useCsvImportWithDialog } from '@/hooks/csv/useCsvImportWithDialog';

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
  removeStudent,
  updateStudent,
  importCsv,
  downloadStudentsCsv,
  onProceedToLayout,
}: StudentInputProps) {
  const { t } = useTranslation('students');
  const navigate = useLocalizedNavigate();
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [placeholderCount, setPlaceholderCount] = useState('10');

  // Below `lg` the list flows in the page scroll (no inner scroll container);
  // at `lg+` the adaptive-viewport hook caps the inner scroll height.
  const isLgUp = useIsLgUp();
  const { listContainerRef, listMaxHeight, proceedButtonRef } =
    useStudentListLayout({
      isMobile: !isLgUp,
      studentCount: students.length,
      recalcKey: 0, // No longer need dynamic recalc
    });

  // Track which student card was just expanded (e.g. after bulk creation)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Same rule the wizard uses to block the step change (empty names only).
  const missingNameHintId = React.useId();
  const missingNameCount = React.useMemo(
    () => validateStudentsComplete(students).emptyNameCount,
    [students],
  );
  const missingNameHint =
    missingNameCount > 0
      ? t('validation.missingNames', {
          count: missingNameCount,
          defaultValue: 'Bitte ergänze die {{count}} fehlenden Namen.',
        })
      : '';

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
  const {
    classSummaries,
    activeClass,
    selectClass,
    createClass,
    updateClassMetadata,
    deleteClass,
  } = useClassManagementContext();
  const { triggerImport } = useSeatingPlanActions();
  const hasActiveClass = Boolean(activeClass.id);
  const formatClassName = (name?: string | null) =>
    name && name.trim().length > 0
      ? `„${name.trim()}"`
      : t('studentInput.yourClass', 'deine Klasse');

  // CSV import handler
  const handleCsvImport = useCallback(
    async (file: File, mode?: NameColumnMode) => {
      const importedStudents = await importCsv(file, mode);
      return importedStudents;
    },
    [importCsv],
  );

  // CSVs with both a first-name and a last-name column are ambiguous; ask
  // instead of silently defaulting to the first name.
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

  const requestStudentRemoval = useCallback(
    (studentId: string) => {
      const targetStudent = students.find((entry) => entry.id === studentId);
      if (!targetStudent) {
        return;
      }

      setPendingRemoval({
        id: studentId,
        name: targetStudent.name,
      });
    },
    [students],
  );

  const pendingRemovalName = pendingRemoval?.name?.trim();
  const removalTargetLabel = pendingRemovalName
    ? `"${pendingRemovalName}"`
    : t('studentInput.thisStudent', 'diesen Schüler');

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
  // An open dialog owns the key though (Modal closes on Escape as well), so the
  // shortcut stands down instead of quietly clearing the selection behind it —
  // cancelling a dialog must leave the selection intact.
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
        document.querySelector('[role="dialog"]') === null,
    },
  );

  const handleBulkApply = useCallback(
    (patch: Partial<Student>) => {
      const ids = [...selection.selectedIds];
      ids.forEach((id) => updateStudent(id, patch));
      showToast(
        'success',
        t('bulkEdit.applied', {
          count: ids.length,
          defaultValue: '{{count}} Schüler aktualisiert.',
        }),
      );
    },
    [selection.selectedIds, updateStudent, t],
  );

  const handleBulkDelete = useCallback(() => {
    const ids = [...selection.selectedIds];
    ids.forEach((id) => removeStudent(id));
    selection.clear();
    setBulkDeleteOpen(false);
    showToast(
      'success',
      t('bulkEdit.deleted', {
        count: ids.length,
        defaultValue: '{{count}} Schüler entfernt.',
      }),
    );
  }, [selection, removeStudent, setBulkDeleteOpen, t]);

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

  return (
    <div className="space-y-6">
      <ClassActionsPanel
        classSummaries={classSummaries}
        activeClass={activeClass}
        selectClass={selectClass}
        createClass={createClass}
        updateClassMetadata={updateClassMetadata}
        deleteClass={deleteClass}
        studentCount={students.length}
        placeholderCount={placeholderCount}
        onPlaceholderCountChange={setPlaceholderCount}
        onCreatePlaceholders={handlePlaceholderClass}
        newStudentName={newStudentName}
        onNewStudentNameChange={setNewStudentName}
        onAddStudent={handleAddStudent}
        isAddStudentDisabled={isAddDisabled}
        onImportCsv={analyzeCsvFile}
        onExportCsv={downloadStudentsCsv}
        onImportBackup={triggerImport}
      >
        {showListTools && (
          <StudentListToolsRow
            listView={listView}
            selection={selection}
            selectedStudents={selectedStudents}
            totalCount={students.length}
            onBulkApply={handleBulkApply}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
          />
        )}
      </ClassActionsPanel>
      {!hasActiveClass ? null : (
        <>
          {students.length === 0 && (
            <div
              className={`${cardSurfaceClass} flex flex-col gap-4 border border-blue-200/80 bg-blue-50/90 p-5 text-blue-900 shadow-lg dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100 sm:flex-row sm:items-start sm:gap-6`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/70 bg-white/80 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/60 dark:text-blue-200">
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
                  {t(
                    'studentInput.emptyClassCsvHintPrefix',
                    'Du kannst auch diese ',
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
                    className="font-semibold text-green-600 underline transition hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  >
                    {t('csv.templateLink', 'CSV-Vorlage')}
                  </a>
                  {t(
                    'studentInput.emptyClassCsvHintSuffix',
                    ' nutzen und sie mit den Namen deiner Schüler befüllen. Klicke dann auf Import und lade die CSV-Datei hoch.',
                  )}
                </p>
              </div>
            </div>
          )}

          <MissingNameNotice
            students={students}
            updateStudent={updateStudent}
          />

          {showListTools && listView.visibleStudents.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
              updateStudent={updateStudent}
              requestStudentRemoval={requestStudentRemoval}
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
      )}

      {/* Classroom setup moved to Step 2 - LayoutEditorView */}

      {students.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            aria-disabled={!canPlayNameGame}
            onClick={handleNameGameClick}
            title={t(
              'studentInput.nameGameTitle',
              'Namen deiner Schüler spielerisch lernen',
            )}
            className={`${warningButtonClass} justify-center gap-2 mr-auto`}
          >
            <GameControllerIcon size={16} aria-hidden />
            {t('studentInput.nameGameButton', 'Namensspiel')}
          </button>
          {/* Proceed Button — blocked by missing names; the reason shows on
              hover/focus, the click still raises the toast. */}
          <div className="group relative">
            <button
              ref={proceedButtonRef}
              type="button"
              onClick={onProceedToLayout}
              aria-disabled={missingNameHint ? true : undefined}
              aria-describedby={missingNameHint ? missingNameHintId : undefined}
              title={t('studentInput.proceedShortcut', 'Weiter (Alt/Option+→)')}
              className={`${primaryButtonClass} justify-center gap-2`}
            >
              {t('studentInput.proceedButton', 'Weiter zum Klassenraum')}
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            {missingNameHint && (
              <HintTooltip id={missingNameHintId} hint={missingNameHint} />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title={t('studentInput.removeStudentTitle', 'Schüler entfernen')}
        message={t('studentInput.removeStudentMessage', {
          studentName: removalTargetLabel,
          defaultValue: `Möchtest du ${removalTargetLabel} wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.`,
        })}
        confirmLabel={t('classManagement.delete', 'Entfernen')}
        cancelLabel={t('common.cancel', 'Abbrechen')}
        onConfirm={() => {
          if (!pendingRemoval) {
            return;
          }
          const studentName = pendingRemoval.name.trim();
          removeStudent(pendingRemoval.id);
          showToast(
            'success',
            t('studentInput.studentRemoved', {
              studentName:
                studentName || t('studentList.newStudent', 'Schüler'),
              defaultValue: `${studentName || 'Schüler'} wurde entfernt.`,
            }),
          );
          setPendingRemoval(null);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={t('bulkEdit.deleteTitle', 'Ausgewählte Schüler entfernen')}
        message={t('bulkEdit.deleteMessage', {
          count: selection.selectedCount,
          defaultValue:
            'Möchtest du {{count}} ausgewählte Schüler wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.',
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
