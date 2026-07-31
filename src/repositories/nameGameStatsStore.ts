// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage layer for the name-learning game ("Namensspiel").
 *
 * All game data (per-student quiz stats + memory best scores) lives in a
 * single record in the default keyval store under `DB_KEYS.nameGameStats`,
 * so "delete all data" wipes it together with the rest of the app data.
 *
 * Storage access goes through `idbClient`, which reports failures as a
 * `Result`. The public API deliberately does *not* pass those on: a lost quiz
 * statistic is nothing the player can act on, and the game keeps working
 * without persistence. Failures are logged and swallowed here, at the one place
 * that knows they are harmless.
 */
import { tryReadValue, tryWriteValue, tryDeleteValue } from './idbClient';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError } from '@/utils';
import type {
  MemoryBestScore,
  NameGameData,
  NameGameStudentStat,
} from '@/types';

const LOG_SOURCE = 'nameGameStatsStore';

export interface QuizAnswerResult {
  studentId: string;
  correct: boolean;
}

function emptyData(): NameGameData {
  return { version: 1, stats: {}, memoryBest: {} };
}

/** Load the stored game data, falling back to an empty record. */
export async function loadNameGameData(): Promise<NameGameData> {
  if (!hasIndexedDB()) return emptyData();

  const result = await tryReadValue<NameGameData>(DB_KEYS.nameGameStats);
  if (!result.success) {
    logError(
      'Failed to load name game data',
      { error: result.error },
      LOG_SOURCE,
    );
    return emptyData();
  }

  const stored = result.data;
  if (!stored || stored.version !== 1) return emptyData();
  return {
    version: 1,
    stats: stored.stats ?? {},
    memoryBest: stored.memoryBest ?? {},
  };
}

async function saveNameGameData(data: NameGameData): Promise<void> {
  if (!hasIndexedDB()) return;
  const result = await tryWriteValue(DB_KEYS.nameGameStats, data);
  if (!result.success) {
    logError(
      'Failed to save name game data',
      { error: result.error },
      LOG_SOURCE,
    );
  }
}

/**
 * Accumulate the results of one quiz round into the per-student stats.
 * One read-modify-write per round.
 */
export async function recordQuizAnswers(
  results: ReadonlyArray<QuizAnswerResult>,
): Promise<void> {
  if (!hasIndexedDB() || results.length === 0) return;
  try {
    const data = await loadNameGameData();
    const now = new Date().toISOString();
    for (const { studentId, correct } of results) {
      const stat: NameGameStudentStat = data.stats[studentId] ?? {
        asked: 0,
        correct: 0,
      };
      stat.asked += 1;
      if (correct) stat.correct += 1;
      stat.lastAskedAt = now;
      data.stats[studentId] = stat;
    }
    await saveNameGameData(data);
  } catch (error) {
    logError('Failed to record quiz answers', { error }, LOG_SOURCE);
  }
}

/**
 * Compare a finished memory round against the stored best for the same pair
 * count and persist it when it is better (fewer moves; on a tie, less time).
 * Returns the score that is now the stored best.
 */
export async function recordMemoryResult(
  pairs: number,
  moves: number,
  timeMs: number,
): Promise<MemoryBestScore> {
  const candidate: MemoryBestScore = {
    moves,
    timeMs,
    achievedAt: new Date().toISOString(),
  };
  if (!hasIndexedDB()) return candidate;
  try {
    const data = await loadNameGameData();
    const best = data.memoryBest[pairs];
    const isImprovement =
      !best ||
      moves < best.moves ||
      (moves === best.moves && timeMs < best.timeMs);
    if (!isImprovement) return best;
    data.memoryBest[pairs] = candidate;
    await saveNameGameData(data);
    return candidate;
  } catch (error) {
    logError('Failed to record memory result', { error }, LOG_SOURCE);
    return candidate;
  }
}

/** Wipe all stored game data (quiz stats and memory best scores). */
export async function clearNameGameData(): Promise<void> {
  if (!hasIndexedDB()) return;
  const result = await tryDeleteValue(DB_KEYS.nameGameStats);
  if (!result.success) {
    logError(
      'Failed to clear name game data',
      { error: result.error },
      LOG_SOURCE,
    );
  }
}

/**
 * Drop stats whose student id is no longer present in any class. Returns the
 * number of removed entries. Safe to call on app start.
 */
export async function sweepOrphanNameGameStats(
  knownStudentIds: Iterable<string>,
): Promise<number> {
  if (!hasIndexedDB()) return 0;
  try {
    const data = await loadNameGameData();
    const known = new Set(knownStudentIds);
    const orphans = Object.keys(data.stats).filter((id) => !known.has(id));
    if (orphans.length === 0) return 0;
    for (const id of orphans) {
      delete data.stats[id];
    }
    await saveNameGameData(data);
    return orphans.length;
  } catch (error) {
    logError('Failed to sweep orphan name game stats', { error }, LOG_SOURCE);
    return 0;
  }
}
