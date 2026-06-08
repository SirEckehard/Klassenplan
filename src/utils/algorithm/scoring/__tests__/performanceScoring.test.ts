// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import {
  scorePeerTutoring,
  scoreHomogeneousGroups,
  scorePerformance,
} from '../performanceScoring';
import type { ScoringContext } from '../scoringContext';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import {
  getSeatNeighborhoods,
  getSeatPositions,
} from '@/utils/math/seatGeometry';
import { emptyCounts } from '../scoringHelpers';
import { DEFAULT_NEIGHBOR_WEIGHTS } from '@/utils';

describe('performanceScoring', () => {
  let baseContext: ScoringContext;

  beforeEach(() => {
    const scene = createMockClassroomScene(2, {
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
      ],
      totalStudents: 4,
    });

    baseContext = {
      student: createMockStudent({ id: 's1', name: 'Test' }),
      tableIndex: 0,
      seatIndex: 0,
      arrangement: [
        [null, null],
        [null, null],
      ],
      settings: {},
      scene,
      seatCounts: [2, 2],
      targets: [2, 2],
      seatNeighborhoods: getSeatNeighborhoods(scene),
      seatPositions: getSeatPositions(scene),
      minX: 100,
      maxX: 200,
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

  describe('scorePeerTutoring', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.peerTutoring = 0;
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });

      const score = scorePeerTutoring(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when partner seat is empty', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });

      const score = scorePeerTutoring(baseContext);
      expect(score).toBe(0);
    });

    it('rewards strong-weak pairing', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceWeak: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePeerTutoring(baseContext);
      expect(score).toBeLessThan(0); // Negative = reward
      expect(score).toBe(-10);
    });

    it('rewards weak-strong pairing', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceStrong: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceWeak: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePeerTutoring(baseContext);
      expect(score).toBe(-10); // Reward
    });

    it('penalizes strong-strong pairing', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceStrong: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePeerTutoring(baseContext);
      expect(score).toBeGreaterThan(0); // Positive = penalty
      expect(score).toBe(10);
    });

    it('penalizes weak-weak pairing', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceWeak: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceWeak: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePeerTutoring(baseContext);
      expect(score).toBe(10); // Penalty
    });

    it('returns 0 for neutral pairings', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.arrangement[0]![1] = createMockStudent({ id: 's2' }); // Neutral
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePeerTutoring(baseContext);
      expect(score).toBe(0); // No penalty for neutral
    });
  });

  describe('scoreHomogeneousGroups', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.homogeneousPerformanceGroups = 0;
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when partner seat is empty', () => {
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBe(0);
    });

    it('rewards strong-strong pairing', () => {
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceStrong: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBeLessThan(0); // Negative = reward
      expect(score).toBe(-10);
    });

    it('rewards weak-weak pairing', () => {
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceWeak: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceWeak: true,
      });
      baseContext.seatIndex = 0;

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBe(-10); // Reward
    });

    it('penalizes strong-weak pairing', () => {
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceWeak: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBeGreaterThan(0); // Positive = penalty
      expect(score).toBe(10);
    });

    it('penalizes weak-strong pairing', () => {
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceStrong: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceWeak: true,
      });
      baseContext.seatIndex = 0;

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBe(10); // Penalty
    });

    it('returns 0 for neutral pairings', () => {
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({ id: 's2' }); // Neutral
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scoreHomogeneousGroups(baseContext);
      expect(score).toBe(0); // No penalty for neutral
    });
  });

  describe('scorePerformance (combined)', () => {
    it('uses peerTutoring when weight is higher', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.settings.homogeneousPerformanceGroups = 5;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceWeak: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePerformance(baseContext);
      expect(score).toBe(-10); // Peer tutoring reward
    });

    it('uses homogeneousGroups when weight is higher', () => {
      baseContext.settings.peerTutoring = 5;
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceStrong: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePerformance(baseContext);
      expect(score).toBe(-10); // Homogeneous reward
    });

    it('returns 0 when both strategies are disabled', () => {
      baseContext.settings.peerTutoring = 0;
      baseContext.settings.homogeneousPerformanceGroups = 0;

      const score = scorePerformance(baseContext);
      expect(score).toBe(0);
    });

    it('peerTutoring takes precedence when weights are equal', () => {
      baseContext.settings.peerTutoring = 10;
      baseContext.settings.homogeneousPerformanceGroups = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        performanceWeak: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        performanceStrong: true,
      });
      baseContext.seatIndex = 0;

      const score = scorePerformance(baseContext);
      // Peer tutoring rewards high-low pairs
      expect(score).toBe(-10);
    });
  });
});
