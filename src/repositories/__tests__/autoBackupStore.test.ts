// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import {
  loadAutoBackupConfig,
  noteAutoBackupWritten,
  removeAutoBackupConfig,
  saveAutoBackupConfig,
} from '../autoBackupStore';
import { DB_KEYS } from '@/utils/data/storageKeys';

// Plain stand-ins: IndexedDB clones a real folder handle and key alike.
const config = {
  folder: { name: 'Sicherung' } as unknown as FileSystemDirectoryHandle,
  folderName: 'Sicherung',
  key: {} as CryptoKey,
  salt: 'c2FsdA==',
  iterations: 600000,
  lastWrittenAt: null,
};

describe('the automatic backup’s settings', () => {
  beforeEach(() => {
    memory.clear();
  });

  it('notes when the last file was written', async () => {
    await saveAutoBackupConfig(config);
    await noteAutoBackupWritten('2026-11-20T10:00:00.000Z');

    expect((await loadAutoBackupConfig())?.lastWrittenAt).toBe(
      '2026-11-20T10:00:00.000Z',
    );
  });

  it('stays removed when a file was written meanwhile', async () => {
    await saveAutoBackupConfig(config);
    await removeAutoBackupConfig();
    await noteAutoBackupWritten('2026-11-20T10:00:00.000Z');

    expect(await loadAutoBackupConfig()).toBeNull();
    expect(memory.has(`default::${DB_KEYS.autoBackup}`)).toBe(false);
  });

  it('leaves a newer version’s settings to it', async () => {
    memory.set(`default::${DB_KEYS.autoBackup}`, { ...config, version: 2 });

    expect(await loadAutoBackupConfig()).toBeNull();
  });
});
