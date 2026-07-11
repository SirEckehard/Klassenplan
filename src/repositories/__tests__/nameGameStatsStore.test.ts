// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// In-memory stand-in for idb-keyval (default store only).
const memory = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  set: vi.fn(async (key: string, value: unknown) => {
    memory.set(key, value);
  }),
  get: vi.fn(async (key: string) => memory.get(key)),
  del: vi.fn(async (key: string) => {
    memory.delete(key);
  }),
}));

import {
  loadNameGameData,
  recordQuizAnswers,
  recordMemoryResult,
  clearNameGameData,
  sweepOrphanNameGameStats,
} from '../nameGameStatsStore';
import { DB_KEYS } from '@/utils/data/storageKeys';

beforeEach(() => {
  memory.clear();
  // hasIndexedDB() must return true for the store to perform operations.
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadNameGameData', () => {
  it('falls back to an empty record when nothing is stored', async () => {
    expect(await loadNameGameData()).toEqual({
      version: 1,
      stats: {},
      memoryBest: {},
    });
  });

  it('falls back when the stored record has an unknown version', async () => {
    memory.set(DB_KEYS.nameGameStats, { version: 99, stats: { a: {} } });
    expect(await loadNameGameData()).toEqual({
      version: 1,
      stats: {},
      memoryBest: {},
    });
  });
});

describe('recordQuizAnswers', () => {
  it('accumulates asked/correct counters across rounds', async () => {
    await recordQuizAnswers([
      { studentId: 'a', correct: true },
      { studentId: 'b', correct: false },
    ]);
    await recordQuizAnswers([{ studentId: 'a', correct: false }]);

    const data = await loadNameGameData();
    expect(data.stats.a).toMatchObject({ asked: 2, correct: 1 });
    expect(data.stats.b).toMatchObject({ asked: 1, correct: 0 });
    expect(data.stats.a.lastAskedAt).toBeDefined();
  });

  it('does nothing for an empty result list', async () => {
    await recordQuizAnswers([]);
    expect(memory.has(DB_KEYS.nameGameStats)).toBe(false);
  });
});

describe('recordMemoryResult', () => {
  it('stores the first result as best', async () => {
    const best = await recordMemoryResult(8, 14, 30000);
    expect(best).toMatchObject({ moves: 14, timeMs: 30000 });
    expect((await loadNameGameData()).memoryBest[8]).toMatchObject({
      moves: 14,
    });
  });

  it('only improves on fewer moves, or equal moves with less time', async () => {
    await recordMemoryResult(8, 14, 30000);

    const worse = await recordMemoryResult(8, 16, 10000);
    expect(worse.moves).toBe(14);

    const slowerTie = await recordMemoryResult(8, 14, 40000);
    expect(slowerTie.timeMs).toBe(30000);

    const fasterTie = await recordMemoryResult(8, 14, 20000);
    expect(fasterTie.timeMs).toBe(20000);

    const fewerMoves = await recordMemoryResult(8, 12, 90000);
    expect(fewerMoves.moves).toBe(12);
  });

  it('keeps separate bests per pair count', async () => {
    await recordMemoryResult(8, 14, 30000);
    await recordMemoryResult(4, 6, 9000);

    const data = await loadNameGameData();
    expect(data.memoryBest[8]?.moves).toBe(14);
    expect(data.memoryBest[4]?.moves).toBe(6);
  });
});

describe('sweepOrphanNameGameStats', () => {
  it('removes only stats whose student id is unknown', async () => {
    await recordQuizAnswers([
      { studentId: 'keep', correct: true },
      { studentId: 'orphan', correct: false },
    ]);

    const removed = await sweepOrphanNameGameStats(new Set(['keep', 'other']));

    expect(removed).toBe(1);
    const data = await loadNameGameData();
    expect(Object.keys(data.stats)).toEqual(['keep']);
  });

  it('returns 0 and writes nothing when all ids are known', async () => {
    await recordQuizAnswers([{ studentId: 'a', correct: true }]);
    expect(await sweepOrphanNameGameStats(['a'])).toBe(0);
  });
});

describe('without IndexedDB', () => {
  it('every operation is a safe no-op', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await recordQuizAnswers([{ studentId: 'a', correct: true }]);
    const best = await recordMemoryResult(8, 10, 1000);
    await clearNameGameData();

    expect(best.moves).toBe(10);
    expect(await sweepOrphanNameGameStats([])).toBe(0);
    expect(await loadNameGameData()).toEqual({
      version: 1,
      stats: {},
      memoryBest: {},
    });
    expect(memory.size).toBe(0);
  });
});

describe('clearNameGameData', () => {
  it('wipes the stored record', async () => {
    await recordQuizAnswers([{ studentId: 'a', correct: true }]);
    await clearNameGameData();
    expect(memory.has(DB_KEYS.nameGameStats)).toBe(false);
  });
});
