// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The work of the automatic backup (decision 0050), loaded once it is needed:
 * looking whether a file is due, writing it, setting the backup up and
 * stopping it. `useAutoBackup` stays in the start-up bundle and keeps only
 * what a click must do at once — the folder picker, the permission prompt.
 */
import {
  setAutoBackupState,
  type AutoBackupDeps,
} from '@/hooks/persistence/autoBackupStatus';
import {
  loadAutoBackupConfig,
  noteAutoBackupWritten,
  removeAutoBackupConfig,
  saveAutoBackupConfig,
  type AutoBackupConfig,
} from '@/repositories/autoBackupStore';
import {
  deriveStoredBackupKey,
  encryptJsonWithKey,
} from '@/utils/data/backupCrypto';
import {
  autoBackupFileName,
  autoBackupFilesToRemove,
  isAutoBackupDue,
} from '@/utils/data/autoBackup';
import { recordBackupCreated } from '@/utils/data/backupReminder';
import { confirmInStatusBar } from '@/utils/ui/statusNotice';
import { showToast } from '@/utils/ui/toast';
import { isWebCryptoAvailable, logError } from '@/utils';

const LOG_SOURCE = 'autoBackupRunner';
const READ_WRITE = { mode: 'readwrite' } as const;

let current: AutoBackupConfig | null = null;
let busy = false;

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

function publish(config: AutoBackupConfig | null, waiting = false): void {
  setAutoBackupState({
    configured: config !== null,
    folderName: config?.folderName ?? null,
    lastWrittenAt: config?.lastWrittenAt ?? null,
    waiting: config !== null && waiting,
  });
}

/** Writes today's file and lets the oldest beyond seven go. */
async function write(
  config: AutoBackupConfig,
  deps: AutoBackupDeps,
): Promise<void> {
  const now = new Date();
  const contents = await encryptJsonWithKey(
    await deps.exportAllAsJson(),
    config,
  );
  const file = await config.folder.getFileHandle(autoBackupFileName(now), {
    create: true,
  });
  const writable = await file.createWritable();
  await writable.write(contents);
  await writable.close();

  const names: string[] = [];
  for await (const name of config.folder.keys()) names.push(name);
  for (const name of autoBackupFilesToRemove(names)) {
    await config.folder.removeEntry(name).catch((error: unknown) => {
      logError(
        'Failed to remove an old automatic backup',
        { error },
        LOG_SOURCE,
      );
    });
  }

  const at = now.toISOString();
  await noteAutoBackupWritten(at);
  // A backup like any other: the reminder after 30 days starts again.
  recordBackupCreated();
  current = { ...config, lastWrittenAt: at };
  publish(current);
}

/** When a class last changed, as the classes are stored. */
async function lastChangeAt(deps: AutoBackupDeps): Promise<string | null> {
  const result = await deps.listClasses();
  if (!result.success || result.data.length === 0) return null;
  return (
    result.data
      .map((entry) => entry.updatedAt)
      .sort()
      .at(-1) ?? null
  );
}

/** Writes a file when one is due and the folder may be written. */
async function check(deps: AutoBackupDeps): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const config = await loadAutoBackupConfig();
    current = config;
    if (!config) {
      publish(null);
      return;
    }
    const due = isAutoBackupDue({
      lastWrittenAt: config.lastWrittenAt,
      lastChangeAt: await lastChangeAt(deps),
      now: new Date(),
    });
    if (!due) {
      publish(config);
      return;
    }
    const permission =
      (await config.folder.queryPermission?.(READ_WRITE)) ?? 'granted';
    if (permission !== 'granted') {
      publish(config, true);
      return;
    }
    await write(config, deps);
  } catch (error) {
    logError('Automatic backup failed', { error }, LOG_SOURCE);
    publish(current, true);
  } finally {
    busy = false;
  }
}

/** Takes the folder the picker gave, asks for the password, writes at once. */
async function finishSetUp(
  chosen: Promise<FileSystemDirectoryHandle>,
  deps: AutoBackupDeps,
): Promise<void> {
  let folder: FileSystemDirectoryHandle;
  try {
    folder = await chosen;
  } catch (error) {
    if (!isAbort(error)) {
      logError('Choosing the backup folder failed', { error }, LOG_SOURCE);
      showToast('error', 'toast:backup.autoBackupFailed');
    }
    return;
  }
  try {
    if (!isWebCryptoAvailable()) {
      showToast('error', 'toast:backup.webCryptoExportError');
      return;
    }
    const { promptBackupPassword } =
      await import('@/services/ui/backupDialogs');
    const password = await promptBackupPassword('auto');
    if (!password) return;
    const key = await deriveStoredBackupKey(password);
    const config: AutoBackupConfig = {
      ...key,
      version: 1,
      folder,
      folderName: folder.name,
      lastWrittenAt: null,
    };
    await saveAutoBackupConfig(config);
    current = config;
    publish(config);
    await write(config, deps);
    confirmInStatusBar('autoBackupOn', 'generator:shell.notice.autoBackupOn');
  } catch (error) {
    logError('Setting up the automatic backup failed', { error }, LOG_SOURCE);
    showToast('error', 'toast:backup.autoBackupFailed');
    publish(current, current !== null);
  }
}

async function stop(): Promise<void> {
  try {
    await removeAutoBackupConfig();
    current = null;
    publish(null);
    confirmInStatusBar('autoBackupOff', 'generator:shell.notice.autoBackupOff');
  } catch (error) {
    logError('Stopping the automatic backup failed', { error }, LOG_SOURCE);
    showToast('error', 'toast:errors.storage');
  }
}

/**
 * Asks for the folder again and writes what is due. Called in the click,
 * which the browser's prompt needs: nothing awaits before it.
 */
async function resume(deps: AutoBackupDeps): Promise<void> {
  const config = current;
  if (!config) return;
  try {
    const permission =
      (await config.folder.requestPermission?.(READ_WRITE)) ?? 'granted';
    if (permission !== 'granted') return;
    await write(config, deps);
    confirmInStatusBar('backupSaved', 'generator:storage.backupExported');
  } catch (error) {
    logError('Resuming the automatic backup failed', { error }, LOG_SOURCE);
    showToast('error', 'toast:backup.autoBackupFailed');
  }
}

/** One object, as `loadOnDemand` hands the module out. */
export default { check, finishSetUp, stop, resume };
