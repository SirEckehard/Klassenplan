import type { ScoringContext } from './scoringContext';
import {
  isRestless,
  isShy,
  isConcentration,
  hasNeedsFrontSeat,
  specialWeight,
  getPartner,
  tableStats,
} from './scoringHelpers';

/**
 * Score front placement for students with front seat need.
 * Rewards placing sensory-impaired students closer to the front (based on board position).
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for front placement (reward), zero for back
 */
export const scoreFrontPlacement = (context: ScoringContext): number => {
  const {
    student,
    tableIndex,
    seatIndex,
    settings,
    seatPositions,
    minX,
    maxX,
    minY,
    maxY,
    frontIsHighX,
    frontIsHighY,
    dominantAxis,
  } = context;
  const weight = settings.preferFrontForNeedsFrontSeat ?? 0;

  if (weight === 0 || !hasNeedsFrontSeat(student)) return 0;

  const pos = seatPositions.get(`${tableIndex}-${seatIndex}`);
  if (!pos) return 0;

  // Calculate relative position (0 = back, 1 = front), respecting dominant axis
  let rel = 0.5;
  if (dominantAxis === 'x' && maxX > minX) {
    const rawRel = (pos.x - minX) / (maxX - minX);
    rel = frontIsHighX ? rawRel : 1 - rawRel;
  } else if (dominantAxis === 'y' && maxY > minY) {
    const rawRel = (pos.y - minY) / (maxY - minY);
    rel = frontIsHighY ? rawRel : 1 - rawRel;
  }

  // Reward front placement (higher rel = closer to front)
  return -rel * weight * specialWeight(student);
};

/**
 * Score restless student pairs.
 * Penalizes placing two restless students as partners.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for restless pair (penalty)
 */
export const scoreRestlessPairs = (context: ScoringContext): number => {
  const { student, settings } = context;
  const weight = settings.avoidRestlessTogether ?? 0;

  if (weight === 0 || !isRestless(student)) return 0;

  const { partner } = getPartner(context);

  if (partner && isRestless(partner)) {
    return weight * Math.max(specialWeight(student), specialWeight(partner));
  }

  return 0;
};

/**
 * Score concentration issues at the same table.
 * Penalizes placing multiple students with concentration issues together.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for multiple concentration issues (penalty)
 */
export const scoreConcentrationTogether = (context: ScoringContext): number => {
  const { student, tableIndex, arrangement, settings } = context;
  const weight = settings.avoidConcentrationTogether ?? 0;

  if (weight === 0 || !isConcentration(student)) return 0;

  let score = 0;
  const table = arrangement[tableIndex] ?? [];
  const tableLength = table.length;

  for (let i = 0; i < tableLength; i++) {
    const other = table[i];
    if (other && isConcentration(other)) {
      score += weight * Math.max(specialWeight(student), specialWeight(other));
    }
  }

  return score;
};

/**
 * Score concentration issues near restless students.
 * Penalizes placing students with concentration issues near restless neighbors.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for problematic adjacency (penalty)
 */
export const scoreConcentrationNearRestless = (
  context: ScoringContext,
): number => {
  const {
    student,
    tableIndex,
    seatIndex,
    arrangement,
    settings,
    seatNeighborhoods,
    behavioralNeighborWeights,
  } = context;
  const weight = settings.avoidConcentrationNearRestless ?? 0;

  if (weight === 0 || !isConcentration(student)) return 0;

  let score = 0;
  const neighbors = seatNeighborhoods.get(`${tableIndex}-${seatIndex}`) ?? [];
  const neighborsLength = neighbors.length;

  for (let i = 0; i < neighborsLength; i++) {
    const {
      tableIndex: nt,
      seatIndex: ns,
      strengthFactor,
      direction,
    } = neighbors[i]!;
    const neighborStudent = arrangement[nt]?.[ns];

    if (neighborStudent && isRestless(neighborStudent)) {
      const directionalWeight = behavioralNeighborWeights[direction] ?? 1;
      score +=
        weight *
        Math.max(specialWeight(student), specialWeight(neighborStudent)) *
        strengthFactor *
        directionalWeight;
    }
  }

  return score;
};

/**
 * Score shy students alone at a table.
 * Penalizes placing shy students at completely empty tables.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for shy student alone (penalty)
 */
export const scoreShyAlone = (context: ScoringContext): number => {
  const { student, tableIndex, arrangement, settings } = context;
  const weight = settings.avoidShyAlone ?? 0;

  if (weight === 0 || !isShy(student)) return 0;

  const { seated } = tableStats(tableIndex, arrangement);

  // Completely alone at the table (no other students yet)
  if (seated === 0) {
    return weight * specialWeight(student);
  }

  return 0;
};

/**
 * Score capacity preference.
 * Small penalty for filling tables beyond target, reward for filling to target.
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for filling toward target (reward)
 */
export const scoreCapacity = (context: ScoringContext): number => {
  const { tableIndex, targets, arrangement } = context;
  const { seated } = tableStats(tableIndex, arrangement);

  // Reward filling toward target capacity
  return -(targets[tableIndex]! - seated) * 0.25;
};

/**
 * Combined special needs scoring.
 * Evaluates all special needs constraints for a seat placement.
 *
 * @param context - Scoring context with student and position information
 * @returns Total special needs score (lower is better)
 */
export const scoreSpecialNeeds = (context: ScoringContext): number => {
  return (
    scoreFrontPlacement(context) +
    scoreRestlessPairs(context) +
    scoreConcentrationTogether(context) +
    scoreConcentrationNearRestless(context) +
    scoreShyAlone(context) +
    scoreCapacity(context)
  );
};
