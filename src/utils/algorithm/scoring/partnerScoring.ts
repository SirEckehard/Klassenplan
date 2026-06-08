import type { ScoringContext } from './scoringContext';
import type { SeatNeighborDirection } from '@/utils/math/seatGeometry';
import { getPartner } from './scoringHelpers';
import {
  getWishPartnerIds,
  getAvoidPartnerIds,
} from '@/utils/data/studentMigration';

/**
 * Direction-based reduction factors for neighbor scoring.
 * Closer neighbors have stronger impact on wish/avoid scoring.
 */
const NEIGHBOR_WISH_FACTORS: Record<SeatNeighborDirection, number> = {
  direct: 0.7, // Almost like a partner
  side: 0.5, // Can see/hear each other
  front: 0.3, // Less direct interaction
  back: 0.3, // Less direct interaction
};

const NEIGHBOR_AVOID_FACTORS: Record<SeatNeighborDirection, number> = {
  direct: 0.8, // Strong penalty - sitting close
  side: 0.6, // Moderate penalty
  front: 0.4, // Weaker penalty
  back: 0.4, // Weaker penalty
};

/**
 * Score avoid partner constraint (highest priority).
 * Heavily penalizes placing a student with any of their avoid partners.
 * Supports both legacy single field and new array field.
 *
 * @param context - Scoring context with student and position information
 * @returns High positive score for conflict (penalty)
 */
export const scoreAvoidPartners = (context: ScoringContext): number => {
  const {
    student,
    tableIndex,
    seatIndex,
    arrangement,
    studentById,
    settings,
    seatNeighborhoods,
  } = context;
  const weight = settings.avoidConflictPartners ?? 0;

  const avoidPartnerIds = getAvoidPartnerIds(student);
  if (weight === 0 || avoidPartnerIds.length === 0) return 0;

  const { partner } = getPartner(context);
  let totalScore = 0;

  // Check if direct partner is in avoid list (highest penalty)
  if (partner && avoidPartnerIds.includes(partner.id)) {
    // Priority-weighted penalty: first avoid partner has highest weight
    const priorityIdx = avoidPartnerIds.indexOf(partner.id);
    const priorityMultiplier = 1 - priorityIdx * 0.1; // 1.0, 0.9, 0.8...
    totalScore += weight * 2 * priorityMultiplier;
  }

  // Check table proximity for all avoid partners
  const t = arrangement[tableIndex];

  // First, check for spatial neighbors (for Single tables or when no direct partner)
  const seatKey = `${tableIndex}-${seatIndex}`;
  const neighbors = seatNeighborhoods.get(seatKey) ?? [];
  const neighborAvoidIds = new Set<string>(); // Track avoid partners who are neighbors

  if (!partner) {
    for (const neighbor of neighbors) {
      const neighborStudent =
        arrangement[neighbor.tableIndex]?.[neighbor.seatIndex];
      if (!neighborStudent) continue;

      const avoidIdx = avoidPartnerIds.indexOf(neighborStudent.id);
      if (avoidIdx === -1) continue;

      // Skip if at same table (handled separately)
      if (t?.some((s) => s?.id === neighborStudent.id)) continue;

      neighborAvoidIds.add(neighborStudent.id);

      const priorityMultiplier = 1 - avoidIdx * 0.1;
      const directionFactor = NEIGHBOR_AVOID_FACTORS[neighbor.direction];

      // Distance-based factor - closer neighbors get stronger penalty
      const distanceFactor = Math.max(
        0.3,
        Math.min(1.0, 1 - neighbor.distance / 200),
      );

      // Penalty: avoid partner is a spatial neighbor
      totalScore +=
        weight *
        directionFactor *
        priorityMultiplier *
        distanceFactor *
        neighbor.strengthFactor;
    }
  }

  // Now check table proximity (but don't reward "different table" if they're neighbors)
  for (let i = 0; i < avoidPartnerIds.length; i++) {
    const avoidId = avoidPartnerIds[i]!;
    const avoidStudent = studentById.get(avoidId);
    if (!avoidStudent) continue;

    // Skip if already penalized as direct partner
    if (partner && partner.id === avoidId) continue;

    let isAtSameTable = false;
    if (t) {
      for (let j = 0; j < t.length; j++) {
        const s = t[j];
        if (s && s.id === avoidId) {
          isAtSameTable = true;
          break;
        }
      }
    }

    const priorityMultiplier = 1 - i * 0.1; // 1.0, 0.9, 0.8...

    if (isAtSameTable) {
      // Penalty: at same table but not direct partner
      totalScore += weight * 0.8 * priorityMultiplier;
    } else if (!neighborAvoidIds.has(avoidId)) {
      // Reward: placing at different table from avoided partner (only if not a neighbor!)
      totalScore -= weight * 0.3 * priorityMultiplier;
    }
    // If partner is a neighbor, no reward - they're still too close
  }

  return totalScore;
};

/**
 * Score wish partner constraint.
 * Rewards placing students near any of their wish partners.
 * Supports both legacy single field and new array field.
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for fulfilled wish (reward), positive for unfulfilled
 */
export const scoreWishPartners = (context: ScoringContext): number => {
  const {
    student,
    tableIndex,
    seatIndex,
    studentById,
    settings,
    seatNeighborhoods,
    arrangement,
  } = context;
  const weight = settings.considerWishPartners ?? 0;

  const wishPartnerIds = getWishPartnerIds(student);
  if (weight === 0 || wishPartnerIds.length === 0) return 0;

  const { partner } = getPartner(context);

  // Check if any wish partner is fulfilled
  if (partner && wishPartnerIds.includes(partner.id)) {
    // Priority-weighted reward: fulfilling first wish is best
    const priorityIdx = wishPartnerIds.indexOf(partner.id);
    const priorityMultiplier = 1 - priorityIdx * 0.15; // 1.0, 0.85, 0.7...

    // Check for conflict: does the wish partner want to avoid us?
    const wishPartner = studentById.get(partner.id);
    if (wishPartner) {
      const theirAvoidIds = getAvoidPartnerIds(wishPartner);
      if (
        theirAvoidIds.includes(student.id) &&
        settings.avoidConflictPartners
      ) {
        // Conflict: A wants B, but B avoids A - apply penalty
        return settings.avoidConflictPartners;
      }
    }

    // Reward: wish partner is seated together
    return -weight * priorityMultiplier;
  }

  // Seat is occupied but not by any wish partner
  if (partner) {
    return weight * 0.5;
  }

  // NEW: Check spatial neighbors for wish partners (for Single tables or other cases without direct partner)
  const seatKey = `${tableIndex}-${seatIndex}`;
  const neighbors = seatNeighborhoods.get(seatKey) ?? [];
  let bestNeighborScore = 0;

  for (const neighbor of neighbors) {
    const neighborStudent =
      arrangement[neighbor.tableIndex]?.[neighbor.seatIndex];
    if (!neighborStudent) continue;

    const wishIdx = wishPartnerIds.indexOf(neighborStudent.id);
    if (wishIdx === -1) continue;

    // Check for conflict: does the wish partner want to avoid us?
    const theirAvoidIds = getAvoidPartnerIds(neighborStudent);
    if (theirAvoidIds.includes(student.id) && settings.avoidConflictPartners) {
      // Conflict: A wants B, but B avoids A - no reward
      continue;
    }

    const priorityMultiplier = 1 - wishIdx * 0.15;
    const directionFactor = NEIGHBOR_WISH_FACTORS[neighbor.direction];

    // NEW: Distance-based factor - closer neighbors get much stronger bonus
    // Formula: 1 - (distance / 200) gives higher factor for closer distances
    // Clamped between 0.3 and 1.0
    const distanceFactor = Math.max(
      0.3,
      Math.min(1.0, 1 - neighbor.distance / 200),
    );

    // Reward: wish partner is a spatial neighbor
    // Multiply by both direction factor AND distance factor
    const score =
      -weight *
      directionFactor *
      priorityMultiplier *
      distanceFactor *
      neighbor.strengthFactor;

    // Keep best (most negative) score
    if (score < bestNeighborScore) {
      bestNeighborScore = score;
    }
  }

  return bestNeighborScore;
};

/**
 * Score wish partner when partner is locked at another position.
 * Rewards placing student at same table as any locked wish partner.
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for same table (reward), positive for different table
 */
export const scoreLockedWishPartner = (context: ScoringContext): number => {
  const {
    student,
    tableIndex,
    studentById,
    validLockedIds,
    lockedPositions,
    settings,
  } = context;
  const weight = settings.considerWishPartners ?? 0;

  const wishPartnerIds = getWishPartnerIds(student);
  if (weight === 0 || wishPartnerIds.length === 0) return 0;

  const { partner } = getPartner(context);

  // Only applies when partner seat is empty but wish partner is locked elsewhere
  if (partner) return 0;

  let bestScore = 0;

  for (let i = 0; i < wishPartnerIds.length; i++) {
    const wishId = wishPartnerIds[i]!;
    const wishPartner = studentById.get(wishId);
    if (!wishPartner || !validLockedIds.has(wishId)) {
      continue;
    }

    // Find locked partner's table
    const lockedPos = lockedPositions[wishId];
    if (!lockedPos) continue;

    const priorityMultiplier = 1 - i * 0.15; // 1.0, 0.85, 0.7...

    if (lockedPos.table === tableIndex) {
      // Reward: placing at same table as locked wish partner
      const score = -weight * 0.5 * priorityMultiplier;
      if (score < bestScore) bestScore = score;
    } else {
      // Only penalize for first wish partner not matched
      if (i === 0) {
        bestScore += weight * 0.3;
      }
    }
  }

  return bestScore;
};

/**
 * Combined partner scoring.
 * Evaluates all partner-related constraints for a seat placement.
 * Avoid partners have highest priority, then wish partners.
 *
 * @param context - Scoring context with student and position information
 * @returns Total partner score (lower is better)
 */
export const scorePartners = (context: ScoringContext): number => {
  return (
    scoreAvoidPartners(context) +
    scoreWishPartners(context) +
    scoreLockedWishPartner(context)
  );
};
