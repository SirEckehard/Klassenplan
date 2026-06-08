// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, InfoIcon } from '@phosphor-icons/react';

import { useStudentManagement } from '@/hooks/student/useStudentManagement';
import { downloadCsvTemplate } from '@/utils/csv/csvTemplateDownload';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { showToast } from '@/utils/ui/toast';
import { cardSurfaceClass, primaryButtonClass, MAX_STUDENTS } from '@/utils';
import type { NameColumnMode } from '@/utils/data/csvUtils';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanActions } from '@/contexts/seatingPlan/store';
import type { StudentInputProps } from '@/components/studentInput/types';
import ClassActionsPanel from '@/components/studentInput/ClassActionsPanel';
import MissingNameNotice from '@/components/studentInput/MissingNameNotice';
import StudentList from '@/components/studentInput/StudentList';
import { useStudentListLayout } from '@/components/studentInput/hooks/useStudentListLayout';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';

function StudentInput({
  students,
  addStudent,
  addBulkPlaceholderStudents,
  removeStudent,
  clearStudents,
  updateStudent,
  importCsv,
  downloadStudentsCsv,
  onProceedToLayout,
}: StudentInputProps) {
  const { t } = useTranslation('students');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
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
  const classDisplayName = formatClassName(activeClass.name);

  // CSV import handler
  const handleCsvImport = useCallback(
    async (file: File, mode?: NameColumnMode) => {
      const importedStudents = await importCsv(file, mode);
      return importedStudents;
    },
    [importCsv],
  );

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

  return (
    <div className="space-y-6">
      <ClassActionsPanel
        classSummaries={classSummaries}
        activeClass={activeClass}
        selectClass={selectClass}
        createClass={createClass}
        updateClassMetadata={updateClassMetadata}
        deleteClass={deleteClass}
        onClearStudents={() => setClearConfirmOpen(true)}
        studentCount={students.length}
        placeholderCount={placeholderCount}
        onPlaceholderCountChange={setPlaceholderCount}
        onCreatePlaceholders={handlePlaceholderClass}
        newStudentName={newStudentName}
        onNewStudentNameChange={setNewStudentName}
        onAddStudent={handleAddStudent}
        isAddStudentDisabled={isAddDisabled}
        onImportCsv={handleCsvImport}
        onExportCsv={downloadStudentsCsv}
        onImportBackup={triggerImport}
      />
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

          <StudentList
            students={students}
            lastAddedId={lastAddedId}
            expandedCardId={expandedCardId}
            updateStudent={updateStudent}
            requestStudentRemoval={requestStudentRemoval}
            listContainerRef={listContainerRef}
            maxHeight={listMaxHeight}
            onScrollCollapse={handleListScrollCollapse}
          />
        </>
      )}

      {/* Classroom setup moved to Step 2 - LayoutEditorView */}

      {students.length > 0 && (
        <div className="mt-4 flex justify-end">
          {/* Proceed Button */}
          <button
            ref={proceedButtonRef}
            type="button"
            onClick={onProceedToLayout}
            title={t('studentInput.proceedShortcut', 'Weiter (Alt/Option+→)')}
            className={`${primaryButtonClass} justify-center gap-2`}
          >
            {t('studentInput.proceedButton', 'Weiter zum Klassenraum')}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
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
        open={clearConfirmOpen}
        title={t('studentInput.clearAllTitle', 'Alle Schüler entfernen')}
        message={t('studentInput.clearAllMessage', {
          className: classDisplayName,
          defaultValue: `Möchtest du wirklich alle Schüler aus ${classDisplayName} entfernen? Diese Aktion kann nicht rückgängig gemacht werden.`,
        })}
        confirmLabel={t(
          'classManagement.clearStudents',
          'Alle Schüler entfernen',
        )}
        cancelLabel={t('common.cancel', 'Abbrechen')}
        onConfirm={() => {
          clearStudents();
          setClearConfirmOpen(false);
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
}

// Memoize StudentInput to prevent unnecessary re-renders
export default React.memo(StudentInput);
export type { StudentInputProps } from '@/components/studentInput/types';
