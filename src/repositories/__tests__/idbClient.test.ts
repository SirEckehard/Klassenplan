// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';

const memory = new Map<string, unknown>();
const idbMocks = vi.hoisted(() => ({
  createStore: vi.fn(() => ({ token: 'custom-store' })),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  entries: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('idb-keyval', () => idbMocks);

import {
  clearStore,
  createIdbStore,
  deleteValue,
  deleteValues,
  listEntries,
  listKeys,
  readValue,
  tryClearStore,
  tryDeleteValue,
  tryDeleteValues,
  tryListEntries,
  tryListKeys,
  tryReadValue,
  tryWriteValue,
  writeValue,
} from '../idbClient';
import { RepositoryErrorType } from '../types';

beforeEach(() => {
  memory.clear();
  vi.clearAllMocks();
  idbMocks.get.mockImplementation(async (key: string) => memory.get(key));
  idbMocks.set.mockImplementation(async (key: string, value: unknown) => {
    memory.set(key, value);
  });
  idbMocks.del.mockImplementation(async (key: string) => {
    memory.delete(key);
  });
  idbMocks.keys.mockImplementation(async () => [...memory.keys()]);
  idbMocks.entries.mockImplementation(async () => [...memory.entries()]);
  idbMocks.clear.mockImplementation(async () => {
    memory.clear();
  });
});

describe('plain primitives', () => {
  it('reads back what it wrote', async () => {
    await writeValue('a', { value: 1 });
    await expect(readValue<{ value: number }>('a')).resolves.toEqual({
      value: 1,
    });
  });

  it('resolves to undefined for a missing key', async () => {
    await expect(readValue('missing')).resolves.toBeUndefined();
  });

  it('deletes single and multiple keys', async () => {
    await writeValue('a', 1);
    await writeValue('b', 2);
    await writeValue('c', 3);

    await deleteValue('a');
    await deleteValues(['b', 'c']);

    await expect(listKeys()).resolves.toEqual([]);
  });

  it('lists keys as strings and entries as pairs', async () => {
    await writeValue('a', 1);
    await writeValue('b', 2);

    await expect(listKeys()).resolves.toEqual(['a', 'b']);
    await expect(listEntries<number>()).resolves.toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('clears the whole store', async () => {
    await writeValue('a', 1);
    await clearStore();
    await expect(listKeys()).resolves.toEqual([]);
  });

  it('omits the store argument for the default store', async () => {
    await readValue('a');
    expect(idbMocks.get).toHaveBeenCalledWith('a');
  });

  it('forwards a custom store when one is given', async () => {
    const store = createIdbStore('photos-db', 'photos');
    await readValue('a', store);
    expect(idbMocks.get).toHaveBeenCalledWith('a', store);
  });

  it('rejects when the driver fails', async () => {
    idbMocks.set.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(writeValue('a', 1)).rejects.toThrow('quota exceeded');
  });
});

describe('Result variants', () => {
  it('wrap successful operations', async () => {
    expect(await tryWriteValue('a', 5)).toEqual({
      success: true,
      data: undefined,
    });
    expect(await tryReadValue<number>('a')).toEqual({ success: true, data: 5 });
    expect(await tryListKeys()).toEqual({ success: true, data: ['a'] });
    expect(await tryListEntries<number>()).toEqual({
      success: true,
      data: [['a', 5]],
    });
    expect(await tryDeleteValue('a')).toEqual({
      success: true,
      data: undefined,
    });
    expect(await tryClearStore()).toEqual({ success: true, data: undefined });
  });

  it('turn a driver failure into a storage failure instead of throwing', async () => {
    idbMocks.get.mockRejectedValueOnce(new Error('db closed'));

    const result = await tryReadValue('a');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected a failure');
    expect(result.error.type).toBe(RepositoryErrorType.STORAGE_ERROR);
    expect(result.error.message).toContain('read');
    expect(result.error.originalError).toBeInstanceOf(Error);
  });

  it('reports failures for every operation kind', async () => {
    idbMocks.set.mockRejectedValueOnce(new Error('x'));
    expect((await tryWriteValue('a', 1)).success).toBe(false);

    idbMocks.del.mockRejectedValueOnce(new Error('x'));
    expect((await tryDeleteValue('a')).success).toBe(false);

    idbMocks.del.mockRejectedValueOnce(new Error('x'));
    expect((await tryDeleteValues(['a'])).success).toBe(false);

    idbMocks.keys.mockRejectedValueOnce(new Error('x'));
    expect((await tryListKeys()).success).toBe(false);

    idbMocks.entries.mockRejectedValueOnce(new Error('x'));
    expect((await tryListEntries()).success).toBe(false);

    idbMocks.clear.mockRejectedValueOnce(new Error('x'));
    expect((await tryClearStore()).success).toBe(false);
  });
});
