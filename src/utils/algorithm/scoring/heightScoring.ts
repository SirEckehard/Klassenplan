import type { ScoringContext } from './scoringContext';

export const HEIGHT_PLACEMENT_AMPLIFICATION = 3;

/**
 * Check if student is categorized as small
 */
export const isSmall = (context: ScoringContext): boolean => {
  return context.student.height === 'small';
};

/**
 * Check if student is categorized as tall
 */
export const isTall = (context: ScoringContext): boolean => {
  return context.student.height === 'tall';
};

/**
 * Score height-based placement for students.
 * Places smaller students toward the front and taller students toward the back.
 * Front direction is determined by board position (frontIsHighX).
 *
 * Strategy:
 * - Small students: Rewarded for front placement (closer to board = lower score)
 * - Tall students: Rewarded for back placement (away from board = lower score)
 * - Medium students: No preference (score 0)
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for optimal placement (reward), positive for suboptimal
 */
export const scoreHeightPlacement = (context: ScoringContext): number => {
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

  const weight = settings.preferFrontForSmallerStudents ?? 0;

  // Feature disabled
  if (weight === 0) return 0;

  // No height category set or medium height
  if (!student.height || student.height === 'medium') return 0;

  const pos = seatPositions.get(`${tableIndex}-${seatIndex}`);
  if (!pos) return 0;

  // Calculate relative position (0 = back, 1 = front), respecting dominant axis
  let relativePosition = 0.5;
  if (dominantAxis === 'x' && maxX > minX) {
    const rawPosition = (pos.x - minX) / (maxX - minX);
    relativePosition = frontIsHighX ? rawPosition : 1 - rawPosition;
  } else if (dominantAxis === 'y' && maxY > minY) {
    const rawPosition = (pos.y - minY) / (maxY - minY);
    relativePosition = frontIsHighY ? rawPosition : 1 - rawPosition;
  }

  if (student.height === 'small') {
    // Reward front placement for small students
    // relativePosition=1.0 (front) → -30 (at weight=10)
    // relativePosition=0.0 (back)  → 0
    return -relativePosition * weight * HEIGHT_PLACEMENT_AMPLIFICATION;
  }

  if (student.height === 'tall') {
    // Reward back placement for tall students
    // relativePosition=0.0 (back)  → -30 (at weight=10)
    // relativePosition=1.0 (front) → 0
    return -(1 - relativePosition) * weight * HEIGHT_PLACEMENT_AMPLIFICATION;
  }

  return 0;
};
