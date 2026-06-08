// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  MixResult,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import type { StatisticHighlightEntry } from '@/types/StatisticsHighlight';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH, getStatisticStatus } from '@/utils';
import { buildPreviousPairs } from '@/utils/pairs';
import {
  getSeatNeighborhoods,
  getSeatPositions,
  partnerSeat,
} from '@/utils/math/seatGeometry';
import { createGenderCounts, calculateGenderImbalance } from './genderBalance';
import { determineFrontDirection } from './orientationUtils';

const buildSeatKey = (tableIndex: number, seatIndex: number) =>
  `${tableIndex}-${seatIndex}`;

type HighlightParams = {
  criterionKey: keyof MixSettings;
  arrangement: SeatingArrangement;
  scene: ClassroomScene;
  seatingHistory?: SavedPlan[];
  mixHistory?: MixResult[];
};

const calculateFeatureDistances = (
  scene: ClassroomScene,
  seatPositions: Map<string, { x: number; y: number }>,
) => {
  const features = scene.features ?? [];
  const windowFeatures = features.filter(
    (feature) => feature.type === 'window',
  );
  const doorFeatures = features.filter((feature) => feature.type === 'door');

  const windowDistances = new Map<string, number>();
  const doorDistances = new Map<string, number>();

  let maxWindowDistance = 0;
  let maxDoorDistance = 0;

  const distanceToFeature = (
    x: number,
    y: number,
    feature: { x: number; y: number; width: number; height: number },
  ) => {
    const dx = Math.max(feature.x - x, 0, x - (feature.x + feature.width));
    const dy = Math.max(feature.y - y, 0, y - (feature.y + feature.height));
    return Math.hypot(dx, dy);
  };

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
    windowDistances,
    doorDistances,
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

const addEntry = (
  entries: StatisticHighlightEntry[],
  tableIndex: number,
  seatIndex: number,
  studentId: string | null | undefined,
  percentage: number,
) => {
  entries.push({
    target: {
      type: 'seat',
      tableIndex,
      seatIndex,
      studentId: studentId ?? null,
    },
    percentage,
    status: getStatisticStatus(percentage),
  });
};

export function buildCriterionHighlightEntries({
  criterionKey,
  arrangement,
  scene,
  seatingHistory,
  mixHistory,
}: HighlightParams): StatisticHighlightEntry[] {
  const entries: StatisticHighlightEntry[] = [];
  const seatPositions = getSeatPositions(scene);
  const seatNeighborhoods = getSeatNeighborhoods(scene, {
    directions: ['direct', 'front', 'back', 'side'],
  });
  const seatMap = new Map<string, Student | null>();
  arrangement.forEach((table, tIdx) => {
    table.forEach((seat, sIdx) => {
      seatMap.set(buildSeatKey(tIdx, sIdx), seat);
    });
  });

  // Thresholds and helper data
  const allX = Array.from(seatPositions.values()).map((p) => p.x);
  const allY = Array.from(seatPositions.values()).map((p) => p.y);
  const maxX = Math.max(...allX);
  const minX = Math.min(...allX);
  const maxY = Math.max(...allY);
  const minY = Math.min(...allY);

  // Determine front direction based on board position
  const orientation = determineFrontDirection(scene);

  // Front threshold: 30% of seats closest to front
  const frontThresholdX = orientation.frontIsHighX
    ? maxX - (maxX - minX) * 0.3
    : minX + (maxX - minX) * 0.3;
  const frontThresholdY = orientation.frontIsHighY
    ? maxY - (maxY - minY) * 0.3
    : minY + (maxY - minY) * 0.3;

  const { windowDistances, doorDistances, maxWindowDistance, maxDoorDistance } =
    calculateFeatureDistances(scene, seatPositions);
  const seatedCount = arrangement.reduce(
    (count, table) => count + table.filter(Boolean).length,
    0,
  );

  const previousPairs =
    criterionKey === 'avoidPreviousPairs' && seatingHistory
      ? buildPreviousPairs(seatingHistory, {
          mixHistory,
          studentCount: seatedCount,
        })
      : null;

  const tableCount = scene.tables.length;

  const getNeighbors = (tableIndex: number, seatIndex: number) => {
    const key = buildSeatKey(tableIndex, seatIndex);
    return seatNeighborhoods.get(key) ?? [];
  };

  const forEachSeat = (
    callback: (
      student: Student | null,
      tableIndex: number,
      seatIndex: number,
      seatCount: number,
      table: (Student | null)[],
    ) => void,
  ) => {
    arrangement.forEach((table, tIdx) => {
      const seatCount = table.length;
      for (let sIdx = 0; sIdx < seatCount; sIdx++) {
        callback(table[sIdx], tIdx, sIdx, seatCount, table);
      }
    });
  };

  switch (criterionKey) {
    case 'considerWishPartners': {
      forEachSeat((student, tIdx, sIdx, seatCount, table) => {
        if (!student || !student.wishPartnerId) return;
        const partnerIdx = partnerSeat(seatCount, sIdx);
        const partner =
          partnerIdx !== null ? (table[partnerIdx] ?? null) : null;
        if (partner && partner.id === student.wishPartnerId) {
          addEntry(entries, tIdx, sIdx, student.id, 100);
          if (partnerIdx !== null) {
            addEntry(entries, tIdx, partnerIdx, partner.id, 100);
          }
        } else if (partner) {
          addEntry(entries, tIdx, sIdx, student.id, 0);
          addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, 0);
        } else {
          addEntry(entries, tIdx, sIdx, student.id, 60);
        }
      });
      break;
    }
    case 'avoidConflictPartners': {
      forEachSeat((student, tIdx, sIdx, seatCount, table) => {
        if (!student || !student.avoidPartnerId) return;
        const partnerIdx = partnerSeat(seatCount, sIdx);
        const partner =
          partnerIdx !== null ? (table[partnerIdx] ?? null) : null;
        if (partner && partner.id === student.avoidPartnerId) {
          addEntry(entries, tIdx, sIdx, student.id, 0);
          addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, 0);
        } else {
          addEntry(entries, tIdx, sIdx, student.id, 100);
        }
      });
      break;
    }
    case 'avoidPreviousPairs': {
      if (!previousPairs || previousPairs.size === 0) break;
      forEachSeat((student, tIdx, sIdx, seatCount, table) => {
        if (!student) return;
        const partnerIdx = partnerSeat(seatCount, sIdx);
        const partner =
          partnerIdx !== null ? (table[partnerIdx] ?? null) : null;
        if (!partner || sIdx > (partnerIdx ?? sIdx)) return;
        const pairKey = [student.id, partner.id].sort().join('::');
        if (previousPairs.has(pairKey)) {
          addEntry(entries, tIdx, sIdx, student.id, 0);
          addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, 0);
        } else {
          addEntry(entries, tIdx, sIdx, student.id, 100);
          addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, 100);
        }
      });
      break;
    }
    case 'avoidRestlessTogether': {
      forEachSeat((student, tIdx, sIdx) => {
        if (!student?.restless) return;
        const neighbors = getNeighbors(tIdx, sIdx);
        const hasRestlessNeighbor = neighbors.some((neighbor) => {
          const neighborStudent = seatMap.get(
            buildSeatKey(neighbor.tableIndex, neighbor.seatIndex),
          );
          return neighborStudent?.restless;
        });
        addEntry(
          entries,
          tIdx,
          sIdx,
          student.id,
          hasRestlessNeighbor ? 0 : 100,
        );
      });
      break;
    }
    case 'avoidConcentrationTogether': {
      forEachSeat((student, tIdx, sIdx) => {
        if (!student?.concentrationIssues) return;
        const neighbors = getNeighbors(tIdx, sIdx);
        const hasConcentrationNeighbor = neighbors.some((neighbor) => {
          const neighborStudent = seatMap.get(
            buildSeatKey(neighbor.tableIndex, neighbor.seatIndex),
          );
          return neighborStudent?.concentrationIssues;
        });
        addEntry(
          entries,
          tIdx,
          sIdx,
          student.id,
          hasConcentrationNeighbor ? 0 : 100,
        );
      });
      break;
    }
    case 'avoidConcentrationNearRestless': {
      forEachSeat((student, tIdx, sIdx) => {
        if (!student?.concentrationIssues) return;
        const neighbors = getNeighbors(tIdx, sIdx);
        const nearRestless = neighbors.some((neighbor) => {
          const neighborStudent = seatMap.get(
            buildSeatKey(neighbor.tableIndex, neighbor.seatIndex),
          );
          return neighborStudent?.restless;
        });
        addEntry(entries, tIdx, sIdx, student.id, nearRestless ? 0 : 100);
      });
      break;
    }
    case 'preferGenderMix': {
      for (let tIdx = 0; tIdx < tableCount; tIdx++) {
        const table = arrangement[tIdx] ?? [];
        const occupied = table.filter(Boolean) as Student[];
        if (occupied.length < 2) continue;
        const genderCounts = createGenderCounts();
        occupied.forEach((student) => {
          if (student.gender) genderCounts[student.gender]++;
        });
        const imbalance = calculateGenderImbalance(genderCounts);
        const percentage =
          imbalance <= 1
            ? 100
            : imbalance === 2
              ? 65
              : Math.max(0, 50 - imbalance * 5);
        table.forEach((seat, sIdx) => {
          if (!seat) return;
          addEntry(entries, tIdx, sIdx, seat.id, percentage);
        });
      }
      break;
    }
    case 'avoidShyAlone': {
      forEachSeat((student, tIdx, sIdx, seatCount, table) => {
        if (!student?.shy) return;
        const partnerIdx = partnerSeat(seatCount, sIdx);
        const partner =
          partnerIdx !== null ? (table[partnerIdx] ?? null) : null;
        addEntry(entries, tIdx, sIdx, student.id, partner ? 100 : 0);
        if (partner) {
          addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, 100);
        }
      });
      break;
    }
    case 'peerTutoring': {
      forEachSeat((student, tIdx, sIdx, seatCount, table) => {
        if (!student) return;
        const hasPerformance =
          student.performanceStrong || student.performanceWeak;
        if (!hasPerformance) return;
        const partnerIdx = partnerSeat(seatCount, sIdx);
        const partner =
          partnerIdx !== null ? (table[partnerIdx] ?? null) : null;
        const partnerHasPerformance =
          partner?.performanceStrong || partner?.performanceWeak;
        if (!partner || !partnerHasPerformance) {
          addEntry(entries, tIdx, sIdx, student.id, 0);
          return;
        }
        const heteroPair =
          (student.performanceStrong && partner.performanceWeak) ||
          (student.performanceWeak && partner.performanceStrong);
        const percentage = heteroPair ? 100 : 0;
        addEntry(entries, tIdx, sIdx, student.id, percentage);
        addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, percentage);
      });
      break;
    }
    case 'homogeneousPerformanceGroups': {
      forEachSeat((student, tIdx, sIdx, seatCount, table) => {
        if (!student) return;
        const hasPerformance =
          student.performanceStrong || student.performanceWeak;
        if (!hasPerformance) return;
        const partnerIdx = partnerSeat(seatCount, sIdx);
        const partner =
          partnerIdx !== null ? (table[partnerIdx] ?? null) : null;
        const partnerHasPerformance =
          partner?.performanceStrong || partner?.performanceWeak;
        if (!partner || !partnerHasPerformance) {
          addEntry(entries, tIdx, sIdx, student.id, 0);
          return;
        }
        const homogeneousPair =
          (student.performanceStrong && partner.performanceStrong) ||
          (student.performanceWeak && partner.performanceWeak);
        const percentage = homogeneousPair ? 100 : 0;
        addEntry(entries, tIdx, sIdx, student.id, percentage);
        addEntry(entries, tIdx, partnerIdx ?? sIdx, partner.id, percentage);
      });
      break;
    }
    case 'preferFrontForNeedsFrontSeat': {
      forEachSeat((student, tIdx, sIdx) => {
        if (!student?.needsFrontSeat) return;
        const pos = seatPositions.get(buildSeatKey(tIdx, sIdx));
        if (!pos) return;
        // Check if seat is in front (respecting dominant axis)
        const isFront = orientation.dominantAxis === 'x'
          ? (orientation.frontIsHighX ? pos.x >= frontThresholdX : pos.x <= frontThresholdX)
          : (orientation.frontIsHighY ? pos.y >= frontThresholdY : pos.y <= frontThresholdY);
        addEntry(entries, tIdx, sIdx, student.id, isFront ? 100 : 0);
      });
      break;
    }
    case 'preferFrontForSmallerStudents': {
      forEachSeat((student, tIdx, sIdx) => {
        if (
          !student ||
          (student.height !== 'small' && student.height !== 'tall')
        )
          return;
        const pos = seatPositions.get(buildSeatKey(tIdx, sIdx));
        if (!pos) return;
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
        if (student.height === 'small') {
          addEntry(
            entries,
            tIdx,
            sIdx,
            student.id,
            relativePosition > 0.5 ? 100 : 0,
          );
        } else if (student.height === 'tall') {
          addEntry(
            entries,
            tIdx,
            sIdx,
            student.id,
            relativePosition < 0.5 ? 100 : 0,
          );
        }
      });
      break;
    }
    case 'preferWindowSeats': {
      forEachSeat((student, tIdx, sIdx) => {
        if (!student?.prefersWindow) return;
        const seatKey = buildSeatKey(tIdx, sIdx);
        const distance =
          windowDistances.get(seatKey) ?? Number.POSITIVE_INFINITY;
        const proximity = calculateProximityScore(distance, maxWindowDistance);
        addEntry(entries, tIdx, sIdx, student.id, proximity * 100);
      });
      break;
    }
    case 'preferDoorSeats': {
      forEachSeat((student, tIdx, sIdx) => {
        if (!student?.prefersDoor) return;
        const seatKey = buildSeatKey(tIdx, sIdx);
        const distance = doorDistances.get(seatKey) ?? Number.POSITIVE_INFINITY;
        const proximity = calculateProximityScore(distance, maxDoorDistance);
        addEntry(entries, tIdx, sIdx, student.id, proximity * 100);
      });
      break;
    }
    case 'preferLanguageMixing': {
      // Highlight students with language skills based on table composition
      for (let tIdx = 0; tIdx < tableCount; tIdx++) {
        const table = arrangement[tIdx] ?? [];
        const occupied = table.filter(Boolean) as Student[];
        const languageLevels = occupied
          .map((s) => s.languageSkill)
          .filter(Boolean);

        if (languageLevels.length < 2) continue;

        const hasStrong = languageLevels.some(
          (l) => l === 'native' || l === 'fluent',
        );
        const hasWeak = languageLevels.some(
          (l) => l === 'beginner' || l === 'daz',
        );
        const isHeterogeneous = hasStrong && hasWeak;

        table.forEach((seat, sIdx) => {
          if (!seat?.languageSkill) return;
          const isStrong =
            seat.languageSkill === 'native' || seat.languageSkill === 'fluent';
          const isWeak =
            seat.languageSkill === 'beginner' || seat.languageSkill === 'daz';

          if (isHeterogeneous) {
            // Table is well mixed
            addEntry(entries, tIdx, sIdx, seat.id, 100);
          } else if (isWeak && !hasStrong) {
            // Weak student without strong support - not ideal
            addEntry(entries, tIdx, sIdx, seat.id, 30);
          } else if (isStrong && !hasWeak) {
            // Strong student without anyone to help - neutral
            addEntry(entries, tIdx, sIdx, seat.id, 60);
          } else {
            addEntry(entries, tIdx, sIdx, seat.id, 50);
          }
        });
      }
      break;
    }
    case 'distributeSocialRoles': {
      // Highlight students with social roles based on table distribution
      for (let tIdx = 0; tIdx < tableCount; tIdx++) {
        const table = arrangement[tIdx] ?? [];
        const occupied = table.filter(Boolean) as Student[];
        const roles = occupied.map((s) => s.socialRole).filter(Boolean);

        if (roles.length === 0) continue;

        // Count roles at this table
        const roleCounts = new Map<string, number>();
        for (const role of roles) {
          roleCounts.set(role!, (roleCounts.get(role!) ?? 0) + 1);
        }

        table.forEach((seat, sIdx) => {
          if (!seat?.socialRole) return;
          const role = seat.socialRole;
          const roleCount = roleCounts.get(role) ?? 0;

          // Loner clustering is bad
          if (role === 'loner') {
            const lonerCount = roleCounts.get('loner') ?? 0;
            const hasMediator = roleCounts.has('mediator');
            const hasSocialHub = roleCounts.has('socialHub');
            if (lonerCount > 1) {
              addEntry(entries, tIdx, sIdx, seat.id, 0); // Multiple loners - bad
            } else if (hasMediator || hasSocialHub) {
              addEntry(entries, tIdx, sIdx, seat.id, 100); // Good support
            } else {
              addEntry(entries, tIdx, sIdx, seat.id, 50); // Alone but not paired
            }
          } else if (role === 'leader') {
            const leaderCount = roleCounts.get('leader') ?? 0;
            if (leaderCount > 1) {
              addEntry(entries, tIdx, sIdx, seat.id, 30); // Multiple leaders - conflict potential
            } else {
              addEntry(entries, tIdx, sIdx, seat.id, 100);
            }
          } else if (role === 'mediator') {
            // Mediators are good everywhere, but penalize clustering
            if (roleCount > 1) {
              addEntry(entries, tIdx, sIdx, seat.id, 60); // Spread mediators out
            } else {
              addEntry(entries, tIdx, sIdx, seat.id, 100);
            }
          } else {
            // socialHub and others
            if (roleCount > 1) {
              addEntry(entries, tIdx, sIdx, seat.id, 50);
            } else {
              addEntry(entries, tIdx, sIdx, seat.id, 100);
            }
          }
        });
      }
      break;
    }
    default:
      break;
  }

  return entries;
}
