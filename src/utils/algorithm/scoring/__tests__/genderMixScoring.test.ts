// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import {
  scoreLocalGenderMix,
  scoreGlobalGenderMix,
  scoreCrossTableGenderAdjacency,
  scoreGenderMix,
} from '../genderMixScoring';
import type { ScoringContext } from '../scoringContext';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import {
  getSeatNeighborhoods,
  getSeatPositions,
} from '@/utils/math/seatGeometry';
import { emptyCounts } from '../scoringHelpers';
import { DEFAULT_NEIGHBOR_WEIGHTS } from '@/utils';

describe('genderMixScoring', () => {
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
      student: createMockStudent({ id: 's1', name: 'Test', gender: 'boy' }),
      tableIndex: 0,
      seatIndex: 0,
      arrangement: [
        [null, null],
        [null, null],
      ],
      settings: { preferGenderMix: 5 },
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

  describe('scoreLocalGenderMix', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.preferGenderMix = 0;
      const score = scoreLocalGenderMix(baseContext);
      expect(score).toBe(0);
    });

    it('rewards placing student that improves gender balance', () => {
      // Table has 2 girls, adding a boy improves balance
      baseContext.arrangement[0] = [
        createMockStudent({ id: 'g1', gender: 'girl' }),
        null,
      ];
      baseContext.student = createMockStudent({ id: 'b1', gender: 'boy' });
      baseContext.seatIndex = 1;

      const score = scoreLocalGenderMix(baseContext);
      expect(score).toBeLessThan(0); // Negative = reward
    });

    it('returns 0 when gender balance stays same', () => {
      // Empty table, any placement has same balance
      const score = scoreLocalGenderMix(baseContext);
      expect(score).toBe(0);
    });

    it('does not penalize worsening local balance', () => {
      // Table has 1 boy, adding another boy worsens balance
      baseContext.arrangement[0] = [
        createMockStudent({ id: 'b1', gender: 'boy' }),
        null,
      ];
      baseContext.student = createMockStudent({ id: 'b2', gender: 'boy' });
      baseContext.seatIndex = 1;

      const score = scoreLocalGenderMix(baseContext);
      expect(score).toBe(0); // Only rewards, doesn't penalize locally
    });
  });

  describe('scoreGlobalGenderMix', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.preferGenderMix = 0;
      const score = scoreGlobalGenderMix(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes placement that worsens global balance', () => {
      // Global: 2 boys, 0 girls - adding boy worsens imbalance
      baseContext.globalCounts = { boy: 2, girl: 0, diverse: 0 };
      baseContext.student = createMockStudent({ id: 'b3', gender: 'boy' });

      const score = scoreGlobalGenderMix(baseContext);
      expect(score).toBeGreaterThan(0); // Positive = penalty
    });

    it('rewards placement that improves global balance', () => {
      // Global: 2 boys, 0 girls - adding girl improves balance
      baseContext.globalCounts = { boy: 2, girl: 0, diverse: 0 };
      baseContext.student = createMockStudent({ id: 'g1', gender: 'girl' });

      const score = scoreGlobalGenderMix(baseContext);
      expect(score).toBeLessThan(0); // Negative = reward
    });

    it('penalizes worsening global balance from balanced state', () => {
      // Balanced start: 2 boys, 2 girls - adding boy worsens balance (creates imbalance)
      baseContext.globalCounts = { boy: 2, girl: 2, diverse: 0 };
      baseContext.student = createMockStudent({ id: 'b3', gender: 'boy' });

      const score = scoreGlobalGenderMix(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty for worsening balance
    });
  });

  describe('scoreCrossTableGenderAdjacency', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.preferGenderMix = 0;
      const score = scoreCrossTableGenderAdjacency(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes same-gender neighbors at adjacent tables', () => {
      // Place a boy at table 0, seat 0
      // Place another boy at adjacent seat (table 1, seat 0)
      baseContext.arrangement[1]![0] = createMockStudent({
        id: 'b2',
        gender: 'boy',
      });
      baseContext.student = createMockStudent({ id: 'b1', gender: 'boy' });

      const score = scoreCrossTableGenderAdjacency(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty for same gender
    });

    it('returns 0 when neighbors are different gender', () => {
      // Place a boy at table 0, seat 0
      // Place a girl at adjacent seat (table 1, seat 0)
      baseContext.arrangement[1]![0] = createMockStudent({
        id: 'g1',
        gender: 'girl',
      });
      baseContext.student = createMockStudent({ id: 'b1', gender: 'boy' });

      const score = scoreCrossTableGenderAdjacency(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when no adjacent neighbors exist', () => {
      // Empty classroom except target seat
      const score = scoreCrossTableGenderAdjacency(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('scoreGenderMix (combined)', () => {
    it('combines all gender mixing scores', () => {
      // Setup: Table has 1 girl, global has 2 girls
      baseContext.arrangement[0] = [
        createMockStudent({ id: 'g1', gender: 'girl' }),
        null,
      ];
      baseContext.globalCounts = { boy: 0, girl: 2, diverse: 0 };
      baseContext.student = createMockStudent({ id: 'b1', gender: 'boy' });
      baseContext.seatIndex = 1;

      const totalScore = scoreGenderMix(baseContext);

      // Should reward local balance improvement (boy + girl = balanced)
      // Should reward global balance improvement (adds boy to girl-heavy classroom)
      expect(totalScore).toBeLessThan(0); // Overall reward
    });

    it('returns 0 when preferGenderMix is disabled', () => {
      baseContext.settings.preferGenderMix = 0;

      const score = scoreGenderMix(baseContext);
      expect(score).toBe(0);
    });

    it('applies weight correctly to all components', () => {
      baseContext.settings.preferGenderMix = 10;
      baseContext.arrangement[0] = [
        createMockStudent({ id: 'g1', gender: 'girl' }),
        null,
      ];
      baseContext.globalCounts = { boy: 0, girl: 2, diverse: 0 }; // Imbalanced global state
      baseContext.student = createMockStudent({ id: 'b1', gender: 'boy' });
      baseContext.seatIndex = 1;

      const score = scoreGenderMix(baseContext);

      // With weight=10, should reward both local improvement and global improvement
      expect(score).toBeLessThan(0); // Overall reward
      expect(Math.abs(score)).toBeGreaterThanOrEqual(10);
    });
  });
});
