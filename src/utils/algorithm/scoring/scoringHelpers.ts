import type { Student, MixSettings, SeatingArrangement } from '@/types';
import type { GenderCounts } from '../genderBalance';
import { createGenderCounts } from '../genderBalance';
import type { ScoringContext } from './scoringContext';

/**
 * Helper predicates for student attributes
 */
export const isRestless = (s: Student) => s.restless;
export const isShy = (s: Student) => s.shy;
export const isConcentration = (s: Student) => s.concentrationIssues;
export const isHighPerf = (s: Student) => s.performanceStrong;
export const isLowPerf = (s: Student) => s.performanceWeak;
export const hasNeedsFrontSeat = (s: Student) => s.needsFrontSeat;

/**
 * Check if student requires front seat placement
 */
export const requiresFront = (s: Student, settings: Partial<MixSettings>) =>
  hasNeedsFrontSeat(s) && (settings.preferFrontForNeedsFrontSeat ?? 0) > 0;

/**
 * Count how many special needs flags a student has
 */
export const countSpecialFlags = (s: Student): number => {
  let count = 0;
  if (s.restless) count++;
  if (s.shy) count++;
  if (s.concentrationIssues) count++;
  if (s.needsFrontSeat) count++;
  return count;
};

/**
 * Calculate special weight factor based on number of special needs.
 * Linear weighting: each additional flag adds 0.5 to base weight of 1.0
 * 0 flags → 1.0, 1 flag → 1.5, 2 flags → 2.0, 3 flags → 2.5, 4 flags → 3.0
 */
export const specialWeight = (s: Student) => 1 + countSpecialFlags(s) * 0.5;

/**
 * Create empty gender counts
 */
export const emptyCounts = (): GenderCounts => createGenderCounts();

/**
 * Calculate gender statistics for a specific table
 */
export const tableStats = (
  tIdx: number,
  arrangement: SeatingArrangement,
): {
  boy: number;
  girl: number;
  diverse: number;
  seated: number;
  restCount: number;
  highPerf: number;
  lowPerf: number;
} => {
  const t = arrangement[tIdx] ?? [];
  const counts = emptyCounts();
  let seated = 0,
    restCount = 0,
    highPerf = 0,
    lowPerf = 0;
  const tableLength = t.length;
  for (let i = 0; i < tableLength; i++) {
    const s = t[i];
    if (s) {
      seated++;
      if (s.gender) {
        counts[s.gender]++;
      }
      if (isRestless(s)) restCount++;
      if (isHighPerf(s)) highPerf++;
      else if (isLowPerf(s)) lowPerf++;
    }
  }
  return { ...counts, seated, restCount, highPerf, lowPerf };
};

/**
 * Get the partner seat for a given seat on a table.
 * Partner seats are paired as: (0,1), (2,3), (4,5), etc.
 */
export const getPartner = (
  context: ScoringContext,
): { partnerIdx: number | null; partner: Student | null } => {
  const { tableIndex, seatIndex, seatCounts, arrangement } = context;
  const seatCount = seatCounts[tableIndex]!;

  // Calculate partner index based on seat pairs
  let partnerIdx: number | null = null;
  if (seatIndex % 2 === 0 && seatIndex + 1 < seatCount) {
    partnerIdx = seatIndex + 1;
  } else if (seatIndex % 2 === 1) {
    partnerIdx = seatIndex - 1;
  }

  const partner =
    partnerIdx !== null ? arrangement[tableIndex]![partnerIdx] : null;

  return { partnerIdx, partner };
};

/**
 * Check if seat position is valid and available
 */
export const isSeatAvailable = (context: ScoringContext): boolean => {
  const { tableIndex, seatIndex, arrangement, targets } = context;

  if (
    !arrangement[tableIndex] ||
    arrangement[tableIndex]![seatIndex] !== null
  ) {
    return false;
  }

  if (seatIndex >= (targets[tableIndex] ?? 0)) {
    return false;
  }

  return true;
};

/**
 * Check if table has reached its target capacity
 */
export const isTableFull = (context: ScoringContext): boolean => {
  const { tableIndex, targets, arrangement } = context;
  const { seated } = tableStats(tableIndex, arrangement);
  return seated >= targets[tableIndex]!;
};
