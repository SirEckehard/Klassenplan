// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@/types/file-system-access.d.ts';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import useDataBackup from '../useDataBackup';
import {
  promptBackupPassword,
  promptBackupRestoreMode,
} from '../../services/ui/backupDialogs';
import {
  BACKUP_ERROR_MESSAGES,
  BACKUP_LIMITS,
} from '../../utils/validation/backupValidation';
import { BackupExportError } from '@/utils/validation/backupLimits';
import { setupLocalStorageMock } from '../../__tests__/utils';
import * as toastModule from '../../utils/ui/toast';
import { TOAST_MESSAGES } from '../../utils/ui/toast';
import * as utilsModule from '@/utils';
import type { BackupImportOutcome } from '@/services/backup/dataBackup';

vi.mock('../../services/ui/backupDialogs', () => ({
  promptBackupPassword: vi.fn(),
  promptBackupRestoreMode: vi.fn(),
}));

const showToastMock = vi.spyOn(toastModule, 'showToast');

const mockPromptPassword = vi.mocked(promptBackupPassword);
const mockPromptRestoreMode = vi.mocked(promptBackupRestoreMode);

const { webCrypto, WebCryptoUnavailableError } = utilsModule;

let isWebCryptoAvailableSpy: MockInstance;
let getRandomValuesSpy: MockInstance;
let importKeySpy: MockInstance;
let deriveKeySpy: MockInstance;
let encryptSpy: MockInstance;
let decryptSpy: MockInstance;
let logErrorSpy: MockInstance;

describe('useDataBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupLocalStorageMock();
    showToastMock.mockClear();

    // The password dialog validates length and confirmation itself, so the
    // hook only ever sees a usable password or `null`.
    mockPromptPassword.mockResolvedValue('backup-passwort');
    mockPromptRestoreMode.mockResolvedValue('replace');

    isWebCryptoAvailableSpy = vi
      .spyOn(utilsModule, 'isWebCryptoAvailable')
      .mockImplementation(() => true);
    getRandomValuesSpy = vi
      .spyOn(webCrypto, 'getRandomValues')
      .mockImplementation(((array: ArrayBufferView) => {
        if (array instanceof Uint8Array) {
          array.fill(1);
        }
        return array;
      }) as typeof webCrypto.getRandomValues);
    importKeySpy = vi
      .spyOn(webCrypto, 'importKey')
      .mockResolvedValue({} as CryptoKey);
    deriveKeySpy = vi
      .spyOn(webCrypto, 'deriveKey')
      .mockResolvedValue({} as CryptoKey);
    encryptSpy = vi
      .spyOn(webCrypto, 'encrypt')
      .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    decryptSpy = vi
      .spyOn(webCrypto, 'decrypt')
      .mockResolvedValue(new TextEncoder().encode('{}').buffer);
    logErrorSpy = vi
      .spyOn(utilsModule, 'logError')
      .mockImplementation(() => {});

    // Mock file picker with writable stream
    const writable = { write: vi.fn(), close: vi.fn() } as const;
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn().mockResolvedValue({
        createWritable: vi.fn().mockResolvedValue(writable),
      }),
    );
  });

  afterEach(() => {
    isWebCryptoAvailableSpy.mockRestore();
    getRandomValuesSpy.mockRestore();
    importKeySpy.mockRestore();
    deriveKeySpy.mockRestore();
    encryptSpy.mockRestore();
    decryptSpy.mockRestore();
    logErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });
  it('provides backup handlers', () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );

    expect(typeof result.current.handleExportAll).toBe('function');
    expect(typeof result.current.triggerImport).toBe('function');
    expect(typeof result.current.handleImportFile).toBe('function');
    expect(result.current.importInputRef.current).toBeNull();
  });
  it('shows error toast on export failure', async () => {
    const exportFn = vi.fn().mockRejectedValue(new Error('fail'));
    const importFn = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    await act(async () => {
      await result.current.handleExportAll();
    });
    expect(exportFn).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('error', 'toast:export.error');
  });

  it('says why no file came when the import could not read the backup', async () => {
    const megabyte = 1024 * 1024;
    const exportFn = vi
      .fn()
      .mockRejectedValue(
        new BackupExportError('tooLarge', 25 * megabyte + 1, 24 * megabyte),
      );
    const downloadSpy = vi.spyOn(utilsModule, 'downloadBlob');
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: vi.fn() }),
    );

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      expect.stringMatching(/26 MB.*24 MB/),
    );
    downloadSpy.mockRestore();
  });

  it('does not call exportAllAsJson when password prompt is cancelled', async () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn();
    // Simulate user cancelling password prompt
    mockPromptPassword.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    await act(async () => {
      await result.current.handleExportAll();
    });
    expect(exportFn).not.toHaveBeenCalled();
  });

  it('stores the KDF parameters in the encrypted envelope', async () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn();
    const downloadSpy = vi
      .spyOn(utilsModule, 'downloadBlob')
      .mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    await act(async () => {
      await result.current.handleExportAll();
    });

    const [payload] = downloadSpy.mock.calls[0];
    const envelope = JSON.parse(payload as string);
    expect(envelope.kdf).toEqual({
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600000,
    });
    expect(deriveKeySpy).toHaveBeenCalledWith(
      expect.objectContaining({ iterations: 600000 }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    downloadSpy.mockRestore();
  });

  it('falls back to the legacy iteration count for envelopes without kdf', async () => {
    const exportFn = vi.fn();
    const importFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = JSON.stringify({
        encrypted: true,
        iv: 'AA==',
        salt: 'AA==',
        data: 'AA==',
      });
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    await act(async () => {
      result.current.handleImportFile({
        target: {
          files: [
            new File(['{}'], 'legacy.json', { type: 'application/json' }),
          ],
        },
        currentTarget: { value: '' },
      } as any);
      await Promise.resolve();
    });
    expect(deriveKeySpy).toHaveBeenCalledWith(
      expect.objectContaining({ iterations: 250000 }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  type ImportFn = (
    text: string,
    opts?: { merge?: boolean },
  ) => Promise<BackupImportOutcome>;

  const runImport = async (importFn: ImportFn): Promise<void> => {
    const { result } = renderHook(() =>
      useDataBackup({
        exportAllAsJson: vi.fn(),
        importAllFromJson: importFn,
      }),
    );
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = JSON.stringify({
        encrypted: true,
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000 },
        iv: 'AA==',
        salt: 'AA==',
        data: 'AA==',
      });
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    await act(async () => {
      result.current.handleImportFile({
        target: {
          files: [
            new File(['{}'], 'backup.json', { type: 'application/json' }),
          ],
        },
        currentTarget: { value: '' },
      } as any);
      await Promise.resolve();
    });
  };

  it('replaces existing data when the restore dialog returns "replace"', async () => {
    const importFn = vi.fn().mockResolvedValue({ merge: false });
    mockPromptRestoreMode.mockResolvedValue('replace');

    await runImport(importFn);

    expect(importFn).toHaveBeenCalledWith(expect.any(String), {
      merge: false,
    });
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'success',
        TOAST_MESSAGES.BACKUP_IMPORT_SUCCESS,
      ),
    );
  });

  // The dialog tries the password and stays open on a wrong one; the backup
  // it opened is the one restored (decision 0037).
  it('lets the password dialog try a wrong password, then the right one', async () => {
    const importFn = vi.fn().mockResolvedValue({ merge: false });
    decryptSpy.mockRejectedValueOnce(new Error('wrong password'));
    const answers: Array<string | null> = [];
    mockPromptPassword.mockImplementation(async (_mode, check) => {
      answers.push(await check!('falsch'));
      answers.push(await check!('richtig'));
      return 'richtig';
    });

    await runImport(importFn);

    await waitFor(() => expect(importFn).toHaveBeenCalled());
    expect(answers).toEqual([
      expect.stringMatching(/nicht öffnen|does not open/),
      null,
    ]);
    // Decrypted once by the dialog's check, not again afterwards.
    expect(decryptSpy).toHaveBeenCalledTimes(2);
    expect(showToastMock).not.toHaveBeenCalledWith(
      'error',
      'toast:backup.decryptFailed',
    );
  });

  it('restores a file handed over directly, as the installed app does', async () => {
    const importFn = vi.fn().mockResolvedValue({ merge: false });
    const { result } = renderHook(() =>
      useDataBackup({
        exportAllAsJson: vi.fn(),
        importAllFromJson: importFn,
      }),
    );
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = JSON.stringify({
        encrypted: true,
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000 },
        iv: 'AA==',
        salt: 'AA==',
        data: 'AA==',
      });
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);

    await act(async () => {
      result.current.importBackupFile(
        new File(['{}'], 'backup-2026-10-15.klassenplan'),
      );
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(importFn).toHaveBeenCalledWith(expect.any(String), {
        merge: false,
      }),
    );
  });

  it('hands a room template’s file on without a password (decision 0046)', async () => {
    const importFn = vi.fn();
    const openSharedFile = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDataBackup({
        exportAllAsJson: vi.fn(),
        importAllFromJson: importFn,
        openSharedFile,
      }),
    );
    const scene = { tables: [], totalStudents: 0 };
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = JSON.stringify({
        format: 'klassenplan-room-template',
        version: 1,
        template: { name: 'Raum 204', scene },
      });
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);

    await act(async () => {
      result.current.importBackupFile(
        new File(['{}'], 'Raumvorlage Raum 204.klassenplan'),
      );
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(openSharedFile).toHaveBeenCalledWith({
        kind: 'template',
        name: 'Raum 204',
        scene,
      }),
    );
    expect(mockPromptPassword).not.toHaveBeenCalled();
    expect(importFn).not.toHaveBeenCalled();
  });

  it('says a damaged preset file is no file it can open', async () => {
    const openSharedFile = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({
        exportAllAsJson: vi.fn(),
        importAllFromJson: vi.fn(),
        openSharedFile,
      }),
    );
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = JSON.stringify({
        format: 'klassenplan-mix-preset',
        version: 1,
        preset: { name: 'Ruhig', weights: 'none' },
      });
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);

    await act(async () => {
      result.current.importBackupFile(new File(['{}'], 'x.klassenplan'));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'error',
        'toast:sharedFile.unreadable',
      ),
    );
    expect(openSharedFile).not.toHaveBeenCalled();
  });

  it('merges into existing data when the restore dialog returns "merge"', async () => {
    const importFn = vi.fn().mockResolvedValue({
      merge: true,
      addedClasses: 2,
      addedTemplates: 1,
      leftOutPresets: 0,
    });
    mockPromptRestoreMode.mockResolvedValue('merge');

    await runImport(importFn);

    expect(importFn).toHaveBeenCalledWith(expect.any(String), { merge: true });
    // The classes that came are what the message counts.
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'success',
        expect.stringMatching(/2 Klassen|2 classes/),
      ),
    );
  });

  it('names the templates when a merge brought templates but no class', async () => {
    const importFn = vi.fn().mockResolvedValue({
      merge: true,
      addedClasses: 0,
      addedTemplates: 1,
      leftOutPresets: 0,
    });
    mockPromptRestoreMode.mockResolvedValue('merge');

    await runImport(importFn);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'success',
        expect.stringMatching(/1 Vorlage|1 template/),
      ),
    );
  });

  it('says so when a merge found nothing this device lacks', async () => {
    const importFn = vi.fn().mockResolvedValue({
      merge: true,
      addedClasses: 0,
      addedTemplates: 0,
      leftOutPresets: 0,
    });
    mockPromptRestoreMode.mockResolvedValue('merge');

    await runImport(importFn);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'info',
        'toast:backup.mergedNothing',
      ),
    );
    expect(showToastMock).not.toHaveBeenCalledWith(
      'success',
      TOAST_MESSAGES.BACKUP_IMPORT_SUCCESS,
    );
  });

  it('says how many own presets the limit kept out', async () => {
    const importFn = vi.fn().mockResolvedValue({
      merge: true,
      addedClasses: 1,
      addedTemplates: 0,
      leftOutPresets: 3,
    });
    mockPromptRestoreMode.mockResolvedValue('merge');

    await runImport(importFn);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'warning',
        expect.stringMatching(/3/),
      ),
    );
  });

  it('does not import when the restore dialog is cancelled', async () => {
    const importFn = vi.fn().mockResolvedValue({ merge: false });
    mockPromptRestoreMode.mockResolvedValue(null);

    await runImport(importFn);

    expect(importFn).not.toHaveBeenCalled();
  });

  it('does not call exportAllAsJson when save dialog is cancelled', async () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn();
    // Simulate user cancelling the save file picker
    (window.showSaveFilePicker as any).mockRejectedValue(
      new DOMException('Aborted', 'AbortError'),
    );
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    await act(async () => {
      await result.current.handleExportAll();
    });
    // Password is now asked first, so exportFn IS called
    expect(exportFn).toHaveBeenCalled();
    expect(promptBackupPassword).toHaveBeenCalledWith('create');
  });

  it('passes encrypted backup to download helper', async () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn();
    const downloadSpy = vi
      .spyOn(utilsModule, 'downloadBlob')
      .mockResolvedValue(true);

    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [payload, filename, mimeType, options] = downloadSpy.mock.calls[0];
    expect(typeof payload).toBe('string');
    expect(filename).toMatch(/^backup-.*\.klassenplan$/);
    // Neutral, so Safari keeps the extension instead of appending its own.
    expect(mimeType).toBe('application/octet-stream');
    expect(options).toMatchObject({
      logContext: 'useDataBackup',
      filePickerTypes: [
        { accept: { 'application/x-klassenplan': ['.klassenplan'] } },
      ],
    });

    downloadSpy.mockRestore();
  });

  it('shows error toast on invalid import file', async () => {
    const exportFn = vi.fn();
    const importFn = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = 'invalid';
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    await act(async () => {
      result.current.handleImportFile({
        target: {
          files: [new File(['x'], 'x.json', { type: 'application/json' })],
        },
        currentTarget: { value: '' },
      } as any);
      await Promise.resolve();
    });
    expect(importFn).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      BACKUP_ERROR_MESSAGES.unreadable,
    );
  });

  it('rejects oversized import files before reading', async () => {
    const exportFn = vi.fn();
    const importFn = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    const bigFile = new File(
      [new Uint8Array(BACKUP_LIMITS.encryptedFileBytes + 1)],
      'big.json',
      { type: 'application/json' },
    );
    const readSpy = vi.fn();
    class FileReaderMock {
      onload: null | (() => void) = null;
      readAsText = readSpy;
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    await act(async () => {
      result.current.handleImportFile({
        target: { files: [bigFile] },
        currentTarget: { value: '' },
      } as any);
      await Promise.resolve();
    });
    expect(readSpy).not.toHaveBeenCalled();
    expect(importFn).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      TOAST_MESSAGES.VALIDATION_FILE_TOO_LARGE,
    );
  });

  it('shows validation error for malformed encrypted payload', async () => {
    const exportFn = vi.fn();
    const importFn = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    class FileReaderMock {
      onload: null | (() => void) = null;
      result = '{}';
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);
    await act(async () => {
      result.current.handleImportFile({
        target: {
          files: [
            new File(['{}'], 'invalid.json', { type: 'application/json' }),
          ],
        },
        currentTarget: { value: '' },
      } as any);
      await Promise.resolve();
    });
    expect(importFn).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      BACKUP_ERROR_MESSAGES.invalidEncryptedPayload,
    );
  });

  it('shows a helpful message when WebCrypto is unavailable for export', async () => {
    isWebCryptoAvailableSpy.mockImplementation(() => false);

    const exportFn = vi.fn();
    const importFn = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(exportFn).not.toHaveBeenCalled();
    expect(promptBackupPassword).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      'toast:backup.webCryptoExportError',
    );
    expect(logErrorSpy).toHaveBeenCalledWith(
      'WebCrypto unavailable',
      { context: 'export', error: undefined },
      'useDataBackup',
    );
  });

  it('handles WebCryptoUnavailableError during import decryption gracefully', async () => {
    const exportFn = vi.fn();
    const importFn = vi.fn();
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );

    decryptSpy.mockRejectedValueOnce(new WebCryptoUnavailableError());

    class FileReaderMock {
      onload: null | (() => void) = null;
      result = JSON.stringify({
        encrypted: true,
        iv: 'AA==',
        salt: 'AA==',
        data: 'AA==',
      });
      readAsText = vi.fn().mockImplementation(function (this: FileReaderMock) {
        this.onload?.();
      });
    }
    vi.stubGlobal('FileReader', FileReaderMock);

    await act(async () => {
      result.current.handleImportFile({
        target: {
          files: [
            new File(['{}'], 'encrypted.json', { type: 'application/json' }),
          ],
        },
        currentTarget: { value: '' },
      } as any);
      await Promise.resolve();
    });

    expect(importFn).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      'toast:backup.webCryptoImportError',
    );
    expect(logErrorSpy).toHaveBeenCalledWith(
      'WebCrypto unavailable',
      { context: 'import', error: expect.any(WebCryptoUnavailableError) },
      'useDataBackup',
    );
  });
});
