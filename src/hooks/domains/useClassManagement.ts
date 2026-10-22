// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { logError, showToast, TOAST_MESSAGES } from '@/utils';
import type {
  ClassRecord,
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
  /**
   * Puts a class's new name, school year or notes into the summaries and,
   * for the open class, into the active class — nothing else about a class
   * changes with them, so they need no reload, and the undo history stays.
   */
  applyClassMetadata: (record: ClassRecord) => void;
};

export function useClassManagement({
  repository,
  classSummaries,
  activeClass,
  hasPendingStudentUpdates,
  hasUnsavedSeatingChanges,
  applyClassReload,
  applyClassMetadata,
}: UseClassManagementProps) {
  const { t } = useTranslation();
  // Classes carry a name, but a record written by an older build may not — and
  // the placeholder goes into a translated toast, so it cannot be a literal.
  const formatClassLabel = useCallback(
    (name?: string) => {
      const trimmed = name?.trim();
      return trimmed && trimmed.length > 0
        ? t('common:quoted', { text: trimmed })
        : t('toast:class.unnamed');
    },
    [t],
  );

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

      try {
        await applyClassReload();
      } catch (error) {
        logError(
          'Failed to load the class after switching',
          { error, classId },
          'useClassManagement',
        );
        showToast('error', TOAST_MESSAGES.CLASS_SWITCH_ERROR);
        return false;
      }
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
    async (
      payload: CreateClassPayload,
      options?: { activate?: boolean },
    ): Promise<string | null> => {
      const trimmedName = payload.name.trim();
      if (!trimmedName) {
        showToast('warning', TOAST_MESSAGES.VALIDATION_NAME_REQUIRED);
        return null;
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
          return null;
        }
        logError(
          'Failed to create class',
          { error: result.error },
          'useClassManagement',
        );
        showToast('error', TOAST_MESSAGES.CLASS_CREATE_ERROR);
        return null;
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
      return result.data.id;
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

  // Edited where they are read, field by field, so a change says nothing:
  // the field shows it. Only a refusal speaks.
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
      applyClassMetadata(result.data);
      return true;
    },
    [applyClassMetadata, repository],
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
    deleteClass,
  };
}
