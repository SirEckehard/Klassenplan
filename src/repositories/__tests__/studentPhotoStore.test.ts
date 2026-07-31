// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// In-memory stand-in for idb-keyval (the store token is ignored).
const memory = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => ({})),
  set: vi.fn(async (key: string, value: unknown) => {
    memory.set(key, value);
  }),
  get: vi.fn(async (key: string) => memory.get(key)),
  del: vi.fn(async (key: string) => {
    memory.delete(key);
  }),
  keys: vi.fn(async () => [...memory.keys()]),
  entries: vi.fn(async () => [...memory.entries()]),
  clear: vi.fn(async () => {
    memory.clear();
  }),
}));

import {
  setStudentPhoto,
  getStudentPhoto,
  deleteStudentPhoto,
  getAllPhotoIds,
  getAllPhotos,
  clearAllPhotos,
  sweepOrphanPhotos,
} from '../studentPhotoStore';
import type { Result } from '../types';

beforeEach(() => {
  memory.clear();
  // hasIndexedDB() must return true for the store to perform operations.
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const blob = (tag: string) => new Blob([tag], { type: 'image/jpeg' });

/** Unwraps a successful Result, failing the test when it is a Failure. */
const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

describe('studentPhotoStore CRUD', () => {
  it('stores, reads and deletes a photo', async () => {
    expectData(await setStudentPhoto('a', blob('a')));
    expect(expectData(await getStudentPhoto('a'))).toBeInstanceOf(Blob);

    expectData(await deleteStudentPhoto('a'));
    expect(expectData(await getStudentPhoto('a'))).toBeUndefined();
  });

  it('lists all ids and entries', async () => {
    await setStudentPhoto('a', blob('a'));
    await setStudentPhoto('b', blob('b'));

    expect(expectData(await getAllPhotoIds()).sort()).toEqual(['a', 'b']);
    const all = expectData(await getAllPhotos());
    expect(all.size).toBe(2);
    expect(all.get('a')).toBeInstanceOf(Blob);
  });

  it('clears every photo', async () => {
    await setStudentPhoto('a', blob('a'));
    expectData(await clearAllPhotos());
    expect(expectData(await getAllPhotoIds())).toEqual([]);
  });

  it('reports a storage failure when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const written = await setStudentPhoto('a', blob('a'));
    expect(written.success).toBe(false);

    const ids = await getAllPhotoIds();
    expect(ids.success).toBe(false);
  });
});

describe('sweepOrphanPhotos', () => {
  it('removes only photos whose student id is unknown', async () => {
    await setStudentPhoto('keep', blob('keep'));
    await setStudentPhoto('orphan1', blob('o1'));
    await setStudentPhoto('orphan2', blob('o2'));

    const removed = await sweepOrphanPhotos(new Set(['keep', 'other']));

    expect(removed).toBe(2);
    expect(expectData(await getAllPhotoIds()).sort()).toEqual(['keep']);
  });

  it('keeps everything when all ids are known', async () => {
    await setStudentPhoto('a', blob('a'));
    const removed = await sweepOrphanPhotos(['a']);
    expect(removed).toBe(0);
    expect(expectData(await getAllPhotoIds())).toEqual(['a']);
  });
});
