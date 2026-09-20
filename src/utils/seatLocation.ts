// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import { getSeatPositions, partnerSeat } from './math/seatGeometry';
import { determineFrontDirection } from './algorithm/orientationUtils';
import { getFeatureDistanceMaps } from './algorithm/featureDistances';

/**
 * Where a student sits, in the words someone standing in the doorway would
 * use: the table, how far back, and what they are next to.
 *
 * A substitute teacher does not read coordinates, and "Reihe 3, Platz 2" is
 * only true from one corner of the room. A table number, a depth and a
 * landmark survive every way of looking at the room, which is what makes them
 * sayable out loud.
 */

export type SeatDepth = 'front' | 'middle' | 'back';

/** The fixed thing nearest the seat, where there is one near enough. */
export type SeatLandmark = 'window' | 'door' | null;

export type SeatLocation = {
  tableIndex: number;
  seatIndex: number;
  /** As the plan labels it: one-based, the way a teacher counts tables. */
  tableNumber: number;
  depth: SeatDepth;
  landmark: SeatLandmark;
  /** Whoever shares the table's seat pair — usually exactly one person. */
  neighbors: Student[];
};

/** Beyond this share of the room's own span, a landmark is not "near". */
const LANDMARK_PROXIMITY = 0.75;

const buildSeatKey = (tableIndex: number, seatIndex: number) =>
  `${tableIndex}-${seatIndex}`;

const proximity = (distance: number | undefined, max: number): number => {
  if (distance === undefined || !Number.isFinite(distance) || max <= 0) {
    return 0;
  }
  return 1 - Math.min(distance / max, 1);
};

export function findSeatLocation(
  arrangement: SeatingArrangement,
  scene: ClassroomScene,
  studentId: string,
): SeatLocation | null {
  let tableIndex = -1;
  let seatIndex = -1;

  arrangement.forEach((table, tIdx) => {
    table?.forEach((student, sIdx) => {
      if (student?.id === studentId) {
        tableIndex = tIdx;
        seatIndex = sIdx;
      }
    });
  });

  if (tableIndex < 0) {
    return null;
  }

  const table = arrangement[tableIndex] ?? [];
  const partnerIndex = partnerSeat(table.length, seatIndex);
  const partner = partnerIndex === null ? null : (table[partnerIndex] ?? null);

  const seatPositions = getSeatPositions(scene);
  const position = seatPositions.get(buildSeatKey(tableIndex, seatIndex));

  let depth: SeatDepth = 'middle';
  if (position) {
    const orientation = determineFrontDirection(scene);
    const values = Array.from(seatPositions.values()).map((seat) =>
      orientation.dominantAxis === 'x' ? seat.x : seat.y,
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const own = orientation.dominantAxis === 'x' ? position.x : position.y;
    // 0 = as far from the board as the room goes, 1 = right at it.
    const towardsFront = max === min ? 0.5 : (own - min) / (max - min);
    const frontIsHigh =
      orientation.dominantAxis === 'x'
        ? orientation.frontIsHighX
        : orientation.frontIsHighY;
    const share = frontIsHigh ? towardsFront : 1 - towardsFront;
    depth = share >= 2 / 3 ? 'front' : share <= 1 / 3 ? 'back' : 'middle';
  }

  let landmark: SeatLandmark = null;
  if (position) {
    const maps = getFeatureDistanceMaps(scene, seatPositions);
    const key = buildSeatKey(tableIndex, seatIndex);
    const toWindow = proximity(maps.window.get(key), maps.maxWindowDistance);
    const toDoor = proximity(maps.door.get(key), maps.maxDoorDistance);
    const best = Math.max(toWindow, toDoor);
    if (best >= LANDMARK_PROXIMITY) {
      landmark = toWindow >= toDoor ? 'window' : 'door';
    }
  }

  return {
    tableIndex,
    seatIndex,
    tableNumber: tableIndex + 1,
    depth,
    landmark,
    neighbors: partner ? [partner] : [],
  };
}
