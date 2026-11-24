// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The automatic backup (decision 0050) against a folder made up here: it
 * writes once a day after a change, keeps the newest seven, waits for the
 * folder to be allowed again, and writes a file that the password opens.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { repository, promptBackupPassword } = vi.hoisted(() => ({
  repository: { listClasses: vi.fn() },
  promptBackupPassword: vi.fn(),
}));
vi.mock('@/hooks/useSeatingRepository', () => ({
  useSeatingRepository: () => repository,
}));
vi.mock('@/services/ui/backupDialogs', () => ({ promptBackupPassword }));
// A folder made up here holds functions, which IndexedDB's clone refuses; a
// real handle is cloned. The settings are kept by reference instead.
vi.mock('@/repositories/autoBackupStore', () => {
  let stored: Record<string, unknown> | null = null;
  return {
    loadAutoBackupConfig: vi.fn(async () => stored),
    saveAutoBackupConfig: vi.fn(async (config: Record<string, unknown>) => {
      stored = { ...config, version: 1 };
    }),
    noteAutoBackupWritten: vi.fn(async (at: string) => {
      if (stored) stored = { ...stored, lastWrittenAt: at };
    }),
    removeAutoBackupConfig: vi.fn(async () => {
      stored = null;
    }),
  };
});
// The key is real, made once: 600,000 rounds of PBKDF2 per test are slow.
vi.mock('@/utils/data/backupCrypto', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/utils/data/backupCrypto')>();
  return {
    ...actual,
    encryptJsonWithKey: vi.fn(async (json: string) => `sealed:${json}`),
    deriveStoredBackupKey: vi.fn(async () => ({
      key: { usages: ['encrypt'] } as unknown as CryptoKey,
      salt: 'c2FsdA==',
      iterations: 600000,
    })),
  };
});

import { useAutoBackup } from '../useAutoBackup';
import {
  autoBackupActions,
  setAutoBackupState,
  useAutoBackupState,
} from '@/hooks/persistence/autoBackupStatus';
import {
  loadAutoBackupConfig,
  removeAutoBackupConfig,
  saveAutoBackupConfig,
} from '@/repositories/autoBackupStore';
import { BackupExportError } from '@/utils/validation/backupLimits';
import { subscribeToToasts, type ToastEvent } from '@/utils/ui/toast';

/** A folder as the File System Access API hands it out, in memory. */
function makeFolder(permission: PermissionState = 'granted') {
  const files = new Map<string, string>();
  const state = { permission };
  const folder = {
    name: 'Klassenplan-Sicherung',
    kind: 'directory',
    files,
    state,
    queryPermission: vi.fn(async () => state.permission),
    requestPermission: vi.fn(async () => {
      state.permission = 'granted';
      return state.permission;
    }),
    getFileHandle: vi.fn(async (name: string) => ({
      createWritable: async () => ({
        write: async (contents: string) => {
          files.set(name, contents);
        },
        close: async () => undefined,
      }),
    })),
    keys: async function* () {
      yield* [...files.keys()];
    },
    removeEntry: vi.fn(async (name: string) => {
      files.delete(name);
    }),
  };
  return folder;
}

const NOW = Date.parse('2026-11-20T10:00:00');
const HOUR = 3600 * 1000;

describe('the automatic backup', () => {
  const exportAllAsJson = vi.fn(async () => '{"version":3}');

  const mount = () => {
    const hook = renderHook(() => {
      useAutoBackup({ exportAllAsJson });
      return useAutoBackupState();
    });
    return hook;
  };

  /** Lets the first look, 15 s after start, run and finish. */
  const firstLook = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
      // The work loads on demand (`autoBackupRunner`), outside the timers.
      await vi.dynamicImportSettled();
      for (let round = 0; round < 20; round += 1) {
        await vi.advanceTimersByTimeAsync(0);
      }
    });
  };

  const classChangedAt = (iso: string) =>
    repository.listClasses.mockResolvedValue({
      success: true,
      data: [{ id: '7a', name: '7a', updatedAt: iso }],
    });

  const setUpWith = (
    folder: ReturnType<typeof makeFolder>,
    lastWrittenAt: string | null,
  ) =>
    saveAutoBackupConfig({
      folder: folder as unknown as FileSystemDirectoryHandle,
      folderName: folder.name,
      key: {} as CryptoKey,
      salt: 'c2FsdA==',
      iterations: 600000,
      lastWrittenAt,
    });

  /** The toasts raised, newest last. */
  let toasts: Extract<ToastEvent, { action: 'add' }>['toast'][] = [];
  let unsubscribeToasts = () => {};

  beforeEach(async () => {
    toasts = [];
    unsubscribeToasts = subscribeToToasts((event) => {
      if (event.action === 'add') toasts.push(event.toast);
    });
    await removeAutoBackupConfig();
    vi.clearAllMocks();
    vi.stubGlobal('indexedDB', {});
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'setInterval'] });
    vi.setSystemTime(NOW);
    setAutoBackupState({
      configured: false,
      folderName: null,
      lastWrittenAt: null,
      waiting: false,
      failure: null,
    });
    classChangedAt(new Date(NOW - HOUR).toISOString());
  });

  afterEach(() => {
    unsubscribeToasts();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('writes today’s file after a change since yesterday’s', async () => {
    const folder = makeFolder();
    await setUpWith(folder, new Date(NOW - 20 * HOUR).toISOString());

    const { result } = mount();
    await firstLook();

    expect(folder.files.get('klassenplan-auto-2026-11-20.klassenplan')).toBe(
      'sealed:{"version":3}',
    );
    expect(result.current.lastWrittenAt?.slice(0, 10)).toBe('2026-11-20');
  });

  it('knows at once that it is set up, before the first look', async () => {
    const folder = makeFolder();
    await setUpWith(folder, new Date(NOW - HOUR).toISOString());

    const { result } = mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current).toMatchObject({
      configured: true,
      folderName: 'Klassenplan-Sicherung',
    });
    expect(folder.files.size).toBe(0);
  });

  it('writes nothing more the same day', async () => {
    const folder = makeFolder();
    await setUpWith(folder, new Date(NOW - HOUR / 2).toISOString());

    mount();
    await firstLook();

    expect(folder.files.size).toBe(0);
  });

  it('keeps the newest seven files', async () => {
    const folder = makeFolder();
    for (let day = 10; day < 19; day += 1) {
      folder.files.set(`klassenplan-auto-2026-11-${day}.klassenplan`, 'old');
    }
    folder.files.set('meine-eigene.klassenplan', 'mine');
    await setUpWith(folder, new Date(NOW - 30 * HOUR).toISOString());

    mount();
    await firstLook();

    const kept = [...folder.files.keys()].sort();
    expect(kept).toHaveLength(8);
    expect(kept).toContain('meine-eigene.klassenplan');
    expect(kept).toContain('klassenplan-auto-2026-11-20.klassenplan');
    // Today's and the six before it: the 13th to the 18th.
    expect(kept).toContain('klassenplan-auto-2026-11-13.klassenplan');
    expect(kept).not.toContain('klassenplan-auto-2026-11-12.klassenplan');
  });

  it('waits for the folder to be allowed again, then writes in the click', async () => {
    const folder = makeFolder('prompt');
    await setUpWith(folder, new Date(NOW - 30 * HOUR).toISOString());

    const { result } = mount();
    await firstLook();
    expect(result.current.waiting).toBe(true);
    expect(folder.files.size).toBe(0);

    await act(() => autoBackupActions.resume());

    expect(folder.requestPermission).toHaveBeenCalledWith({
      mode: 'readwrite',
    });
    expect(folder.files.size).toBe(1);
    expect(result.current.waiting).toBe(false);
  });

  it('sets up with a folder and a password and writes at once', async () => {
    const folder = makeFolder();
    vi.stubGlobal('isSecureContext', true);
    const picker = vi.fn(async () => folder);
    window.showDirectoryPicker =
      picker as unknown as typeof window.showDirectoryPicker;
    promptBackupPassword.mockResolvedValue('klassenbuch-2026');

    const { result } = mount();
    await act(() => autoBackupActions.setUp());

    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'readwrite' }),
    );
    expect(promptBackupPassword).toHaveBeenCalledWith('auto');
    expect(folder.files.size).toBe(1);
    expect(result.current).toMatchObject({
      configured: true,
      folderName: 'Klassenplan-Sicherung',
    });

    await act(() => autoBackupActions.stop());
    expect(result.current.configured).toBe(false);
    delete window.showDirectoryPicker;
  });

  // A write that fails is no folder to allow again (review of 22 November
  // 2026, N37): the bar says it failed, a click tries again and says why.
  it('says a backup too large failed, and why when asked', async () => {
    const folder = makeFolder();
    await setUpWith(folder, new Date(NOW - 30 * HOUR).toISOString());
    exportAllAsJson.mockRejectedValueOnce(
      new BackupExportError('tooLarge', 31 * 1024 * 1024, 24 * 1024 * 1024),
    );

    const { result } = mount();
    await firstLook();
    expect(result.current.waiting).toBe(false);
    expect(result.current.failure).toEqual({
      reason: 'tooLarge',
      sizeBytes: 31 * 1024 * 1024,
      maxBytes: 24 * 1024 * 1024,
    });

    exportAllAsJson.mockRejectedValueOnce(
      new BackupExportError('tooLarge', 31 * 1024 * 1024, 24 * 1024 * 1024),
    );
    await act(() => autoBackupActions.resume());
    expect(toasts.at(-1)).toMatchObject({ type: 'error' });
    expect(toasts.at(-1)?.message).toMatch(/31 MB/);
    expect(toasts.at(-1)?.message).toMatch(/24 MB/);
    expect(folder.files.size).toBe(0);

    // A click that works ends the failure.
    await act(() => autoBackupActions.resume());
    expect(folder.files.size).toBe(1);
    expect(result.current.failure).toBeNull();
  });

  it('tries a failed write again only once a class changed since', async () => {
    const folder = makeFolder();
    await setUpWith(folder, new Date(NOW - 30 * HOUR).toISOString());
    exportAllAsJson.mockRejectedValueOnce(
      new BackupExportError('notRestorable', 1024),
    );

    const { result } = mount();
    await firstLook();
    expect(result.current.failure).toEqual({ reason: 'notRestorable' });
    expect(exportAllAsJson).toHaveBeenCalledTimes(1);

    // The next look, five minutes on, with nothing changed: no new attempt.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    expect(exportAllAsJson).toHaveBeenCalledTimes(1);

    // A class changes: the look after it writes.
    classChangedAt(new Date(Date.now() + 1000).toISOString());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    expect(exportAllAsJson).toHaveBeenCalledTimes(2);
    expect(folder.files.size).toBe(1);
    expect(result.current.failure).toBeNull();
  });

  it('names a folder that is gone as the failure, not a folder to allow', async () => {
    const folder = makeFolder();
    folder.getFileHandle.mockRejectedValue(
      new DOMException('The folder is gone', 'NotFoundError'),
    );
    await setUpWith(folder, new Date(NOW - 30 * HOUR).toISOString());

    const { result } = mount();
    await firstLook();
    expect(result.current).toMatchObject({
      waiting: false,
      failure: { reason: 'folder' },
    });

    await act(() => autoBackupActions.resume());
    expect(toasts.at(-1)?.message).toMatch(/Klassenplan-Sicherung/);
  });

  // Stopping asks nothing and can be taken back (N39, decision 0041).
  it('brings a stopped backup back with its folder and key', async () => {
    const folder = makeFolder();
    await setUpWith(folder, new Date(NOW - HOUR).toISOString());
    const { result } = mount();
    await firstLook();
    expect(result.current.configured).toBe(true);

    await act(() => autoBackupActions.stop());
    expect(result.current.configured).toBe(false);
    expect(await loadAutoBackupConfig()).toBeNull();
    const card = toasts.at(-1);
    expect(card?.message).toMatch(/beendet|stopped/i);
    expect(card?.duration).toBe(8000);

    await act(async () => {
      card?.action?.onClick();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({
      configured: true,
      folderName: 'Klassenplan-Sicherung',
    });
    expect(await loadAutoBackupConfig()).toMatchObject({
      folderName: 'Klassenplan-Sicherung',
    });
  });

  it('leaves a backup set up anew alone when the stopped one is asked back', async () => {
    const first = makeFolder();
    await setUpWith(first, new Date(NOW - HOUR).toISOString());
    const { result } = mount();
    await firstLook();
    await act(() => autoBackupActions.stop());
    const card = toasts.at(-1);

    const second = { ...makeFolder(), name: 'Neuer Ordner' };
    await setUpWith(second, null);
    await act(async () => {
      card?.action?.onClick();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(await loadAutoBackupConfig()).toMatchObject({
      folderName: 'Neuer Ordner',
    });
    expect(result.current.configured).toBe(false);
  });

  it('sets up nothing when the password is not given', async () => {
    const folder = makeFolder();
    window.showDirectoryPicker = vi.fn(
      async () => folder,
    ) as unknown as typeof window.showDirectoryPicker;
    promptBackupPassword.mockResolvedValue(null);

    const { result } = mount();
    await act(() => autoBackupActions.setUp());

    expect(result.current.configured).toBe(false);
    expect(folder.files.size).toBe(0);
    delete window.showDirectoryPicker;
  });
});
