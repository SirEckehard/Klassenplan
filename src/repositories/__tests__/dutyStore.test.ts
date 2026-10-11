// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassDuties } from '@/types';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import {
  getAllDuties,
  loadClassDuties,
  restoreDuties,
  saveClassDuties,
  sweepOrphanDuties,
} from '../dutyStore';

const duties = (current: Record<string, string[]>): ClassDuties => ({
  duties: [{ id: 'board', name: 'Tafeldienst', count: 2 }],
  current: { at: '2026-10-11T08:00:00.000Z', assignments: current },
  rounds: [
    { at: '2026-10-04T08:00:00.000Z', assignments: { board: ['c', 'd'] } },
  ],
});

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dutyStore', () => {
  it('gives a class without duties an empty list', async () => {
    expect(await loadClassDuties('class-1')).toEqual({
      duties: [],
      current: null,
      rounds: [],
    });
    expect(await getAllDuties()).toBeUndefined();
  });

  it('keeps each class apart', async () => {
    expect(await saveClassDuties('class-1', duties({ board: ['a'] }))).toBe(
      true,
    );
    await saveClassDuties('class-2', duties({ board: ['x'] }));

    expect((await loadClassDuties('class-1')).current?.assignments).toEqual({
      board: ['a'],
    });
    expect(Object.keys((await getAllDuties()) ?? {})).toEqual([
      'class-1',
      'class-2',
    ]);
  });

  it('sweeps deleted classes and students that left', async () => {
    await saveClassDuties('class-1', duties({ board: ['a', 'gone'] }));
    await saveClassDuties('deleted', duties({ board: ['x'] }));

    await sweepOrphanDuties(new Map([['class-1', new Set(['a', 'c'])]]));

    const stored = await getAllDuties();
    expect(Object.keys(stored ?? {})).toEqual(['class-1']);
    expect(stored?.['class-1']?.current?.assignments).toEqual({ board: ['a'] });
    expect(stored?.['class-1']?.rounds[0]?.assignments).toEqual({
      board: ['c'],
    });
  });

  it('replaces everything on a full restore and only adds on a merge', async () => {
    await saveClassDuties('class-1', duties({ board: ['a'] }));

    await restoreDuties(
      { 'class-1': duties({ board: ['b'] }), 'class-2': duties({}) },
      { merge: true },
    );
    expect((await loadClassDuties('class-1')).current?.assignments).toEqual({
      board: ['a'],
    });
    expect(Object.keys((await getAllDuties()) ?? {})).toHaveLength(2);

    await restoreDuties(undefined);
    expect(await getAllDuties()).toBeUndefined();
  });
});
