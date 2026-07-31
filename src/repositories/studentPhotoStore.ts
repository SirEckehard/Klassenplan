// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage layer for optional student photos.
 *
 * Photos are stored as image Blobs in a dedicated IndexedDB object store
 * (separate from the default `keyval` store that holds the class collection)
 * so that writing a single photo never reserializes the entire class data and
 * so the photos can be wiped independently. Keys are raw `student.id` strings.
 *
 * Every operation returns a {@link Result}: a photo that failed to save must not
 * look like a photo that saved fine, and callers differ in how much they care.
 * A browser without IndexedDB is reported as a storage failure too — the photo
 * feature simply has no home there.
 *
 * Privacy note: photos never leave the device. They live only in this local
 * IndexedDB store and — when the user explicitly exports a backup — embedded in
 * that backup file.
 */
import { STUDENT_PHOTO_STORE } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError } from '@/utils';
import type { Result } from './types';
import { ResultHelpers, RepositoryErrorType } from './types';
import {
  createIdbStore,
  tryClearStore,
  tryDeleteValue,
  tryListEntries,
  tryListKeys,
  tryReadValue,
  tryWriteValue,
  type IdbStore,
} from './idbClient';

const LOG_SOURCE = 'studentPhotoStore';

// Schema version of the photo store, kept under a reserved key inside the
// store itself (mirrors CLASS_COLLECTION_VERSION for the class data). Bump it
// when the stored format changes; readers can then branch on the old value.
export const STUDENT_PHOTO_STORE_VERSION = 1;
const VERSION_KEY = '__photoStoreVersion';

// Lazily created so importing this module never touches IndexedDB (keeps SSR
// and tests without a DB safe). createStore only opens the DB on the first
// actual operation.
let store: IdbStore | null = null;

function getStore(): IdbStore {
  if (!store) {
    store = createIdbStore(
      STUDENT_PHOTO_STORE.dbName,
      STUDENT_PHOTO_STORE.storeName,
    );
  }
  return store;
}

const unavailable = () =>
  ResultHelpers.failure({
    type: RepositoryErrorType.STORAGE_ERROR,
    message: 'IndexedDB is not available in this browser',
  });

/** Persist (or replace) the photo blob for a student. */
export async function setStudentPhoto(
  id: string,
  blob: Blob,
): Promise<Result<void>> {
  if (!hasIndexedDB()) return unavailable();
  return tryWriteValue(id, blob, getStore());
}

/** Read the stored photo blob for a student; `undefined` when none exists. */
export async function getStudentPhoto(
  id: string,
): Promise<Result<Blob | undefined>> {
  if (!hasIndexedDB()) return unavailable();
  return tryReadValue<Blob>(id, getStore());
}

/** Remove the stored photo for a student (no-op if none exists). */
export async function deleteStudentPhoto(id: string): Promise<Result<void>> {
  if (!hasIndexedDB()) return unavailable();
  return tryDeleteValue(id, getStore());
}

/** All student ids that currently have a stored photo. */
export async function getAllPhotoIds(): Promise<Result<string[]>> {
  if (!hasIndexedDB()) return unavailable();
  const result = await tryListKeys(getStore());
  if (!result.success) return result;
  return ResultHelpers.success(result.data.filter((id) => id !== VERSION_KEY));
}

/** Every stored photo keyed by student id (used for export). */
export async function getAllPhotos(): Promise<Result<Map<string, Blob>>> {
  if (!hasIndexedDB()) return unavailable();
  const result = await tryListEntries<Blob>(getStore());
  if (!result.success) return result;
  return ResultHelpers.success(
    new Map(
      result.data
        .filter(([id]) => String(id) !== VERSION_KEY)
        .map(([id, blob]) => [String(id), blob] as const),
    ),
  );
}

/** Wipe every stored photo (used by "delete all data" and full imports). */
export async function clearAllPhotos(): Promise<Result<void>> {
  if (!hasIndexedDB()) return unavailable();
  return tryClearStore(getStore());
}

/**
 * Delete photos whose student id is no longer present in any class. Returns the
 * number of orphaned photos that were removed. Safe to call on app start.
 *
 * Failures are logged and reported as "nothing swept" rather than as an error:
 * this is opportunistic housekeeping, and the caller has nothing to do about it.
 */
export async function sweepOrphanPhotos(
  knownStudentIds: Iterable<string>,
): Promise<number> {
  if (!hasIndexedDB()) return 0;

  // Piggyback the version stamp on the start-up sweep so every store that has
  // ever been touched carries its schema version.
  const version = await tryReadValue<number>(VERSION_KEY, getStore());
  if (version.success && version.data === undefined) {
    await tryWriteValue(VERSION_KEY, STUDENT_PHOTO_STORE_VERSION, getStore());
  }

  const ids = await getAllPhotoIds();
  if (!ids.success) {
    logError(
      'Failed to sweep orphan student photos',
      { error: ids.error },
      LOG_SOURCE,
    );
    return 0;
  }

  const known = new Set(knownStudentIds);
  const orphans = ids.data.filter((id) => !known.has(id));
  const results = await Promise.all(
    orphans.map((id) => deleteStudentPhoto(id)),
  );
  return results.filter((result) => result.success).length;
}
