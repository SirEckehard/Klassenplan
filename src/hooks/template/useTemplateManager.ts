import React from 'react';
import deepEqual from 'fast-deep-equal';
import { useTranslation } from 'react-i18next';
import { confirmDialog } from '@/services/ui/dialogs';
import type { ClassroomTemplate, ClassroomScene } from '@/types';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { logError } from '@/utils';
import { useTemplateService } from './useTemplateService';
import type { TemplateServiceError } from './useTemplateService';

/**
 * Handle classroom template state and persistence helpers.
 */
function cloneScene(scene: ClassroomScene): ClassroomScene {
  return {
    ...scene,
    tables: scene.tables.map((table) => ({ ...table })),
  };
}

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
 * UI Orchestration Layer for Template Management
 */
export default function useTemplateManager(
  classroomScene: ClassroomScene,
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void,
) {
  const { t } = useTranslation('generator');
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
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState(false);
  const lastLoadedTemplateRef = React.useRef<{
    id: number;
    scene: ClassroomScene;
  } | null>(null);

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

  // Clear lastLoadedTemplate if it was deleted
  React.useEffect(() => {
    if (
      lastLoadedTemplateRef.current &&
      !templates.some((t) => t.id === lastLoadedTemplateRef.current?.id)
    ) {
      lastLoadedTemplateRef.current = null;
    }
  }, [templates]);

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
   * Save or overwrite template
   */
  const handleSaveTemplate = React.useCallback(
    async (name: string, overwriteId?: number): Promise<void> => {
      // Overwrite existing template
      if (overwriteId !== undefined) {
        const result = await updateTemplateService(overwriteId, classroomScene);
        if (result.success) {
          showToast('success', TOAST_MESSAGES.TEMPLATE_UPDATE_SUCCESS);
          await reloadTemplates();
          setSelectedTemplateId(overwriteId);
          lastLoadedTemplateRef.current = {
            id: overwriteId,
            scene: cloneScene(classroomScene),
          };
        } else {
          showToast('error', getToastMessageForError(result.error));
        }
        return;
      }

      // Save as new template
      const result = await saveTemplateService(name, classroomScene);
      if (result.success) {
        showToast('success', TOAST_MESSAGES.SAVE_TEMPLATE_SUCCESS);
        await reloadTemplates();
        // Select the newly created template
        setSelectedTemplateId(result.data.id);
        lastLoadedTemplateRef.current = null;
      } else {
        showToast('error', getToastMessageForError(result.error));
      }
    },
    [
      classroomScene,
      reloadTemplates,
      saveTemplateService,
      updateTemplateService,
    ],
  );

  /**
   * Open save modal
   */
  const openSaveModal = React.useCallback(() => {
    setIsSaveModalOpen(true);
  }, []);

  /**
   * Close save modal
   */
  const closeSaveModal = React.useCallback(() => {
    setIsSaveModalOpen(false);
  }, []);

  /**
   * Quick save: Show overwrite dialog if template was changed
   */
  const handleQuickSave = React.useCallback(async () => {
    const lastLoaded = lastLoadedTemplateRef.current;
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    const canOverwrite =
      selectedTemplateId !== null &&
      lastLoaded?.id === selectedTemplateId &&
      !deepEqual(lastLoaded.scene, classroomScene);

    if (canOverwrite && selectedTemplate) {
      const overwrite = await confirmDialog(
        t(
          'layout.overwriteTemplateMessage',
          'Die aktuelle Vorlage wurde verändert. Soll die vorhandene Vorlage überschrieben werden?',
        ),
        {
          confirmLabel: t('layout.overwrite', 'Überschreiben'),
          cancelLabel: t('common.cancel', 'Abbrechen'),
        },
      );
      if (overwrite) {
        await handleSaveTemplate(selectedTemplate.name, selectedTemplateId);
      }
    } else {
      // No loaded template or no changes - show save modal
      openSaveModal();
    }
  }, [
    templates,
    selectedTemplateId,
    classroomScene,
    handleSaveTemplate,
    openSaveModal,
    t,
  ]);

  /**
   * Load a template into the scene
   */
  const handleLoadTemplate = React.useCallback(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const clonedScene = cloneScene(tpl.scene);
    updateClassroomScene(clonedScene);
    lastLoadedTemplateRef.current = {
      id: tpl.id,
      scene: cloneScene(tpl.scene),
    };
    showToast('success', TOAST_MESSAGES.LOAD_TEMPLATE_SUCCESS);
  }, [templates, selectedTemplateId, updateClassroomScene]);

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

        // Clear lastLoaded if it was deleted
        if (lastLoadedTemplateRef.current?.id === templateId) {
          lastLoadedTemplateRef.current = null;
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
    handleLoadTemplate,
    handleDeleteTemplate,
    handleRenameTemplate,
    isSaveModalOpen,
    openSaveModal,
    closeSaveModal,
    handleQuickSave,
  };
}
