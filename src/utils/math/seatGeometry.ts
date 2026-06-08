// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import {
  calculateSeatLayout,
  calculateSeatPosition,
} from '@/utils/math/positionCalculations';

export type SeatNeighborDirection = 'direct' | 'side' | 'front' | 'back';

export interface SeatNeighbor {
  tableIndex: number;
  seatIndex: number;
  distance: number;
  direction: SeatNeighborDirection;
  strengthFactor: number;
}

export type SeatNeighborhoodMap = Map<string, SeatNeighbor[]>;

export interface SeatNeighborhoodOptions {
  directions?: SeatNeighborDirection[];
  maxDistance?: number;
}

const SIDE_GAP_EXTRA = 90;
const FRONT_BACK_GAP_EXTRA = 90;
const SIDE_ALIGNMENT_FACTOR = 0.75;
const FRONT_BACK_ALIGNMENT_FACTOR = 0.75;

const OPPOSITE_DIRECTION: Record<SeatNeighborDirection, SeatNeighborDirection> =
  {
    direct: 'direct',
    side: 'side',
    front: 'back',
    back: 'front',
  };

/**
 * Define seat pairs for each table shape.
 * @param seatCount Seats per table
 * @returns Array of seat index pairs
 */
export const seatPairsFor = (seatCount: number): [number, number][] => {
  const pairs: [number, number][] = [];
  for (let i = 0; i < seatCount - 1; i += 2) {
    pairs.push([i, i + 1]);
  }
  return pairs;
};

/**
 * Get the partner seat index for a given seat.
 * @param seatCount Seats per table
 * @param seatIdx Index of seat
 * @returns Partner seat index or `null`
 */
export const partnerSeat = (
  seatCount: number,
  seatIdx: number,
): number | null => {
  for (const [a, b] of seatPairsFor(seatCount)) {
    if (a === seatIdx) return b;
    if (b === seatIdx) return a;
  }
  return null;
};

/**
 * Build adjacency information for all seats in the scene.
 * @param scene Classroom layout
 * @returns Map of seat key "table-seat" to neighboring seats
 */
type SeatInfo = {
  tableIndex: number;
  seatIndex: number;
  x: number;
  y: number;
  seatWidth: number;
  seatHeight: number;
};

const collectSeatInfos = (scene: ClassroomScene): SeatInfo[] => {
  const infos: SeatInfo[] = [];

  scene.tables.forEach((table, tableIndex) => {
    const layout = calculateSeatLayout(table);

    layout.positions.forEach((_, seatIndex) => {
      const { x, y } = calculateSeatPosition({
        mode: 'scene',
        table,
        seatIndex,
        layout,
      });
      infos.push({
        tableIndex,
        seatIndex,
        x,
        y,
        seatWidth: layout.seatWidth,
        seatHeight: layout.seatHeight,
      });
    });
  });

  return infos;
};

const determineDirection = (a: SeatInfo, b: SeatInfo) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const horizontalThreshold = (a.seatWidth + b.seatWidth) / 2 + 1;
  const verticalThreshold = (a.seatHeight + b.seatHeight) / 2 + 1;

  const horizontal = dx <= horizontalThreshold && dy < verticalThreshold;
  const vertical = dy <= verticalThreshold && dx < horizontalThreshold;

  if (horizontal || vertical) {
    return 'direct' as SeatNeighborDirection;
  }

  const horizontalGap = Math.max(0, dx - horizontalThreshold);
  const verticalGap = Math.max(0, dy - verticalThreshold);
  const averageSeatWidth = (a.seatWidth + b.seatWidth) / 2;
  const averageSeatHeight = (a.seatHeight + b.seatHeight) / 2;

  const sideGapLimit = averageSeatWidth + SIDE_GAP_EXTRA;
  const sideAlignmentLimit =
    verticalThreshold + averageSeatHeight * SIDE_ALIGNMENT_FACTOR;

  if (
    horizontalGap > 0 &&
    horizontalGap <= sideGapLimit &&
    dy <= sideAlignmentLimit
  ) {
    return 'side' as SeatNeighborDirection;
  }

  const frontBackGapLimit = averageSeatHeight + FRONT_BACK_GAP_EXTRA;
  const frontBackAlignmentLimit =
    horizontalThreshold + averageSeatWidth * FRONT_BACK_ALIGNMENT_FACTOR;

  if (
    verticalGap > 0 &&
    verticalGap <= frontBackGapLimit &&
    dx <= frontBackAlignmentLimit
  ) {
    return (b.y < a.y ? 'front' : 'back') as SeatNeighborDirection;
  }

  return null;
};

export const filterNeighbors = (
  neighbors: SeatNeighbor[] | undefined,
  directions: SeatNeighborDirection[],
) => {
  if (!neighbors) {
    return [];
  }
  const directionSet = new Set(directions);
  return neighbors.filter((neighbor) => directionSet.has(neighbor.direction));
};

export const getSeatNeighborhoods = (() => {
  const cache = new WeakMap<ClassroomScene, SeatNeighborhoodMap>();

  return (
    scene: ClassroomScene,
    options?: SeatNeighborhoodOptions,
  ): SeatNeighborhoodMap => {
    const cached = cache.get(scene);
    if (!cached) {
      const infos = collectSeatInfos(scene);
      const map: SeatNeighborhoodMap = new Map();

      for (let i = 0; i < infos.length; i++) {
        for (let j = i + 1; j < infos.length; j++) {
          const a = infos[i]!;
          const b = infos[j]!;
          const direction = determineDirection(a, b);
          if (!direction) continue;

          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          const strengthFactor =
            direction === 'direct' ? 1 : direction === 'side' ? 0.7 : 0.5;

          const keyA = `${a.tableIndex}-${a.seatIndex}`;
          const keyB = `${b.tableIndex}-${b.seatIndex}`;

          if (!map.has(keyA)) map.set(keyA, []);
          if (!map.has(keyB)) map.set(keyB, []);

          map.get(keyA)!.push({
            tableIndex: b.tableIndex,
            seatIndex: b.seatIndex,
            distance,
            direction,
            strengthFactor,
          });

          const oppositeDirection = OPPOSITE_DIRECTION[direction];

          map.get(keyB)!.push({
            tableIndex: a.tableIndex,
            seatIndex: a.seatIndex,
            distance,
            direction: oppositeDirection,
            strengthFactor,
          });
        }
      }

      cache.set(scene, map);
    }

    const fullMap = cache.get(scene)!;
    if (!options || (!options.directions && !options.maxDistance)) {
      return fullMap;
    }

    const filteredMap: SeatNeighborhoodMap = new Map();
    const allowedDirections = options.directions
      ? new Set(options.directions)
      : null;
    const maxDistance = options.maxDistance;

    for (const [key, neighbors] of fullMap.entries()) {
      const filtered = neighbors.filter((neighbor) => {
        if (allowedDirections && !allowedDirections.has(neighbor.direction)) {
          return false;
        }
        if (maxDistance !== undefined && neighbor.distance > maxDistance) {
          return false;
        }
        return true;
      });
      if (filtered.length > 0) {
        filteredMap.set(key, filtered);
      }
    }

    return filteredMap;
  };
})();

export const getAdjacentSeats = (() => {
  const cache = new WeakMap<
    ClassroomScene,
    Map<string, { t: number; s: number }[]>
  >();

  return (scene: ClassroomScene): Map<string, { t: number; s: number }[]> => {
    const cached = cache.get(scene);
    if (cached) return cached;

    const neighborhoods = getSeatNeighborhoods(scene, {
      directions: ['direct', 'front', 'back', 'side'],
    });

    const map = new Map<string, { t: number; s: number }[]>();

    for (const [key, neighbors] of neighborhoods.entries()) {
      map.set(
        key,
        neighbors.map((neighbor) => ({
          t: neighbor.tableIndex,
          s: neighbor.seatIndex,
        })),
      );
    }

    cache.set(scene, map);
    return map;
  };
})();

/**
 * Compute seat center positions for all seats.
 * @param scene Classroom layout
 * @returns Map of seat key "table-seat" to position
 */
export const getSeatPositions = (() => {
  const cache = new WeakMap<
    ClassroomScene,
    Map<string, { x: number; y: number }>
  >();

  return (scene: ClassroomScene): Map<string, { x: number; y: number }> => {
    const cached = cache.get(scene);
    if (cached) return cached;
    const map = new Map<string, { x: number; y: number }>();
    scene.tables.forEach((table, tIdx) => {
      const layout = calculateSeatLayout(table);

      layout.positions.forEach((_, sIdx) => {
        const { x, y } = calculateSeatPosition({
          mode: 'scene',
          table,
          seatIndex: sIdx,
          layout,
        });
        map.set(`${tIdx}-${sIdx}`, { x, y });
      });
    });
    cache.set(scene, map);
    return map;
  };
})();
