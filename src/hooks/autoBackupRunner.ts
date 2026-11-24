// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The work of the automatic backup (decision 0050), loaded once it is needed:
 * looking whether a file is due, writing it, setting the backup up and
 * stopping it. `useAutoBackup` stays in the start-up bundle and keeps only
 * what a click must do at once — the folder picker, the permission prompt.
 */
import i18n from '@/i18n';
import {
  setAutoBackupState,
  type AutoBackupDeps,
  type AutoBackupFailure,
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
import { BackupExportError } from '@/utils/validation/backupLimits';
import { confirmInStatusBar } from '@/utils/ui/statusNotice';
import { showToast } from '@/utils/ui/toast';
import { isWebCryptoAvailable, logError } from '@/utils';

const LOG_SOURCE = 'autoBackupRunner';
const READ_WRITE = { mode: 'readwrite' } as const;
/** How long "Rückgängig" brings a backup just stopped back. */
const UNDO_DURATION_MS = 8000;

let current: AutoBackupConfig | null = null;
let busy = false;
/**
 * Why the last write failed, and when. A look tries again only once a class
 * changed since: a backup too large stays so until then, and every look
 * would build it anew. The status bar's button tries at once.
 */
let failed: { failure: AutoBackupFailure; at: number } | null = null;

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Says where the backup stands. A folder to allow again comes first: the
 * click that allows it writes, and says a failure then.
 */
function publish(config: AutoBackupConfig | null, waiting = false): void {
  setAutoBackupState({
    configured: config !== null,
    folderName: config?.folderName ?? null,
    lastWrittenAt: config?.lastWrittenAt ?? null,
    waiting: config !== null && waiting,
    failure: config !== null && !waiting ? (failed?.failure ?? null) : null,
  });
}

/** Why a write failed, in what the teacher can act on. */
function failureOf(error: unknown): AutoBackupFailure {
  if (error instanceof BackupExportError) {
    return error.reason === 'tooLarge'
      ? {
          reason: 'tooLarge',
          sizeBytes: error.sizeBytes,
          maxBytes: error.maxBytes,
        }
      : { reason: 'notRestorable' };
  }
  // The folder was moved, deleted or taken out of the browser's reach.
  if (
    error instanceof DOMException &&
    (error.name === 'NotFoundError' || error.name === 'NotAllowedError')
  ) {
    return { reason: 'folder' };
  }
  return { reason: 'write' };
}

/**
 * Notes a failed write: the status bar says so and tries again on a click,
 * the backup menu offers to set the backup up anew.
 */
function noteFailure(error: unknown): AutoBackupFailure {
  const failure = failureOf(error);
  failed = { failure, at: Date.now() };
  publish(current);
  return failure;
}

/** Megabytes for a message, rounded up as the backup by hand rounds them. */
const toMegabytes = (bytes: number) => Math.ceil(bytes / (1024 * 1024));

/**
 * What a failure says to the teacher who asked for the file: the words of
 * the backup by hand where the export refused it.
 */
function failureMessage(failure: AutoBackupFailure, folderName: string) {
  switch (failure.reason) {
    case 'tooLarge':
      return i18n.t('toast:backup.exportTooLarge', {
        size: toMegabytes(failure.sizeBytes),
        max: toMegabytes(failure.maxBytes),
      });
    case 'notRestorable':
      return 'toast:backup.exportNotRestorable';
    case 'folder':
      return i18n.t('toast:backup.autoBackupFolderGone', {
        folder: folderName,
      });
    default:
      return 'toast:backup.autoBackupFailed';
  }
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
  failed = null;
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
      failed = null;
      publish(null);
      return;
    }
    const changedAt = await lastChangeAt(deps);
    if (failed && !(changedAt !== null && Date.parse(changedAt) > failed.at)) {
      publish(config);
      return;
    }
    const due = isAutoBackupDue({
      lastWrittenAt: config.lastWrittenAt,
      lastChangeAt: changedAt,
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
    noteFailure(error);
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
  let config: AutoBackupConfig;
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
    config = {
      ...key,
      version: 1,
      folder,
      folderName: folder.name,
      lastWrittenAt: null,
    };
    await saveAutoBackupConfig(config);
    current = config;
    failed = null;
    publish(config);
  } catch (error) {
    logError('Setting up the automatic backup failed', { error }, LOG_SOURCE);
    showToast('error', 'toast:backup.autoBackupFailed');
    publish(current);
    return;
  }
  // Set up from here: a first file that fails is a failure of the backup,
  // said with its reason, and the menu offers to set it up anew.
  try {
    await write(config, deps);
    confirmInStatusBar('autoBackupOn', 'generator:shell.notice.autoBackupOn');
  } catch (error) {
    logError('The first automatic backup failed', { error }, LOG_SOURCE);
    showToast('error', failureMessage(noteFailure(error), config.folderName));
  }
}

/** Puts a backup just stopped back, unless another was set up meanwhile. */
async function bringBack(config: AutoBackupConfig): Promise<void> {
  if (await loadAutoBackupConfig()) return;
  await saveAutoBackupConfig(config);
  current = config;
  failed = null;
  publish(config);
}

/**
 * Ends the automatic backup without asking: "Rückgängig" brings the folder
 * and the key back as they were (decision 0041) — setting it up anew would
 * take a folder and a password again.
 */
async function stop(): Promise<void> {
  let stopped: AutoBackupConfig | null;
  try {
    stopped = (await loadAutoBackupConfig()) ?? current;
    await removeAutoBackupConfig();
  } catch (error) {
    logError('Stopping the automatic backup failed', { error }, LOG_SOURCE);
    showToast('error', 'toast:errors.storage');
    return;
  }
  current = null;
  failed = null;
  publish(null);
  if (!stopped) return;
  const kept = stopped;
  showToast('info', 'toast:backup.autoBackupStopped', {
    duration: UNDO_DURATION_MS,
    action: {
      label: i18n.t('common:buttons.undo'),
      onClick: () => {
        bringBack(kept).catch((error: unknown) => {
          logError(
            'Bringing the automatic backup back failed',
            { error },
            LOG_SOURCE,
          );
          showToast('error', 'toast:errors.storage');
        });
      },
    },
  });
}

/**
 * Asks for the folder again and writes what is due, or tries a failed write
 * again; a failure says why. Called in the click, which the browser's prompt
 * needs: nothing awaits before it.
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
    showToast('error', failureMessage(noteFailure(error), config.folderName));
  }
}

/** One object, as `loadOnDemand` hands the module out. */
export default { check, finishSetUp, stop, resume };
