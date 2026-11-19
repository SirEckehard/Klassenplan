// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How the classes lie in IndexedDB since version 4 (decision 0049).
 *
 * Up to version 3 every class of the device sat in one value,
 * `spg.classCollection`, and every save read, converted and wrote all of
 * them — a cost that grew with every class, on the main thread. Now each
 * class has a key of its own, `spg.class:<id>`, and `spg.classIndex` says
 * which classes there are, in which order, and which one to open: saving the
 * open class touches that class alone.
 *
 * The index is the truth. A class key it does not name is left over — from a
 * write that stopped between the class and the index, or from a replace that
 * stopped before it tidied — and goes once it is older than a few minutes, so
 * a class another tab is just creating is not taken.
 *
 * The value from before the switch stays where it was for 30 days (B2 of the
 * review of November 2026): `retiredAt` marks it, and its `version` of 4 makes
 * a window still on 3.4.1 read it without writing anything over it
 * (`newerStoredData`). After that only the marker stays, without classes.
 *
 * The app sees none of this: the repository still hands out and takes a
 * whole `ClassCollectionState`, as the backup does.
 */
import {
  deleteValues,
  listKeys,
  readValue,
  updateValue,
  writeValue,
} from './idbClient';
import { isFromNewerVersion } from './newerStoredData';
import type { ClassCollectionState, ClassRecord } from '@/types';
import { CLASS_RECORD_KEY_PREFIX, DB_KEYS } from '@/utils/data/storageKeys';

/** 4: one key per class and an index (decision 0049). */
export const CLASS_STORAGE_VERSION = 4;

/** How long the classes as they were before version 4 stay on the device. */
const RETIRED_COLLECTION_DAYS = 30;

/** A key no index names is taken only once it is this old. */
const LEFTOVER_AGE_MS = 10 * 60 * 1000;

/** Which classes there are, in order, and the one to open next time. */
export interface StoredClassIndex {
  version: number;
  activeClassId: string | null;
  order: string[];
}

/** One class as it is stored: every seat an id (decision 0035). */
export interface StoredClass {
  version: number;
  record: ClassRecord;
}

/** The value of `spg.classCollection` from before version 4. */
export interface RetiredCollection extends ClassCollectionState {
  /** When version 4 took over; the copy goes 30 days later. */
  retiredAt: string;
  /** The version the classes were stored in then. */
  retiredFromVersion: number;
}

/** What a change returns to end its transaction without writing. */
export const UNCHANGED: unique symbol = Symbol('unchanged');

/**
 * `updateValue` that may leave the value alone: `change` returns `UNCHANGED`
 * and nothing is written — returning `undefined` would store it.
 */
export async function changeStored<T>(
  key: string,
  change: (current: T | undefined) => T | typeof UNCHANGED,
): Promise<void> {
  try {
    await updateValue<T>(key, (current) => {
      const next = change(current);
      if (next === UNCHANGED) throw UNCHANGED;
      return next;
    });
  } catch (error) {
    if (error !== UNCHANGED) throw error;
  }
}

export const classRecordKey = (classId: string): string =>
  `${CLASS_RECORD_KEY_PREFIX}${classId}`;

const classIdOfKey = (key: string): string | null =>
  key.startsWith(CLASS_RECORD_KEY_PREFIX)
    ? key.slice(CLASS_RECORD_KEY_PREFIX.length)
    : null;

export const emptyClassIndex = (): StoredClassIndex => ({
  version: CLASS_STORAGE_VERSION,
  activeClassId: null,
  order: [],
});

/** Every class key there is, named by the index or not. */
export async function listClassRecordKeys(): Promise<string[]> {
  return (await listKeys()).filter((key) => classIdOfKey(key) !== null);
}

export const readClassIndex = (): Promise<StoredClassIndex | undefined> =>
  readValue<StoredClassIndex>(DB_KEYS.classIndex);

export const readStoredClass = (
  classId: string,
): Promise<StoredClass | undefined> =>
  readValue<StoredClass>(classRecordKey(classId));

/** Whether a stored value was written by a newer version than this one. */
export const isNewerStorage = (
  stored: { version?: unknown } | null | undefined,
): boolean => isFromNewerVersion(stored, CLASS_STORAGE_VERSION);

export const storedClassOf = (record: ClassRecord): StoredClass => ({
  version: CLASS_STORAGE_VERSION,
  record,
});

/**
 * Writes a whole collection, already in its stored form: first every class,
 * then the index, which makes them the classes there are, then away with the
 * classes it no longer names. A failure before the index leaves the classes
 * as they were.
 *
 * `keepExisting` is the switch to version 4: a class or an index another tab
 * wrote meanwhile stays, since it is the newer of the two.
 */
export async function writeStoredCollection(
  collection: ClassCollectionState,
  options: {
    keepExisting?: boolean;
    /** Throws inside the index's transaction to write nothing over it. */
    guardIndex?: (current: StoredClassIndex | undefined) => void;
  } = {},
): Promise<StoredClassIndex> {
  const classes = collection.classes as ClassRecord[];
  await Promise.all(
    classes.map((record) =>
      options.keepExisting
        ? changeStored<StoredClass>(classRecordKey(record.id), (current) =>
            current ? UNCHANGED : storedClassOf(record),
          )
        : writeValue(classRecordKey(record.id), storedClassOf(record)),
    ),
  );
  let written: StoredClassIndex = {
    version: CLASS_STORAGE_VERSION,
    activeClassId: collection.activeClassId,
    order: classes.map((record) => record.id),
  };
  const proposed = written;
  await updateValue<StoredClassIndex>(DB_KEYS.classIndex, (current) => {
    options.guardIndex?.(current);
    if (options.keepExisting && current) {
      written = current;
      return current;
    }
    written = proposed;
    return proposed;
  });
  if (!options.keepExisting) {
    await removeClassesNotIn(written, { now: true });
  }
  return written;
}

/**
 * Removes the class keys the index does not name: at once after a replace,
 * otherwise only those older than a few minutes.
 */
export async function removeClassesNotIn(
  index: StoredClassIndex,
  options: { now?: boolean } = {},
): Promise<void> {
  const named = new Set(index.order);
  const leftover = (await listClassRecordKeys()).filter(
    (key) => !named.has(classIdOfKey(key) ?? ''),
  );
  if (leftover.length === 0) return;
  if (options.now) {
    await deleteValues(leftover);
    return;
  }
  const cutoff = Date.now() - LEFTOVER_AGE_MS;
  const old: string[] = [];
  for (const key of leftover) {
    const stored = await readValue<StoredClass>(key);
    const stamp = Date.parse(stored?.record?.updatedAt ?? '');
    if (!Number.isFinite(stamp) || stamp < cutoff) old.push(key);
  }
  await deleteValues(old);
}

/**
 * Marks the value from before version 4 as the copy it now is, unchanged
 * otherwise. A value marked already stays as it is.
 */
export async function retireCollection(now = new Date()): Promise<void> {
  await changeStored<ClassCollectionState | RetiredCollection>(
    DB_KEYS.classCollection,
    (current) => {
      if (!current || 'retiredAt' in current) return UNCHANGED;
      if (isNewerStorage(current)) return UNCHANGED;
      return {
        ...current,
        version: CLASS_STORAGE_VERSION,
        retiredAt: now.toISOString(),
        retiredFromVersion:
          typeof current.version === 'number' ? current.version : 1,
      };
    },
  );
}

const isRetired = (value: unknown): value is RetiredCollection =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as { retiredAt?: unknown }).retiredAt === 'string' &&
  Array.isArray((value as { classes?: unknown }).classes);

const retiredUntil = (retired: RetiredCollection): number =>
  Date.parse(retired.retiredAt) + RETIRED_COLLECTION_DAYS * 24 * 3600 * 1000;

/**
 * The classes as they were before version 4, while they are kept and hold a
 * class; `undefined` otherwise. Past their 30 days they are dropped here,
 * and only the marker stays, so a window on 3.4.1 still writes nothing.
 */
export async function readRetiredCollection(
  now = new Date(),
): Promise<RetiredCollection | undefined> {
  const stored = await readValue<unknown>(DB_KEYS.classCollection);
  if (!isRetired(stored) || stored.classes.length === 0) return undefined;
  if (now.getTime() < retiredUntil(stored)) return stored;
  await changeStored<unknown>(DB_KEYS.classCollection, (current) =>
    isRetired(current) && now.getTime() >= retiredUntil(current)
      ? { ...current, activeClassId: null, classes: [] }
      : UNCHANGED,
  );
  return undefined;
}

/** When the copy from before version 4 goes, for the teacher to read. */
export const retiredCollectionExpiry = (retired: RetiredCollection): Date =>
  new Date(retiredUntil(retired));
