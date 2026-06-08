// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import {
  seatPairsFor,
  partnerSeat,
  getAdjacentSeats,
  getSeatPositions,
  getSeatNeighborhoods,
  filterNeighbors,
} from '../seatGeometry';
import type { ClassroomScene } from '../../../types';
import { createMockClassroomScene } from '../../../__tests__/utils';

describe('seatGeometry', () => {
  describe('seatPairsFor', () => {
    it('returns correct pairs for even seat counts', () => {
      expect(seatPairsFor(2)).toEqual([[0, 1]]);
      expect(seatPairsFor(4)).toEqual([
        [0, 1],
        [2, 3],
      ]);
      expect(seatPairsFor(6)).toEqual([
        [0, 1],
        [2, 3],
        [4, 5],
      ]);
    });

    it('returns correct pairs for odd seat counts', () => {
      expect(seatPairsFor(1)).toEqual([]);
      expect(seatPairsFor(3)).toEqual([[0, 1]]);
      expect(seatPairsFor(5)).toEqual([
        [0, 1],
        [2, 3],
      ]);
    });

    it('handles zero seats', () => {
      expect(seatPairsFor(0)).toEqual([]);
    });

    it('maintains consistent pairing logic', () => {
      // Test larger seat counts
      const pairs6 = seatPairsFor(6);
      expect(pairs6).toEqual([
        [0, 1],
        [2, 3],
        [4, 5],
      ]);

      const pairs8 = seatPairsFor(8);
      expect(pairs8).toEqual([
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ]);

      const pairs10 = seatPairsFor(10);
      expect(pairs10).toEqual([
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
        [8, 9],
      ]);
    });
  });

  describe('partnerSeat', () => {
    it('returns correct partner for paired seats', () => {
      // 2-seat table
      expect(partnerSeat(2, 0)).toBe(1);
      expect(partnerSeat(2, 1)).toBe(0);

      // 4-seat table
      expect(partnerSeat(4, 0)).toBe(1);
      expect(partnerSeat(4, 1)).toBe(0);
      expect(partnerSeat(4, 2)).toBe(3);
      expect(partnerSeat(4, 3)).toBe(2);

      // 6-seat table
      expect(partnerSeat(6, 0)).toBe(1);
      expect(partnerSeat(6, 1)).toBe(0);
      expect(partnerSeat(6, 2)).toBe(3);
      expect(partnerSeat(6, 3)).toBe(2);
      expect(partnerSeat(6, 4)).toBe(5);
      expect(partnerSeat(6, 5)).toBe(4);
    });

    it('returns null for unpaired seats', () => {
      // 3-seat table (seat 2 has no partner)
      expect(partnerSeat(3, 2)).toBe(null);

      // 5-seat table (seat 4 has no partner)
      expect(partnerSeat(5, 4)).toBe(null);

      // 1-seat table
      expect(partnerSeat(1, 0)).toBe(null);
    });

    it('returns null for invalid seat indices', () => {
      expect(partnerSeat(4, -1)).toBe(null);
      expect(partnerSeat(4, 4)).toBe(null);
      expect(partnerSeat(4, 10)).toBe(null);
    });

    it('handles edge cases', () => {
      expect(partnerSeat(0, 0)).toBe(null);
      expect(partnerSeat(1, 1)).toBe(null);
    });
  });

  describe('getSeatPositions', () => {
    let scene: ClassroomScene;

    beforeEach(() => {
      scene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 200,
            y: 100,
            width: 100,
            height: 50,
            seatCount: 4,
            templateType: 'group4',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
      });
    });

    it('calculates correct positions for rectangular tables', () => {
      const positions = getSeatPositions(scene);

      // Table 1 (2 seats): should be arranged vertically (double template)
      const t1s0 = positions.get('0-0');
      const t1s1 = positions.get('0-1');

      expect(t1s0).toEqual({ x: 50, y: 12.5 }); // Top seat center
      expect(t1s1).toEqual({ x: 50, y: 37.5 }); // Bottom seat center
    });

    it('calculates correct positions for square tables', () => {
      const positions = getSeatPositions(scene);

      // Table 2 (4 seats): should be arranged in 2x2 grid
      const t2s0 = positions.get('1-0');
      const t2s1 = positions.get('1-1');
      const t2s2 = positions.get('1-2');
      const t2s3 = positions.get('1-3');

      expect(t2s0).toEqual({ x: 225, y: 112.5 }); // Top-left
      expect(t2s1).toEqual({ x: 275, y: 112.5 }); // Top-right
      expect(t2s2).toEqual({ x: 225, y: 137.5 }); // Bottom-left
      expect(t2s3).toEqual({ x: 275, y: 137.5 }); // Bottom-right
    });

    it('handles tables with 0 degree rotation', () => {
      const scene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false, // No rotation needed with optimized templates
          },
        ],
      });

      const positions = getSeatPositions(scene);
      const s0 = positions.get('0-0');
      const s1 = positions.get('0-1');

      // With no rotation - positions based on vertical double template layout
      expect(s0?.x).toBeCloseTo(50, 1); // Top seat
      expect(s0?.y).toBeCloseTo(12.5, 1);
      expect(s1?.x).toBeCloseTo(50, 1); // Bottom seat
      expect(s1?.y).toBeCloseTo(37.5, 1);
    });

    it('handles single seat tables', () => {
      const singleSeatScene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions = getSeatPositions(singleSeatScene);
      const s0 = positions.get('0-0');

      expect(s0).toEqual({ x: 25, y: 25 }); // Center of table
    });

    it('caches results for same scene object', () => {
      const positions1 = getSeatPositions(scene);
      const positions2 = getSeatPositions(scene);

      // Should return the exact same Map object (cached)
      expect(positions1).toBe(positions2);
    });

    it('recalculates for different scene objects', () => {
      const scene2 = createMockClassroomScene(1, {
        tables: [
          {
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions1 = getSeatPositions(scene);
      const positions2 = getSeatPositions(scene2);

      // Should be different Map objects
      expect(positions1).not.toBe(positions2);

      // And have different values
      expect(positions1.get('0-0')).not.toEqual(positions2.get('0-0'));
    });

    it('handles empty scene', () => {
      const emptyScene = createMockClassroomScene(0);
      const positions = getSeatPositions(emptyScene);

      expect(positions.size).toBe(0);
    });

    it('handles odd seat counts correctly', () => {
      const oddSeatScene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 150,
            height: 50,
            seatCount: 3,
            templateType: 'group4',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions = getSeatPositions(oddSeatScene);

      // 3 seats should be arranged in 2x2 grid (ceil(sqrt(3)) = 2)
      expect(positions.get('0-0')).toEqual({ x: 37.5, y: 12.5 });
      expect(positions.get('0-1')).toEqual({ x: 112.5, y: 12.5 });
      expect(positions.get('0-2')).toEqual({ x: 37.5, y: 37.5 });
    });

    it('handles group6 tables with 2x3 layout', () => {
      const group6Scene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 180,
            height: 120,
            seatCount: 6,
            templateType: 'group6',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions = getSeatPositions(group6Scene);

      // 6 seats should form a U-shape that opens to the right
      // Each seat: 180/3 = 60px wide, 120/2 = 60px high
      expect(positions.get('0-0')).toEqual({ x: 30, y: 30 }); // [1] top left (short edge)
      expect(positions.get('0-1')).toEqual({ x: 30, y: 90 }); // [2] bottom left (short edge)
      expect(positions.get('0-2')).toEqual({ x: 90, y: 90 }); // [3] bottom middle (long edge)
      expect(positions.get('0-3')).toEqual({ x: 150, y: 90 }); // [4] bottom right (long edge)
      expect(positions.get('0-4')).toEqual({ x: 90, y: 30 }); // [5] top middle (long edge)
      expect(positions.get('0-5')).toEqual({ x: 150, y: 30 }); // [6] top right (long edge)
    });

    it('handles 90 degree rotated group4 table', () => {
      // 100x100 square table at (0,0) rotated 90°
      const rotatedScene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            seatCount: 4,
            templateType: 'group4',
            rotation: 90,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions = getSeatPositions(rotatedScene);

      // 90° rotation swaps and inverts coordinates around center (50, 50)
      // Original: seat 0 at (25, 25), seat 1 at (75, 25)
      // After 90° CW: seat 0 at (75, 25), seat 1 at (75, 75)
      const s0 = positions.get('0-0');
      const s1 = positions.get('0-1');

      expect(s0?.x).toBeCloseTo(75, 1);
      expect(s0?.y).toBeCloseTo(25, 1);
      expect(s1?.x).toBeCloseTo(75, 1);
      expect(s1?.y).toBeCloseTo(75, 1);
    });

    it('handles 180 degree rotated double table', () => {
      // 100x50 table at (0,0) rotated 180°
      const rotatedScene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 180,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions = getSeatPositions(rotatedScene);

      // 180° rotation flips both positions around center (50, 25)
      // Original: seat 0 at (50, 12.5), seat 1 at (50, 37.5)
      // After 180°: seat 0 at (50, 37.5), seat 1 at (50, 12.5)
      const s0 = positions.get('0-0');
      const s1 = positions.get('0-1');

      expect(s0?.x).toBeCloseTo(50, 1);
      expect(s0?.y).toBeCloseTo(37.5, 1);
      expect(s1?.x).toBeCloseTo(50, 1);
      expect(s1?.y).toBeCloseTo(12.5, 1);
    });

    it('handles 45 degree rotation', () => {
      // 100x100 table at (0,0) rotated 45°
      const rotatedScene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            seatCount: 1,
            templateType: 'single',
            rotation: 45,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const positions = getSeatPositions(rotatedScene);

      // Single seat at center (50, 50) stays at center after any rotation
      const s0 = positions.get('0-0');
      expect(s0?.x).toBeCloseTo(50, 1);
      expect(s0?.y).toBeCloseTo(50, 1);
    });
  });

  describe('getAdjacentSeats', () => {
    let scene: ClassroomScene;

    beforeEach(() => {
      scene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 60, // Very close to first table to ensure adjacency
            y: 0,
            width: 100,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });
    });

    it('identifies adjacent seats within same table', () => {
      const adjacent = getAdjacentSeats(scene);

      // Seats within the same table should be adjacent
      const t1s0Adjacent = adjacent.get('0-0') || [];
      const t1s1Adjacent = adjacent.get('0-1') || [];

      expect(t1s0Adjacent).toContainEqual({ t: 0, s: 1 });
      expect(t1s1Adjacent).toContainEqual({ t: 0, s: 0 });
    });

    it('identifies adjacent seats between different tables', () => {
      const adjacent = getAdjacentSeats(scene);

      // Tables are positioned close together, so some seats should be adjacent
      const allAdjacencies = Array.from(adjacent.entries());

      // Should have some cross-table adjacencies
      const crossTableAdjacencies = allAdjacencies.filter(
        ([key, neighbors]) => {
          const [tableStr] = key.split('-');
          const tableIndex = parseInt(tableStr, 10);
          return neighbors.some((neighbor) => neighbor.t !== tableIndex);
        },
      );

      expect(crossTableAdjacencies.length).toBeGreaterThan(0);
    });

    it('includes front/back neighbors for stacked double tables', () => {
      const stackedScene = createMockClassroomScene(2, {
        tables: [
          {
            x: 100,
            y: 100,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 100,
            y: 250,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
      });

      const adjacent = getAdjacentSeats(stackedScene);

      // The back seat of the first table should recognize the front seat behind it
      expect(adjacent.get('0-1')).toContainEqual({ t: 1, s: 0 });
      expect(adjacent.get('1-0')).toContainEqual({ t: 0, s: 1 });
    });

    it('does not include distant seats as adjacent', () => {
      const distantScene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 1000, // Very far away
            y: 1000,
            width: 50,
            height: 50,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const adjacent = getAdjacentSeats(distantScene);

      // These distant seats should not be adjacent
      const t1s0Adjacent = adjacent.get('0-0') || [];
      const t2s0Adjacent = adjacent.get('1-0') || [];

      expect(t1s0Adjacent).not.toContainEqual({ t: 1, s: 0 });
      expect(t2s0Adjacent).not.toContainEqual({ t: 0, s: 0 });
    });

    it('handles tables with optimized layout (0 degree rotation)', () => {
      const scene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            seatCount: 4,
            templateType: 'group4',
            rotation: 0,
            zIndex: 0,
            locked: false, // Optimized template layout, no rotation needed
          },
        ],
      });

      const adjacent = getAdjacentSeats(scene);

      // Should identify adjacent seats in grid layout
      expect(adjacent.size).toBeGreaterThan(0);

      // Each seat should have some neighbors
      for (let i = 0; i < 4; i++) {
        const neighbors = adjacent.get(`0-${i}`) || [];
        expect(neighbors.length).toBeGreaterThan(0);
      }
    });

    it('caches results for same scene object', () => {
      const adjacent1 = getAdjacentSeats(scene);
      const adjacent2 = getAdjacentSeats(scene);

      // Should return the exact same Map object (cached)
      expect(adjacent1).toBe(adjacent2);
    });

    it('handles empty scene', () => {
      const emptyScene = createMockClassroomScene(0);
      const adjacent = getAdjacentSeats(emptyScene);

      expect(adjacent.size).toBe(0);
    });

    it('handles single seat table', () => {
      const singleSeatScene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const adjacent = getAdjacentSeats(singleSeatScene);

      // Single seat has no neighbors
      const neighbors = adjacent.get('0-0') || [];
      expect(neighbors).toHaveLength(0);
    });

    it('correctly handles complex multi-table layouts', () => {
      const complexScene = createMockClassroomScene(3, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 60,
            y: 0,
            width: 50,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 120,
            y: 0,
            width: 50,
            height: 50,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const adjacent = getAdjacentSeats(complexScene);

      // Middle table should have adjacencies to both side tables
      const middleTableSeats = [adjacent.get('1-0'), adjacent.get('1-1')];

      const crossTableTargets = middleTableSeats.map(
        (neighbors) =>
          new Set(
            (neighbors ?? [])
              .filter((neighbor) => neighbor.t !== 1)
              .map((neighbor) => neighbor.t),
          ),
      );

      // Both seats of the middle table should connect to the left and right tables
      crossTableTargets.forEach((targets) => {
        expect(targets.has(0)).toBe(true);
        expect(targets.has(2)).toBe(true);
      });

      // But should have some adjacencies
      expect(adjacent.size).toBeGreaterThan(0);
    });

    it('handles group6 table adjacencies correctly', () => {
      const group6Scene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 180,
            height: 120,
            seatCount: 6,
            templateType: 'group6',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const adjacent = getAdjacentSeats(group6Scene);

      // In the right-open U layout, seat 0 [1] (top left) should be adjacent to seat 1 [2] (below)
      const seat0Adjacent = adjacent.get('0-0') || [];
      expect(seat0Adjacent).toContainEqual({ t: 0, s: 1 }); // Below neighbor [2]

      // Seat 1 [2] (bottom left) should be adjacent to seat 0 [1] (above)
      const seat1Adjacent = adjacent.get('0-1') || [];
      expect(seat1Adjacent).toContainEqual({ t: 0, s: 0 }); // Above neighbor [1]

      // Seat 3 [4] (bottom right) should be adjacent to seat 5 [6] (above) and seat 2 [3] (left)
      const seat3Adjacent = adjacent.get('0-3') || [];
      expect(seat3Adjacent).toContainEqual({ t: 0, s: 5 }); // Above neighbor [6]
      expect(seat3Adjacent).toContainEqual({ t: 0, s: 2 }); // Left neighbor [3]

      // Each seat should have some neighbors (no isolated seats)
      for (let i = 0; i < 6; i++) {
        const neighbors = adjacent.get(`0-${i}`) || [];
        expect(neighbors.length).toBeGreaterThan(0);
      }
    });

    it('maintains symmetrical adjacency relationships', () => {
      const adjacent = getAdjacentSeats(scene);

      // If A is adjacent to B, then B should be adjacent to A
      for (const [seatKey, neighbors] of adjacent.entries()) {
        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.t}-${neighbor.s}`;
          const neighborNeighbors = adjacent.get(neighborKey) || [];

          const [tableStr, seatStr] = seatKey.split('-');
          const originalSeat = {
            t: parseInt(tableStr, 10),
            s: parseInt(seatStr, 10),
          };

          expect(neighborNeighbors).toContainEqual(originalSeat);
        }
      }
    });
  });

  describe('getSeatNeighborhoods', () => {
    it('annotates direct neighbors with distance and strength metadata', () => {
      const scene = createMockClassroomScene(1, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      });

      const neighborhoods = getSeatNeighborhoods(scene);
      const neighbors = neighborhoods.get('0-0') || [];

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]?.direction).toBe('direct');
      expect(neighbors[0]?.strengthFactor).toBe(1);
      expect(neighbors[0]?.distance).toBeGreaterThan(0);
    });

    it('identifies side neighbors across adjacent tables', () => {
      const scene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 95, // 40px walkway between tables
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
      });

      const neighborhoods = getSeatNeighborhoods(scene);
      const leftSeatNeighbors = neighborhoods.get('0-0') || [];
      const rightSeatNeighbors = neighborhoods.get('1-0') || [];

      expect(
        leftSeatNeighbors.some(
          (neighbor) =>
            neighbor.tableIndex === 1 && neighbor.direction === 'side',
        ),
      ).toBe(true);
      expect(
        rightSeatNeighbors.some(
          (neighbor) =>
            neighbor.tableIndex === 0 && neighbor.direction === 'side',
        ),
      ).toBe(true);
    });

    it('distinguishes front and back neighbors across rows', () => {
      const scene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 0,
            y: 170, // 40px walkway between table rows
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
      });

      const neighborhoods = getSeatNeighborhoods(scene);
      const frontSeatNeighbors = neighborhoods.get('0-0') || [];
      const backSeatNeighbors = neighborhoods.get('1-0') || [];

      expect(
        frontSeatNeighbors.some(
          (neighbor) =>
            neighbor.tableIndex === 1 && neighbor.direction === 'back',
        ),
      ).toBe(true);
      expect(
        backSeatNeighbors.some(
          (neighbor) =>
            neighbor.tableIndex === 0 && neighbor.direction === 'front',
        ),
      ).toBe(true);

      const strengthValues = backSeatNeighbors
        .filter((neighbor) => neighbor.tableIndex === 0)
        .map((neighbor) => neighbor.strengthFactor);
      expect(strengthValues.every((value) => value === 0.5)).toBe(true);
    });

    it('supports filtering neighbors using helper function', () => {
      const scene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 95,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
      });

      const neighborhoods = getSeatNeighborhoods(scene);
      const neighbors = neighborhoods.get('0-0');
      const sideOnly = filterNeighbors(neighbors, ['side']);

      expect(sideOnly.length).toBeGreaterThan(0);
      expect(sideOnly.every((neighbor) => neighbor.direction === 'side')).toBe(
        true,
      );
      expect(
        sideOnly.every((neighbor) => neighbor.strengthFactor === 0.7),
      ).toBe(true);
    });

    it('allows directional filtering via options', () => {
      const scene = createMockClassroomScene(2, {
        tables: [
          {
            x: 0,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 95,
            y: 0,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
      });

      const directNeighbors = getSeatNeighborhoods(scene, {
        directions: ['direct'],
      });

      const sideNeighbors = getSeatNeighborhoods(scene, {
        directions: ['side'],
      });

      const directList = directNeighbors.get('0-0') || [];
      const sideList = sideNeighbors.get('0-0') || [];

      expect(directList).toHaveLength(1);
      expect(sideList.length).toBeGreaterThan(0);
      expect(
        directList.every((neighbor) => neighbor.direction === 'direct'),
      ).toBe(true);
      expect(sideList.every((neighbor) => neighbor.direction === 'side')).toBe(
        true,
      );
    });
  });
});
