// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomTemplate, ClassroomScene } from '@/types';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { logError } from '@/utils';
import { useTemplateService } from './useTemplateService';
import type { TemplateServiceError } from './useTemplateService';

/**
 * Map service errors to user-facing toast messages
 */
function getToastMessageForError(error: TemplateServiceError): string {
  switch (error) {
    case 'empty-name':
      return TOAST_MESSAGES.TEMPLATE_NAME_EMPTY;
    case 'duplicate-name':
      return TOAST_MESSAGES.TEMPLATE_NAME_EXISTS;
    case 'template-not-found':
      return TOAST_MESSAGES.TEMPLATE_UPDATE_ERROR;
    case 'storage-error':
      return TOAST_MESSAGES.SAVE_TEMPLATE_ERROR;
    default:
      return TOAST_MESSAGES.SAVE_TEMPLATE_ERROR;
  }
}

/**
 * The room templates of the room layer: the list, and keeping, renaming and
 * removing one — with the message each outcome gets.
 */
export default function useTemplateManager(classroomScene: ClassroomScene) {
  const {
    loadTemplates: loadTemplatesService,
    saveTemplate: saveTemplateService,
    updateTemplate: updateTemplateService,
    deleteTemplate: deleteTemplateService,
    renameTemplate: renameTemplateService,
  } = useTemplateService();

  const [templates, setTemplates] = React.useState<ClassroomTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<
    number | null
  >(null);

  // Load templates on mount
  React.useEffect(() => {
    (async () => {
      const result = await loadTemplatesService();
      if (result.success) {
        setTemplates(result.data);
        // Default: No template selected (Standard-Layout)
        setSelectedTemplateId(null);
      } else {
        // Log error but don't show toast (initial load failure is silent)
        logError('useTemplateManager.loadTemplatesFailed', {
          message: result.message,
        });
      }
    })();
  }, [loadTemplatesService]);

  /**
   * Reload templates from storage
   */
  const reloadTemplates = React.useCallback(async () => {
    const result = await loadTemplatesService();
    if (result.success) {
      setTemplates(result.data);
    } else {
      showToast('error', getToastMessageForError('storage-error'));
    }
  }, [loadTemplatesService]);

  /**
   * Keeps the room as a new template, or over the one `overwriteId` names.
   * Resolves with whether it was kept, so the row that named it can close.
   */
  const handleSaveTemplate = React.useCallback(
    async (name: string, overwriteId?: number): Promise<boolean> => {
      if (overwriteId !== undefined) {
        const result = await updateTemplateService(overwriteId, classroomScene);
        if (!result.success) {
          showToast('error', getToastMessageForError(result.error));
          return false;
        }
        showToast('success', TOAST_MESSAGES.TEMPLATE_UPDATE_SUCCESS);
        await reloadTemplates();
        setSelectedTemplateId(overwriteId);
        return true;
      }

      const result = await saveTemplateService(name, classroomScene);
      if (!result.success) {
        showToast('error', getToastMessageForError(result.error));
        return false;
      }
      showToast('success', TOAST_MESSAGES.SAVE_TEMPLATE_SUCCESS);
      await reloadTemplates();
      setSelectedTemplateId(result.data.id);
      return true;
    },
    [
      classroomScene,
      reloadTemplates,
      saveTemplateService,
      updateTemplateService,
    ],
  );

  /**
   * Delete a template
   */
  const handleDeleteTemplate = React.useCallback(
    async (id?: number) => {
      const templateId = id ?? selectedTemplateId;
      if (templateId === null) return;

      const result = await deleteTemplateService(templateId);
      if (result.success) {
        showToast('success', TOAST_MESSAGES.DELETE_TEMPLATE_SUCCESS);
        await reloadTemplates();

        // Update selection if deleted template was selected
        if (templateId === selectedTemplateId) {
          const newTemplates = templates.filter((t) => t.id !== templateId);
          setSelectedTemplateId(
            newTemplates.length > 0 ? newTemplates[0].id : null,
          );
        }
      } else {
        showToast('error', getToastMessageForError(result.error));
      }
    },
    [deleteTemplateService, selectedTemplateId, templates, reloadTemplates],
  );

  /**
   * Rename a template
   */
  const handleRenameTemplate = React.useCallback(
    async (
      id: number,
      newName: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const result = await renameTemplateService(id, newName);
      if (result.success) {
        showToast('success', TOAST_MESSAGES.TEMPLATE_RENAME_SUCCESS);
        await reloadTemplates();
        return { success: true };
      } else {
        showToast('error', getToastMessageForError(result.error));
        return { success: false, error: result.error };
      }
    },
    [renameTemplateService, reloadTemplates],
  );

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleRenameTemplate,
  };
}
