// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@/types/file-system-access.d.ts';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import useDataBackup from '../useDataBackup';
import { promptDialog, confirmDialog } from '../../services/ui/dialogs';
import {
  BACKUP_ERROR_MESSAGES,
  BACKUP_LIMITS,
} from '../../utils/validation/backupValidation';
import { setupLocalStorageMock } from '../../__tests__/utils';
import * as toastModule from '../../utils/ui/toast';
import { TOAST_MESSAGES } from '../../utils/ui/toast';
import * as utilsModule from '@/utils';

vi.mock('../../services/ui/dialogs', () => ({
  promptDialog: vi.fn(),
  confirmDialog: vi.fn(),
}));

const showToastMock = vi.spyOn(toastModule, 'showToast');

const mockPromptDialog = vi.mocked(promptDialog);
const mockConfirmDialog = vi.mocked(confirmDialog);

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

    // Default password mock
    mockPromptDialog.mockResolvedValue('pw');
    mockConfirmDialog.mockResolvedValue(true);

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
    expect(showToastMock).toHaveBeenCalledWith(
      'error',
      'toast:export.error',
    );
  });

  it('does not call exportAllAsJson when password prompt is cancelled', async () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn();
    // Simulate user cancelling password prompt
    mockPromptDialog.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );
    await act(async () => {
      await result.current.handleExportAll();
    });
    expect(exportFn).not.toHaveBeenCalled();
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
    expect(promptDialog).toHaveBeenCalled();
  });

  it('passes encrypted backup to download helper', async () => {
    const exportFn = vi.fn().mockResolvedValue('{}');
    const importFn = vi.fn();
    const downloadSpy = vi
      .spyOn(utilsModule, 'downloadBlob')
      .mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson: exportFn, importAllFromJson: importFn }),
    );

    await act(async () => {
      await result.current.handleExportAll();
    });

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [payload, filename, mimeType, options] = downloadSpy.mock.calls[0];
    expect(typeof payload).toBe('string');
    expect(filename).toMatch(/^klassenplan-backup-.*\.json$/);
    expect(mimeType).toBe('application/json');
    expect(options).toMatchObject({ logContext: 'useDataBackup' });

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
    expect(promptDialog).not.toHaveBeenCalled();
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
