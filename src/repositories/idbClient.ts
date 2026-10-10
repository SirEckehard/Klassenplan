// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The single point where the app talks to IndexedDB.
 *
 * Every persistence module goes through here instead of importing `idb-keyval`
 * directly, so the storage driver is swappable, error handling is uniform, and
 * there is one place to look when asking "who writes to the database?".
 *
 * Two flavours are provided on purpose:
 * - the plain functions (`readValue`, `writeValue`, …) reject on failure and are
 *   meant for callers that already wrap their work in error handling, such as
 *   `IndexedDBRepository`;
 * - the `try…` variants return a {@link Result} and log the failure, for callers
 *   that want to decide locally what a storage error means.
 *
 * Neither flavour checks whether IndexedDB exists — callers that support running
 * without it (see `hasIndexedDB`) keep that decision, because "no database" and
 * "write failed" mean different things to them.
 */
import {
  createStore,
  get as idbGet,
  set as idbSet,
  del as idbDel,
  keys as idbKeys,
  entries as idbEntries,
  clear as idbClear,
} from 'idb-keyval';
import type { Result } from './types';
import { ResultHelpers, RepositoryErrorType } from './types';
import { logError, logWarn } from '@/utils';

const LOG_SOURCE = 'idbClient';

/** Handle for a non-default object store, created by {@link createIdbStore}. */
export type IdbStore = ReturnType<typeof createStore>;

/** Where idb-keyval keeps its default store: the class collection and more. */
const DEFAULT_DATABASE = 'keyval-store';
const DEFAULT_OBJECT_STORE = 'keyval';

/**
 * A handle of our own for the default store, made once its connection was
 * lost. Until then every call goes through idb-keyval's own default.
 */
let reopenedDefaultStore: IdbStore | undefined;

/**
 * Whether the database connection closed under the page. Safari does this
 * after a tab sat in the background ("Connection to Indexed Database server
 * lost", "The database connection is closing") and does not always tell
 * idb-keyval, which then hands out the dead connection to every later call.
 */
const isConnectionLost = (error: unknown): boolean =>
  typeof DOMException !== 'undefined' &&
  error instanceof DOMException &&
  (error.name === 'InvalidStateError' || error.name === 'UnknownError');

/**
 * Runs `operation` on the default store, and once more on a freshly opened
 * connection when the first one was lost. Each operation is a single
 * transaction, which either happened or did not, so trying it again is safe.
 */
async function onDefaultStore<T>(
  operation: (store: IdbStore | undefined) => Promise<T>,
): Promise<T> {
  try {
    return await operation(reopenedDefaultStore);
  } catch (error) {
    if (!isConnectionLost(error)) throw error;
    logWarn(
      'IndexedDB connection lost, reopening the database',
      { error },
      LOG_SOURCE,
    );
    reopenedDefaultStore = createStore(DEFAULT_DATABASE, DEFAULT_OBJECT_STORE);
    return operation(reopenedDefaultStore);
  }
}

/**
 * Creates a handle for a dedicated object store (e.g. student photos), so its
 * writes never touch the default key-value store that holds the class data.
 */
export const createIdbStore = (dbName: string, storeName: string): IdbStore =>
  createStore(dbName, storeName);

// Omitting the store argument entirely (rather than passing `undefined`) keeps
// the call identical to a direct idb-keyval call against the default store.

/** Read a value; resolves to `undefined` when the key is absent. */
export const readValue = <T>(
  key: IDBValidKey,
  store?: IdbStore,
): Promise<T | undefined> =>
  store
    ? idbGet<T>(key, store)
    : onDefaultStore((own) => (own ? idbGet<T>(key, own) : idbGet<T>(key)));

/** Write a value, replacing any existing one. */
export const writeValue = <T>(
  key: IDBValidKey,
  value: T,
  store?: IdbStore,
): Promise<void> =>
  store
    ? idbSet(key, value, store)
    : onDefaultStore((own) =>
        own ? idbSet(key, value, own) : idbSet(key, value),
      );

/** Delete a key (no-op when it does not exist). */
export const deleteValue = (
  key: IDBValidKey,
  store?: IdbStore,
): Promise<void> =>
  store
    ? idbDel(key, store)
    : onDefaultStore((own) => (own ? idbDel(key, own) : idbDel(key)));

/** Delete several keys in parallel. */
export const deleteValues = async (
  keys: readonly IDBValidKey[],
  store?: IdbStore,
): Promise<void> => {
  await Promise.all(keys.map((key) => deleteValue(key, store)));
};

/** All keys of the store, as strings. */
export const listKeys = async (store?: IdbStore): Promise<string[]> => {
  const keys = store
    ? await idbKeys(store)
    : await onDefaultStore((own) => (own ? idbKeys(own) : idbKeys()));
  return keys.map((key) => String(key));
};

/** All key/value pairs of the store. */
export const listEntries = <T>(store?: IdbStore): Promise<[string, T][]> =>
  store
    ? idbEntries<string, T>(store)
    : onDefaultStore((own) =>
        own ? idbEntries<string, T>(own) : idbEntries<string, T>(),
      );

/** Remove everything from the store. */
export const clearStore = (store?: IdbStore): Promise<void> =>
  store
    ? idbClear(store)
    : onDefaultStore((own) => (own ? idbClear(own) : idbClear()));

const toStorageFailure = (error: unknown, operation: string) => {
  logError(`IndexedDB ${operation} failed`, { error }, LOG_SOURCE);
  return ResultHelpers.fromError(
    error,
    RepositoryErrorType.STORAGE_ERROR,
    `IndexedDB ${operation} failed`,
  );
};

/** {@link readValue} as a {@link Result}; storage errors are logged, not thrown. */
export const tryReadValue = async <T>(
  key: IDBValidKey,
  store?: IdbStore,
): Promise<Result<T | undefined>> => {
  try {
    return ResultHelpers.success(await readValue<T>(key, store));
  } catch (error) {
    return toStorageFailure(error, 'read');
  }
};

/** {@link writeValue} as a {@link Result}. */
export const tryWriteValue = async <T>(
  key: IDBValidKey,
  value: T,
  store?: IdbStore,
): Promise<Result<void>> => {
  try {
    await writeValue(key, value, store);
    return ResultHelpers.success(undefined);
  } catch (error) {
    return toStorageFailure(error, 'write');
  }
};

/** {@link deleteValue} as a {@link Result}. */
export const tryDeleteValue = async (
  key: IDBValidKey,
  store?: IdbStore,
): Promise<Result<void>> => {
  try {
    await deleteValue(key, store);
    return ResultHelpers.success(undefined);
  } catch (error) {
    return toStorageFailure(error, 'delete');
  }
};

/** {@link deleteValues} as a {@link Result}. */
export const tryDeleteValues = async (
  keys: readonly IDBValidKey[],
  store?: IdbStore,
): Promise<Result<void>> => {
  try {
    await deleteValues(keys, store);
    return ResultHelpers.success(undefined);
  } catch (error) {
    return toStorageFailure(error, 'delete');
  }
};

/** {@link listKeys} as a {@link Result}. */
export const tryListKeys = async (
  store?: IdbStore,
): Promise<Result<string[]>> => {
  try {
    return ResultHelpers.success(await listKeys(store));
  } catch (error) {
    return toStorageFailure(error, 'list keys');
  }
};

/** {@link listEntries} as a {@link Result}. */
export const tryListEntries = async <T>(
  store?: IdbStore,
): Promise<Result<[string, T][]>> => {
  try {
    return ResultHelpers.success(await listEntries<T>(store));
  } catch (error) {
    return toStorageFailure(error, 'list entries');
  }
};

/** {@link clearStore} as a {@link Result}. */
export const tryClearStore = async (
  store?: IdbStore,
): Promise<Result<void>> => {
  try {
    await clearStore(store);
    return ResultHelpers.success(undefined);
  } catch (error) {
    return toStorageFailure(error, 'clear');
  }
};
