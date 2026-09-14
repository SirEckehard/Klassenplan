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

type UseClassManagementProps = {
  repository: ISeatingPlanRepository;
  classSummaries: ClassSummary[];
  activeClass: ActiveClassState;
  hasPendingStudentUpdates: boolean;
  hasUnsavedSeatingChanges: boolean;
  /**
   * Reloads the class the repository marks as active. It first writes what is
   * still queued for the class that was open, then sets the new class's data
   * and its id in one state update. Nothing here sets the active class on its
   * own, so the id never runs ahead of the data (docs/ARCHITECTURE.md,
   * "Switching classes").
   */
  applyClassReload: () => Promise<void>;
};

export function useClassManagement({
  repository,
  classSummaries,
  activeClass,
  hasPendingStudentUpdates,
  hasUnsavedSeatingChanges,
  applyClassReload,
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
      formatClassLabel,
      hasPendingStudentUpdates,
      hasUnsavedSeatingChanges,
      repository,
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
      // With `activate`, the repository marks the new class as active, so the
      // reload below is what switches to it.
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
      formatClassLabel,
      hasPendingStudentUpdates,
      hasUnsavedSeatingChanges,
      repository,
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
      // The copy joins the class list; the class that was open stays active.
      await applyClassReload();
      showToast(
        'success',
        t('toast:class.duplicatedName', {
          name: formatClassLabel(result.data.name),
        }),
      );
      return true;
    },
    [applyClassReload, formatClassLabel, repository, t],
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
