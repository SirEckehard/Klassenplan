// src/utils/pairs.ts
import type {
  MixResult,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { MIX_HISTORY_LIMIT } from './constants';

export type PreviousPairWeights = Map<string, number>;

type BuildPreviousPairsOptions = {
  mixHistory?: MixResult[];
  currentSeating?: SeatingArrangement | null;
  studentCount?: number;
};

const MIN_HISTORY_WINDOW = 5;
const MIN_DECAY_WEIGHT = 0.25;

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

const addPairsFromSeating = (
  seating: SeatingArrangement | null | undefined,
  contribution: number,
  target: PreviousPairWeights,
) => {
  if (!seating || contribution <= 0) return;

  for (const table of seating ?? []) {
    const identifiers = (table ?? [])
      .filter(Boolean)
      .map((s) => (s as Student).id || (s as Student).name);
    for (let i = 0; i < identifiers.length; i++) {
      for (let j = i + 1; j < identifiers.length; j++) {
        const key = [identifiers[i], identifiers[j]].sort().join('::');
        const accumulated = target.get(key) ?? 0;
        target.set(key, Math.min(1, accumulated + contribution));
      }
    }
  }
};

/**
 * Build a weighted map of student pairs that appeared together in recent plans.
 * Uses a dynamic window based on class size (capped at MIX_HISTORY_LIMIT) and
 * applies a recency decay so older mixes contribute less strongly.
 * @param history Optional list of past seating plans
 * @param options Additional sources like recent mixes or current seating
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

  const recentSeatings: SeatingArrangement[] = [];

  if (options?.currentSeating) {
    recentSeatings.push(options.currentSeating);
  }

  if (options?.mixHistory?.length) {
    const trimmedMixHistory = options.mixHistory.slice(-windowSize);
    for (
      let i = trimmedMixHistory.length - 1;
      i >= 0 && recentSeatings.length < windowSize;
      i--
    ) {
      recentSeatings.push(trimmedMixHistory[i]?.seating);
    }
  }

  if (recentSeatings.length < windowSize && history.length > 0) {
    const remaining = windowSize - recentSeatings.length;
    const trimmedHistory = history.slice(-remaining);
    for (let i = trimmedHistory.length - 1; i >= 0; i--) {
      recentSeatings.push(trimmedHistory[i]?.seating);
    }
  }

  const effectiveWindow = Math.max(1, recentSeatings.length);

  recentSeatings.forEach((seating, index) => {
    const contribution = calculateDecayContribution(index, effectiveWindow);
    addPairsFromSeating(seating, contribution, pairWeights);
  });

  return pairWeights;
}
