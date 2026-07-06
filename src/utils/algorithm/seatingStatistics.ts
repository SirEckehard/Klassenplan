// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  Student,
  SeatingArrangement,
  MixSettings,
  SavedPlan,
  ClassroomScene,
  MixResult,
} from '@/types';
import { buildPreviousPairs } from '@/utils/pairs';
import {
  partnerSeat,
  getSeatPositions,
  getSeatNeighborhoods,
} from '@/utils/math/seatGeometry';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';
import { createGenderCounts, calculateGenderImbalance } from './genderBalance';
import { determineFrontDirection } from './orientationUtils';

type FeatureDistanceMaps = {
  window: Map<string, number>;
  door: Map<string, number>;
  maxWindowDistance: number;
  maxDoorDistance: number;
};

// Seat is considered "fulfilled" for environmental preference if it is within
// the closest 40% of all available distances relative to the farthest seat.
const PROXIMITY_SATISFIED_THRESHOLD = 0.6;

const buildSeatKey = (tableIndex: number, seatIndex: number) =>
  `${tableIndex}-${seatIndex}`;

const distanceToFeature = (
  x: number,
  y: number,
  feature: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
) => {
  const dx = Math.max(feature.x - x, 0, x - (feature.x + feature.width));
  const dy = Math.max(feature.y - y, 0, y - (feature.y + feature.height));
  return Math.hypot(dx, dy);
};

const computeFeatureDistanceMaps = (
  scene: ClassroomScene,
  seatPositions: Map<string, { x: number; y: number }>,
): FeatureDistanceMaps => {
  const features = scene.features ?? [];
  const windowFeatures = features.filter(
    (feature) => feature.type === 'window',
  );
  const doorFeatures = features.filter((feature) => feature.type === 'door');

  const windowDistances = new Map<string, number>();
  const doorDistances = new Map<string, number>();

  let maxWindowDistance = 0;
  let maxDoorDistance = 0;

  const defaultFallbackDistance = Math.hypot(CLASSROOM_WIDTH, CLASSROOM_HEIGHT);

  for (const [seatKey, position] of seatPositions.entries()) {
    if (windowFeatures.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY;
      for (const feature of windowFeatures) {
        const distance = distanceToFeature(position.x, position.y, feature);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      windowDistances.set(seatKey, minDistance);
      if (Number.isFinite(minDistance)) {
        maxWindowDistance = Math.max(maxWindowDistance, minDistance);
      }
    } else {
      windowDistances.set(seatKey, Number.POSITIVE_INFINITY);
    }

    if (doorFeatures.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY;
      for (const feature of doorFeatures) {
        const distance = distanceToFeature(position.x, position.y, feature);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      doorDistances.set(seatKey, minDistance);
      if (Number.isFinite(minDistance)) {
        maxDoorDistance = Math.max(maxDoorDistance, minDistance);
      }
    } else {
      doorDistances.set(seatKey, Number.POSITIVE_INFINITY);
    }
  }

  return {
    window: windowDistances,
    door: doorDistances,
    maxWindowDistance:
      maxWindowDistance > 0 ? maxWindowDistance : defaultFallbackDistance,
    maxDoorDistance:
      maxDoorDistance > 0 ? maxDoorDistance : defaultFallbackDistance,
  };
};

const calculateProximityScore = (distance: number, maxDistance: number) => {
  if (!Number.isFinite(distance) || maxDistance <= 0) {
    return 0;
  }
  const normalized = Math.min(distance / maxDistance, 1);
  return 1 - normalized;
};

/**
 * Statistics about how well a seating arrangement fulfills the mix criteria
 */
export interface SeatingStatistics {
  // Total counts
  totalStudents: number;
  totalSeats: number;

  // Wish partners
  wishPartnersFulfilled: number;
  wishPartnersTotal: number;
  wishPartnersPercentage: number;

  // Avoid partners (Distanzwünsche)
  avoidPartnersFulfilled: number;
  avoidPartnersTotal: number;
  avoidPartnersPercentage: number;

  // Previous pairs avoidance
  previousPairsAvoided: number;
  previousPairsTotal: number;
  previousPairsPercentage: number;

  // Restless students
  restlessPairCount: number;
  restlessTotalCount: number;
  restlessAvoidedPercentage: number;

  // Concentration issues
  concentrationPairCount: number;
  concentrationTotalCount: number;
  concentrationAvoidedPercentage: number;
  concentrationNearRestlessCount: number;
  concentrationNearRestlessPercentage: number;

  // Gender mix
  genderMixScore: number; // 0-100, higher is better
  genderBalancedTables: number;
  genderTotalTables: number; // Tables with at least two occupied seats evaluated for gender mix

  // Shy students
  shyAloneCount: number;
  shyTotalCount: number;
  shyAlonePercentage: number;

  // Performance pairing
  peerTutoringPairs: number; // Heterogeneous: strong+weak pairs
  sameLevelPairs: number; // Homogeneous: strong+strong or weak+weak pairs
  peerTutoringPercentage: number; // For heterogeneous mode (peerTutoring)
  homogeneousPerformancePercentage: number; // For homogeneous mode (homogeneousPerformanceGroups)

  // Front seat need
  frontSeatInFrontCount: number;
  frontSeatTotalCount: number;
  frontSeatFrontPercentage: number;

  // Environmental preferences
  windowPreferenceFulfilled: number;
  windowPreferenceTotal: number;
  windowPreferencePercentage: number;
  doorPreferenceFulfilled: number;
  doorPreferenceTotal: number;
  doorPreferencePercentage: number;

  // Height placement (smaller students front, taller students back)
  heightPlacementScore: number; // 0-100, overall score
  smallInFrontCount: number;
  smallTotalCount: number;
  tallInBackCount: number;
  tallTotalCount: number;
  heightPlacementPercentage: number; // Combined: correctly placed / total

  // Language skill mixing
  languageMixingScore: number; // 0-100, heterogeneous mixing score
  languageMixedTables: number;
  languageTotalRelevantTables: number;
  languageMixingPercentage: number;

  // Social role distribution
  socialRoleDistributionScore: number; // 0-100, balanced distribution
  socialRoleBalancedTables: number;
  socialRoleTotalRelevantTables: number;
  socialRoleDistributionPercentage: number;
}

/**
 * Calculate statistics for a seating arrangement.
 *
 * This function analyzes how well a seating arrangement fulfills various mix criteria:
 * - Wish partners: Students sitting with their desired partners
 * - Previous pairs: Avoiding seat neighbors from previous plans
 * - Restless students: Separating students with restlessness issues
 * - Concentration issues: Separating students with concentration problems and keeping them away from restless students
 * - Gender mix: Balanced distribution of genders across tables
 * - Shy students: Ensuring shy students are not alone
 * - Peer tutoring: Pairing strong and weak performers for mutual support
 * - Front seat need: Placing students with front seat needs in front seats
 *
 * @param arrangement Current seating arrangement to analyze
 * @param students Full list of students
 * @param settings Mix criteria weights (0-10)
 * @param seatingHistory Previous seating plans for repetition avoidance
 * @param scene Classroom layout for position calculations
 * @returns Statistics object with counts and percentages for each criterion
 */
export function calculateSeatingStatistics(
  arrangement: SeatingArrangement,
  students: Student[],
  settings: Partial<MixSettings>,
  seatingHistory: SavedPlan[],
  scene: ClassroomScene,
  options?: { mixHistory?: MixResult[] },
): SeatingStatistics {
  const totalStudents = students.length;
  const totalSeats = arrangement.reduce((sum, table) => sum + table.length, 0);

  // Previous pairs
  const mixHistoryExcludingCurrent = options?.mixHistory?.length
    ? options.mixHistory.slice(0, -1)
    : options?.mixHistory;

  const previousPairs = settings.avoidPreviousPairs
    ? buildPreviousPairs(seatingHistory, {
        mixHistory: mixHistoryExcludingCurrent,
        studentCount: students.length,
      })
    : new Map<string, number>();

  let wishPartnersFulfilled = 0;
  let wishPartnersTotal = 0;
  let avoidPartnersFulfilled = 0;
  let avoidPartnersTotal = 0;
  let previousPairsAvoided = 0;
  let previousPairsTotal = 0;
  let restlessPairCount = 0;
  let restlessTotalCount = 0;
  let concentrationPairCount = 0;
  let concentrationTotalCount = 0;
  let concentrationNearRestlessCount = 0;
  let shyAloneCount = 0;
  let shyTotalCount = 0;
  let peerTutoringPairs = 0;
  let sameLevelPairs = 0;
  let frontSeatInFrontCount = 0;
  let frontSeatTotalCount = 0;
  let genderBalancedTables = 0;
  let genderEvaluatedTables = 0;

  // Height placement counters
  let smallInFrontCount = 0;
  let smallTotalCount = 0;
  let tallInBackCount = 0;
  let tallTotalCount = 0;

  let windowPreferenceFulfilled = 0;
  let windowPreferenceTotal = 0;
  let windowPreferenceScoreSum = 0;
  let doorPreferenceFulfilled = 0;
  let doorPreferenceTotal = 0;
  let doorPreferenceScoreSum = 0;

  // Helper to get wish/avoid partner IDs (handles both legacy and new format)
  const getWishIds = (s: Student): string[] => {
    if (s.wishPartnerIds && s.wishPartnerIds.length > 0)
      return s.wishPartnerIds;
    if (s.wishPartnerId) return [s.wishPartnerId];
    return [];
  };
  const getAvoidIds = (s: Student): string[] => {
    if (s.avoidPartnerIds && s.avoidPartnerIds.length > 0)
      return s.avoidPartnerIds;
    if (s.avoidPartnerId) return [s.avoidPartnerId];
    return [];
  };

  // Count students with specific attributes - now counts all wishes
  students.forEach((s) => {
    wishPartnersTotal += getWishIds(s).length;
    avoidPartnersTotal += getAvoidIds(s).length;
    if (s.restless) restlessTotalCount++;
    if (s.concentrationIssues) concentrationTotalCount++;
    if (s.shy) shyTotalCount++;
    if (s.needsFrontSeat) frontSeatTotalCount++;
    if (s.prefersWindow) windowPreferenceTotal++;
    if (s.prefersDoor) doorPreferenceTotal++;
  });

  // Get accurate seat positions (not just table centers)
  const seatPositions = getSeatPositions(scene);
  const seatNeighborhoods = getSeatNeighborhoods(scene, {
    directions: ['direct', 'front', 'back', 'side'],
  });
  const {
    window: windowSeatDistances,
    door: doorSeatDistances,
    maxWindowDistance,
    maxDoorDistance,
  } = computeFeatureDistanceMaps(scene, seatPositions);

  const countedRestlessPairs = new Set<string>();
  const countedConcentrationPairs = new Set<string>();
  const concentrationNearRestlessPairs = new Set<string>();

  // Calculate front threshold based on board orientation
  const allX = Array.from(seatPositions.values()).map((p) => p.x);
  const allY = Array.from(seatPositions.values()).map((p) => p.y);
  const maxX = Math.max(...allX);
  const minX = Math.min(...allX);
  const maxY = Math.max(...allY);
  const minY = Math.min(...allY);

  // Determine front direction based on board position
  const orientation = determineFrontDirection(scene);

  // Front threshold: 30% of seats closest to front (used for sensory)
  // If dominantAxis is 'x': use X-based threshold
  // If dominantAxis is 'y': use Y-based threshold
  const frontThresholdX = orientation.frontIsHighX
    ? maxX - (maxX - minX) * 0.3
    : minX + (maxX - minX) * 0.3;
  const frontThresholdY = orientation.frontIsHighY
    ? maxY - (maxY - minY) * 0.3
    : minY + (maxY - minY) * 0.3;

  // Analyze each table
  arrangement.forEach((table, tIdx) => {
    const seatCount = table.length;
    const occupiedSeats = table.filter(Boolean) as Student[];
    const tableStudentIds = new Set(occupiedSeats.map((s) => s.id));

    // Gender balance
    if (occupiedSeats.length >= 2) {
      genderEvaluatedTables++;
      const genderCounts = createGenderCounts();
      occupiedSeats.forEach((s) => {
        if (s.gender) genderCounts[s.gender]++;
      });
      const genderImbalance = calculateGenderImbalance(genderCounts);
      if (genderImbalance <= 1) {
        genderBalancedTables++;
      }
    }

    // Analyze pairs
    for (let sIdx = 0; sIdx < seatCount; sIdx++) {
      const student = table[sIdx];
      if (!student) continue;

      const partnerIdx = partnerSeat(seatCount, sIdx);
      const partner = partnerIdx !== null ? table[partnerIdx] : null;

      // Wish partners - now checks all wish partners with priority weighting
      const wishIds = getWishIds(student);
      const seatKey = buildSeatKey(tIdx, sIdx);
      const neighbors = seatNeighborhoods.get(seatKey) ?? [];

      for (let i = 0; i < wishIds.length; i++) {
        const wishId = wishIds[i]!;
        // Direct partner = 100% fulfilled
        if (partner && partner.id === wishId) {
          wishPartnersFulfilled += 1;
        }
        // Same table but not direct partner = 50% fulfilled (group tables)
        else if (tableStudentIds.has(wishId) && seatCount > 2) {
          wishPartnersFulfilled += 0.5;
        }
        // NEW: Spatial neighbor = 50% fulfilled (for Single tables or adjacent tables)
        else if (!partner || seatCount === 1) {
          // Check if wish partner is a spatial neighbor
          for (const neighborInfo of neighbors) {
            const neighborStudent =
              arrangement[neighborInfo.tableIndex]?.[neighborInfo.seatIndex];
            if (neighborStudent && neighborStudent.id === wishId) {
              // Neighbor fulfillment: 50% (same as same-table, non-partner)
              wishPartnersFulfilled += 0.5;
              break; // Only count once per wish partner
            }
          }
        }
        // Priority bonus: first wish partner fulfilled counts more
        // (handled by order in array - first listed = most important)
      }

      // Avoid partners - now checks all avoid partners
      const avoidIds = getAvoidIds(student);
      for (const avoidId of avoidIds) {
        // Direct partner = not fulfilled
        if (partner && partner.id === avoidId) {
          // 0% fulfilled - sitting directly with avoided partner
        }
        // Same table but not direct partner = 50% fulfilled (better than direct)
        else if (tableStudentIds.has(avoidId) && seatCount > 2) {
          avoidPartnersFulfilled += 0.5;
        }
        // Different table = 100% fulfilled
        else {
          avoidPartnersFulfilled += 1;
        }
      }

      // Previous pairs (only count once per pair)
      if (partner && sIdx < (partnerIdx ?? seatCount)) {
        const pairKey = [student.id, partner.id].sort().join('::');
        const previousWeight = previousPairs.get(pairKey) ?? 0;
        const isRepeat = previousWeight > 0;
        const repeatContribution = isRepeat ? previousWeight : 0;
        previousPairsTotal += repeatContribution;
        previousPairsAvoided += 1 - repeatContribution;
      }

      if (student.restless) {
        for (const neighborInfo of neighbors) {
          const neighbor =
            arrangement[neighborInfo.tableIndex]?.[neighborInfo.seatIndex];
          if (!neighbor || !neighbor.restless) continue;
          const pairKey = [student.id, neighbor.id].sort().join('::');
          if (countedRestlessPairs.has(pairKey)) continue;
          countedRestlessPairs.add(pairKey);
          restlessPairCount++;
        }
      }

      if (student.concentrationIssues) {
        for (const neighborInfo of neighbors) {
          const neighbor =
            arrangement[neighborInfo.tableIndex]?.[neighborInfo.seatIndex];
          if (!neighbor) continue;

          if (neighbor.restless) {
            const concentrationRestlessKey = [student.id, neighbor.id]
              .sort()
              .join('::');
            if (!concentrationNearRestlessPairs.has(concentrationRestlessKey)) {
              concentrationNearRestlessPairs.add(concentrationRestlessKey);
              concentrationNearRestlessCount++;
            }
          }

          if (!neighbor.concentrationIssues) continue;
          const pairKey = [student.id, neighbor.id].sort().join('::');
          if (countedConcentrationPairs.has(pairKey)) continue;
          countedConcentrationPairs.add(pairKey);
          concentrationPairCount++;
        }
      }

      // Shy alone
      if (student.shy && !partner) {
        shyAloneCount++;
      }

      // Peer tutoring
      if (partner && sIdx < (partnerIdx ?? seatCount)) {
        const stuStrong = student.performanceStrong;
        const stuWeak = student.performanceWeak;
        const partnerStrong = partner.performanceStrong;
        const partnerWeak = partner.performanceWeak;

        if ((stuStrong && partnerWeak) || (stuWeak && partnerStrong)) {
          peerTutoringPairs++;
        } else if ((stuStrong && partnerStrong) || (stuWeak && partnerWeak)) {
          sameLevelPairs++;
        }
      }

      if (student.prefersWindow) {
        const distance = windowSeatDistances.get(seatKey);
        const proximity = calculateProximityScore(
          distance ?? Number.POSITIVE_INFINITY,
          maxWindowDistance,
        );
        windowPreferenceScoreSum += proximity;
        if (proximity >= PROXIMITY_SATISFIED_THRESHOLD) {
          windowPreferenceFulfilled++;
        }
      }

      if (student.prefersDoor) {
        const distance = doorSeatDistances.get(seatKey);
        const proximity = calculateProximityScore(
          distance ?? Number.POSITIVE_INFINITY,
          maxDoorDistance,
        );
        doorPreferenceScoreSum += proximity;
        if (proximity >= PROXIMITY_SATISFIED_THRESHOLD) {
          doorPreferenceFulfilled++;
        }
      }

      // Front seat need in front
      if (student.needsFrontSeat) {
        const pos = seatPositions.get(seatKey);
        if (pos) {
          // Check if seat is in front (respecting dominant axis)
          const isFront =
            orientation.dominantAxis === 'x'
              ? orientation.frontIsHighX
                ? pos.x >= frontThresholdX
                : pos.x <= frontThresholdX
              : orientation.frontIsHighY
                ? pos.y >= frontThresholdY
                : pos.y <= frontThresholdY;
          if (isFront) {
            frontSeatInFrontCount++;
          }
        }
      }

      // Height placement - smaller students front, taller students back
      if (student.height === 'small') {
        smallTotalCount++;
        const pos = seatPositions.get(seatKey);
        if (pos) {
          // Calculate relative position (0 = back, 1 = front), respecting dominant axis
          let relativePosition = 0.5;
          if (orientation.dominantAxis === 'x' && maxX > minX) {
            const rawPosition = (pos.x - minX) / (maxX - minX);
            relativePosition = orientation.frontIsHighX
              ? rawPosition
              : 1 - rawPosition;
          } else if (orientation.dominantAxis === 'y' && maxY > minY) {
            const rawPosition = (pos.y - minY) / (maxY - minY);
            relativePosition = orientation.frontIsHighY
              ? rawPosition
              : 1 - rawPosition;
          }
          // Front half = relativePosition > 0.5
          if (relativePosition > 0.5) {
            smallInFrontCount++;
          }
        }
      } else if (student.height === 'tall') {
        tallTotalCount++;
        const pos = seatPositions.get(seatKey);
        if (pos) {
          // Calculate relative position (0 = back, 1 = front), respecting dominant axis
          let relativePosition = 0.5;
          if (orientation.dominantAxis === 'x' && maxX > minX) {
            const rawPosition = (pos.x - minX) / (maxX - minX);
            relativePosition = orientation.frontIsHighX
              ? rawPosition
              : 1 - rawPosition;
          } else if (orientation.dominantAxis === 'y' && maxY > minY) {
            const rawPosition = (pos.y - minY) / (maxY - minY);
            relativePosition = orientation.frontIsHighY
              ? rawPosition
              : 1 - rawPosition;
          }
          // Back half = relativePosition < 0.5
          if (relativePosition < 0.5) {
            tallInBackCount++;
          }
        }
      }
    }
  });

  // Calculate percentages
  const wishPartnersPercentage =
    wishPartnersTotal > 0
      ? (wishPartnersFulfilled / wishPartnersTotal) * 100
      : 100;

  const avoidPartnersPercentage =
    avoidPartnersTotal > 0
      ? (avoidPartnersFulfilled / avoidPartnersTotal) * 100
      : 100;

  const previousPairsPercentage =
    previousPairsTotal + previousPairsAvoided > 0
      ? (previousPairsAvoided / (previousPairsTotal + previousPairsAvoided)) *
        100
      : 100;

  // Restless: 0 pairs = 100%, all paired = 0%
  // Formula: percentage of pairs that were successfully avoided
  const restlessAvoidedPercentage =
    restlessTotalCount >= 2
      ? Math.max(
          0,
          100 - (restlessPairCount / Math.floor(restlessTotalCount / 2)) * 100,
        )
      : 100;

  // Concentration: Same calculation as restless
  // 0 pairs together = 100%, all paired together = 0%
  const concentrationAvoidedPercentage =
    concentrationTotalCount >= 2
      ? Math.max(
          0,
          100 -
            (concentrationPairCount / Math.floor(concentrationTotalCount / 2)) *
              100,
        )
      : 100;

  // Concentration near restless: 0 adjacencies = 100%, all adjacent = 0%
  // We want concentration students NOT near restless students
  const maxConcentrationNearRestless = concentrationTotalCount; // Each concentration student could be near restless
  const concentrationNearRestlessPercentage =
    concentrationTotalCount > 0 && restlessTotalCount > 0
      ? Math.max(
          0,
          100 -
            (concentrationNearRestlessCount / maxConcentrationNearRestless) *
              100,
        )
      : 100;

  // Only evaluate tables with at least two occupied seats for gender mix
  const genderMixScore =
    genderEvaluatedTables > 0
      ? (genderBalancedTables / genderEvaluatedTables) * 100
      : 100;

  const shyAlonePercentage =
    shyTotalCount > 0
      ? Math.max(0, 100 - (shyAloneCount / shyTotalCount) * 100)
      : 100;

  // Performance pairing percentages
  const totalPerformancePairs = peerTutoringPairs + sameLevelPairs;
  const peerTutoringPercentage =
    totalPerformancePairs > 0
      ? (peerTutoringPairs / totalPerformancePairs) * 100
      : 0;

  const homogeneousPerformancePercentage =
    totalPerformancePairs > 0
      ? (sameLevelPairs / totalPerformancePairs) * 100
      : 0;

  const frontSeatFrontPercentage =
    frontSeatTotalCount > 0
      ? (frontSeatInFrontCount / frontSeatTotalCount) * 100
      : 100;

  // Height placement percentage
  const heightPlacementTotalCount = smallTotalCount + tallTotalCount;
  const heightPlacementCorrectCount = smallInFrontCount + tallInBackCount;
  const heightPlacementPercentage =
    heightPlacementTotalCount > 0
      ? (heightPlacementCorrectCount / heightPlacementTotalCount) * 100
      : 100; // Default 100% if no small/tall students

  const heightPlacementScore = heightPlacementPercentage;

  const windowPreferencePercentage =
    windowPreferenceTotal > 0
      ? (windowPreferenceScoreSum / windowPreferenceTotal) * 100
      : 100;

  const doorPreferencePercentage =
    doorPreferenceTotal > 0
      ? (doorPreferenceScoreSum / doorPreferenceTotal) * 100
      : 100;

  // Language skill mixing statistics
  // Count tables with heterogeneous language levels (strong + weak)
  let languageMixedTables = 0;
  let languageTotalRelevantTables = 0;

  arrangement.forEach((table) => {
    const occupiedSeats = table.filter(Boolean) as Student[];
    const languageLevels = occupiedSeats
      .map((s) => s.languageSkill)
      .filter(Boolean);

    if (languageLevels.length >= 2) {
      languageTotalRelevantTables++;
      const hasStrong = languageLevels.some(
        (l) => l === 'native' || l === 'fluent',
      );
      const hasWeak = languageLevels.some(
        (l) => l === 'beginner' || l === 'daz',
      );
      if (hasStrong && hasWeak) {
        languageMixedTables++;
      }
    }
  });

  const languageMixingPercentage =
    languageTotalRelevantTables > 0
      ? (languageMixedTables / languageTotalRelevantTables) * 100
      : 100;
  const languageMixingScore = languageMixingPercentage;

  // Social role distribution statistics
  // Count tables where social roles are well distributed (no clustering of same roles)
  let socialRoleBalancedTables = 0;
  let socialRoleTotalRelevantTables = 0;

  arrangement.forEach((table) => {
    const occupiedSeats = table.filter(Boolean) as Student[];
    const roles = occupiedSeats.map((s) => s.socialRole).filter(Boolean);

    if (roles.length >= 1) {
      socialRoleTotalRelevantTables++;
      // Check for role clustering (same role appearing more than once)
      const roleCounts = new Map<string, number>();
      for (const role of roles) {
        roleCounts.set(role!, (roleCounts.get(role!) ?? 0) + 1);
      }
      // Table is balanced if no non-mediator role appears more than once
      // and loners are not paired together
      let isBalanced = true;
      for (const [role, count] of roleCounts) {
        if (count > 1 && role !== 'mediator') {
          isBalanced = false;
          break;
        }
        if (role === 'loner' && count > 1) {
          isBalanced = false;
          break;
        }
      }
      if (isBalanced) {
        socialRoleBalancedTables++;
      }
    }
  });

  const socialRoleDistributionPercentage =
    socialRoleTotalRelevantTables > 0
      ? (socialRoleBalancedTables / socialRoleTotalRelevantTables) * 100
      : 100;
  const socialRoleDistributionScore = socialRoleDistributionPercentage;

  return {
    totalStudents,
    totalSeats,
    wishPartnersFulfilled,
    wishPartnersTotal,
    wishPartnersPercentage,
    avoidPartnersFulfilled,
    avoidPartnersTotal,
    avoidPartnersPercentage,
    previousPairsAvoided,
    previousPairsTotal,
    previousPairsPercentage,
    restlessPairCount,
    restlessTotalCount,
    restlessAvoidedPercentage,
    concentrationPairCount,
    concentrationTotalCount,
    concentrationAvoidedPercentage,
    concentrationNearRestlessCount,
    concentrationNearRestlessPercentage,
    genderMixScore,
    genderBalancedTables,
    genderTotalTables: genderEvaluatedTables,
    shyAloneCount,
    shyTotalCount,
    shyAlonePercentage,
    peerTutoringPairs,
    sameLevelPairs,
    peerTutoringPercentage,
    homogeneousPerformancePercentage,
    frontSeatInFrontCount,
    frontSeatTotalCount,
    frontSeatFrontPercentage,
    windowPreferenceFulfilled,
    windowPreferenceTotal,
    windowPreferencePercentage,
    doorPreferenceFulfilled,
    doorPreferenceTotal,
    doorPreferencePercentage,
    heightPlacementScore,
    smallInFrontCount,
    smallTotalCount,
    tallInBackCount,
    tallTotalCount,
    heightPlacementPercentage,
    languageMixingScore,
    languageMixedTables,
    languageTotalRelevantTables,
    languageMixingPercentage,
    socialRoleDistributionScore,
    socialRoleBalancedTables,
    socialRoleTotalRelevantTables,
    socialRoleDistributionPercentage,
  };
}

/**
 * Represents a single criterion's fulfillment status
 */
export interface CriterionFulfillment {
  key: keyof MixSettings;
  label: string;
  percentage: number;
  weight: number;
  active: boolean;
}

export function calculateCriteriaWeightedScore(
  criteria: CriterionFulfillment[],
): number {
  if (!criteria.length) {
    return 0;
  }

  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );
  if (totalWeight <= 0) {
    return 0;
  }

  const weightedSum = criteria.reduce(
    (sum, criterion) => sum + criterion.percentage * criterion.weight,
    0,
  );
  return weightedSum / totalWeight;
}

/**
 * Get top fulfilled criteria sorted by importance and fulfillment.
 *
 * This function filters active criteria (weight > 0 and relevant students exist)
 * and returns the top N criteria sorted by:
 * 1. Weight (higher weight = higher priority)
 * 2. Percentage (higher fulfillment = higher priority)
 *
 * @param stats Statistics from calculateSeatingStatistics
 * @param settings Current mix criteria weights
 * @param limit Maximum number of criteria to return (default: 5)
 * @returns Array of active criteria sorted by importance
 */
export function getTopFulfilledCriteria(
  stats: SeatingStatistics,
  settings: Partial<MixSettings>,
  limit?: number,
): CriterionFulfillment[] {
  const concentrationWeight = Math.max(
    settings.avoidConcentrationTogether ?? 0,
    settings.avoidConcentrationNearRestless ?? 0,
  );

  const concentrationMetrics: Array<{ percentage: number; weight: number }> =
    [];

  if (
    (settings.avoidConcentrationTogether ?? 0) > 0 &&
    stats.concentrationTotalCount >= 2
  ) {
    concentrationMetrics.push({
      percentage: stats.concentrationAvoidedPercentage,
      weight: settings.avoidConcentrationTogether ?? 0,
    });
  }

  if (
    (settings.avoidConcentrationNearRestless ?? 0) > 0 &&
    stats.concentrationTotalCount > 0 &&
    stats.restlessTotalCount > 0
  ) {
    concentrationMetrics.push({
      percentage: stats.concentrationNearRestlessPercentage,
      weight: settings.avoidConcentrationNearRestless ?? 0,
    });
  }

  const combinedConcentrationPercentage =
    concentrationMetrics.length > 0
      ? concentrationMetrics.reduce(
          (sum, metric) => sum + metric.percentage * metric.weight,
          0,
        ) / concentrationMetrics.reduce((sum, metric) => sum + metric.weight, 0)
      : 0;

  const concentrationActive =
    concentrationWeight > 0 && concentrationMetrics.length > 0;

  // Criteria ordered by Option A: Wiederholung → Identität → Fähigkeiten → Verhalten → Soziales → Raum
  const criteria: CriterionFulfillment[] = [
    // Wiederholung (ganz oben, ohne Kategorie)
    {
      key: 'avoidPreviousPairs',
      label: 'Wiederholung',
      percentage: stats.previousPairsPercentage,
      weight: settings.avoidPreviousPairs ?? 0,
      active:
        (settings.avoidPreviousPairs ?? 0) > 0 &&
        stats.previousPairsTotal + stats.previousPairsAvoided > 0,
    },
    // Identität
    {
      key: 'preferGenderMix',
      label: 'Geschlechter',
      percentage: stats.genderMixScore,
      weight: settings.preferGenderMix ?? 0,
      active: (settings.preferGenderMix ?? 0) > 0,
    },
    {
      key: 'preferFrontForSmallerStudents',
      label: 'Körpergröße',
      percentage: stats.heightPlacementPercentage,
      weight: settings.preferFrontForSmallerStudents ?? 0,
      active:
        (settings.preferFrontForSmallerStudents ?? 0) > 0 &&
        (stats.smallTotalCount > 0 || stats.tallTotalCount > 0),
    },
    // Fähigkeiten
    {
      key: 'preferLanguageMixing',
      label: 'Sprachförderung',
      percentage: stats.languageMixingPercentage,
      weight: settings.preferLanguageMixing ?? 0,
      active:
        (settings.preferLanguageMixing ?? 0) > 0 &&
        stats.languageTotalRelevantTables > 0,
    },
    {
      key: 'peerTutoring',
      label: 'Fördern (heterogen)',
      percentage: stats.peerTutoringPercentage,
      weight: settings.peerTutoring ?? 0,
      active: (settings.peerTutoring ?? 0) > 0,
    },
    {
      key: 'homogeneousPerformanceGroups',
      label: 'Fördern (homogen)',
      percentage: stats.homogeneousPerformancePercentage,
      weight: settings.homogeneousPerformanceGroups ?? 0,
      active: (settings.homogeneousPerformanceGroups ?? 0) > 0,
    },
    {
      key: 'preferFrontForNeedsFrontSeat',
      label: 'Vordere Plätze',
      percentage: stats.frontSeatFrontPercentage,
      weight: settings.preferFrontForNeedsFrontSeat ?? 0,
      active:
        (settings.preferFrontForNeedsFrontSeat ?? 0) > 0 &&
        stats.frontSeatTotalCount > 0,
    },
    // Verhalten
    {
      key: 'avoidRestlessTogether',
      label: 'Unruhe',
      percentage: stats.restlessAvoidedPercentage,
      weight: settings.avoidRestlessTogether ?? 0,
      active:
        (settings.avoidRestlessTogether ?? 0) > 0 &&
        stats.restlessTotalCount >= 2,
    },
    {
      key: 'avoidShyAlone',
      label: 'Schüchternheit',
      percentage: stats.shyAlonePercentage,
      weight: settings.avoidShyAlone ?? 0,
      active: (settings.avoidShyAlone ?? 0) > 0 && stats.shyTotalCount > 0,
    },
    {
      key: 'avoidConcentrationTogether',
      label: 'Ablenkbarkeit',
      percentage: combinedConcentrationPercentage,
      weight: concentrationWeight,
      active: concentrationActive,
    },
    // Soziales
    {
      key: 'distributeSocialRoles',
      label: 'Soziale Rollen',
      percentage: stats.socialRoleDistributionPercentage,
      weight: settings.distributeSocialRoles ?? 0,
      active:
        (settings.distributeSocialRoles ?? 0) > 0 &&
        stats.socialRoleTotalRelevantTables > 0,
    },
    {
      key: 'considerWishPartners',
      label: 'Wunschpartner erfüllt',
      percentage: stats.wishPartnersPercentage,
      weight: settings.considerWishPartners ?? 0,
      active:
        (settings.considerWishPartners ?? 0) > 0 && stats.wishPartnersTotal > 0,
    },
    {
      key: 'avoidConflictPartners',
      label: 'Distanzwünsche',
      percentage: stats.avoidPartnersPercentage,
      weight: settings.avoidConflictPartners ?? 0,
      active:
        (settings.avoidConflictPartners ?? 0) > 0 &&
        stats.avoidPartnersTotal > 0,
    },
    // Raum
    {
      key: 'preferWindowSeats',
      label: 'Fensterplätze',
      percentage: stats.windowPreferencePercentage,
      weight: settings.preferWindowSeats ?? 0,
      active:
        (settings.preferWindowSeats ?? 0) > 0 &&
        stats.windowPreferenceTotal > 0,
    },
    {
      key: 'preferDoorSeats',
      label: 'Türnähe',
      percentage: stats.doorPreferencePercentage,
      weight: settings.preferDoorSeats ?? 0,
      active:
        (settings.preferDoorSeats ?? 0) > 0 && stats.doorPreferenceTotal > 0,
    },
  ];

  // Filter active criteria - preserve fixed Option A order (no sorting)
  const filtered = criteria.filter((c) => c.active);

  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}
