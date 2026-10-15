// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * The backup's own file type. The content is the encrypted JSON envelope
 * described in `docs/backup-format.md`; the extension exists so an installed
 * app can register itself for these files (`file_handlers` in
 * `vite.config.ts`) without claiming every JSON file on the computer.
 */
export const BACKUP_FILE_EXTENSION = '.klassenplan';

/** Older backups carry this extension and still import. */
const LEGACY_BACKUP_FILE_EXTENSION = '.json';

/**
 * The media type the save dialog and the manifest pair with the extension.
 * Not registered anywhere; browsers match these files by their extension.
 */
export const BACKUP_FILE_MEDIA_TYPE = 'application/x-klassenplan';

/** What the file input for a restore offers. */
export const BACKUP_FILE_ACCEPT = `${BACKUP_FILE_EXTENSION},${LEGACY_BACKUP_FILE_EXTENSION}`;

/** `backup-2026-10-15T08-30-00-000Z.klassenplan` */
export const backupFileName = (date: Date = new Date()): string =>
  `backup-${date.toISOString().replace(/[:.]/g, '-')}${BACKUP_FILE_EXTENSION}`;
