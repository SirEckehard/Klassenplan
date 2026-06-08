import type { ScoringContext } from './scoringContext';
import { isHighPerf, isLowPerf, getPartner } from './scoringHelpers';

/**
 * Score peer tutoring (heterogeneous performance pairing).
 * Rewards placing strong and weak performers together.
 * Penalizes pairing students of the same performance level.
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for high-low pairs (reward), positive for same-level pairs (penalty)
 */
export const scorePeerTutoring = (context: ScoringContext): number => {
  const { student, settings } = context;
  const weight = settings.peerTutoring ?? 0;

  if (weight === 0) return 0;

  const { partner } = getPartner(context);
  if (!partner) return 0;

  const high = isHighPerf(student);
  const low = isLowPerf(student);
  const partnerHigh = isHighPerf(partner);
  const partnerLow = isLowPerf(partner);

  // Reward: strong/weak pairing (peer tutoring)
  if ((high && partnerLow) || (low && partnerHigh)) {
    return -weight;
  }

  // Penalty: same performance level pairing
  if ((high && partnerHigh) || (low && partnerLow)) {
    return weight;
  }

  // No penalty if one is neutral (neither strong nor weak)
  return 0;
};

/**
 * Score homogeneous performance groups.
 * Rewards placing students of the same performance level together.
 * Penalizes mixing strong and weak performers.
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for same-level pairs (reward), positive for mixed pairs (penalty)
 */
export const scoreHomogeneousGroups = (context: ScoringContext): number => {
  const { student, settings } = context;
  const weight = settings.homogeneousPerformanceGroups ?? 0;

  if (weight === 0) return 0;

  const { partner } = getPartner(context);
  if (!partner) return 0;

  const high = isHighPerf(student);
  const low = isLowPerf(student);
  const partnerHigh = isHighPerf(partner);
  const partnerLow = isLowPerf(partner);

  const bothHigh = high && partnerHigh;
  const bothLow = low && partnerLow;

  // Reward: same performance level pairing
  if (bothHigh || bothLow) {
    return -weight;
  }

  // Penalty: mixed performance level pairing
  if ((high && partnerLow) || (low && partnerHigh)) {
    return weight;
  }

  // No penalty if one is neutral (neither strong nor weak)
  return 0;
};

/**
 * Combined performance-based scoring.
 * Uses the strategy with higher weight (mutually exclusive).
 * Peer tutoring takes precedence when both are enabled.
 *
 * @param context - Scoring context with student and position information
 * @returns Total performance score (lower is better)
 */
export const scorePerformance = (context: ScoringContext): number => {
  const { settings } = context;
  const peerTutoringWeight = settings.peerTutoring ?? 0;
  const homogeneousWeight = settings.homogeneousPerformanceGroups ?? 0;

  // Determine which strategy to use (mutually exclusive)
  // Peer tutoring takes precedence when weights are equal
  const usePeerTutoring = peerTutoringWeight >= homogeneousWeight;

  if (usePeerTutoring && peerTutoringWeight > 0) {
    return scorePeerTutoring(context);
  } else if (homogeneousWeight > 0) {
    return scoreHomogeneousGroups(context);
  }

  return 0;
};
