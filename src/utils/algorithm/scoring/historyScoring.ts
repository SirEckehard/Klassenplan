import type { ScoringContext } from './scoringContext';

/**
 * Score previous pairs constraint.
 * Penalizes placing students who have been paired together before.
 * Wish partners are exempt from this penalty.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for repeated pairs (penalty)
 */
export const scorePreviousPairs = (context: ScoringContext): number => {
  const { student, tableIndex, arrangement, settings, previousPairs } = context;
  const weight = settings.avoidPreviousPairs ?? 0;

  if (weight === 0 || previousPairs.size === 0) return 0;

  let score = 0;
  const t = arrangement[tableIndex] ?? [];

  for (const other of t) {
    if (!other) continue;

    const key = [student.id, other.id].sort().join('::');
    const wishPair =
      settings.considerWishPartners && student.wishPartnerId === other.id;
    const pairPenalty = previousPairs.get(key) ?? 0;

    // Don't penalize wish partners even if they were together before
    if (!wishPair && pairPenalty > 0) {
      score += weight * pairPenalty;
    }
  }

  return score;
};

/**
 * History scoring (currently only previous pairs).
 * Can be extended with other history-based constraints.
 *
 * @param context - Scoring context with student and position information
 * @returns Total history score (lower is better)
 */
export const scoreHistory = (context: ScoringContext): number => {
  return scorePreviousPairs(context);
};
