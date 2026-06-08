import { useCallback } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { ClassroomScene, ClassroomTemplate } from '@/types';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { errorHandlers, logError } from '@/utils';
import { TOAST_MESSAGES } from '@/utils/ui/toast';

export type SaveTemplateError =
  | 'empty'
  | 'duplicate'
  | 'storage'
  | 'no-indexeddb';

export type SaveTemplateResult =
  | { success: true }
  | { success: false; error: SaveTemplateError };

/**
 * @deprecated This hook is deprecated. Use the template hooks from hooks/template/ instead:
 * - useTemplateService for business logic
 * - useTemplateManager for UI orchestration
 *
 * The new architecture uses the Repository Pattern (ISeatingPlanRepository)
 * instead of direct IndexedDB access via idb-keyval.
 *
 * Migration path:
 * 1. For direct data access: Use repository.loadTemplates(), repository.saveTemplate(), etc.
 * 2. For UI components: Use useTemplateManager which provides state + persistence + UI feedback
 * 3. For service layer: Use useTemplateService for pure business logic
 *
 * Manage classroom templates in IndexedDB.
 */
export function useTemplateStorage() {
  const saveTemplate = useCallback(
    async (
      name: string,
      scene: ClassroomScene,
    ): Promise<SaveTemplateResult> => {
      if (!hasIndexedDB()) return { success: false, error: 'no-indexeddb' };
      const trimmed = name.trim();
      if (!trimmed) return { success: false, error: 'empty' };
      try {
        const existing =
          ((await idbGet(DB_KEYS.classroomTemplates)) as ClassroomTemplate[]) ||
          [];
        if (existing.some((t) => t.name === trimmed))
          return { success: false, error: 'duplicate' };
        const template: ClassroomTemplate = {
          id: Date.now(),
          name: trimmed,
          scene,
        };
        await idbSet(DB_KEYS.classroomTemplates, [...existing, template]);
        return { success: true };
      } catch (e) {
        errorHandlers.storageError(e as Error, TOAST_MESSAGES.SAVE_TEMPLATE_ERROR);
        return { success: false, error: 'storage' };
      }
    },
    [],
  );

  const updateTemplate = useCallback(
    async (id: number, scene: ClassroomScene): Promise<boolean> => {
      if (!hasIndexedDB()) return false;
      try {
        const existing =
          ((await idbGet(DB_KEYS.classroomTemplates)) as ClassroomTemplate[]) ||
          [];
        const index = existing.findIndex((t) => t.id === id);
        if (index === -1) return false;
        const next = [...existing];
        next[index] = { ...next[index], scene };
        await idbSet(DB_KEYS.classroomTemplates, next);
        return true;
      } catch (e) {
        errorHandlers.storageError(e as Error, TOAST_MESSAGES.TEMPLATE_UPDATE_ERROR);
        return false;
      }
    },
    [],
  );

  const loadTemplate = useCallback(async (): Promise<ClassroomTemplate[]> => {
    if (!hasIndexedDB()) return [];
    try {
      const v = await idbGet(DB_KEYS.classroomTemplates);
      return (v as ClassroomTemplate[]) ?? [];
    } catch (e) {
      logError(
        'Load classroomTemplates failed',
        { error: e },
        'useTemplateStorage',
      );
      return [];
    }
  }, []);

  const deleteTemplate = useCallback(async (id: number) => {
    if (!hasIndexedDB()) return;
    try {
      const existing =
        ((await idbGet(DB_KEYS.classroomTemplates)) as ClassroomTemplate[]) ||
        [];
      await idbSet(
        DB_KEYS.classroomTemplates,
        existing.filter((t) => t.id !== id),
      );
    } catch (e) {
      errorHandlers.storageError(e as Error, TOAST_MESSAGES.DELETE_TEMPLATE_ERROR);
    }
  }, []);

  const renameTemplate = useCallback(
    async (
      id: number,
      newName: string,
    ): Promise<{
      success: boolean;
      error?: 'empty' | 'duplicate' | 'storage';
    }> => {
      if (!hasIndexedDB()) return { success: false, error: 'storage' };
      const trimmed = newName.trim();
      if (!trimmed) return { success: false, error: 'empty' };
      try {
        const existing =
          ((await idbGet(DB_KEYS.classroomTemplates)) as ClassroomTemplate[]) ||
          [];
        const index = existing.findIndex((t) => t.id === id);
        if (index === -1) return { success: false, error: 'storage' };
        // Check if name already exists (excluding current template)
        if (existing.some((t, i) => i !== index && t.name === trimmed))
          return { success: false, error: 'duplicate' };
        const next = [...existing];
        next[index] = { ...next[index], name: trimmed };
        await idbSet(DB_KEYS.classroomTemplates, next);
        return { success: true };
      } catch (e) {
        errorHandlers.storageError(e as Error, TOAST_MESSAGES.TEMPLATE_RENAME_ERROR);
        return { success: false, error: 'storage' };
      }
    },
    [],
  );

  return {
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    renameTemplate,
  };
}
