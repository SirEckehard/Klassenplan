// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// src/utils/pairs.ts
import type {
  MixResult,
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { MIX_HISTORY_LIMIT } from './constants';
import { isCountedUsage } from './data/planUsage';

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
  mixHistory?: MixResult[];
  currentSeating?: SeatingArrangement | null;
  studentCount?: number;
  /**
   * Records of the plans that were really in use. When present these replace
   * the saved plans as the history of record — see the module comment.
   */
  planUsage?: PlanUsage[];
};

const MIN_HISTORY_WINDOW = 5;
const MIN_DECAY_WEIGHT = 0.25;

/**
 * How much a mix from the running session weighs against a plan that was
 * really in use.
 *
 * Teachers shuffle many times before settling, so the mix history is mostly
 * experiments. It still has a job — shuffling twice in a row should not hand
 * back the same neighbours — but a pair that happened to come up in a dozen
 * consecutive tries must not end up looking like a pair that sat together for a
 * term. Halving is the compromise: session variety survives, experiments no
 * longer outweigh reality.
 */
const MIX_HISTORY_CONTRIBUTION = 0.5;

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
    target.set(key, Math.min(1, accumulated + contribution));
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

/** One entry of a history, already reduced to pair keys. */
type WeightedPairSource = { keys: string[]; factor: number };

/**
 * Apply one history to the weights, newest entry first, with a recency decay
 * across that history.
 */
const applyDecayedSources = (
  sources: readonly WeightedPairSource[],
  target: PreviousPairWeights,
) => {
  const span = Math.max(1, sources.length);
  sources.forEach(({ keys, factor }, index) => {
    addPairKeys(keys, calculateDecayContribution(index, span) * factor, target);
  });
};

/**
 * Build a weighted map of student pairs that recently sat together.
 *
 * Two histories contribute independently and are summed per pair (capped at 1):
 *
 * 1. **What was really in use** — the arrangement on screen, then the plan
 *    usage records, or the saved plans when no records exist yet. This history
 *    is read first and can never be crowded out.
 * 2. **The running session** — the recent mixes, scaled by
 *    `MIX_HISTORY_CONTRIBUTION` so a long shuffling session cannot outweigh a
 *    plan that a class actually sat in.
 *
 * Both decay with recency: within each history the newest entry counts fully
 * and the oldest one down to `MIN_DECAY_WEIGHT`.
 *
 * @param history Saved plans, used when no usage records are available
 * @param options Current arrangement, usage records, mixes and class size
 * @returns Map of pairs encoded as "idA::idB" to a weight between 0 and 1
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

  const realPlans: WeightedPairSource[] = [];

  if (options?.currentSeating) {
    realPlans.push({
      keys: pairKeysOfSeating(options.currentSeating),
      factor: 1,
    });
  }

  // Records of plans that were really in use take precedence over the saved
  // plans: a plan can be saved and never used, and every record that exists was
  // presented, exported or deliberately named.
  const countedUsage = (options?.planUsage ?? [])
    .filter(isCountedUsage)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  if (countedUsage.length > 0) {
    for (const entry of countedUsage) {
      if (realPlans.length >= windowSize) break;
      // Weaker evidence contributes less; see PLAN_USAGE_SOURCE_CONFIDENCE.
      realPlans.push({ keys: entry.pairs, factor: entry.confidence });
    }
  } else {
    for (let i = history.length - 1; i >= 0; i--) {
      if (realPlans.length >= windowSize) break;
      realPlans.push({
        keys: pairKeysOfSeating(history[i]?.seating),
        factor: 1,
      });
    }
  }

  applyDecayedSources(realPlans, pairWeights);

  const mixes = (options?.mixHistory ?? [])
    .slice(-windowSize)
    .reverse()
    .map((mix) => ({
      keys: pairKeysOfSeating(mix?.seating),
      factor: MIX_HISTORY_CONTRIBUTION,
    }));

  applyDecayedSources(mixes, pairWeights);

  return pairWeights;
}
