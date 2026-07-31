// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  MixSettings,
  NeighborWeightConfig,
  SeatingArrangement,
  Student,
} from '@/types';
import type { PreviousPairWeights } from '@/utils/pairs';
import type { SeatNeighborhoodMap } from '@/utils/math/seatGeometry';
import { seatPairsFor } from '@/utils/math/seatGeometry';
import { TABLE_SCORE_WEIGHTS } from '@/utils';
import type { OrientationContext } from '../orientationUtils';
import type { FeatureDistanceMaps } from '../featureDistances';
import { calculateGenderImbalance } from '../genderBalance';
import {
  emptyCounts,
  hasNeedsFrontSeat,
  isConcentration,
  isHighPerf,
  isLowPerf,
  isRestless,
  isShy,
  specialWeight,
} from './scoringHelpers';
import { HEIGHT_PLACEMENT_AMPLIFICATION } from './heightScoring';
import { scoreTableComposition } from './tableScoring';

/**
 * Everything {@link scoreTable} needs to rate a table of an existing plan.
 *
 * Unlike {@link ScoringContext}, which rates a single candidate placement while
 * a plan is being built, this context rates whole tables of a plan that already
 * exists — that is what the refinement pass compares before and after a swap.
 * `arrangement` is held by reference on purpose: the refinement loop swaps seats
 * in place and re-scores without rebuilding the context.
 */
export interface ArrangementScoringContext {
  arrangement: SeatingArrangement;
  settings: Partial<MixSettings>;
  seatCounts: number[];
  /** Even-distribution target per table, see `evenTargetsFor` */
  targets: number[];
  seatNeighborhoods: SeatNeighborhoodMap;
  seatPositions: Map<string, { x: number; y: number }>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  orientation: OrientationContext;
  previousPairs: PreviousPairWeights;
  featureDistances: FeatureDistanceMaps;
  behavioralNeighborWeights: NeighborWeightConfig;
  genderNeighborWeights: NeighborWeightConfig;
}

const buildSeatKey = (tableIndex: number, seatIndex: number): string =>
  `${tableIndex}-${seatIndex}`;

const normalizeFeatureDistance = (
  distance: number,
  maxDistance: number,
): number => {
  if (!Number.isFinite(distance) || maxDistance <= 0) {
    return 1;
  }
  return Math.min(distance / maxDistance, 1);
};

const getWishIds = (student: Student): string[] =>
  student.wishPartnerIds?.length
    ? student.wishPartnerIds
    : student.wishPartnerId
      ? [student.wishPartnerId]
      : [];

const getAvoidIds = (student: Student): string[] =>
  student.avoidPartnerIds?.length
    ? student.avoidPartnerIds
    : student.avoidPartnerId
      ? [student.avoidPartnerId]
      : [];

/** Score the seat pairs of a table: behaviour, partner wishes, performance. */
const scoreSeatPairs = (
  ctx: ArrangementScoringContext,
  table: (Student | null)[],
  seatCount: number,
): number => {
  const { settings } = ctx;
  let score = 0;

  for (const [a, b] of seatPairsFor(seatCount)) {
    const A = table[a];
    const B = table[b];

    if (
      settings.avoidRestlessTogether &&
      A &&
      B &&
      isRestless(A) &&
      isRestless(B)
    ) {
      score +=
        settings.avoidRestlessTogether *
        Math.max(specialWeight(A), specialWeight(B));
    }

    if (settings.avoidShyAlone) {
      if (A && isShy(A) && !B)
        score += settings.avoidShyAlone * specialWeight(A);
      if (B && isShy(B) && !A)
        score += settings.avoidShyAlone * specialWeight(B);
    }

    // Avoid partner logic (higher priority) - supports up to three partners
    if (settings.avoidConflictPartners) {
      const avoidIdsA = A ? getAvoidIds(A) : [];
      const avoidIdsB = B ? getAvoidIds(B) : [];
      const avoidA = A && B && avoidIdsA.includes(B.id);
      const avoidB = B && A && avoidIdsB.includes(A.id);
      if (avoidA || avoidB) {
        score +=
          settings.avoidConflictPartners *
          TABLE_SCORE_WEIGHTS.avoidPartnerTogether;
      }
    }

    if (settings.considerWishPartners) {
      const wishIdsA = A ? getWishIds(A) : [];
      const wishIdsB = B ? getWishIds(B) : [];
      const avoidIdsA = A ? getAvoidIds(A) : [];
      const avoidIdsB = B ? getAvoidIds(B) : [];

      const wishA = A && B && wishIdsA.includes(B.id);
      const wishB = B && A && wishIdsB.includes(A.id);
      // Conflict: A wishes for B, but B wants to avoid A
      const conflictA =
        A && B && wishIdsA.includes(B.id) && avoidIdsB.includes(A.id);
      const conflictB =
        B && A && wishIdsB.includes(A.id) && avoidIdsA.includes(B.id);
      if ((conflictA || conflictB) && settings.avoidConflictPartners) {
        // Conflict: avoid wins over wish
        score += settings.avoidConflictPartners;
      } else if (wishA || wishB) {
        score -= settings.considerWishPartners;
      } else if (wishIdsA.length > 0 || wishIdsB.length > 0) {
        score += settings.considerWishPartners;
      }
    }

    // Performance-based pairing (the two options are mutually exclusive)
    const peerTutoringWeight = settings.peerTutoring ?? 0;
    const homogeneousWeight = settings.homogeneousPerformanceGroups ?? 0;
    const usePeerTutoring = peerTutoringWeight > homogeneousWeight;

    const highA = A && isHighPerf(A);
    const highB = B && isHighPerf(B);
    const lowA = A && isLowPerf(A);
    const lowB = B && isLowPerf(B);

    if (usePeerTutoring && peerTutoringWeight > 0) {
      // Heterogeneous performance pairing (peer tutoring)
      if ((highA && lowB) || (lowA && highB)) {
        score -= peerTutoringWeight;
      } else if (highA || highB || lowA || lowB) {
        score += peerTutoringWeight;
      }
    } else if (homogeneousWeight > 0) {
      // Homogeneous performance grouping
      const bothHigh = highA && highB;
      const bothLow = lowA && lowB;
      if (bothHigh || bothLow) {
        score -= homogeneousWeight;
      } else if ((highA && lowB) || (lowA && highB)) {
        score += homogeneousWeight;
      }
    }
  }

  return score;
};

/** Penalise students with concentration issues sharing a table. */
const scoreConcentrationClustering = (
  ctx: ArrangementScoringContext,
  members: Student[],
): number => {
  const weight = ctx.settings.avoidConcentrationTogether;
  if (!weight) return 0;

  let score = 0;
  for (let i = 0; i < members.length; i++) {
    const A = members[i]!;
    if (!isConcentration(A)) continue;
    for (let j = i + 1; j < members.length; j++) {
      const B = members[j]!;
      if (isConcentration(B)) {
        score += weight * Math.max(specialWeight(A), specialWeight(B));
      }
    }
  }
  return score;
};

/**
 * Score neighbourhood relations that reach across table borders.
 *
 * Only pairs where the neighbour sits "after" the current seat are counted, so
 * each relation is scored exactly once when all tables are summed up.
 */
const scoreNeighborRelations = (
  ctx: ArrangementScoringContext,
  table: (Student | null)[],
  tableIndex: number,
): number => {
  const { settings, arrangement, seatNeighborhoods } = ctx;
  if (!settings.avoidConcentrationNearRestless && !settings.preferGenderMix) {
    return 0;
  }

  let score = 0;
  for (let seatIndex = 0; seatIndex < table.length; seatIndex++) {
    const current = table[seatIndex];
    if (!current) continue;

    const neighbors =
      seatNeighborhoods.get(buildSeatKey(tableIndex, seatIndex)) ?? [];
    if (neighbors.length === 0) continue;

    for (const neighbor of neighbors) {
      const {
        tableIndex: nt,
        seatIndex: ns,
        strengthFactor,
        direction,
      } = neighbor;
      if (nt < tableIndex || (nt === tableIndex && ns <= seatIndex)) continue;

      const other = arrangement[nt]?.[ns];
      if (!other) continue;

      if (
        settings.avoidConcentrationNearRestless &&
        isConcentration(current) &&
        isRestless(other)
      ) {
        score +=
          settings.avoidConcentrationNearRestless *
          Math.max(specialWeight(current), specialWeight(other)) *
          strengthFactor *
          ctx.behavioralNeighborWeights[direction];
      }

      if (
        settings.preferGenderMix &&
        current.gender &&
        other.gender &&
        current.gender === other.gender
      ) {
        score +=
          settings.preferGenderMix *
          strengthFactor *
          ctx.genderNeighborWeights[direction];
      }
    }
  }
  return score;
};

/** Penalise pairs that already sat together in an earlier plan. */
const scorePreviousPairs = (
  ctx: ArrangementScoringContext,
  members: Student[],
): number => {
  const { settings, previousPairs } = ctx;
  if (!settings.avoidPreviousPairs || previousPairs.size === 0) return 0;

  let score = 0;
  for (let i = 0; i < members.length; i++) {
    const mi = members[i]!;
    for (let j = i + 1; j < members.length; j++) {
      const mj = members[j]!;
      const pairKey = [mi.id, mj.id].sort().join('::');
      const wishPair =
        settings.considerWishPartners && mi.wishPartnerId === mj.id;
      if (!wishPair && previousPairs.has(pairKey)) {
        score += settings.avoidPreviousPairs;
      }
    }
  }
  return score;
};

/**
 * Score seat-bound preferences: front-row needs, body height, window/door
 * proximity. All of these depend on where a seat sits in the room, not on who
 * sits next to it.
 */
const scoreSeatPositions = (
  ctx: ArrangementScoringContext,
  table: (Student | null)[],
  tableIndex: number,
): number => {
  const {
    settings,
    seatPositions,
    orientation,
    minX,
    maxX,
    minY,
    maxY,
    featureDistances,
  } = ctx;
  const preferWindowWeight = settings.preferWindowSeats ?? 0;
  const preferDoorWeight = settings.preferDoorSeats ?? 0;

  let score = 0;
  for (let seatIndex = 0; seatIndex < table.length; seatIndex++) {
    const student = table[seatIndex];
    if (!student) continue;

    const seatKey = buildSeatKey(tableIndex, seatIndex);
    const position = seatPositions.get(seatKey);

    if (position) {
      // Relative front position (0 = back, 1 = front) along the dominant axis
      let rel = 0.5;
      if (orientation.dominantAxis === 'x' && maxX > minX) {
        const rawRel = (position.x - minX) / (maxX - minX);
        rel = orientation.frontIsHighX ? rawRel : 1 - rawRel;
      } else if (orientation.dominantAxis === 'y' && maxY > minY) {
        const rawRel = (position.y - minY) / (maxY - minY);
        rel = orientation.frontIsHighY ? rawRel : 1 - rawRel;
      }

      if (settings.preferFrontForNeedsFrontSeat && hasNeedsFrontSeat(student)) {
        score -=
          rel * settings.preferFrontForNeedsFrontSeat * specialWeight(student);
      }

      const heightWeight = settings.preferFrontForSmallerStudents ?? 0;
      if (heightWeight > 0 && student.height && student.height !== 'medium') {
        if (student.height === 'small') {
          score -= rel * heightWeight * HEIGHT_PLACEMENT_AMPLIFICATION;
        } else if (student.height === 'tall') {
          score -= (1 - rel) * heightWeight * HEIGHT_PLACEMENT_AMPLIFICATION;
        }
      }
    }

    if (preferWindowWeight > 0 && student.prefersWindow) {
      const distance = featureDistances.window.get(seatKey);
      if (distance !== undefined) {
        score +=
          normalizeFeatureDistance(
            distance,
            featureDistances.maxWindowDistance,
          ) * preferWindowWeight;
      }
    }

    if (preferDoorWeight > 0 && student.prefersDoor) {
      const distance = featureDistances.door.get(seatKey);
      if (distance !== undefined) {
        score +=
          normalizeFeatureDistance(distance, featureDistances.maxDoorDistance) *
          preferDoorWeight;
      }
    }
  }
  return score;
};

/** Reward heterogeneous language levels, penalise clusters needing support. */
const scoreLanguageDistribution = (
  ctx: ArrangementScoringContext,
  members: Student[],
): number => {
  const weight = ctx.settings.preferLanguageMixing ?? 0;
  if (weight <= 0) return 0;

  const languageLevels = members.map((m) => m.languageSkill).filter(Boolean);
  if (languageLevels.length < 2) return 0;

  let score = 0;
  const hasStrong = languageLevels.some(
    (l) => l === 'native' || l === 'fluent',
  );
  const hasWeak = languageLevels.some((l) => l === 'beginner' || l === 'daz');

  if (hasStrong && hasWeak) {
    score -= weight * TABLE_SCORE_WEIGHTS.language.heterogeneousMix;
  }

  const weakCount = languageLevels.filter(
    (l) => l === 'beginner' || l === 'daz',
  ).length;
  if (weakCount > 1 && !hasStrong) {
    score +=
      weight *
      TABLE_SCORE_WEIGHTS.language.needsSupportCluster *
      (weakCount - 1);
  }

  return score;
};

/** Spread social roles across tables instead of clustering them. */
const scoreSocialRoleDistribution = (
  ctx: ArrangementScoringContext,
  members: Student[],
): number => {
  const weight = ctx.settings.distributeSocialRoles ?? 0;
  if (weight <= 0) return 0;

  const roles = members.map((m) => m.socialRole).filter(Boolean);
  if (roles.length === 0) return 0;

  const roleCounts = new Map<string, number>();
  for (const role of roles) {
    roleCounts.set(role!, (roleCounts.get(role!) ?? 0) + 1);
  }

  let score = 0;
  for (const [role, count] of roleCounts) {
    if (count > 1 && role !== 'mediator') {
      score +=
        weight * TABLE_SCORE_WEIGHTS.socialRole.sameRoleCluster * (count - 1);
    }
  }

  const lonerCount = roleCounts.get('loner') ?? 0;
  if (lonerCount > 1) {
    score +=
      weight * TABLE_SCORE_WEIGHTS.socialRole.lonerCluster * (lonerCount - 1);
  }
  if (lonerCount > 0) {
    const hasSupport =
      roleCounts.has('mediator') || roleCounts.has('socialHub');
    if (hasSupport) {
      score -= weight * TABLE_SCORE_WEIGHTS.socialRole.lonerSupport;
    }
  }

  return score;
};

/**
 * Rates one table of an existing arrangement — lower is better.
 *
 * Used by the refinement pass: a swap is kept only when the tables it touched
 * score lower afterwards.
 */
export const scoreTable = (
  ctx: ArrangementScoringContext,
  tableIndex: number,
): number => {
  const table = ctx.arrangement[tableIndex] ?? [];
  const members = table.filter(Boolean) as Student[];
  const seatCount = ctx.seatCounts[tableIndex]!;

  let score = 0;

  const seated = members.length;
  const target = ctx.targets[tableIndex]!;
  if (seated > target) {
    score += (seated - target) * TABLE_SCORE_WEIGHTS.seatOverflow;
  }

  score += scoreSeatPairs(ctx, table, seatCount);
  score += scoreConcentrationClustering(ctx, members);

  if (ctx.settings.preferGenderMix && members.length > 1 && seatCount > 1) {
    const counts = emptyCounts();
    for (const member of members) {
      if (member.gender) {
        counts[member.gender]++;
      }
    }
    score += calculateGenderImbalance(counts) * ctx.settings.preferGenderMix;
  }

  score += scoreNeighborRelations(ctx, table, tableIndex);
  score += scorePreviousPairs(ctx, members);
  score += scoreSeatPositions(ctx, table, tableIndex);
  score += scoreLanguageDistribution(ctx, members);
  score += scoreSocialRoleDistribution(ctx, members);

  // Table-level composition scoring for large tables (4+ students).
  // Catches issues that pair-based scoring misses.
  if (members.length >= 4) {
    score += scoreTableComposition({
      members,
      tableIndex,
      settings: ctx.settings,
    });
  }

  return score;
};

/** Gender imbalance of a single table; 0 for empty and single-seat tables. */
const tableGenderDiff = (
  ctx: ArrangementScoringContext,
  tableIndex: number,
): number => {
  const table = ctx.arrangement[tableIndex] ?? [];
  const counts = emptyCounts();
  let occupied = 0;
  for (const student of table) {
    if (!student) continue;
    if (student.gender) {
      counts[student.gender]++;
    }
    occupied++;
  }
  if (occupied <= 1) return 0;
  return calculateGenderImbalance(counts);
};

/** Summed gender imbalance across every table of the arrangement. */
export const globalGenderDiff = (ctx: ArrangementScoringContext): number => {
  let total = 0;
  for (let index = 0; index < ctx.seatCounts.length; index++) {
    total += tableGenderDiff(ctx, index);
  }
  return total;
};

/**
 * Combined score of the two tables a swap would touch, plus the global gender
 * imbalance when gender mixing is enabled. Passing the same index twice scores
 * that table once.
 */
export const scoreTablePair = (
  ctx: ArrangementScoringContext,
  a: number,
  b: number,
): number => {
  let score = scoreTable(ctx, a) + (a === b ? 0 : scoreTable(ctx, b));
  if (ctx.settings.preferGenderMix) {
    score += globalGenderDiff(ctx) * ctx.settings.preferGenderMix;
  }
  return score;
};
