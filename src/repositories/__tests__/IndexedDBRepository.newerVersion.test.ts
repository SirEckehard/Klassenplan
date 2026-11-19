// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A window that still runs the version before an update, or an image the
 * operator went back to, finds classes a newer version wrote. It must not
 * write them back as it misreads them: the next change of the stored shape
 * would otherwise be undone by whichever old window saved last.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { DB_KEYS } from '@/utils/data/storageKeys';
import { CLASS_COLLECTION_VERSION } from '@/utils/data/classCollection';
import { createMockStudent } from '@/__tests__/utils';
import { RepositoryErrorType, type Result } from '../types';
import { CLASS_STORAGE_VERSION, classRecordKey } from '../classStorage';

// The memory stand-in keeps the default store's keys under a prefix.
const INDEX_KEY = `default::${DB_KEYS.classIndex}`;
const classKey = (classId: string) => `default::${classRecordKey(classId)}`;

/** Everything stored about the classes, to tell that nothing changed. */
const storedClasses = () =>
  structuredClone(
    Object.fromEntries(
      [...memory.entries()].filter(([key]) =>
        key.startsWith('default::spg.class'),
      ),
    ),
  );

// Fresh modules per test: whether newer data was found holds for the page.
const loadModules = async () => {
  vi.resetModules();
  const { IndexedDBRepository } = await import('../IndexedDBRepository');
  const { hasNewerStoredData } = await import('../newerStoredData');
  return { IndexedDBRepository, hasNewerStoredData };
};

const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

const expectRefused = (result: Result<unknown>) => {
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(result.error.type).toBe(RepositoryErrorType.NEWER_DATA);
};

/** Stamps a stored value as a newer version would. */
const stampNewer = (key: string, extra: Record<string, unknown> = {}) => {
  const stored = memory.get(key) as Record<string, unknown>;
  memory.set(key, {
    ...stored,
    version: CLASS_STORAGE_VERSION + 1,
    ...extra,
  });
};

/** A class 7a with Mia, then stamped as a newer version would stamp it. */
const storeNewerClasses = async () => {
  const { IndexedDBRepository } = await loadModules();
  const writer = new IndexedDBRepository();
  const sevenA = expectData(
    await writer.createClass({ name: '7a' }, { activate: true }),
  );
  expectData(
    await writer.saveClassSnapshot(sevenA.id, {
      students: [createMockStudent({ name: 'Mia' })],
    }),
  );
  // Something this build has never heard of.
  stampNewer(INDEX_KEY, { seatsByRoom: { kept: true } });
  stampNewer(classKey(sevenA.id));
  return { sevenA, stored: storedClasses() };
};

describe('classes written by a newer version', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads them without writing anything back', async () => {
    const { stored } = await storeNewerClasses();
    const { IndexedDBRepository, hasNewerStoredData } = await loadModules();

    const collection = expectData(
      await new IndexedDBRepository().loadClassCollection(),
    );

    expect(collection.classes.map((entry) => entry.name)).toEqual(['7a']);
    expect(storedClasses()).toEqual(stored);
    expect(hasNewerStoredData()).toBe(true);
  });

  it('refuses every write and leaves them as they are', async () => {
    const { sevenA, stored } = await storeNewerClasses();
    const { IndexedDBRepository } = await loadModules();
    const repository = new IndexedDBRepository();
    expectData(await repository.loadClassCollection());

    expectRefused(
      await repository.saveClassSnapshot(sevenA.id, {
        students: [createMockStudent({ name: 'Noah' })],
      }),
    );
    expectRefused(await repository.createClass({ name: '8b' }));
    expectRefused(await repository.markOpenClassOpened());
    expectRefused(await repository.setActiveClass(sevenA.id));
    expectRefused(await repository.deleteClass(sevenA.id));
    expectRefused(
      await repository.saveClassCollection({
        version: CLASS_COLLECTION_VERSION,
        activeClassId: null,
        classes: [],
      }),
    );

    expect(storedClasses()).toEqual(stored);
  });

  it('leaves alone what a newer window wrote after this one read', async () => {
    const { IndexedDBRepository, hasNewerStoredData } = await loadModules();
    const repository = new IndexedDBRepository();
    const sevenA = expectData(
      await repository.createClass({ name: '7a' }, { activate: true }),
    );
    expect(hasNewerStoredData()).toBe(false);

    // Another window took an update and saved the class.
    stampNewer(classKey(sevenA.id));
    const stored = storedClasses();

    expectRefused(
      await repository.saveClassSnapshot(sevenA.id, {
        students: [createMockStudent({ name: 'Noah' })],
      }),
    );
    expect(storedClasses()).toEqual(stored);
    expect(hasNewerStoredData()).toBe(true);
  });

  it('notes nothing for classes of its own version', async () => {
    const { IndexedDBRepository, hasNewerStoredData } = await loadModules();
    const repository = new IndexedDBRepository();
    expectData(
      await repository.createClass({ name: '7a' }, { activate: true }),
    );
    expectData(await repository.loadClassCollection());

    expect(hasNewerStoredData()).toBe(false);
  });
});
