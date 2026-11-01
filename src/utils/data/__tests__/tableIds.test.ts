// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassroomTable } from '@/types';
import { createMockClassroomScene } from '@/__tests__/utils';
import {
  anchorLocks,
  RESTING_LOCK_TABLE,
  withTableIds,
} from '@/utils/data/tableIds';

const tables = (...ids: (string | undefined)[]): ClassroomTable[] =>
  createMockClassroomScene(ids.length).tables.map((table, index) =>
    ids[index] === undefined ? table : { ...table, id: ids[index] },
  );

describe('withTableIds', () => {
  it('gives every table an id once and keeps it after', () => {
    const ided = withTableIds(tables(undefined, undefined));

    expect(ided.every((table) => typeof table.id === 'string')).toBe(true);
    expect(new Set(ided.map((table) => table.id)).size).toBe(2);
    expect(withTableIds(ided)).toBe(ided);
  });

  // A pasted or duplicated table is a copy of another, its id included.
  it('gives a copy an id of its own and leaves the original its own', () => {
    const [first, second] = withTableIds(tables('a', 'a'));

    expect(first.id).toBe('a');
    expect(second.id).not.toBe('a');
  });
});

describe('anchorLocks', () => {
  it('follows a table to where it now stands in the list', () => {
    const locks = { ben: { table: 1, seat: 0, tableId: 'b' } };

    expect(anchorLocks(locks, tables('b', 'c'))).toEqual({
      ben: { table: 0, seat: 0, tableId: 'b' },
    });
  });

  it('rests a lock while its table is gone, and wakes it when it is back', () => {
    const locks = { ben: { table: 0, seat: 1, tableId: 'a' } };

    const resting = anchorLocks(locks, tables('b'));
    expect(resting.ben.table).toBe(RESTING_LOCK_TABLE);

    expect(anchorLocks(resting, tables('a', 'b'))).toEqual(locks);
  });

  it('gives a lock without an id the id of its table', () => {
    expect(
      anchorLocks({ ben: { table: 1, seat: 0 } }, tables('a', 'b')),
    ).toEqual({ ben: { table: 1, seat: 0, tableId: 'b' } });
  });

  it('changes nothing for tables without ids yet', () => {
    const locks = { ben: { table: 0, seat: 0, tableId: 'a' } };

    expect(anchorLocks(locks, tables(undefined))).toBe(locks);
  });

  it('returns the same locks when every one is where it belongs', () => {
    const locks = { ben: { table: 0, seat: 0, tableId: 'a' } };

    expect(anchorLocks(locks, tables('a'))).toBe(locks);
  });
});
