// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useRef } from 'react';
import {
  promptBackupPassword,
  promptBackupRestoreMode,
} from '@/services/ui/backupDialogs';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { recordBackupCreated } from '@/utils/data/backupReminder';
import {
  BACKUP_ERROR_MESSAGES,
  BACKUP_LIMITS,
  BackupValidationError,
  parseEncryptedBackupPayload,
  type EncryptedBackupPayload,
} from '@/utils/validation/backupValidation';
import {
  logError,
  webCrypto,
  isWebCryptoAvailable,
  WebCryptoUnavailableError,
  downloadBlob,
} from '@/utils';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const aad = encoder.encode('klassenplan-backup-v1');
const WEB_CRYPTO_EXPORT_ERROR_MESSAGE = 'toast:backup.webCryptoExportError';
const WEB_CRYPTO_IMPORT_ERROR_MESSAGE = 'toast:backup.webCryptoImportError';

const KDF_HASH = 'SHA-256';
export const KDF_ITERATIONS = 600000;
// Backups written before the KDF parameters were stored in the envelope
// were derived with this fixed iteration count and must stay importable.
export const LEGACY_KDF_ITERATIONS = 250000;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  // Convert buffer to Base64 string
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  // Decode Base64 string to Uint8Array
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const keyMaterial = await webCrypto.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webCrypto.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: KDF_HASH,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptJson(json: string, password: string) {
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, KDF_ITERATIONS);
  const data = await webCrypto.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoder.encode(json),
  );
  return JSON.stringify({
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: KDF_HASH, iterations: KDF_ITERATIONS },
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    data: bufferToBase64(data),
  });
}

async function decryptJson(payload: EncryptedBackupPayload, password: string) {
  const iv = base64ToBuffer(payload.iv);
  const salt = base64ToBuffer(payload.salt);
  const iterations = payload.kdf?.iterations ?? LEGACY_KDF_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);
  const decrypted = await webCrypto.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    base64ToBuffer(payload.data),
  );
  return decoder.decode(decrypted);
}

interface Options {
  exportAllAsJson: () => Promise<string>;
  importAllFromJson: (
    text: string,
    opts?: { merge?: boolean },
  ) => Promise<void>;
}

export default function useDataBackup({
  exportAllAsJson,
  importAllFromJson,
}: Options) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger file selection dialog
  const triggerImport = () => {
    importInputRef.current?.click();
  };

  // Export all data as downloadable JSON file
  const handleExportAll = async () => {
    try {
      if (!isWebCryptoAvailable()) {
        handleWebCryptoUnavailable('export');
        return;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `klassenplan-backup-${stamp}.json`;

      // Ask for password first (before file dialog). The dialog enforces the
      // minimum length and the confirmation match itself.
      const password = await promptBackupPassword('create');
      if (!password) return;

      // Encrypt data
      const json = await exportAllAsJson();
      const output = await encryptJson(json, password);

      const saved = await downloadBlob(output, filename, 'application/json', {
        logContext: 'useDataBackup',
        filePickerTypes: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      // Confirm only once the file was actually written — the password prompt
      // and the save dialog both come after the click.
      if (saved) {
        recordBackupCreated();
        showToast('success', 'generator:storage.backupExported');
      }
    } catch (e) {
      if (e instanceof WebCryptoUnavailableError) {
        handleWebCryptoUnavailable('export', e);
      } else {
        logError('Export failed', { error: e }, 'useDataBackup');
        showToast('error', TOAST_MESSAGES.EXPORT_ERROR);
      }
    }
  };

  // Handle import from selected JSON file
  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    if (file.size > BACKUP_LIMITS.encryptedFileBytes) {
      showToast('error', TOAST_MESSAGES.VALIDATION_FILE_TOO_LARGE);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || '');
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new BackupValidationError(BACKUP_ERROR_MESSAGES.unreadable);
        }
        const encryptedPayload = parseEncryptedBackupPayload(parsed);
        if (!isWebCryptoAvailable()) {
          handleWebCryptoUnavailable('import');
          return;
        }
        const password = await promptBackupPassword('unlock');
        if (password === null) return;
        let decrypted;
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

        // Let the user choose between replacing everything and merging the
        // backup into the existing data.
        const restoreMode = await promptBackupRestoreMode();
        if (!restoreMode) return;

        await importAllFromJson(decrypted, {
          merge: restoreMode === 'merge',
        });
        showToast('success', TOAST_MESSAGES.BACKUP_IMPORT_SUCCESS);
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

  return { importInputRef, triggerImport, handleExportAll, handleImportFile };
}
