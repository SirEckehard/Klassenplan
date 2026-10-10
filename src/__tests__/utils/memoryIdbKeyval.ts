// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * An in-memory stand-in for `idb-keyval`, for tests that run the real hooks,
 * stores and repositories against storage — the seams between live state,
 * the persist queue and the repository, where unit tests with mocked partners
 * see nothing. Each store keeps its keys under a prefix of its own (the
 * default store under `default::`), and values are cloned on the way in and
 * out, as IndexedDB's structured clone does.
 *
 * Mock the module from the test file, with the map from `vi.hoisted`:
 *
 * ```ts
 * const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
 * vi.mock('idb-keyval', async () =>
 *   (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
 *     memory,
 *   ),
 * );
 * ```
 */
import { vi } from 'vitest';

type Store = { name: string } | undefined;

export function createMemoryIdbKeyval(memory: Map<string, unknown>) {
  const prefix = (store: Store) => `${store?.name ?? 'default'}::`;
  const toKey = (key: IDBValidKey, store: Store) =>
    `${prefix(store)}${String(key)}`;
  const own = (store: Store) =>
    [...memory.entries()].filter(([key]) => key.startsWith(prefix(store)));
  return {
    createStore: vi.fn((db: string, name: string) => ({
      name: `${db}/${name}`,
    })),
    get: vi.fn(async (key: IDBValidKey, store?: Store) => {
      const value = memory.get(toKey(key, store));
      return value === undefined ? undefined : structuredClone(value);
    }),
    set: vi.fn(async (key: IDBValidKey, value: unknown, store?: Store) => {
      memory.set(toKey(key, store), structuredClone(value));
    }),
    del: vi.fn(async (key: IDBValidKey, store?: Store) => {
      memory.delete(toKey(key, store));
    }),
    keys: vi.fn(async (store?: Store) =>
      own(store).map(([key]) => key.slice(prefix(store).length)),
    ),
    entries: vi.fn(async (store?: Store) =>
      own(store).map(([key, value]) => [
        key.slice(prefix(store).length),
        value,
      ]),
    ),
    clear: vi.fn(async (store?: Store) => {
      own(store).forEach(([key]) => memory.delete(key));
    }),
  };
}
