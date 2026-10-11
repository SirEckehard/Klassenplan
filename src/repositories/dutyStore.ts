// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage layer for class duties ("Dienste verteilen", decision 0028).
 *
 * Every class's duties and rounds live in a single record in the default
 * keyval store under `DB_KEYS.duties`, so "delete all data" wipes them with the
 * rest. They stay out of the class record: the tool is a page of its own, and
 * writes of the open class belong to the persist queue alone.
 *
 * Reads that fail are logged and give an empty list; a write that fails is
 * reported to the caller, because the teacher just changed something and has
 * to know it did not stick.
 */
import { tryReadValue, tryWriteValue } from './idbClient';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError } from '@/utils';
import type { ClassDuties, DutyData, DutyRound } from '@/types';

const LOG_SOURCE = 'dutyStore';

/** Edits arrive a keystroke apart; chaining keeps read-modify-writes ordered. */
let writeChain: Promise<unknown> = Promise.resolve();

export function emptyClassDuties(): ClassDuties {
  return { duties: [], current: null, rounds: [] };
}

function emptyData(): DutyData {
  return { version: 1, byClass: {} };
}

/** A class's entry as stored, with any missing part filled in. */
function normalizeClassDuties(value: Partial<ClassDuties>): ClassDuties {
  return {
    duties: Array.isArray(value.duties) ? value.duties : [],
    current: value.current ?? null,
    rounds: Array.isArray(value.rounds) ? value.rounds : [],
  };
}

async function readData(): Promise<DutyData> {
  if (!hasIndexedDB()) return emptyData();

  const result = await tryReadValue<DutyData>(DB_KEYS.duties);
  if (!result.success) {
    logError('Failed to load duties', { error: result.error }, LOG_SOURCE);
    return emptyData();
  }

  const stored = result.data;
  if (!stored || stored.version !== 1) return emptyData();
  return { version: 1, byClass: stored.byClass ?? {} };
}

/**
 * Run a read-modify-write behind the chain.
 *
 * @returns Whether the change was written (true when there was nothing to do)
 */
function mutate(change: (data: DutyData) => DutyData | null): Promise<boolean> {
  const run = writeChain.then(async () => {
    if (!hasIndexedDB()) return false;
    try {
      const next = change(await readData());
      if (!next) return true;
      const result = await tryWriteValue(DB_KEYS.duties, next);
      if (!result.success) {
        logError('Failed to save duties', { error: result.error }, LOG_SOURCE);
        return false;
      }
      return true;
    } catch (error) {
      logError('Failed to update duties', { error }, LOG_SOURCE);
      return false;
    }
  });
  writeChain = run;
  return run;
}

/** A class's duties, or an empty list when it has none yet. */
export async function loadClassDuties(classId: string): Promise<ClassDuties> {
  const data = await readData();
  const entry = data.byClass[classId];
  return entry ? normalizeClassDuties(entry) : emptyClassDuties();
}

/**
 * Store a class's duties as they now are.
 *
 * @returns Whether they were written
 */
export function saveClassDuties(
  classId: string,
  duties: ClassDuties,
): Promise<boolean> {
  return mutate((data) => ({
    ...data,
    byClass: { ...data.byClass, [classId]: duties },
  }));
}

/** Every class's duties, for embedding in a backup. */
export async function getAllDuties(): Promise<
  Record<string, ClassDuties> | undefined
> {
  const data = await readData();
  return Object.keys(data.byClass).length > 0 ? data.byClass : undefined;
}

function keepKnown(
  round: DutyRound,
  known: ReadonlySet<string>,
): { round: DutyRound; changed: boolean } {
  let changed = false;
  const assignments: Record<string, string[]> = {};
  for (const [dutyId, ids] of Object.entries(round.assignments)) {
    const kept = ids.filter((id) => known.has(id));
    if (kept.length !== ids.length) changed = true;
    assignments[dutyId] = kept;
  }
  return { round: changed ? { ...round, assignments } : round, changed };
}

/**
 * Drop the duties of classes that no longer exist and the students that left
 * a class from its rounds. Safe to call on app start.
 *
 * @param studentIdsByClass Student identifiers per remaining class id
 */
export async function sweepOrphanDuties(
  studentIdsByClass: ReadonlyMap<string, ReadonlySet<string>>,
): Promise<void> {
  await mutate((data) => {
    const byClass: Record<string, ClassDuties> = {};
    let changed = false;

    for (const [classId, stored] of Object.entries(data.byClass)) {
      const known = studentIdsByClass.get(classId);
      if (!known) {
        changed = true;
        continue;
      }
      const entry = normalizeClassDuties(stored);
      const current = entry.current ? keepKnown(entry.current, known) : null;
      const rounds = entry.rounds.map((round) => keepKnown(round, known));
      if (current?.changed || rounds.some((round) => round.changed)) {
        changed = true;
      }
      byClass[classId] = {
        duties: entry.duties,
        current: current?.round ?? null,
        rounds: rounds.map((round) => round.round),
      };
    }

    return changed ? { ...data, byClass } : null;
  });
}

/**
 * Restore duties from a backup.
 *
 * A full import replaces the store, as it replaces everything else. A merge
 * only adds the duties of classes that have none yet — the classes a merge
 * adds are new on this device.
 */
export async function restoreDuties(
  byClass: Record<string, ClassDuties> | undefined,
  options?: { merge?: boolean },
): Promise<void> {
  const restored = byClass ?? {};

  if (!options?.merge) {
    await mutate(() => ({ version: 1, byClass: restored }));
    return;
  }

  await mutate((data) => {
    const added = Object.keys(restored).filter((id) => !data.byClass[id]);
    if (added.length === 0) return null;
    const next = { ...data.byClass };
    for (const id of added) next[id] = restored[id]!;
    return { ...data, byClass: next };
  });
}
