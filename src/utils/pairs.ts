// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// src/utils/pairs.ts
import type {
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { MIX_HISTORY_LIMIT } from './constants';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
  isCountedUsage,
  storedPlanDateToTimestamp,
} from './data/planUsage';

export type PreviousPairWeights = Map<string, number>;

/**
 * Identifier a pair key is built from. Falls back to the name for data written
 * before students carried ids.
 */
export function seatStudentIdentifier(student: Student): string {
  return student.id || student.name;
}

/**
 * Order-independent key for a pair of students. The single place that defines
 * the `"idA::idB"` format shared by the repetition scoring, the statistics and
 * the plan usage record.
 */
export function seatPairKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

type BuildPreviousPairsOptions = {
  studentCount?: number;
  /**
   * Records of the plans that were really in use. When present these replace
   * the saved plans as the history of record — see the module comment.
   */
  planUsage?: PlanUsage[];
  /**
   * When the teacher last reset the neighbourhoods of this class (ISO 8601).
   * Saved plans dated up to that day no longer count; the reset emptied the
   * usage records already.
   */
  since?: string | null;
  /**
   * The class marks its plans in use by hand. The records are the history of
   * record then even when none of them counts: the saved plans never stand in,
   * or plans the teacher did not mark would count after all.
   */
  manual?: boolean;
  /**
   * The plan being read: a plan in use is not a repetition of itself, so its
   * own record — and a saved plan with the same pairs — is left out.
   */
  plan?: SeatingArrangement | null;
};

/**
 * Whether something stamped `at` happened after a reset. An unreadable stamp
 * counts as before: the reset was asked for to start afresh.
 */
const isAfterReset = (at: string | null, since: number): boolean => {
  if (!at) return false;
  const time = Date.parse(at);
  return Number.isFinite(time) && time >= since;
};

const MIN_HISTORY_WINDOW = 5;
const MIN_DECAY_WEIGHT = 0.25;

/**
 * The most a pair can weigh. A pair that sat together in several plans weighs
 * more than one that sat together once, up to twice a single plan's weight:
 * frequency counts, without one long-standing pair drowning every other
 * criterion (decision 0031).
 */
export const MAX_PAIR_WEIGHT = 2;

const calculatePairHistoryWindowSize = (studentCount?: number): number => {
  const safeCount =
    Number.isFinite(studentCount ?? NaN) && (studentCount ?? 0) > 0
      ? (studentCount as number)
      : 0;
  const dynamicWindow = 5 + Math.ceil(safeCount / 3);
  const boundedWindow = Math.max(MIN_HISTORY_WINDOW, dynamicWindow);
  return Math.min(MIX_HISTORY_LIMIT, boundedWindow);
};

const calculateDecayContribution = (
  index: number,
  windowSize: number,
): number => {
  if (windowSize <= 1) return 1;
  const decayBase = Math.pow(MIN_DECAY_WEIGHT, 1 / (windowSize - 1));
  return Math.pow(decayBase, index);
};

const addPairKeys = (
  keys: readonly string[],
  contribution: number,
  target: PreviousPairWeights,
) => {
  if (contribution <= 0) return;

  for (const key of keys) {
    const accumulated = target.get(key) ?? 0;
    target.set(key, Math.min(MAX_PAIR_WEIGHT, accumulated + contribution));
  }
};

const pairKeysOfSeating = (
  seating: SeatingArrangement | null | undefined,
): string[] => {
  if (!seating) return [];

  const keys: string[] = [];
  for (const table of seating) {
    const identifiers = (table ?? [])
      .filter(Boolean)
      .map((s) => seatStudentIdentifier(s as Student));
    for (let i = 0; i < identifiers.length; i++) {
      for (let j = i + 1; j < identifiers.length; j++) {
        keys.push(seatPairKey(identifiers[i], identifiers[j]));
      }
    }
  }
  return keys;
};

const fingerprintOf = (seating: SeatingArrangement | null | undefined) =>
  computePlanFingerprint(collectSeatingPairKeys(seating));

/** One plan of the history, already reduced to pair keys. */
type WeightedPairSource = { keys: string[]; factor: number };

/**
 * Apply the plans to the weights, newest first, with a recency decay
 * over the window: an entry's weight depends on its rank alone, so last
 * week's plan weighs the same whether three plans or twelve came before it.
 */
const applyDecayedSources = (
  sources: readonly WeightedPairSource[],
  target: PreviousPairWeights,
  windowSize: number,
) => {
  sources.forEach(({ keys, factor }, index) => {
    addPairKeys(
      keys,
      calculateDecayContribution(index, windowSize) * factor,
      target,
    );
  });
};

/**
 * Build a weighted map of student pairs that sat together in plans that were
 * really in use (decision 0032): the plan usage records, or the saved plans
 * the teacher named when no record counts yet and the class detects its
 * plans. A mix is an experiment and never counts — neither the mix history
 * nor the plan on screen, which is in the records once it was in use.
 *
 * The plans decay with recency over the window: the newest counts fully and
 * the last one the window holds `MIN_DECAY_WEIGHT`. A pair that sat together
 * in several plans adds up to `MAX_PAIR_WEIGHT`.
 *
 * @param history Saved plans, used when no usage records are available
 * @param options Usage records, reset, the plan being read and class size
 * @returns Map of pairs encoded as "idA::idB" to a weight between 0 and
 *   `MAX_PAIR_WEIGHT`
 */
export function buildPreviousPairs(
  history: SavedPlan[] = [],
  options?: BuildPreviousPairsOptions,
): PreviousPairWeights {
  const pairWeights: PreviousPairWeights = new Map();
  const studentCountFromOptions = options?.studentCount;
  const fallbackStudentCount =
    history.length > 0
      ? (history[history.length - 1]?.scene?.totalStudents ?? 0)
      : 0;
  const windowSize = calculatePairHistoryWindowSize(
    studentCountFromOptions ?? fallbackStudentCount,
  );
  const ownFingerprint = options?.plan ? fingerprintOf(options.plan) : null;

  const since = options?.since ? Date.parse(options.since) : Number.NaN;
  const hasReset = Number.isFinite(since);

  const realPlans: WeightedPairSource[] = [];

  // Records of plans that were really in use take precedence over the saved
  // plans: a plan can be saved and never used, and every record that exists was
  // presented, exported or deliberately named.
  const countedUsage = (options?.planUsage ?? [])
    .filter(isCountedUsage)
    .filter((entry) => entry.fingerprint !== ownFingerprint)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  if (countedUsage.length > 0 || options?.manual) {
    for (const entry of countedUsage) {
      if (realPlans.length >= windowSize) break;
      // Weaker evidence contributes less; see PLAN_USAGE_SOURCE_CONFIDENCE.
      realPlans.push({ keys: entry.pairs, factor: entry.confidence });
    }
  } else {
    // Only plans the teacher named: the auto-save is written when leaving
    // the plan layer and says nothing about the plan being used. A saved plan
    // carries its day, not its moment: one from the day of a reset was saved
    // before it or got a usage record of its own when it was.
    const savedPlans = history.filter(
      (plan) =>
        plan?.autoSaved !== true &&
        (!hasReset ||
          isAfterReset(storedPlanDateToTimestamp(plan?.date ?? ''), since)) &&
        (ownFingerprint === null ||
          fingerprintOf(plan?.seating) !== ownFingerprint),
    );
    // Newest first by the day a plan carries; a plan saved again keeps its
    // place in the list, so the list's order is no age.
    const byDate = savedPlans
      .map((plan, index) => ({
        plan,
        index,
        time: Date.parse(storedPlanDateToTimestamp(plan?.date ?? '') ?? ''),
      }))
      .sort(
        (a, b) =>
          (Number.isFinite(b.time) ? b.time : -Infinity) -
            (Number.isFinite(a.time) ? a.time : -Infinity) || b.index - a.index,
      );
    for (const { plan } of byDate) {
      if (realPlans.length >= windowSize) break;
      realPlans.push({
        keys: pairKeysOfSeating(plan?.seating),
        factor: 1,
      });
    }
  }

  applyDecayedSources(realPlans, pairWeights, windowSize);

  return pairWeights;
}

/**
 * What the plans in use taught about pairs (decision 0054): `poor` weighs the
 * pairs of the tables at which a plan did not work, `good` holds the pairs of
 * plans that went well.
 */
export interface PlanExperience {
  /** Pair key → weight between 0 and `MAX_PAIR_WEIGHT` */
  poor: PreviousPairWeights;
  /**
   * The students of every table that did not work, while it counts, by
   * `seatStudentIdentifier` — what the fulfilment counts against, since a
   * table of six cannot be parted over four tables
   */
  groups: string[][];
  /** Pair keys of plans that went well, none of them in `poor` */
  good: ReadonlySet<string>;
}

/** Experience of a class that gave no feedback. */
export const emptyPlanExperience = (): PlanExperience => ({
  poor: new Map(),
  groups: [],
  good: new Set(),
});

/**
 * The tables an arrangement's pair keys stand for: every two students of a
 * table are a pair and no pair crosses tables, so a table is a group of
 * students linked by pairs. A student alone at a table has no pair and no
 * table here.
 */
export function tablesOfPairs(pairs: readonly string[]): string[][] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (const key of pairs) {
    const separator = key.indexOf('::');
    if (separator === -1) continue;
    const a = key.slice(0, separator);
    const b = key.slice(separator + 2);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    parent.set(find(a), find(b));
  }
  const tables = new Map<string, string[]>();
  for (const id of [...parent.keys()].sort()) {
    const root = find(id);
    const table = tables.get(root);
    if (table) table.push(id);
    else tables.set(root, [id]);
  }
  return [...tables.values()];
}

/**
 * A plan rated "Nicht gut" without a table weighs each of its pairs this
 * much; a table chosen weighs each of its pairs 1. The repetition parts them
 * anyway, and the rating alone cannot say which pair it means.
 */
export const POOR_PLAN_PAIR_WEIGHT = 0.25;

/**
 * How much a plan's feedback still counts by its rank among the plans in use,
 * newest first: fully within the repetition's window, then fading to nothing
 * over a second window as long — twice as long as a repetition, and then
 * over (decision 0054).
 */
const experienceFactor = (rank: number, windowSize: number): number => {
  if (rank < windowSize) return 1;
  return Math.max(0, (2 * windowSize - rank) / (windowSize + 1));
};

/**
 * Build what the feedback on the plans in use says about pairs (decision
 * 0054). Only usage records carry feedback, so the saved plans never stand in
 * here; the records are ranked as `buildPreviousPairs` ranks them, the plan
 * being read left out.
 *
 * @param planUsage The class's usage records, resolved for its mode
 * @param options The plan being read and the class size
 */
export function buildPlanExperience(
  planUsage: readonly PlanUsage[] = [],
  options?: Pick<BuildPreviousPairsOptions, 'plan' | 'studentCount'>,
): PlanExperience {
  const poor: PreviousPairWeights = new Map();
  const groups: string[][] = [];
  const windowSize = calculatePairHistoryWindowSize(options?.studentCount);
  const ownFingerprint = options?.plan ? fingerprintOf(options.plan) : null;
  const counted = planUsage
    .filter(isCountedUsage)
    .filter((entry) => entry.fingerprint !== ownFingerprint)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  const wentWell = new Set<string>();
  counted.forEach((entry, rank) => {
    const factor = experienceFactor(rank, windowSize);
    const feedback = entry.feedback;
    if (!feedback || factor <= 0) return;
    if (feedback.rating === 'good') {
      for (const key of entry.pairs) wentWell.add(key);
      return;
    }
    if (feedback.poorTables && feedback.poorTables.length > 0) {
      for (const table of feedback.poorTables) {
        groups.push([...table]);
        const pairs = new Set<string>();
        table.forEach((id, i) => {
          for (const other of table.slice(i + 1)) {
            pairs.add(seatPairKey(id, other));
          }
        });
        addPairKeys([...pairs], factor, poor);
      }
    } else {
      groups.push(...tablesOfPairs(entry.pairs));
      addPairKeys(entry.pairs, factor * POOR_PLAN_PAIR_WEIGHT, poor);
    }
  });

  const good = new Set<string>();
  for (const key of wentWell) {
    if (!poor.has(key)) good.add(key);
  }
  return { poor, groups, good };
}
