// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A room template or a mixing preset as a file of its own, to hand to a
 * colleague (decision 0046). Neither holds anything about a student, so the
 * file is plain JSON, not the backup's encrypted envelope; it carries the
 * backup's extension, and the import tells the three apart by `format`.
 */
import type {
  ClassroomScene,
  ClassroomTemplate,
  MixPresetWeights,
} from '@/types';
import { BACKUP_FILE_EXTENSION } from '@/config/backupFile';
import {
  getAppVersion,
  MIX_CRITERIA_VERSION,
  normalizeMixPresetData,
} from '@/utils';
import { BackupValidationError } from '@/utils/validation/backupLimits';
import {
  validateSharedPreset,
  validateSharedTemplate,
} from '@/utils/validation/backupValidation';

const SHARE_FILE_FORMATS = {
  template: 'klassenplan-room-template',
  preset: 'klassenplan-mix-preset',
} as const;

const SHARE_FILE_VERSION = 1;

/**
 * Far above any room or preset: the largest room the editor allows is a few
 * dozen kilobytes. A larger file is no such file.
 */
export const SHARE_FILE_MAX_BYTES = 1024 * 1024;

/** i18n keys (namespace `toast:sharedFile.*`), resolved by `showToast`. */
const SHARE_FILE_ERRORS = {
  unreadable: 'toast:sharedFile.unreadable',
  newer: 'toast:sharedFile.newer',
  tooLarge: 'toast:sharedFile.tooLarge',
} as const;

/** What a file brings, ready to be added under a name of its own. */
export type SharedFile =
  | { kind: 'template'; name: string; scene: ClassroomScene }
  | { kind: 'preset'; name: string; weights: MixPresetWeights };

const envelope = (kind: SharedFile['kind'], now: Date) => ({
  format: SHARE_FILE_FORMATS[kind],
  version: SHARE_FILE_VERSION,
  app: getAppVersion(),
  savedAt: now.toISOString(),
});

/** A room template as a file: its name and its tables and elements. */
export function buildTemplateFile(
  template: Pick<ClassroomTemplate, 'name' | 'scene'>,
  now: Date = new Date(),
): string {
  return JSON.stringify(
    {
      ...envelope('template', now),
      template: { name: template.name, scene: template.scene },
    },
    null,
    2,
  );
}

/**
 * A preset as a file: its name and every weight, with what the weights mean
 * (decision 0031), so a later app can bring them up to date.
 */
export function buildPresetFile(
  preset: { name: string; weights: MixPresetWeights },
  now: Date = new Date(),
): string {
  return JSON.stringify(
    {
      ...envelope('preset', now),
      preset: {
        name: preset.name,
        weights: preset.weights,
        criteriaVersion: MIX_CRITERIA_VERSION,
      },
    },
    null,
    2,
  );
}

/**
 * The file's name: what it is and the entry's name, without the characters
 * Windows refuses — `Raumvorlage Raum 204.klassenplan`.
 */
export function sharedFileName(kind: string, name: string): string {
  const safe = `${kind} ${name}`
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return `${safe}${BACKUP_FILE_EXTENSION}`;
}

/**
 * What a parsed file brings when it is a template's or a preset's, `null` when
 * it is none (a backup's envelope, say, which the restore reads). A file that
 * names one of the two formats but does not hold it, or that a newer app
 * wrote, throws a `BackupValidationError` with the message to show.
 *
 * @param textLength - The file's length, refused above `SHARE_FILE_MAX_BYTES`
 */
export function readSharedFile(
  value: unknown,
  textLength = 0,
): SharedFile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const kind =
    record.format === SHARE_FILE_FORMATS.template
      ? 'template'
      : record.format === SHARE_FILE_FORMATS.preset
        ? 'preset'
        : null;
  if (!kind) {
    if (
      typeof record.format === 'string' &&
      record.format.startsWith('klassenplan-')
    ) {
      // A kind of file a later app may add: not this app's to read.
      throw new BackupValidationError(SHARE_FILE_ERRORS.newer);
    }
    return null;
  }
  if (textLength > SHARE_FILE_MAX_BYTES) {
    throw new BackupValidationError(SHARE_FILE_ERRORS.tooLarge);
  }
  if (typeof record.version !== 'number') {
    throw new BackupValidationError(SHARE_FILE_ERRORS.unreadable);
  }
  if (record.version > SHARE_FILE_VERSION) {
    throw new BackupValidationError(SHARE_FILE_ERRORS.newer);
  }

  try {
    if (kind === 'template') {
      const template = record.template;
      validateSharedTemplate(template);
      return {
        kind,
        name: template.name.trim(),
        scene: template.scene,
      };
    }
    const preset = record.preset;
    validateSharedPreset(preset);
    // The store's own reading: missing criteria off, older weights lifted.
    const [normalized] = normalizeMixPresetData({
      version: 1,
      overrides: {},
      presets: [{ ...preset, id: 'shared' }],
    }).presets;
    if (!normalized) {
      throw new BackupValidationError(SHARE_FILE_ERRORS.unreadable);
    }
    return { kind, name: normalized.name, weights: normalized.weights };
  } catch (error) {
    if (error instanceof BackupValidationError) {
      // The backup's messages speak of a backup; this is none.
      throw new BackupValidationError(SHARE_FILE_ERRORS.unreadable);
    }
    throw error;
  }
}
