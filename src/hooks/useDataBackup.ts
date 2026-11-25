// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useRef } from 'react';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { confirmInStatusBar } from '@/utils/ui/statusNotice';
import { recordBackupCreated } from '@/utils/data/backupReminder';
import {
  BACKUP_ERROR_MESSAGES,
  BACKUP_LIMITS,
  BackupExportError,
  BackupValidationError,
} from '@/utils/validation/backupLimits';
import { decryptJson, encryptJson } from '@/utils/data/backupCrypto';
import type { BackupImportOutcome } from '@/services/backup/dataBackup';
import type { SharedFile } from '@/utils/data/shareFiles';
import i18n from '@/i18n';
import type { ClassRecord } from '@/types';
import {
  BACKUP_FILE_EXTENSION,
  BACKUP_FILE_MEDIA_TYPE,
  backupFileName,
} from '@/config/backupFile';
import {
  logError,
  isWebCryptoAvailable,
  WebCryptoUnavailableError,
  downloadBlob,
  formatLongDate,
  MAX_MIX_PRESETS,
} from '@/utils';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';
import { dehydrateCollection } from '@/utils/data/storedSeating';

const WEB_CRYPTO_EXPORT_ERROR_MESSAGE = 'toast:backup.webCryptoExportError';
const WEB_CRYPTO_IMPORT_ERROR_MESSAGE = 'toast:backup.webCryptoImportError';

// The password and restore dialogs and the payload validators are needed only
// once a backup is exported or imported, so they load then instead of with the
// app. A failed load ends up in the same error toast as any other failure.
const loadBackupDialogs = () => import('@/services/ui/backupDialogs');
const loadBackupValidation = () =>
  import('@/utils/validation/backupValidation');
const loadShareFiles = () => import('@/utils/data/shareFiles');
const loadConfirmDialog = () => import('@/services/ui/dialogs');
const loadConfirmFacts = () => import('@/components/ui/modals/confirmFacts');

function handleWebCryptoUnavailable(
  context: 'export' | 'import',
  error?: unknown,
) {
  logError('WebCrypto unavailable', { context, error }, 'useDataBackup');
  const message =
    context === 'export'
      ? WEB_CRYPTO_EXPORT_ERROR_MESSAGE
      : WEB_CRYPTO_IMPORT_ERROR_MESSAGE;
  showToast('error', message);
}

interface Options {
  exportAllAsJson: () => Promise<string>;
  importAllFromJson: (
    text: string,
    opts?: { merge?: boolean },
  ) => Promise<BackupImportOutcome>;
  /**
   * Adds what a room template's or a preset's file brings (decision 0046),
   * which comes the backup's way and is no backup.
   */
  openSharedFile?: (shared: SharedFile) => Promise<void>;
}

/**
 * What a merge says it did: the classes that came, else the templates, else
 * that the backup held nothing this device lacks — a merge of a device's own
 * backup adds nothing, and a plain "imported" would hide that.
 */
function showMergeOutcome(
  outcome: Extract<BackupImportOutcome, { merge: true }>,
) {
  if (outcome.addedClasses > 0) {
    showToast(
      'success',
      i18n.t('toast:backup.mergedClasses', { count: outcome.addedClasses }),
    );
  } else if (outcome.addedTemplates > 0) {
    showToast(
      'success',
      i18n.t('toast:backup.mergedTemplates', {
        count: outcome.addedTemplates,
      }),
    );
  } else {
    showToast('info', 'toast:backup.mergedNothing');
  }
  if (outcome.leftOutPresets) {
    showToast(
      'warning',
      i18n.t('toast:backup.presetsLeftOut', {
        count: outcome.leftOutPresets,
        max: MAX_MIX_PRESETS,
      }),
    );
  }
}

/** Megabytes for a message, rounded up so the size is never understated. */

const toMegabytes = (bytes: number) => Math.ceil(bytes / (1024 * 1024));

/** Why no backup file came: the import would not have read it back. */
function showBackupExportRefusal(error: BackupExportError) {
  if (error.reason === 'tooLarge') {
    showToast(
      'error',
      i18n.t('toast:backup.exportTooLarge', {
        size: toMegabytes(error.sizeBytes),
        max: toMegabytes(error.maxBytes),
      }),
    );
    return;
  }
  showToast('error', 'toast:backup.exportNotRestorable');
}

export default function useDataBackup({
  exportAllAsJson,
  importAllFromJson,
  openSharedFile,
}: Options) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const repository = useSeatingRepository();

  // Trigger file selection dialog
  const triggerImport = () => {
    importInputRef.current?.click();
  };

  // Export all data as an encrypted backup file
  const handleExportAll = async () => {
    try {
      if (!isWebCryptoAvailable()) {
        handleWebCryptoUnavailable('export');
        return;
      }
      const filename = backupFileName();

      // Ask for password first (before file dialog). The dialog enforces the
      // minimum length and the confirmation match itself.
      const { promptBackupPassword } = await loadBackupDialogs();
      const password = await promptBackupPassword('create');
      if (!password) return;

      // Encrypt data
      const json = await exportAllAsJson();
      const output = await encryptJson(json, password);

      // A neutral blob type: Safari names a download after its type and
      // would turn an unknown one into `….klassenplan.json`.
      const saved = await downloadBlob(
        output,
        filename,
        'application/octet-stream',
        {
          logContext: 'useDataBackup',
          filePickerTypes: [
            {
              description: 'Klassenplan Backup',
              accept: { [BACKUP_FILE_MEDIA_TYPE]: [BACKUP_FILE_EXTENSION] },
            },
          ],
        },
      );
      // Confirm only once the file was actually written — the password prompt
      // and the save dialog both come after the click.
      if (saved) {
        recordBackupCreated();
        // The file is saved where the browser keeps it; the status bar's
        // line says so, where there is one.
        confirmInStatusBar('backupSaved', 'generator:storage.backupExported');
      }
    } catch (e) {
      if (e instanceof WebCryptoUnavailableError) {
        handleWebCryptoUnavailable('export', e);
      } else if (e instanceof BackupExportError) {
        showBackupExportRefusal(e);
      } else {
        logError('Export failed', { error: e }, 'useDataBackup');
        showToast('error', TOAST_MESSAGES.EXPORT_ERROR);
      }
    }
  };

  /**
   * Restores a backup file: asks for its password, then how it applies. The
   * file comes from the file input or, in the installed app, from the system
   * when a backup was opened with it (`useBackupFileLaunch`). A room
   * template's or a preset's file takes the same way in and is told apart by
   * its content (decision 0046).
   */
  const importBackupFile = (file: File) => {
    if (file.size > BACKUP_LIMITS.encryptedFileBytes) {
      showToast('error', TOAST_MESSAGES.VALIDATION_FILE_TOO_LARGE);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const [{ parseEncryptedBackupPayload }, dialogs] = await Promise.all([
          loadBackupValidation(),
          loadBackupDialogs(),
        ]);
        const text = String(reader.result || '');
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new BackupValidationError(BACKUP_ERROR_MESSAGES.unreadable);
        }
        const shared = openSharedFile
          ? (await loadShareFiles()).readSharedFile(parsed, text.length)
          : null;
        if (shared && openSharedFile) {
          await openSharedFile(shared);
          return;
        }
        const encryptedPayload = parseEncryptedBackupPayload(parsed);
        if (!isWebCryptoAvailable()) {
          handleWebCryptoUnavailable('import');
          return;
        }
        // The dialog tries the password itself and stays open on a wrong
        // one, saying so under the field (decision 0037); the backup it
        // opened is kept here.
        let decrypted: Awaited<ReturnType<typeof decryptJson>> | undefined;
        let cryptoError: WebCryptoUnavailableError | null = null;
        const password = await dialogs.promptBackupPassword(
          'unlock',
          async (candidate) => {
            try {
              decrypted = await decryptJson(encryptedPayload, candidate);
              return null;
            } catch (error) {
              if (error instanceof WebCryptoUnavailableError) {
                // Nothing a second password changes: let the dialog close.
                cryptoError = error;
                return null;
              }
              logError('Decrypt failed', { error }, 'useDataBackup');
              return i18n.t('common:backupPassword.errorWrong');
            }
          },
        );
        if (password === null) return;
        if (cryptoError) {
          handleWebCryptoUnavailable('import', cryptoError);
          return;
        }
        if (decrypted === undefined) {
          // A dialog that did not try the password leaves it to us.
          try {
            decrypted = await decryptJson(encryptedPayload, password);
          } catch (error) {
            if (error instanceof WebCryptoUnavailableError) {
              handleWebCryptoUnavailable('import', error);
            } else {
              logError('Decrypt failed', { error }, 'useDataBackup');
              showToast('error', 'toast:backup.decryptFailed');
            }
            return;
          }
        }

        // Let the user choose between replacing everything and merging the
        // backup into the existing data.
        const restoreMode = await dialogs.promptBackupRestoreMode();
        if (!restoreMode) return;

        const outcome = await importAllFromJson(decrypted, {
          merge: restoreMode === 'merge',
        });
        if (outcome.merge) {
          showMergeOutcome(outcome);
        } else {
          showToast('success', TOAST_MESSAGES.BACKUP_IMPORT_SUCCESS);
        }
      } catch (err) {
        if (err instanceof WebCryptoUnavailableError) {
          handleWebCryptoUnavailable('import', err);
        } else if (err instanceof BackupValidationError) {
          logError('Import failed', { error: err }, 'useDataBackup');
          showToast('error', err.message);
        } else {
          logError('Import failed', { error: err }, 'useDataBackup');
          showToast('error', BACKUP_ERROR_MESSAGES.processingFailed);
        }
      }
    };
    reader.onerror = (error) => {
      logError('FileReader failed', { error }, 'useDataBackup');
      showToast('error', BACKUP_ERROR_MESSAGES.processingFailed);
      reader.abort();
    };
    reader.readAsText(file);
  };

  /**
   * Brings back the classes as they were before the switch to a key per
   * class, kept 30 days (decision 0049). The way a backup comes back with
   * "Alles ersetzen": everything else stays as it is now — templates,
   * presets, photos — and the classes are the copy's.
   */
  const restoreClassesFromBeforeUpdate = async () => {
    try {
      const [retiredResult, currentResult] = await Promise.all([
        repository.loadRetiredClasses(),
        repository.loadClassCollection(),
      ]);
      const retired = retiredResult.success ? retiredResult.data : null;
      if (!retired) {
        showToast('info', 'toast:backup.beforeUpdateGone');
        return;
      }
      const [{ confirmDialog }, { compareClassFacts }] = await Promise.all([
        loadConfirmDialog(),
        loadConfirmFacts(),
      ]);
      const now = currentResult.success ? currentResult.data.classes : [];
      const before = retired.collection.classes;
      const namesOnlyIn = (
        classes: readonly ClassRecord[],
        other: readonly ClassRecord[],
      ) => {
        const ids = new Set(other.map((entry) => entry.id));
        return classes
          .filter((entry) => !ids.has(entry.id))
          .map((entry) => entry.name)
          .join(', ');
      };
      const onlyNow = namesOnlyIn(now, before);
      const onlyBefore = namesOnlyIn(before, now);
      // A window still on 3.4.0 writes into the copy after the switch
      // (decision 0049, addendum of 2026-11-25): it holds the state of its
      // newest change, which may be later than the switch.
      const asOf = Math.max(
        Date.parse(retired.retiredAt),
        ...before
          .map((entry) => Date.parse(entry.updatedAt))
          .filter(Number.isFinite),
      );
      const confirmed = await confirmDialog({
        icon: ClockCounterClockwiseIcon,
        title: i18n.t('common:dialogs.beforeUpdate.title'),
        meta: i18n.t('common:dialogs.beforeUpdate.meta', {
          date: formatLongDate(asOf),
          until: formatLongDate(retired.keptUntil),
        }),
        comparison: {
          columns: [
            i18n.t('common:dialogs.beforeUpdate.now'),
            i18n.t('common:dialogs.beforeUpdate.before'),
          ],
          rows: compareClassFacts(now, before),
          notes: [
            onlyNow &&
              i18n.t('common:dialogs.beforeUpdate.onlyNow', { names: onlyNow }),
            onlyBefore &&
              i18n.t('common:dialogs.beforeUpdate.onlyBefore', {
                names: onlyBefore,
              }),
          ].filter((note): note is string => !!note),
        },
        message: i18n.t('common:dialogs.beforeUpdate.message'),
        confirmLabel: i18n.t('common:dialogs.beforeUpdate.confirm'),
      });
      if (!confirmed) return;

      const bundle = JSON.parse(await exportAllAsJson()) as Record<
        string,
        unknown
      >;
      bundle.classCollection = dehydrateCollection(retired.collection);
      await importAllFromJson(JSON.stringify(bundle), { merge: false });
      showToast('success', 'toast:backup.beforeUpdateRestored');
    } catch (error) {
      if (error instanceof BackupExportError) {
        showBackupExportRefusal(error);
        return;
      }
      logError(
        'Restoring the classes from before the update failed',
        { error },
        'useDataBackup',
      );
      showToast('error', BACKUP_ERROR_MESSAGES.processingFailed);
    }
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (file) importBackupFile(file);
  };

  return {
    importInputRef,
    triggerImport,
    handleExportAll,
    handleImportFile,
    importBackupFile,
    restoreClassesFromBeforeUpdate,
  };
}
