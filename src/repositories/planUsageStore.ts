// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage layer for the plan usage record — which seating plans were actually
 * in use, derived from actions that only happen for a plan that is really being
 * used (see `@/types/PlanUsage`).
 *
 * Everything lives in a single record in the default keyval store under
 * `DB_KEYS.planUsage`, so "delete all data" wipes it with the rest. Only pair
 * keys and timestamps are stored, never a full arrangement.
 *
 * Like the name-game store, failures are logged and swallowed here: a lost
 * usage signal is nothing the teacher can act on, and every flow this hangs off
 * — presenting, exporting, saving — has to keep working without it.
 */
import { tryReadValue, tryWriteValue } from './idbClient';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { generateId, logError } from '@/utils';
import {
  buildBackfillUsage,
  collectSeatingPairKeys,
  computePlanFingerprint,
  mergePlanUsageSignal,
  trimPlanUsage,
  usageBelongsToClass,
} from '@/utils/data/planUsage';
import type {
  PlanUsage,
  PlanUsageData,
  PlanUsageSource,
  SavedPlan,
  SeatingArrangement,
} from '@/types';

const LOG_SOURCE = 'planUsageStore';

/**
 * Signals arrive seconds apart at most, but a read-modify-write pair that
 * interleaves would drop one. Chaining every mutation keeps them ordered
 * without pulling a lock into the storage layer.
 */
let writeChain: Promise<void> = Promise.resolve();

type PlanUsageListener = () => void;

const listeners = new Set<PlanUsageListener>();

/**
 * Watch for changes to the record.
 *
 * Signals are raised from pages that live outside the generator (presenting,
 * exporting), so a component holding a loaded copy has no other way of knowing
 * that it went stale.
 *
 * @param listener Called after every write that changed something
 * @returns Unsubscribe function
 */
export function subscribeToPlanUsage(listener: PlanUsageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      logError('Plan usage listener failed', { error }, LOG_SOURCE);
    }
  }
}

function emptyData(): PlanUsageData {
  return { version: 1, byClass: {}, backfilledClassIds: [] };
}

async function readData(): Promise<PlanUsageData> {
  if (!hasIndexedDB()) return emptyData();

  const result = await tryReadValue<PlanUsageData>(DB_KEYS.planUsage);
  if (!result.success) {
    logError(
      'Failed to load plan usage data',
      { error: result.error },
      LOG_SOURCE,
    );
    return emptyData();
  }

  const stored = result.data;
  if (!stored || stored.version !== 1) return emptyData();
  return {
    version: 1,
    byClass: stored.byClass ?? {},
    backfilledClassIds: stored.backfilledClassIds ?? [],
  };
}

async function writeData(data: PlanUsageData): Promise<void> {
  if (!hasIndexedDB()) return;
  const result = await tryWriteValue(DB_KEYS.planUsage, data);
  if (!result.success) {
    logError(
      'Failed to save plan usage data',
      { error: result.error },
      LOG_SOURCE,
    );
  }
}

/** Run a read-modify-write behind the chain, swallowing and logging failures. */
async function mutate(
  change: (data: PlanUsageData) => PlanUsageData | null,
): Promise<void> {
  const run = writeChain.then(async () => {
    try {
      const data = await readData();
      const next = change(data);
      if (next) {
        await writeData(next);
        notifyListeners();
      }
    } catch (error) {
      logError('Failed to update plan usage data', { error }, LOG_SOURCE);
    }
  });
  writeChain = run;
  return run;
}

/** Usage records of one class, most recently seen last. */
export async function loadPlanUsage(
  classId: string | null | undefined,
): Promise<PlanUsage[]> {
  if (!classId) return [];
  const data = await readData();
  return data.byClass[classId] ?? [];
}

/** Every class's usage records, for embedding in a backup. */
export async function getAllPlanUsage(): Promise<
  Record<string, PlanUsage[]> | undefined
> {
  const data = await readData();
  return Object.keys(data.byClass).length > 0 ? data.byClass : undefined;
}

/** What one signal did to the record; drives whether the UI asks anything. */
export interface RecordPlanUsageOutcome {
  /** Id of the record the signal landed on. */
  id: string;
  /** True when this arrangement had no record yet. */
  created: boolean;
  /**
   * True when this signal is the first one stronger than a hand edit. The
   * confirmation prompt hangs off this, not off `created`: a plan presented
   * every week must not be questioned every week, and a plan that was
   * rearranged by hand before being exported must still be asked about once.
   */
  firstStrongSignal: boolean;
  /** Whether the teacher already answered the prompt for this record. */
  confirmed?: boolean;
}

/**
 * Note that a seating plan was in use.
 *
 * Safe to call on every occurrence of a signal: an arrangement that already has
 * a record extends it rather than adding a second one.
 *
 * @param classId Active class; the call is a no-op without one
 * @param seating Arrangement that was presented, exported, saved or edited
 * @param source What the teacher did
 * @returns What happened, or null when nothing was recorded
 */
export async function recordPlanUsage(
  classId: string | null | undefined,
  seating: SeatingArrangement | null | undefined,
  source: PlanUsageSource,
): Promise<RecordPlanUsageOutcome | null> {
  if (!classId || !hasIndexedDB()) return null;

  const pairs = collectSeatingPairKeys(seating);
  if (pairs.length === 0) return null;

  const fingerprint = computePlanFingerprint(pairs);
  const signal = {
    pairs,
    fingerprint,
    source,
    at: new Date().toISOString(),
    id: generateId(),
  };

  let outcome: RecordPlanUsageOutcome | null = null;

  await mutate((data) => {
    const entries = data.byClass[classId] ?? [];
    const existing = entries.find((entry) => entry.fingerprint === fingerprint);
    const merged = mergePlanUsageSignal(entries, signal);
    const record = merged.find((entry) => entry.fingerprint === fingerprint);

    const hadStrongSignal =
      existing?.sources.some((entry) => entry !== 'edited') ?? false;

    outcome = record
      ? {
          id: record.id,
          created: !existing,
          firstStrongSignal: source !== 'edited' && !hadStrongSignal,
          confirmed: record.confirmed,
        }
      : null;

    return { ...data, byClass: { ...data.byClass, [classId]: merged } };
  });

  return outcome;
}

/**
 * Answer the confirmation prompt for one record.
 *
 * `false` takes the plan out of the count without deleting it: the teacher can
 * change their mind, and a deleted record would be recreated by the next signal
 * for the same arrangement.
 *
 * @param classId Class the record belongs to
 * @param usageId Record to mark
 * @param confirmed Whether the plan really was in use
 */
export async function setPlanUsageConfirmed(
  classId: string | null | undefined,
  usageId: string,
  confirmed: boolean,
): Promise<void> {
  if (!classId || !hasIndexedDB()) return;

  await mutate((data) => {
    const entries = data.byClass[classId];
    if (!entries?.some((entry) => entry.id === usageId)) return null;

    return {
      ...data,
      byClass: {
        ...data.byClass,
        [classId]: entries.map((entry) =>
          entry.id === usageId ? { ...entry, confirmed } : entry,
        ),
      },
    };
  });
}

/**
 * Seed a class from the plans it saved before the signals existed, so the
 * record is not empty for teachers who have been using the app all along.
 * Runs at most once per class.
 *
 * @param classId Class to seed
 * @param plans That class's saved plans
 */
export async function backfillPlanUsage(
  classId: string | null | undefined,
  plans: readonly SavedPlan[],
): Promise<void> {
  if (!classId || !hasIndexedDB()) return;

  await mutate((data) => {
    if (data.backfilledClassIds.includes(classId)) return null;

    const seeded = buildBackfillUsage(plans, generateId);
    const existing = data.byClass[classId] ?? [];

    return {
      ...data,
      byClass: {
        ...data.byClass,
        // Records written since the app started win: a live signal is better
        // evidence than a plan that was merely saved at some point.
        [classId]: trimPlanUsage([
          ...seeded.filter(
            (entry) =>
              !existing.some((kept) => kept.fingerprint === entry.fingerprint),
          ),
          ...existing,
        ]),
      },
      backfilledClassIds: [...data.backfilledClassIds, classId],
    };
  });
}

/**
 * Drop records of classes that no longer exist, and records that name nobody
 * from the class they sit under. Safe to call on app start.
 *
 * The second part repairs cross-class contamination: because `activeClass` is
 * set optimistically on a class switch, an earlier version could seed one
 * class's bucket from another class's plans, which surfaced as pairs of unknown
 * students in the neighbourhood view.
 *
 * @param studentIdsByClass Student identifiers per remaining class id
 */
export async function sweepOrphanPlanUsage(
  studentIdsByClass: ReadonlyMap<string, ReadonlySet<string>>,
): Promise<void> {
  if (!hasIndexedDB()) return;

  await mutate((data) => {
    const byClass: Record<string, PlanUsage[]> = {};
    let changed = false;

    for (const [classId, entries] of Object.entries(data.byClass)) {
      const known = studentIdsByClass.get(classId);
      if (!known) {
        changed = true;
        continue;
      }

      const kept = entries.filter((entry) => usageBelongsToClass(entry, known));
      if (kept.length !== entries.length) {
        changed = true;
      }
      byClass[classId] = kept;
    }

    const backfilledClassIds = data.backfilledClassIds.filter((id) =>
      studentIdsByClass.has(id),
    );
    if (backfilledClassIds.length !== data.backfilledClassIds.length) {
      changed = true;
    }

    return changed ? { ...data, byClass, backfilledClassIds } : null;
  });
}

/**
 * Restore usage records from a backup.
 *
 * A full import replaces the store, mirroring how the rest of the backup is
 * applied. A merge only adds classes that have no records yet: reconciling two
 * histories of the same class would have to guess which arrangement came first,
 * and guessing wrong would corrupt the very data this record exists to protect.
 *
 * @param byClass Usage records per class from the backup
 * @param options `merge` keeps existing records; otherwise the store is replaced
 */
export async function restorePlanUsage(
  byClass: Record<string, PlanUsage[]> | undefined,
  options?: { merge?: boolean },
): Promise<void> {
  if (!hasIndexedDB()) return;

  const restored = byClass ?? {};

  if (!options?.merge) {
    await mutate(() => ({
      version: 1,
      byClass: restored,
      backfilledClassIds: Object.keys(restored),
    }));
    return;
  }

  await mutate((data) => {
    const added = Object.keys(restored).filter((id) => !data.byClass[id]);
    if (added.length === 0) return null;

    const byClassNext = { ...data.byClass };
    for (const id of added) {
      byClassNext[id] = restored[id];
    }
    return {
      ...data,
      byClass: byClassNext,
      backfilledClassIds: [...data.backfilledClassIds, ...added],
    };
  });
}
