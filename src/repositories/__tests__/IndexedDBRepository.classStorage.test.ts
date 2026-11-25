// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The switch to a key per class (decision 0049) around its edges: the copy
 * of the classes from before, kept 30 days and safe from a window still on
 * 3.4.1, and what a window on 3.4.0 writes into it; two tabs switching at
 * once; keys the index no longer names; and "Alle Daten löschen".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { IndexedDBRepository } from '../IndexedDBRepository';
import { isFromNewerVersion } from '../newerStoredData';
import { classRecordKey } from '../classStorage';
import type { Result } from '../types';
import type { ClassCollectionState } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import {
  CLASS_COLLECTION_VERSION,
  createClassRecord,
} from '@/utils/data/classCollection';
import { DB_KEYS } from '@/utils/data/storageKeys';

const COLLECTION_KEY = `default::${DB_KEYS.classCollection}`;
const INDEX_KEY = `default::${DB_KEYS.classIndex}`;
const classKey = (classId: string) => `default::${classRecordKey(classId)}`;

const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

const NOW = Date.parse('2026-11-20T08:00:00.000Z');
const DAY = 24 * 3600 * 1000;

/** Two classes as 3.4.1 stored them, 7a open. */
const versionThree = (): ClassCollectionState => {
  const sevenA = createClassRecord({
    id: 'class-7a',
    name: '7a',
    students: [createMockStudent({ id: 'mia', name: 'Mia' })],
  });
  const eightB = createClassRecord({ id: 'class-8b', name: '8b' });
  return {
    version: CLASS_COLLECTION_VERSION,
    activeClassId: sevenA.id,
    classes: [sevenA, eightB],
  };
};

describe('the switch to a key per class', () => {
  let before: ClassCollectionState;

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    before = versionThree();
    memory.set(COLLECTION_KEY, structuredClone(before));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the classes from before where a window on 3.4.1 writes nothing', async () => {
    expectData(await new IndexedDBRepository().loadClassCollection());

    const kept = memory.get(COLLECTION_KEY) as ClassCollectionState;
    expect(kept.classes).toEqual(before.classes);
    // 3.4.1 knows version 3 and reads anything above it without writing.
    expect(isFromNewerVersion(kept, CLASS_COLLECTION_VERSION)).toBe(true);
  });

  it('hands the classes from before out for 30 days, then lets them go', async () => {
    const repository = new IndexedDBRepository();
    expectData(await repository.loadClassCollection());
    // The teacher goes on: Mia leaves 7a.
    expectData(await repository.saveActiveClassSnapshot({ students: [] }));

    vi.setSystemTime(NOW + 29 * DAY);
    const retired = expectData(await repository.loadRetiredClasses());
    expect(retired?.collection.classes.map((entry) => entry.name)).toEqual([
      '7a',
      '8b',
    ]);
    expect(
      retired?.collection.classes[0]?.students.map((student) => student.name),
    ).toEqual(['Mia']);
    expect(retired?.keptUntil).toBe(new Date(NOW + 30 * DAY).toISOString());

    vi.setSystemTime(NOW + 30 * DAY);
    expect(expectData(await repository.loadRetiredClasses())).toBeNull();
    // The marker stays, so a window on 3.4.1 still writes nothing.
    const marker = memory.get(COLLECTION_KEY) as ClassCollectionState;
    expect(marker.classes).toEqual([]);
    expect(isFromNewerVersion(marker, CLASS_COLLECTION_VERSION)).toBe(true);
  });

  // The toolbar's foot asks on every layer: the answer is read once, not
  // the classes put on their seats each time (N42 of the review of
  // 22 November 2026).
  it('says once per window whether the classes from before are kept', async () => {
    const repository = new IndexedDBRepository();
    expectData(await repository.loadClassCollection());
    expect(expectData(await repository.hasRetiredClasses())).toBe(true);

    // Asked again, the window answers from what it read.
    const kept = memory.get(COLLECTION_KEY);
    memory.delete(COLLECTION_KEY);
    expect(expectData(await repository.hasRetiredClasses())).toBe(true);

    // A window opened later reads it anew; past the 30 days it is no more.
    memory.set(COLLECTION_KEY, kept);
    vi.setSystemTime(NOW + 29 * DAY);
    expect(
      expectData(await new IndexedDBRepository().hasRetiredClasses()),
    ).toBe(true);
    vi.setSystemTime(NOW + 30 * DAY);
    expect(
      expectData(await new IndexedDBRepository().hasRetiredClasses()),
    ).toBe(false);
  });

  it('forgets the answer with "Alle Daten löschen"', async () => {
    const repository = new IndexedDBRepository();
    expectData(await repository.loadClassCollection());
    expect(expectData(await repository.hasRetiredClasses())).toBe(true);

    expectData(await repository.clearAll());
    expect(expectData(await repository.hasRetiredClasses())).toBe(false);
  });

  it('restores the classes from before as a backup is restored', async () => {
    const repository = new IndexedDBRepository();
    expectData(await repository.loadClassCollection());
    expectData(await repository.deleteClass('class-8b'));

    const retired = expectData(await repository.loadRetiredClasses());
    expectData(await repository.saveClassCollection(retired!.collection));

    const restored = expectData(await repository.loadClassCollection());
    expect(restored.classes.map((entry) => entry.name)).toEqual(['7a', '8b']);
  });

  // A window still on 3.4.0 knows no newer data. It changes what it reads
  // and spreads the rest, as its `changeCollection` did, so the marker stays
  // and the change lands in the copy (decision 0049, addendum of 2026-11-25).
  it('keeps in the copy what a window still on 3.4.0 changes after the switch', async () => {
    expectData(await new IndexedDBRepository().loadClassCollection());
    vi.setSystemTime(NOW + DAY);
    const read = memory.get(COLLECTION_KEY) as ClassCollectionState;
    memory.set(COLLECTION_KEY, {
      ...read,
      version: CLASS_COLLECTION_VERSION,
      classes: read.classes.map((entry) =>
        entry.id === 'class-7a'
          ? {
              ...entry,
              students: [
                ...entry.students,
                createMockStudent({ id: 'noah', name: 'Noah' }),
              ],
              updatedAt: new Date(NOW + DAY).toISOString(),
            }
          : entry,
      ),
    });

    // The classes in their keys stay as they were ...
    const later = new IndexedDBRepository();
    const now = expectData(await later.loadClassCollection());
    expect(now.classes[0]?.students.map((student) => student.name)).toEqual([
      'Mia',
    ]);
    // ... and "Stand vor dem Update" brings the change back.
    expect(expectData(await later.hasRetiredClasses())).toBe(true);
    const retired = expectData(await later.loadRetiredClasses());
    expect(
      retired?.collection.classes[0]?.students.map((student) => student.name),
    ).toEqual(['Mia', 'Noah']);
    expect(retired?.keptUntil).toBe(new Date(NOW + 30 * DAY).toISOString());
  });

  // Its "Alles ersetzen" writes a backup's classes without the marker: the
  // index stays the truth, and the classes are in the backup file.
  it('stays with the classes in their keys after a restore in a window still on 3.4.0', async () => {
    expectData(await new IndexedDBRepository().loadClassCollection());
    const nineC = createClassRecord({ id: 'class-9c', name: '9c' });
    memory.set(COLLECTION_KEY, {
      version: CLASS_COLLECTION_VERSION,
      activeClassId: nineC.id,
      classes: [nineC],
    });

    const later = new IndexedDBRepository();
    const now = expectData(await later.loadClassCollection());
    expect(now.classes.map((entry) => entry.name)).toEqual(['7a', '8b']);
    expect(expectData(await later.hasRetiredClasses())).toBe(false);
  });

  it('switches once when two tabs open at the same moment', async () => {
    const [a, b] = await Promise.all([
      new IndexedDBRepository().loadClassCollection(),
      new IndexedDBRepository().loadClassCollection(),
    ]);

    expect(expectData(a)).toEqual(expectData(b));
    expect(memory.get(INDEX_KEY)).toMatchObject({
      order: ['class-7a', 'class-8b'],
    });
  });

  it('keeps a class another tab saved while this one switched', async () => {
    const first = new IndexedDBRepository();
    expectData(await first.loadClassCollection());
    expectData(
      await first.saveActiveClassSnapshot({
        students: [createMockStudent({ name: 'Noah' })],
      }),
    );
    // A second tab that finds the index has nothing left to switch.
    memory.set(COLLECTION_KEY, structuredClone(before));
    const second = expectData(
      await new IndexedDBRepository().loadActiveClassSnapshot(),
    );

    expect(second.students?.map((student) => student.name)).toEqual(['Noah']);
  });
});

describe('class keys the index does not name', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const leftover = (id: string, updatedAt: string) =>
    memory.set(classKey(id), {
      version: 4,
      record: createClassRecord({ id, name: id, updatedAt }),
    });

  it('go once they are older than a few minutes', async () => {
    expectData(await new IndexedDBRepository().createClass({ name: '7a' }, {}));
    leftover('old', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    // One another tab is creating right now: its index entry comes next.
    leftover('fresh', new Date().toISOString());

    const classes = expectData(
      await new IndexedDBRepository().loadClassCollection(),
    ).classes;

    expect(classes.map((entry) => entry.name)).toEqual(['7a']);
    expect(memory.has(classKey('old'))).toBe(false);
    expect(memory.has(classKey('fresh'))).toBe(true);
  });

  it('go with a backup that replaces the classes', async () => {
    const repository = new IndexedDBRepository();
    const sevenA = expectData(await repository.createClass({ name: '7a' }));
    const eightB = createClassRecord({ name: '8b' });

    expectData(
      await repository.saveClassCollection({
        version: CLASS_COLLECTION_VERSION,
        activeClassId: eightB.id,
        classes: [eightB],
      }),
    );

    expect(memory.has(classKey(sevenA.id))).toBe(false);
    expect(memory.has(classKey(eightB.id))).toBe(true);
  });
});

describe('a replace that stops before the index', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // A backup of this device brings classes of the same id back; one that
  // stops halfway, say on a full disk, leaves no mix of the two (N44 of the
  // review of 22 November 2026).
  it('leaves the classes as they were', async () => {
    const repository = new IndexedDBRepository();
    const sevenA = expectData(
      await repository.createClass(
        { name: '7a', students: [createMockStudent({ name: 'Mia' })] },
        { activate: true },
      ),
    );
    const eightB = expectData(await repository.createClass({ name: '8b' }));
    const before = structuredClone(memory.get(classKey(sevenA.id)));

    const idb = await import('idb-keyval');
    const set = vi.mocked(idb.set);
    const write = set.getMockImplementation()!;
    set.mockImplementation(async (key, value, store) => {
      if (String(key) === classRecordKey(eightB.id)) {
        throw new DOMException('Disk full', 'QuotaExceededError');
      }
      return write(key, value, store);
    });
    const nineC = createClassRecord({ name: '9c' });
    try {
      const result = await repository.saveClassCollection({
        version: CLASS_COLLECTION_VERSION,
        activeClassId: sevenA.id,
        classes: [
          { ...sevenA, students: [createMockStudent({ name: 'Noah' })] },
          { ...eightB, name: '8b neu' },
          nineC,
        ],
      });
      expect(result.success).toBe(false);
    } finally {
      set.mockImplementation(write);
    }

    expect(memory.get(classKey(sevenA.id))).toEqual(before);
    expect(memory.has(classKey(nineC.id))).toBe(false);
    const classes = expectData(
      await new IndexedDBRepository().loadClassCollection(),
    ).classes;
    expect(classes.map((entry) => entry.name)).toEqual(['7a', '8b']);
    expect(classes[0]?.students.map((student) => student.name)).toEqual([
      'Mia',
    ]);
  });
});

describe('"Alle Daten löschen"', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes every class key with it', async () => {
    memory.set(COLLECTION_KEY, versionThree());
    const repository = new IndexedDBRepository();
    expectData(await repository.loadClassCollection());

    expectData(await repository.clearAll());

    expect(
      [...memory.keys()].filter((key) => key.startsWith('default::spg.class')),
    ).toEqual([]);
  });
});
