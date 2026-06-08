// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import { scoreHeightPlacement, isSmall, isTall } from '../heightScoring';
import type { ScoringContext } from '../scoringContext';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import {
  getSeatNeighborhoods,
  getSeatPositions,
} from '@/utils/math/seatGeometry';
import { emptyCounts } from '../scoringHelpers';
import { DEFAULT_NEIGHBOR_WEIGHTS } from '@/utils';

describe('heightScoring', () => {
  let baseContext: ScoringContext;

  beforeEach(() => {
    const scene = createMockClassroomScene(3, {
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
          x: 200,
          y: 100,
          width: 55,
          height: 130,
          seatCount: 2,
          templateType: 'double',
          rotation: 0,
          zIndex: 1,
          locked: false,
        },
        {
          x: 300,
          y: 100,
          width: 55,
          height: 130,
          seatCount: 2,
          templateType: 'double',
          rotation: 0,
          zIndex: 2,
          locked: false,
        },
      ],
      totalStudents: 6,
    });

    baseContext = {
      student: createMockStudent({ id: 's1', name: 'Test' }),
      tableIndex: 0,
      seatIndex: 0,
      arrangement: [
        [null, null],
        [null, null],
        [null, null],
      ],
      settings: {},
      scene,
      seatCounts: [2, 2, 2],
      targets: [2, 2, 2],
      seatNeighborhoods: getSeatNeighborhoods(scene),
      seatPositions: getSeatPositions(scene),
      minX: 100,
      maxX: 300,
      frontIsHighX: true, // Default: right = front
      frontIsHighY: false,
      dominantAxis: 'x',
      minY: 100,
      maxY: 300,
      globalCounts: emptyCounts(),
      studentById: new Map(),
      validLockedIds: new Set(),
      previousPairs: new Map(),
      lockedPositions: {},
      behavioralNeighborWeights: DEFAULT_NEIGHBOR_WEIGHTS.behavioral,
      genderNeighborWeights: DEFAULT_NEIGHBOR_WEIGHTS.gender,
      featureDistances: {
        window: new Map(),
        door: new Map(),
      },
      maxWindowDistance: 1,
      maxDoorDistance: 1,
    };
  });

  describe('isSmall', () => {
    it('returns true for small height students', () => {
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });
      expect(isSmall(baseContext)).toBe(true);
    });

    it('returns false for non-small students', () => {
      baseContext.student = createMockStudent({ id: 's1', height: 'medium' });
      expect(isSmall(baseContext)).toBe(false);

      baseContext.student = createMockStudent({ id: 's1', height: 'tall' });
      expect(isSmall(baseContext)).toBe(false);

      baseContext.student = createMockStudent({ id: 's1' }); // undefined
      expect(isSmall(baseContext)).toBe(false);
    });
  });

  describe('isTall', () => {
    it('returns true for tall height students', () => {
      baseContext.student = createMockStudent({ id: 's1', height: 'tall' });
      expect(isTall(baseContext)).toBe(true);
    });

    it('returns false for non-tall students', () => {
      baseContext.student = createMockStudent({ id: 's1', height: 'medium' });
      expect(isTall(baseContext)).toBe(false);

      baseContext.student = createMockStudent({ id: 's1', height: 'small' });
      expect(isTall(baseContext)).toBe(false);

      baseContext.student = createMockStudent({ id: 's1' }); // undefined
      expect(isTall(baseContext)).toBe(false);
    });
  });

  describe('scoreHeightPlacement', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.preferFrontForSmallerStudents = 0;
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });

      const score = scoreHeightPlacement(baseContext);

      expect(score).toBe(0);
    });

    it('returns 0 when height is not set', () => {
      baseContext.settings.preferFrontForSmallerStudents = 5;
      baseContext.student = createMockStudent({ id: 's1' }); // height undefined

      const score = scoreHeightPlacement(baseContext);

      expect(score).toBe(0);
    });

    it('returns 0 when height is medium', () => {
      baseContext.settings.preferFrontForSmallerStudents = 5;
      baseContext.student = createMockStudent({ id: 's1', height: 'medium' });

      const score = scoreHeightPlacement(baseContext);

      expect(score).toBe(0);
    });

    it('rewards small students at front seats (higher x)', () => {
      baseContext.settings.preferFrontForSmallerStudents = 5;
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });

      // Front seat (x=300, rightmost)
      baseContext.tableIndex = 2;
      baseContext.seatIndex = 0;
      const frontScore = scoreHeightPlacement(baseContext);

      // Back seat (x=100, leftmost)
      baseContext.tableIndex = 0;
      baseContext.seatIndex = 0;
      const backScore = scoreHeightPlacement(baseContext);

      // Front placement should have more negative score (better)
      expect(frontScore).toBeLessThan(backScore);
      expect(frontScore).toBeLessThan(0); // Should be negative (reward)
    });

    it('rewards tall students at back seats (lower x)', () => {
      baseContext.settings.preferFrontForSmallerStudents = 5;
      baseContext.student = createMockStudent({ id: 's1', height: 'tall' });

      // Back seat (x=100, leftmost)
      baseContext.tableIndex = 0;
      baseContext.seatIndex = 0;
      const backScore = scoreHeightPlacement(baseContext);

      // Front seat (x=300, rightmost)
      baseContext.tableIndex = 2;
      baseContext.seatIndex = 0;
      const frontScore = scoreHeightPlacement(baseContext);

      // Back placement should have more negative score (better)
      expect(backScore).toBeLessThan(frontScore);
      expect(backScore).toBeLessThan(0); // Should be negative (reward)
    });

    it('scales score with weight', () => {
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });
      baseContext.tableIndex = 2; // Front seat

      baseContext.settings.preferFrontForSmallerStudents = 5;
      const score5 = scoreHeightPlacement(baseContext);

      baseContext.settings.preferFrontForSmallerStudents = 10;
      const score10 = scoreHeightPlacement(baseContext);

      // Higher weight should result in stronger (more negative) score
      expect(Math.abs(score10)).toBeGreaterThan(Math.abs(score5));
    });

    it('handles edge case with minX === maxX and minY === maxY', () => {
      baseContext.minX = 100;
      baseContext.maxX = 100;
      baseContext.minY = 100;
      baseContext.maxY = 100;
      baseContext.settings.preferFrontForSmallerStudents = 5;
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });

      const score = scoreHeightPlacement(baseContext);

      // Both axes have no range, so relative position defaults to 0.5
      // Score = -0.5 * 5 * 3 = -7.5
      expect(score).toBe(-7.5);
    });

    it('returns 0 when seat position is not found', () => {
      baseContext.settings.preferFrontForSmallerStudents = 5;
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });
      baseContext.tableIndex = 99; // Invalid table
      baseContext.seatIndex = 99; // Invalid seat

      const score = scoreHeightPlacement(baseContext);

      expect(score).toBe(0);
    });

    it('produces consistent negative scores for optimal placements', () => {
      const weight = 5;
      baseContext.settings.preferFrontForSmallerStudents = weight;

      // Small student at front (x=300, relativePosition=1.0)
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });
      baseContext.tableIndex = 2;
      const smallAtFront = scoreHeightPlacement(baseContext);

      // Tall student at back (x=100, relativePosition=0.0)
      baseContext.student = createMockStudent({ id: 's2', height: 'tall' });
      baseContext.tableIndex = 0;
      const tallAtBack = scoreHeightPlacement(baseContext);

      // Both should be negative (rewarded), but not necessarily equal
      // Small at front: -1.0 * weight = -5
      // Tall at back: -1.0 * weight = -5
      expect(smallAtFront).toBeLessThan(0);
      expect(tallAtBack).toBeLessThan(0);

      // Small at front should be most negative for small students
      baseContext.student = createMockStudent({ id: 's1', height: 'small' });
      baseContext.tableIndex = 0; // Back position
      const smallAtBack = scoreHeightPlacement(baseContext);
      expect(smallAtFront).toBeLessThan(smallAtBack);

      // Tall at back should be most negative for tall students
      baseContext.student = createMockStudent({ id: 's2', height: 'tall' });
      baseContext.tableIndex = 2; // Front position
      const tallAtFront = scoreHeightPlacement(baseContext);
      expect(tallAtBack).toBeLessThan(tallAtFront);
    });
  });
});
