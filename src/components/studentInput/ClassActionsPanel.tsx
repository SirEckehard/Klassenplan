// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { PlusIcon, SparkleIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import ClassSelectionBar from '@/components/students/ClassSelectionBar';
import ClassMetadataDialog, {
  type ClassMetadataFormValues,
} from '@/components/students/ClassMetadataDialog';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';
import type { ClassSummary } from '@/types';
import type { ClassManagementContextValue } from '@/contexts/seatingPlan/ClassManagementContext';

type ClassAction = 'select' | 'create' | 'edit' | 'delete';

type ClassActionsPanelProps = {
  classSummaries: ClassSummary[];
  activeClass: ClassManagementContextValue['activeClass'];
  selectClass: ClassManagementContextValue['selectClass'];
  createClass: ClassManagementContextValue['createClass'];
  updateClassMetadata: ClassManagementContextValue['updateClassMetadata'];
  deleteClass: ClassManagementContextValue['deleteClass'];
  onImportBackup?: () => void;
  children?: React.ReactNode;
  studentCount: number;
  // Student management controls
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

const defaultMetadataValues: ClassMetadataFormValues = {
  name: '',
  label: '',
  notes: '',
};

const ClassActionsPanel = ({
  classSummaries,
  activeClass,
  selectClass,
  createClass,
  updateClassMetadata,
  deleteClass,
  onImportBackup,
  children,
  studentCount,
  placeholderCount,
  onPlaceholderCountChange,
  onCreatePlaceholders,
  newStudentName,
  onNewStudentNameChange,
  onAddStudent,
  isAddStudentDisabled,
  onImportCsv,
  onExportCsv,
}: ClassActionsPanelProps) => {
  const { t } = useTranslation('generator');
  const hasActiveClass = Boolean(activeClass.id);
  const [pendingAction, setPendingAction] = useState<ClassAction | null>(null);
  const [classDialogState, setClassDialogState] = useState<{
    mode: 'create' | 'edit';
    classId?: string | null;
    initialValues: ClassMetadataFormValues;
  } | null>(null);
  // The dropdown offers delete per class row, so the pending target is an id —
  // not implicitly "the active one".
  const [classDeleteTarget, setClassDeleteTarget] = useState<string | null>(
    null,
  );

  const runClassAction = useCallback(
    async (action: ClassAction, handler: () => Promise<boolean>) => {
      setPendingAction(action);
      try {
        return await handler();
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const handleClassSelect = useCallback(
    async (classId: string) => {
      if (!classId || classId === activeClass.id) {
        return;
      }
      await runClassAction('select', () => selectClass(classId));
    },
    [activeClass.id, runClassAction, selectClass],
  );

  const openCreateDialog = () => {
    setClassDialogState({
      mode: 'create',
      initialValues: defaultMetadataValues,
    });
  };

  const openEditDialog = (classId?: string) => {
    const targetId = classId ?? activeClass.id;
    if (!targetId) {
      return;
    }
    const targetClass =
      classSummaries.find((entry) => entry.id === targetId) ?? activeClass;
    setClassDialogState({
      mode: 'edit',
      classId: targetId,
      initialValues: {
        name: targetClass.name ?? '',
        label: targetClass.label ?? '',
        notes: targetClass.notes ?? '',
      },
    });
  };

  const handleMetadataSubmit = useCallback(
    async (values: ClassMetadataFormValues) => {
      if (!classDialogState) return;
      if (classDialogState.mode === 'create') {
        const success = await runClassAction('create', () =>
          createClass(values, { activate: true }),
        );
        if (success) {
          setClassDialogState(null);
        }
        return;
      }
      const targetClassId = classDialogState.classId ?? activeClass.id;
      if (!targetClassId) {
        return;
      }
      const success = await runClassAction('edit', () =>
        updateClassMetadata(targetClassId, values),
      );
      if (success) {
        setClassDialogState(null);
      }
    },
    [
      classDialogState,
      activeClass.id,
      createClass,
      runClassAction,
      updateClassMetadata,
    ],
  );

  const handleDeleteClassConfirmed = useCallback(async () => {
    if (!classDeleteTarget) {
      setClassDeleteTarget(null);
      return;
    }
    const success = await runClassAction('delete', () =>
      deleteClass(classDeleteTarget),
    );
    if (success) {
      setClassDeleteTarget(null);
    }
  }, [classDeleteTarget, deleteClass, runClassAction]);

  const classMetadataInitialValues: ClassMetadataFormValues =
    classDialogState?.initialValues ?? defaultMetadataValues;

  const classDeleteLabel = useMemo(() => {
    const target =
      classSummaries.find((entry) => entry.id === classDeleteTarget) ??
      (classDeleteTarget === activeClass.id ? activeClass : null);
    const className = target?.name?.trim();
    return className
      ? `„${className}"`
      : t('classActions.deleteDialog.fallbackName');
  }, [classDeleteTarget, classSummaries, activeClass, t]);

  return (
    <>
      {hasActiveClass && (
        <ClassSelectionBar
          classSummaries={classSummaries}
          activeClass={activeClass}
          isBusy={pendingAction !== null}
          onSelectClass={handleClassSelect}
          onCreateClass={openCreateDialog}
          onEditClass={openEditDialog}
          onDeleteClass={setClassDeleteTarget}
          studentCount={studentCount}
          placeholderCount={placeholderCount}
          onPlaceholderCountChange={onPlaceholderCountChange}
          onCreatePlaceholders={onCreatePlaceholders}
          newStudentName={newStudentName}
          onNewStudentNameChange={onNewStudentNameChange}
          onAddStudent={onAddStudent}
          isAddStudentDisabled={isAddStudentDisabled}
          onImportCsv={onImportCsv}
          onExportCsv={onExportCsv}
        >
          {children}
        </ClassSelectionBar>
      )}
      {!hasActiveClass && (
        <div
          className={`${cardSurfaceClass} border border-dashed border-blue-300/70 bg-linear-to-br from-blue-50/80 via-white to-cyan-50/70 p-6 text-blue-900 shadow-lg dark:border-blue-900/40 dark:from-blue-950/50 dark:via-gray-900/70 dark:to-cyan-950/30 dark:text-blue-100`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/70 bg-white/80 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/60 dark:text-blue-200">
                <SparkleIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-3 text-sm leading-relaxed">
                <h3 className="text-lg font-semibold">
                  {t('classActions.emptyState.title')}
                </h3>
                <p className="text-blue-900/80 dark:text-blue-100/70">
                  {t('classActions.emptyState.description')}
                </p>
                <ol className="space-y-2 text-blue-900/90 dark:text-blue-100/80">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-100">
                      1
                    </span>
                    <span>
                      <Trans
                        i18nKey="classActions.emptyState.step1"
                        ns="generator"
                        components={{ strong: <strong /> }}
                      />
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-100">
                      2
                    </span>
                    <span>{t('classActions.emptyState.step2')}</span>
                  </li>
                </ol>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 rounded-2xl bg-white/80 p-4 text-sm shadow-inner dark:bg-gray-900/60 sm:w-auto">
              <button
                type="button"
                onClick={openCreateDialog}
                className={`${primaryButtonClass} justify-center gap-2`}
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                {t('classActions.emptyState.createButton')}
              </button>
              <p className="text-center text-xs text-blue-900/70 dark:text-blue-100/70">
                {t('classActions.emptyState.hint')}
              </p>
              {onImportBackup && (
                <>
                  <div className="my-1 h-px bg-blue-200/50 dark:bg-blue-800/50" />
                  <button
                    type="button"
                    onClick={onImportBackup}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200/70 bg-white/60 px-4 py-2.5 text-sm font-medium text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:border-blue-700 dark:hover:bg-blue-900/50"
                  >
                    <UploadSimpleIcon className="h-4 w-4" aria-hidden="true" />
                    {t('classActions.emptyState.importButton')}
                  </button>
                  <p className="text-center text-xs text-blue-900/60 dark:text-blue-100/60">
                    {t('classActions.emptyState.importHint')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <ClassMetadataDialog
        open={Boolean(classDialogState)}
        mode={classDialogState?.mode ?? 'create'}
        initialValues={classMetadataInitialValues}
        isSubmitting={pendingAction === 'create' || pendingAction === 'edit'}
        onClose={() => setClassDialogState(null)}
        onSubmit={handleMetadataSubmit}
      />
      <ConfirmDialog
        open={classDeleteTarget !== null}
        title={t('classActions.deleteDialog.title')}
        message={t('classActions.deleteDialog.message', {
          className: classDeleteLabel,
        })}
        confirmLabel={t('classActions.deleteDialog.confirmLabel')}
        cancelLabel={t('classActions.deleteDialog.cancelLabel')}
        onConfirm={handleDeleteClassConfirmed}
        onCancel={() => setClassDeleteTarget(null)}
      />
    </>
  );
};

export default ClassActionsPanel;
