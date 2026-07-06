// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logError, showToast, TOAST_MESSAGES } from '@/utils';
import type {
  CreateClassPayload,
  UpdateClassMetadataPayload,
  ClassSummary,
  ActiveClassState,
} from '@/types';
import {
  RepositoryErrorType,
  type ISeatingPlanRepository,
} from '@/repositories';

const toActiveClass = (
  record: Partial<{
    id: string | null;
    name?: string | null;
    label?: string | null;
    notes?: string | null;
    lastUsedAt?: string | null;
  }> | null,
): ActiveClassState => ({
  id: record?.id ?? null,
  name: record?.name ?? '',
  label: record?.label ?? undefined,
  notes: record?.notes ?? undefined,
  lastUsedAt: record?.lastUsedAt ?? undefined,
});

type UseClassManagementProps = {
  repository: ISeatingPlanRepository;
  classSummaries: ClassSummary[];
  activeClass: ActiveClassState;
  setActiveClass: (next: ActiveClassState) => void;
  hasPendingStudentUpdates: boolean;
  hasUnsavedSeatingChanges: boolean;
  applyClassReload: () => Promise<void>;
  prepareClassSwitch: (targetClassId: string) => void;
};

export function useClassManagement({
  repository,
  classSummaries,
  activeClass,
  setActiveClass,
  hasPendingStudentUpdates,
  hasUnsavedSeatingChanges,
  applyClassReload,
  prepareClassSwitch,
}: UseClassManagementProps) {
  const { t } = useTranslation();
  const formatClassLabel = useCallback((name?: string) => {
    const trimmed = name?.trim();
    return trimmed && trimmed.length > 0 ? `"${trimmed}"` : 'diese Klasse';
  }, []);

  const selectClass = useCallback(
    async (classId: string) => {
      if (!classId || classId === activeClass.id) {
        return true;
      }

      const pendingChanges =
        hasPendingStudentUpdates || hasUnsavedSeatingChanges;
      const result = await repository.setActiveClass(classId);
      if (!result.success) {
        logError(
          'Failed to switch class',
          { error: result.error, classId },
          'useClassManagement',
        );
        showToast('error', TOAST_MESSAGES.CLASS_SWITCH_ERROR);
        return false;
      }

      prepareClassSwitch(classId);
      const optimisticTarget =
        classSummaries.find((entry) => entry.id === classId) ?? null;
      setActiveClass(
        toActiveClass(
          optimisticTarget
            ? {
                id: optimisticTarget.id,
                name: optimisticTarget.name,
                label: optimisticTarget.label,
                notes: optimisticTarget.notes,
                lastUsedAt: optimisticTarget.lastUsedAt,
              }
            : {
                id: classId,
                name: undefined,
                label: undefined,
                notes: undefined,
              },
        ),
      );
      await applyClassReload();
      showToast(
        'success',
        t('toast:class.activatedName', {
          name: formatClassLabel(result.data.name),
        }),
      );
      if (pendingChanges) {
        showToast('info', TOAST_MESSAGES.CLASS_SWITCH_UNSAVED);
      }
      return true;
    },
    [
      activeClass.id,
      applyClassReload,
      classSummaries,
      prepareClassSwitch,
      formatClassLabel,
      hasPendingStudentUpdates,
      hasUnsavedSeatingChanges,
      repository,
      setActiveClass,
      t,
    ],
  );

  const createClass = useCallback(
    async (payload: CreateClassPayload, options?: { activate?: boolean }) => {
      const trimmedName = payload.name.trim();
      if (!trimmedName) {
        showToast('warning', TOAST_MESSAGES.VALIDATION_NAME_REQUIRED);
        return false;
      }
      const shouldActivate = options?.activate ?? true;
      const pendingChanges =
        shouldActivate &&
        (hasPendingStudentUpdates || hasUnsavedSeatingChanges);
      const result = await repository.createClass(
        { ...payload, name: trimmedName },
        { activate: shouldActivate },
      );
      if (!result.success) {
        const isDuplicate =
          result.error.type === RepositoryErrorType.DUPLICATE_KEY;
        if (isDuplicate) {
          showToast('warning', TOAST_MESSAGES.CLASS_NAME_EXISTS);
          return false;
        }
        logError(
          'Failed to create class',
          { error: result.error },
          'useClassManagement',
        );
        showToast('error', TOAST_MESSAGES.CLASS_CREATE_ERROR);
        return false;
      }
      await applyClassReload();
      if (shouldActivate && result.data.id) {
        prepareClassSwitch(result.data.id);
        setActiveClass(
          toActiveClass({
            id: result.data.id,
            name: result.data.name,
            label: result.data.label,
            notes: result.data.notes,
            lastUsedAt: result.data.lastUsedAt,
          }),
        );
      }
      const message = shouldActivate
        ? t('toast:class.createdActivatedName', {
            name: formatClassLabel(result.data.name),
          })
        : t('toast:class.createdName', {
            name: formatClassLabel(result.data.name),
          });
      showToast('success', message);
      if (pendingChanges) {
        showToast('info', TOAST_MESSAGES.CLASS_SWITCH_UNSAVED);
      }
      return true;
    },
    [
      applyClassReload,
      prepareClassSwitch,
      formatClassLabel,
      hasPendingStudentUpdates,
      hasUnsavedSeatingChanges,
      repository,
      setActiveClass,
      t,
    ],
  );

  const updateClassMetadata = useCallback(
    async (classId: string, patch: UpdateClassMetadataPayload) => {
      const result = await repository.updateClassMetadata(classId, patch);
      if (!result.success) {
        const isDuplicate =
          result.error.type === RepositoryErrorType.DUPLICATE_KEY;
        if (isDuplicate) {
          showToast('warning', TOAST_MESSAGES.CLASS_NAME_EXISTS);
          return false;
        }
        logError(
          'Failed to update class metadata',
          { error: result.error, classId },
          'useClassManagement',
        );
        showToast('error', TOAST_MESSAGES.CLASS_UPDATE_ERROR);
        return false;
      }
      await applyClassReload();
      showToast(
        'success',
        t('toast:class.updatedName', {
          name: formatClassLabel(result.data.name),
        }),
      );
      return true;
    },
    [applyClassReload, formatClassLabel, repository, t],
  );

  const duplicateClass = useCallback(
    async (
      classId: string,
      overrides?: UpdateClassMetadataPayload & { name?: string },
    ) => {
      const result = await repository.duplicateClass(classId, overrides);
      if (!result.success) {
        logError(
          'Failed to duplicate class',
          { error: result.error, classId },
          'useClassManagement',
        );
        showToast('error', TOAST_MESSAGES.CLASS_DUPLICATE_ERROR);
        return false;
      }
      await applyClassReload();
      if (result.data.id) {
        setActiveClass(
          toActiveClass({
            id: result.data.id,
            name: result.data.name,
            label: result.data.label,
            notes: result.data.notes,
            lastUsedAt: result.data.lastUsedAt,
          }),
        );
      }
      showToast(
        'success',
        t('toast:class.duplicatedName', {
          name: formatClassLabel(result.data.name),
        }),
      );
      return true;
    },
    [applyClassReload, formatClassLabel, repository, setActiveClass, t],
  );

  const deleteClass = useCallback(
    async (classId: string) => {
      const target = classSummaries.find((entry) => entry.id === classId);
      const result = await repository.deleteClass(classId);
      if (!result.success) {
        const isMissing = result.error.type === RepositoryErrorType.NOT_FOUND;
        showToast(
          isMissing ? 'warning' : 'error',
          TOAST_MESSAGES.CLASS_DELETE_ERROR,
        );
        logError(
          'Failed to delete class',
          { error: result.error, classId },
          'useClassManagement',
        );
        return false;
      }
      await applyClassReload();
      showToast(
        'success',
        target
          ? t('toast:class.deletedName', {
              name: formatClassLabel(target.name),
            })
          : TOAST_MESSAGES.CLASS_DELETE_SUCCESS,
      );
      return true;
    },
    [applyClassReload, classSummaries, formatClassLabel, repository, t],
  );

  return {
    selectClass,
    createClass,
    updateClassMetadata,
    duplicateClass,
    deleteClass,
  };
}
