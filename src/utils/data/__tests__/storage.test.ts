// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage persistence is what stands between a teacher's classes and the
 * browser's eviction sweep: without a grant, Safari drops the data after seven
 * days and Chromium clears it first under disk pressure. These tests pin the
 * two rules that matter — never ask twice, and never let a failure here throw
 * into a save path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkStorageQuota,
  clearProjectLocalStorage,
  ensureStoragePersistence,
  requestPersistentStorage,
  resetStoragePersistenceForTests,
} from '../storage';
import {
  LEGACY_EXPORT_KEYS,
  PROJECT_LOCAL_STORAGE_KEYS,
  STORAGE_KEYS,
} from '../storageKeys';
import { showToast } from '@/utils/ui/toast';

vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  showToast: vi.fn(),
}));

const showToastMock = vi.mocked(showToast);

type StorageManagerStub = {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
};

/** Replace `navigator.storage` for one test; `undefined` simulates old browsers. */
const stubStorageManager = (stub: StorageManagerStub | undefined): void => {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: stub,
  });
};

const originalStorageDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'storage',
);

beforeEach(() => {
  vi.clearAllMocks();
  resetStoragePersistenceForTests();
});

afterEach(() => {
  if (originalStorageDescriptor) {
    Object.defineProperty(navigator, 'storage', originalStorageDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'storage');
  }
});

describe('requestPersistentStorage', () => {
  it('reports "unknown" instead of throwing when the API is missing', async () => {
    stubStorageManager(undefined);

    await expect(requestPersistentStorage()).resolves.toBeNull();
  });

  it('does not ask again when the origin is already persisted', async () => {
    const persist = vi.fn(async () => true);
    stubStorageManager({ persisted: async () => true, persist });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    // Asking again would re-prompt the user in Firefox.
    expect(persist).not.toHaveBeenCalled();
  });

  it('passes the browser through when the grant is given', async () => {
    stubStorageManager({
      persisted: async () => false,
      persist: async () => true,
    });

    await expect(requestPersistentStorage()).resolves.toBe(true);
  });

  it('passes the browser through when the grant is refused', async () => {
    stubStorageManager({
      persisted: async () => false,
      persist: async () => false,
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('swallows a rejecting storage manager', async () => {
    stubStorageManager({
      persisted: async () => {
        throw new Error('denied by policy');
      },
      persist: async () => true,
    });

    await expect(requestPersistentStorage()).resolves.toBeNull();
  });
});

describe('checkStorageQuota', () => {
  it('flags usage above the warning threshold', async () => {
    stubStorageManager({
      estimate: async () => ({ usage: 90, quota: 100 }),
    });

    const info = await checkStorageQuota();

    expect(info).toMatchObject({ usage: 90, quota: 100, isLow: true });
  });

  it('stays quiet below the threshold', async () => {
    stubStorageManager({
      estimate: async () => ({ usage: 10, quota: 100 }),
    });

    expect((await checkStorageQuota())?.isLow).toBe(false);
  });

  it('returns null when the storage manager is absent', async () => {
    stubStorageManager(undefined);

    await expect(checkStorageQuota()).resolves.toBeNull();
  });
});

describe('ensureStoragePersistence', () => {
  it('requests a grant and warns once when the quota runs low', async () => {
    const persist = vi.fn(async () => true);
    stubStorageManager({
      persisted: async () => false,
      persist,
      estimate: async () => ({ usage: 95, quota: 100 }),
    });

    await ensureStoragePersistence();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      'warning',
      'toast:storage.quotaLow',
      expect.anything(),
    );
  });

  it('stays silent while storage is roomy', async () => {
    stubStorageManager({
      persisted: async () => true,
      persist: async () => true,
      estimate: async () => ({ usage: 5, quota: 100 }),
    });

    await ensureStoragePersistence();

    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('runs at most once per page load', async () => {
    const persist = vi.fn(async () => true);
    stubStorageManager({
      persisted: async () => false,
      persist,
      estimate: async () => ({ usage: 95, quota: 100 }),
    });

    await ensureStoragePersistence();
    await ensureStoragePersistence();
    await ensureStoragePersistence();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledTimes(1);
  });

  it('resolves even when every storage call fails', async () => {
    stubStorageManager({
      persisted: async () => {
        throw new Error('nope');
      },
      persist: async () => {
        throw new Error('nope');
      },
      estimate: async () => {
        throw new Error('nope');
      },
    });

    await expect(ensureStoragePersistence()).resolves.toBeUndefined();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});

describe('clearProjectLocalStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('removes every registered key', () => {
    PROJECT_LOCAL_STORAGE_KEYS.forEach((key, index) => {
      localStorage.setItem(key, String(index));
    });

    clearProjectLocalStorage();

    PROJECT_LOCAL_STORAGE_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
  });

  it('leaves storage owned by other apps on the origin alone', () => {
    localStorage.setItem('someone-elses-key', 'keep me');

    clearProjectLocalStorage();

    expect(localStorage.getItem('someone-elses-key')).toBe('keep me');
  });

  it('clears the export page preferences', () => {
    // These used to be missing from the cleanup list, so "delete all data" left
    // the export settings behind on the device.
    const exportKeys = [
      ...Object.values(STORAGE_KEYS.localStorage).filter((key) =>
        key.startsWith('export.'),
      ),
      ...Object.values(LEGACY_EXPORT_KEYS),
    ];
    expect(exportKeys.length).toBeGreaterThan(0);
    exportKeys.forEach((key) => localStorage.setItem(key, 'true'));

    clearProjectLocalStorage();

    exportKeys.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
  });
});

describe('storage key registry', () => {
  it('registers every localStorage key for cleanup', () => {
    // A key that is written but never registered survives "delete all data",
    // which is a privacy promise the footer action makes.
    const registered = new Set<string>(PROJECT_LOCAL_STORAGE_KEYS);
    const unregistered = Object.values(STORAGE_KEYS.localStorage).filter(
      (key) => !registered.has(key),
    );

    expect(unregistered).toEqual([]);
  });
});
