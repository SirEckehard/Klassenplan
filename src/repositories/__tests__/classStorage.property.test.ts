// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0049 as properties: the classes of version 3 become a key per
 * class and an index without a class changing, what is written as a whole
 * is read back as it was, and saving the open class writes that class alone.
 */
import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { IndexedDBRepository } from '../IndexedDBRepository';
import type { Result } from '../types';
import type { ClassCollectionState } from '@/types';
import { classRecordArb, studentsArb } from '@/__tests__/utils/arbitraries';
import { storedClassCollection } from '@/__tests__/utils/memoryIdbKeyval';
import { ensureActiveClass } from '@/utils/data/classCollection';
import { ensureCollectionRooms } from '@/utils/data/classRooms';
import { dehydrateCollection } from '@/utils/data/storedSeating';
import { DB_KEYS } from '@/utils/data/storageKeys';

const RUNS = { numRuns: 200 };
const COLLECTION_KEY = `default::${DB_KEYS.classCollection}`;
const INDEX_KEY = `default::${DB_KEYS.classIndex}`;

const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

/**
 * One to four classes as the app holds them, repaired already: the repair
 * hands out rooms with new ids, which a property could not foresee.
 */
const collectionArb = (minLength = 1) =>
  fc
    .uniqueArray(classRecordArb(), {
      minLength,
      maxLength: 4,
      selector: (record) => record.id,
    })
    .chain((classes) =>
      fc
        .constantFrom(...classes.map((record) => record.id))
        .map((activeClassId): ClassCollectionState =>
          ensureCollectionRooms(
            ensureActiveClass({ version: 3, activeClassId, classes }),
          ),
        ),
    );

/** Everything but the copy from before version 4, to tell what changed. */
const storedNow = () =>
  structuredClone(
    new Map([...memory].filter(([key]) => key !== COLLECTION_KEY)),
  );

describe('class storage, version 4', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  it('takes the classes of version 3 over as they were', async () => {
    await fc.assert(
      fc.asyncProperty(collectionArb(), async (collection) => {
        memory.clear();
        const stored = dehydrateCollection(collection);
        memory.set(COLLECTION_KEY, structuredClone(stored));

        const read = expectData(
          await new IndexedDBRepository().loadClassCollection(),
        );

        expect(read.classes).toEqual(collection.classes);
        expect(read.activeClassId).toBe(collection.activeClassId);
        expect(storedClassCollection(memory)).toEqual(stored);
        // The old value stays as it was, marked as the copy it now is.
        expect(memory.get(COLLECTION_KEY)).toEqual({
          ...stored,
          version: 4,
          retiredAt: expect.any(String),
          retiredFromVersion: 3,
        });
      }),
      RUNS,
    );
  });

  it('reads back the classes it wrote as a whole', async () => {
    await fc.assert(
      fc.asyncProperty(collectionArb(), async (collection) => {
        memory.clear();
        expectData(
          await new IndexedDBRepository().saveClassCollection(collection),
        );

        const read = expectData(
          await new IndexedDBRepository().loadClassCollection(),
        );
        expect(read).toEqual(collection);
      }),
      RUNS,
    );
  });

  it('writes the open class alone when it saves it', async () => {
    await fc.assert(
      fc.asyncProperty(
        collectionArb(2),
        studentsArb(),
        async (collection, students) => {
          memory.clear();
          const repository = new IndexedDBRepository();
          expectData(await repository.saveClassCollection(collection));
          expectData(await repository.loadActiveClassSnapshot());
          const openKey = [...memory.keys()].find((key) =>
            key.endsWith(`:${collection.activeClassId}`),
          );
          const before = storedNow();

          expectData(await repository.saveActiveClassSnapshot({ students }));

          const after = storedNow();
          for (const [key, value] of before) {
            if (key === openKey) continue;
            expect(after.get(key)).toEqual(value);
          }
          expect(after.get(INDEX_KEY)).toEqual(before.get(INDEX_KEY));
        },
      ),
      RUNS,
    );
  });
});
