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
  removeAutoBackupConfig,
  saveAutoBackupConfig,
} from '@/repositories/autoBackupStore';

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

  beforeEach(async () => {
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
    });
    classChangedAt(new Date(NOW - HOUR).toISOString());
  });

  afterEach(() => {
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
