// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import i18n from '@/i18n';
import {
  BACKUP_FILE_EXTENSION,
  BACKUP_FILE_MEDIA_TYPE,
} from '@/config/backupFile';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';
import { addMixPreset, loadMixPresets } from '@/repositories/mixPresetStore';
import type { ClassroomTemplate, MixPresetWeights } from '@/types';
import type { SharedFile } from '@/utils/data/shareFiles';
import {
  downloadBlob,
  logError,
  MAX_MIX_PRESETS,
  MAX_NAME_LENGTH,
  MIX_RECIPES,
  uniqueName,
} from '@/utils';
import { confirmInStatusBar } from '@/utils/ui/statusNotice';
import { announce, showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

const LOG_SOURCE = 'useShareFiles';

// Building the files and the question before one is added are needed only
// when a file is saved or opened.
const loadShareFiles = () => import('@/utils/data/shareFiles');
const loadSharedFileDialog = () => import('@/services/ui/sharedFileDialog');

/** What a file added, for the view that shows it to choose it. */
export type SharedImport =
  | { kind: 'template'; templateId: number }
  | { kind: 'preset'; presetId: string };

/** Returns whether it shows the entry, so nothing else needs to say so. */
type SharedImportListener = (entry: SharedImport) => boolean;

const listeners = new Set<SharedImportListener>();

/**
 * Watch for what a file added: "Bibliothek" chooses it, the room layer's
 * template list takes it in.
 *
 * @returns Unsubscribe function
 */
export function subscribeToSharedImports(
  listener: SharedImportListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether a view on screen shows the entry now. */
function noteSharedImport(entry: SharedImport): boolean {
  let shown = false;
  for (const listener of [...listeners]) {
    try {
      if (listener(entry)) shown = true;
    } catch (error) {
      logError('Shared import listener failed', { error }, LOG_SOURCE);
    }
  }
  return shown;
}

/** Said where the entry is in sight, a toast where it is not. */
function sayAdded(entry: SharedImport, message: string) {
  if (noteSharedImport(entry)) {
    announce(message);
  } else {
    showToast('success', message);
  }
}

const FILE_PICKER_TYPES = [
  {
    description: 'Klassenplan',
    accept: { [BACKUP_FILE_MEDIA_TYPE]: [BACKUP_FILE_EXTENSION] },
  },
];

async function writeSharedFile(json: string, fileName: string, name: string) {
  // A neutral type, as for the backup: Safari names a download after it.
  const saved = await downloadBlob(json, fileName, 'application/octet-stream', {
    logContext: LOG_SOURCE,
    filePickerTypes: FILE_PICKER_TYPES,
  });
  if (saved) {
    confirmInStatusBar(
      'fileSaved',
      i18n.t('generator:library.share.saved', { name }),
    );
  }
}

/**
 * A room template or a mixing preset as a file of its own, and back
 * (decision 0046): saved from its panel in "Bibliothek", opened the way a
 * backup is — the restore's file dialog, the installed app's file handler —
 * which hands a file that holds one to `openSharedFile`.
 */
export function useShareFiles() {
  const repository = useSeatingRepository();

  const saveTemplateFile = useCallback(
    async (template: Pick<ClassroomTemplate, 'name' | 'scene'>) => {
      try {
        const { buildTemplateFile, sharedFileName } = await loadShareFiles();
        await writeSharedFile(
          buildTemplateFile(template),
          sharedFileName(
            i18n.t('generator:library.share.templateFile'),
            template.name,
          ),
          template.name,
        );
      } catch (error) {
        logError('Saving a template file failed', { error }, LOG_SOURCE);
        showToast('error', TOAST_MESSAGES.EXPORT_ERROR);
      }
    },
    [],
  );

  const savePresetFile = useCallback(
    async (preset: { name: string; weights: MixPresetWeights }) => {
      try {
        const { buildPresetFile, sharedFileName } = await loadShareFiles();
        await writeSharedFile(
          buildPresetFile(preset),
          sharedFileName(
            i18n.t('generator:library.share.presetFile'),
            preset.name,
          ),
          preset.name,
        );
      } catch (error) {
        logError('Saving a preset file failed', { error }, LOG_SOURCE);
        showToast('error', TOAST_MESSAGES.EXPORT_ERROR);
      }
    },
    [],
  );

  /**
   * Asks what the file brings, then adds it beside what is here under a name
   * of its own — "Raum 204 (2)" where "Raum 204" is taken; nothing is
   * replaced.
   */
  const openSharedFile = useCallback(
    async (shared: SharedFile) => {
      if (shared.kind === 'template') {
        const stored = await repository.loadTemplates();
        if (!stored.success) {
          showToast('error', TOAST_MESSAGES.SAVE_TEMPLATE_ERROR);
          return;
        }
        const name = uniqueName(
          shared.name,
          stored.data.map((entry) => entry.name),
          MAX_NAME_LENGTH,
        );
        const { confirmSharedFile } = await loadSharedFileDialog();
        const confirmed = await confirmSharedFile(shared, name);
        if (!confirmed) return;
        // Ids are the time of saving, as for a template saved from a room.
        const id = Math.max(
          Date.now(),
          ...stored.data.map((entry) => entry.id + 1),
        );
        const saved = await repository.saveTemplate({
          id,
          name,
          scene: shared.scene,
        });
        if (!saved.success) {
          showToast('error', TOAST_MESSAGES.SAVE_TEMPLATE_ERROR);
          return;
        }
        sayAdded(
          { kind: 'template', templateId: id },
          i18n.t('toast:sharedFile.templateAdded', { name }),
        );
        return;
      }

      const data = await loadMixPresets();
      if (data.presets.length >= MAX_MIX_PRESETS) {
        showToast(
          'warning',
          i18n.t('generator:mix.recipes.limit', { count: MAX_MIX_PRESETS }),
        );
        return;
      }
      const name = uniqueName(
        shared.name,
        [
          ...MIX_RECIPES.flatMap((recipe) =>
            recipe.builtin
              ? [i18n.t(`generator:mix.recipes.${recipe.builtin}.label`)]
              : [],
          ),
          ...data.presets.map((preset) => preset.name),
        ],
        MAX_NAME_LENGTH,
      );
      const { confirmSharedFile } = await loadSharedFileDialog();
      const confirmed = await confirmSharedFile(shared, name);
      if (!confirmed) return;
      const preset = await addMixPreset(name, shared.weights);
      if (!preset) {
        showToast('error', 'toast:mixPresets.saveFailed');
        return;
      }
      sayAdded(
        { kind: 'preset', presetId: preset.id },
        i18n.t('toast:sharedFile.presetAdded', { name }),
      );
    },
    [repository],
  );

  return { saveTemplateFile, savePresetFile, openSharedFile };
}
