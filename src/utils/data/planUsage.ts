// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Pure helpers behind the plan usage record — see `@/types/PlanUsage` for what
 * it is and `@/repositories/planUsageStore` for where it is stored.
 *
 * Nothing here touches storage or the clock, so the merge rules can be asserted
 * exactly instead of statistically.
 */
import type {
  PlanUsage,
  PlanUsageSource,
  SavedPlan,
  SeatingArrangement,
} from '@/types';
import { seatPairKey, seatStudentIdentifier } from '@/utils/pairs';

/**
 * How much a single action says about a plan really being in use. A record is
 * rated by its strongest signal, not by their sum: presenting a plan twice is
 * not better evidence than presenting it once.
 */
const PLAN_USAGE_SOURCE_CONFIDENCE: Record<PlanUsageSource, number> = {
  presented: 1,
  exported: 1,
  saved: 0.8,
  edited: 0.3,
};

/**
 * Retained records per class. A class changes its seating every few weeks, so
 * this covers roughly two school years before the oldest entry drops out.
 */
export const PLAN_USAGE_LIMIT = 40;

/** Pair keys of an arrangement, sorted and free of duplicates. */
export function collectSeatingPairKeys(
  seating: SeatingArrangement | null | undefined,
): string[] {
  if (!seating) return [];

  const keys = new Set<string>();
  for (const table of seating) {
    const identifiers = (table ?? [])
      .filter(Boolean)
      .map((seat) => seatStudentIdentifier(seat!));
    for (let i = 0; i < identifiers.length; i++) {
      for (let j = i + 1; j < identifiers.length; j++) {
        keys.add(seatPairKey(identifiers[i], identifiers[j]));
      }
    }
  }
  return [...keys].sort();
}

/**
 * Stable hash over the pair keys. Two arrangements that seat the same people
 * next to each other share a fingerprint even when the tables were moved
 * around, which is exactly the equality the usage record cares about.
 *
 * Two FNV-1a passes with different offsets are concatenated: a single 32-bit
 * hash would be enough for a few dozen records per class, the second pass makes
 * an accidental collision — which would silently merge two plans — implausible.
 */
export function computePlanFingerprint(pairs: readonly string[]): string {
  const input = pairs.join('|');
  const hash = (offset: number): string => {
    let value = offset;
    for (let i = 0; i < input.length; i++) {
      value ^= input.charCodeAt(i);
      value = Math.imul(value, 0x01000193) >>> 0;
    }
    return value.toString(16).padStart(8, '0');
  };
  return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}`;
}

/** Highest confidence among the given sources. */
export function confidenceForSources(
  sources: readonly PlanUsageSource[],
): number {
  return sources.reduce(
    (best, source) => Math.max(best, PLAN_USAGE_SOURCE_CONFIDENCE[source] ?? 0),
    0,
  );
}

/**
 * A record backed by hand-rearranging alone. Editing says the teacher means
 * this arrangement, but not yet that it was used, so such a record is kept
 * around only until the next arrangement shows up.
 */
function isProvisional(entry: PlanUsage): boolean {
  return (
    entry.sources.length === 1 &&
    entry.sources[0] === 'edited' &&
    entry.confirmed !== true
  );
}

/** Keep the newest {@link PLAN_USAGE_LIMIT} records, oldest dropping out first. */
export function trimPlanUsage(entries: PlanUsage[]): PlanUsage[] {
  if (entries.length <= PLAN_USAGE_LIMIT) return entries;
  return [...entries]
    .sort((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt))
    .slice(entries.length - PLAN_USAGE_LIMIT);
}

export interface PlanUsageSignal {
  pairs: string[];
  fingerprint: string;
  source: PlanUsageSource;
  /** ISO 8601 timestamp of the action. */
  at: string;
  /** Id for the record this signal creates; ignored when one already exists. */
  id: string;
}

/**
 * Fold one usage signal into the records of a class.
 *
 * A matching fingerprint extends the existing record instead of appending —
 * that is what keeps a plan presented every week from turning into ten entries.
 * A new arrangement drops any provisional record, because a plan that was
 * edited but never used is not evidence of anything.
 */
export function mergePlanUsageSignal(
  entries: readonly PlanUsage[],
  { pairs, fingerprint, source, at, id }: PlanUsageSignal,
): PlanUsage[] {
  const index = entries.findIndex((entry) => entry.fingerprint === fingerprint);

  if (index !== -1) {
    const existing = entries[index];
    const sources = existing.sources.includes(source)
      ? existing.sources
      : [...existing.sources, source];
    const next = [...entries];
    next[index] = {
      ...existing,
      sources,
      confidence: confidenceForSources(sources),
      firstSeenAt: at < existing.firstSeenAt ? at : existing.firstSeenAt,
      lastSeenAt: at > existing.lastSeenAt ? at : existing.lastSeenAt,
    };
    return next;
  }

  const record: PlanUsage = {
    id,
    fingerprint,
    pairs: [...pairs],
    firstSeenAt: at,
    lastSeenAt: at,
    sources: [source],
    confidence: confidenceForSources([source]),
  };

  return trimPlanUsage([
    ...entries.filter((entry) => !isProvisional(entry)),
    record,
  ]);
}

/**
 * Whether a record counts towards the neighbourhood evaluation and the
 * repetition scoring. One definition for both, so the number a teacher reads
 * and the number the algorithm optimizes cannot drift apart.
 *
 * A record the teacher took out of the count never counts. Everything else
 * counts once something stronger than a hand edit was seen for it — editing
 * alone says the arrangement was meant, not that it was used.
 */
export function isCountedUsage(entry: PlanUsage): boolean {
  if (entry.confirmed === false) return false;
  if (entry.confirmed === true) return true;
  return entry.sources.some((source) => source !== 'edited');
}

/**
 * Whether a record belongs to a class, judged by whether any of its pairs names
 * somebody in it.
 *
 * A record whose pairs name nobody from the class came from a different one —
 * that is the shape cross-class contamination takes. Judging by "any" rather
 * than "all" is deliberate: a student who left the class must not invalidate
 * the plans they were part of.
 *
 * @param entry Record to test
 * @param knownIdentifiers Student ids of the class, plus names for pair keys
 *   written before students carried ids
 */
export function usageBelongsToClass(
  entry: PlanUsage,
  knownIdentifiers: ReadonlySet<string>,
): boolean {
  return entry.pairs.some((key) => {
    const separator = key.indexOf('::');
    if (separator === -1) return knownIdentifiers.has(key);
    return (
      knownIdentifiers.has(key.slice(0, separator)) ||
      knownIdentifiers.has(key.slice(separator + 2))
    );
  });
}

/** One pair of students and how often they were neighbours. */
export interface NeighborPairStat {
  /** Pair key, `"idA::idB"`. */
  key: string;
  studentIdA: string;
  studentIdB: string;
  /** Number of counted seating plans that sat them together. */
  count: number;
  /** ISO 8601 timestamp of the most recent of those plans. */
  lastSeenAt: string;
}

/**
 * Aggregate the usage records into "who sat next to whom", most frequent first.
 *
 * Counting *plans*, not signals, is the point: a plan presented every week for
 * a term is one shared plan, because the record behind it is one record.
 *
 * @param entries Usage records of one class
 */
export function buildNeighborhoodStats(
  entries: readonly PlanUsage[],
): NeighborPairStat[] {
  const stats = new Map<string, NeighborPairStat>();

  for (const entry of entries) {
    if (!isCountedUsage(entry)) continue;

    for (const key of entry.pairs) {
      const existing = stats.get(key);
      if (existing) {
        existing.count += 1;
        if (entry.lastSeenAt > existing.lastSeenAt) {
          existing.lastSeenAt = entry.lastSeenAt;
        }
        continue;
      }

      const [studentIdA = '', studentIdB = ''] = key.split('::');
      stats.set(key, {
        key,
        studentIdA,
        studentIdB,
        count: 1,
        lastSeenAt: entry.lastSeenAt,
      });
    }
  }

  return [...stats.values()].sort(
    (a, b) =>
      b.count - a.count ||
      b.lastSeenAt.localeCompare(a.lastSeenAt) ||
      a.key.localeCompare(b.key),
  );
}

const LEGACY_DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn a stored `SavedPlan.date` into a timestamp. Date-only values are read as
 * local midnight, matching how the rest of the app parses them; the German
 * strings written before the ISO switch are converted rather than dropped.
 * Returns null for anything else so the caller can skip the plan.
 */
export function storedPlanDateToTimestamp(stored: string): string | null {
  if (ISO_DATE_ONLY_PATTERN.test(stored)) {
    const [year, month, day] = stored.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
  }

  const legacy = LEGACY_DATE_PATTERN.exec(stored);
  if (legacy) {
    const [, day, month, year] = legacy;
    return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
  }

  const parsed = new Date(stored);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Seed usage records from plans that were saved before the signals existed.
 *
 * Only plans the teacher named count: an auto-save is written when leaving step
 * 3 and says nothing about the plan being used. Plans with the same
 * arrangement collapse into one record.
 *
 * @param plans Saved plans of one class
 * @param createId Id factory, injected so tests stay deterministic
 */
export function buildBackfillUsage(
  plans: readonly SavedPlan[],
  createId: () => string,
): PlanUsage[] {
  let entries: PlanUsage[] = [];

  for (const plan of plans) {
    if (plan.autoSaved === true) continue;
    const at = storedPlanDateToTimestamp(plan.date ?? '');
    if (!at) continue;
    const pairs = collectSeatingPairKeys(plan.seating);
    if (pairs.length === 0) continue;

    entries = mergePlanUsageSignal(entries, {
      pairs,
      fingerprint: computePlanFingerprint(pairs),
      source: 'saved',
      at,
      id: createId(),
    });
  }

  return entries;
}
