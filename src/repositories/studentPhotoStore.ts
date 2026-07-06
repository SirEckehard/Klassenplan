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
 * Privacy note: photos never leave the device. They live only in this local
 * IndexedDB store and — when the user explicitly exports a backup — embedded in
 * that backup file.
 */
import {
  createStore,
  set as idbSet,
  get as idbGet,
  del as idbDel,
  keys as idbKeys,
  entries as idbEntries,
  clear as idbClear,
} from 'idb-keyval';
import { STUDENT_PHOTO_STORE } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError } from '@/utils';

const LOG_SOURCE = 'studentPhotoStore';

// Schema version of the photo store, kept under a reserved key inside the
// store itself (mirrors CLASS_COLLECTION_VERSION for the class data). Bump it
// when the stored format changes; readers can then branch on the old value.
export const STUDENT_PHOTO_STORE_VERSION = 1;
const VERSION_KEY = '__photoStoreVersion';

// Lazily created so importing this module never touches IndexedDB (keeps SSR
// and tests without a DB safe). idb-keyval's createStore only opens the DB on
// the first actual operation.
let store: ReturnType<typeof createStore> | null = null;

function getStore(): ReturnType<typeof createStore> {
  if (!store) {
    store = createStore(
      STUDENT_PHOTO_STORE.dbName,
      STUDENT_PHOTO_STORE.storeName,
    );
  }
  return store;
}

/** Persist (or replace) the photo blob for a student. */
export async function setStudentPhoto(id: string, blob: Blob): Promise<void> {
  if (!hasIndexedDB()) return;
  await idbSet(id, blob, getStore());
}

/** Read the stored photo blob for a student, or undefined if none. */
export async function getStudentPhoto(id: string): Promise<Blob | undefined> {
  if (!hasIndexedDB()) return undefined;
  return idbGet<Blob>(id, getStore());
}

/** Remove the stored photo for a student (no-op if none exists). */
export async function deleteStudentPhoto(id: string): Promise<void> {
  if (!hasIndexedDB()) return;
  await idbDel(id, getStore());
}

/** All student ids that currently have a stored photo. */
export async function getAllPhotoIds(): Promise<string[]> {
  if (!hasIndexedDB()) return [];
  const ids = await idbKeys(getStore());
  return ids.map((id) => String(id)).filter((id) => id !== VERSION_KEY);
}

/** Every stored photo keyed by student id (used for export). */
export async function getAllPhotos(): Promise<Map<string, Blob>> {
  if (!hasIndexedDB()) return new Map();
  const all = await idbEntries<string, Blob>(getStore());
  return new Map(
    all
      .filter(([id]) => String(id) !== VERSION_KEY)
      .map(([id, blob]) => [String(id), blob]),
  );
}

/** Wipe every stored photo (used by "delete all data" and full imports). */
export async function clearAllPhotos(): Promise<void> {
  if (!hasIndexedDB()) return;
  await idbClear(getStore());
}

/**
 * Delete photos whose student id is no longer present in any class. Returns the
 * number of orphaned photos that were removed. Safe to call on app start.
 */
export async function sweepOrphanPhotos(
  knownStudentIds: Iterable<string>,
): Promise<number> {
  if (!hasIndexedDB()) return 0;
  try {
    // Piggyback the version stamp on the start-up sweep so every store that
    // has ever been touched carries its schema version.
    const version = await idbGet<number>(VERSION_KEY, getStore());
    if (version === undefined) {
      await idbSet(VERSION_KEY, STUDENT_PHOTO_STORE_VERSION, getStore());
    }
    const known = new Set(knownStudentIds);
    const ids = await getAllPhotoIds();
    const orphans = ids.filter((id) => !known.has(id));
    await Promise.all(orphans.map((id) => deleteStudentPhoto(id)));
    return orphans.length;
  } catch (error) {
    logError('Failed to sweep orphan student photos', { error }, LOG_SOURCE);
    return 0;
  }
}
