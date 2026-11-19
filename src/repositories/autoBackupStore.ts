// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What the automatic backup keeps on the device (decision 0050): the folder
 * the teacher chose, the key it encrypts with, and when it last wrote.
 *
 * The folder's handle and the key are kept as IndexedDB keeps them —
 * structured clones, which only this origin can use again. The key encrypts
 * and nothing else and never leaves the browser (`deriveStoredBackupKey`);
 * the password it came from is not kept anywhere. None of it goes into a
 * backup: on another device the teacher chooses a folder anew.
 */
import { DB_KEYS } from '@/utils/data/storageKeys';
import type { StoredBackupKey } from '@/utils/data/backupCrypto';
import {
  changeStored,
  deleteValue,
  readValue,
  UNCHANGED,
  writeValue,
} from './idbClient';
import { isFromNewerVersion } from './newerStoredData';

const AUTO_BACKUP_VERSION = 1;

export interface AutoBackupConfig extends StoredBackupKey {
  version: number;
  folder: FileSystemDirectoryHandle;
  /** As the folder is called, to name it in the menu. */
  folderName: string;
  /** When the last file was written, ISO 8601; null before the first. */
  lastWrittenAt: string | null;
}

/** The automatic backup as it is set up, or null where it is not. */
export async function loadAutoBackupConfig(): Promise<AutoBackupConfig | null> {
  const stored = await readValue<AutoBackupConfig>(DB_KEYS.autoBackup);
  if (!stored?.folder || !stored.key) return null;
  // A newer version's settings: this build leaves them to it.
  if (isFromNewerVersion(stored, AUTO_BACKUP_VERSION)) return null;
  return stored;
}

export function saveAutoBackupConfig(
  config: Omit<AutoBackupConfig, 'version'>,
): Promise<void> {
  return writeValue<AutoBackupConfig>(DB_KEYS.autoBackup, {
    ...config,
    version: AUTO_BACKUP_VERSION,
  });
}

/** Notes a file written; settings removed meanwhile stay removed. */
export function noteAutoBackupWritten(at: string): Promise<void> {
  return changeStored<AutoBackupConfig>(DB_KEYS.autoBackup, (current) =>
    current ? { ...current, lastWrittenAt: at } : UNCHANGED,
  );
}

export function removeAutoBackupConfig(): Promise<void> {
  return deleteValue(DB_KEYS.autoBackup);
}
