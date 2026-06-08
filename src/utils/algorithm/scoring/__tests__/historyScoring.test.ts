// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import { scorePreviousPairs, scoreHistory } from '../historyScoring';
import type { ScoringContext } from '../scoringContext';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import {
  getSeatNeighborhoods,
  getSeatPositions,
} from '@/utils/math/seatGeometry';
import { emptyCounts } from '../scoringHelpers';
import { DEFAULT_NEIGHBOR_WEIGHTS } from '@/utils';

describe('historyScoring', () => {
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
      student: createMockStudent({ id: 's1', name: 'Alice' }),
      tableIndex: 0,
      seatIndex: 0,
      arrangement: [
        [null, null],
        [null, null],
      ],
      settings: { avoidPreviousPairs: 10 },
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

  describe('scorePreviousPairs', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.avoidPreviousPairs = 0;
      baseContext.previousPairs.set('s1::s2', 1);

      const score = scorePreviousPairs(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when no previous pairs exist', () => {
      baseContext.previousPairs = new Map();

      const score = scorePreviousPairs(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when table is empty', () => {
      baseContext.previousPairs.set('s1::s2', 1);
      baseContext.arrangement[0] = [null, null];

      const score = scorePreviousPairs(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes placing with previous partner', () => {
      const studentB = createMockStudent({ id: 's2', name: 'Bob' });
      baseContext.arrangement[0]![0] = studentB;
      baseContext.student = createMockStudent({ id: 's1', name: 'Alice' });
      baseContext.previousPairs.set('s1::s2', 1);
      baseContext.seatIndex = 1;

      const score = scorePreviousPairs(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty
      expect(score).toBe(10); // Weight value
    });

    it('handles multiple previous partners at same table', () => {
      const studentB = createMockStudent({ id: 's2', name: 'Bob' });
      const studentC = createMockStudent({ id: 's3', name: 'Charlie' });
      baseContext.arrangement[0] = [studentB, studentC];
      baseContext.student = createMockStudent({ id: 's1', name: 'Alice' });
      baseContext.previousPairs.set('s1::s2', 1);
      baseContext.previousPairs.set('s1::s3', 1);
      baseContext.seatIndex = 0;

      const score = scorePreviousPairs(baseContext);
      expect(score).toBe(20); // 2 previous partners * weight
    });

    it('does not penalize wish partners even if previously paired', () => {
      const studentB = createMockStudent({ id: 's2', name: 'Bob' });
      baseContext.arrangement[0]![0] = studentB;
      baseContext.student = createMockStudent({
        id: 's1',
        name: 'Alice',
        wishPartnerId: 's2',
      });
      baseContext.previousPairs.set('s1::s2', 1);
      baseContext.settings.considerWishPartners = 5;
      baseContext.seatIndex = 1;

      const score = scorePreviousPairs(baseContext);
      expect(score).toBe(0); // No penalty for wish partners
    });

    it('uses sorted pair key to match history', () => {
      const studentB = createMockStudent({ id: 's2', name: 'Bob' });
      baseContext.arrangement[0]![0] = studentB;
      baseContext.student = createMockStudent({ id: 's1', name: 'Alice' });

      // Add pair with sorted key (s1 < s2 alphabetically)
      baseContext.previousPairs.set('s1::s2', 1); // Sorted order
      baseContext.seatIndex = 1;

      const score = scorePreviousPairs(baseContext);
      expect(score).toBeGreaterThan(0); // Should match
    });

    it('returns 0 when students have not been paired before', () => {
      const studentB = createMockStudent({ id: 's2', name: 'Bob' });
      baseContext.arrangement[0]![0] = studentB;
      baseContext.student = createMockStudent({ id: 's1', name: 'Alice' });
      baseContext.previousPairs.set('s3::s4', 1); // Different pair
      baseContext.seatIndex = 1;

      const score = scorePreviousPairs(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('scoreHistory (combined)', () => {
    it('returns scorePreviousPairs result', () => {
      const studentB = createMockStudent({ id: 's2', name: 'Bob' });
      baseContext.arrangement[0]![0] = studentB;
      baseContext.student = createMockStudent({ id: 's1', name: 'Alice' });
      baseContext.previousPairs.set('s1::s2', 1);
      baseContext.seatIndex = 1;

      const historyScore = scoreHistory(baseContext);
      const previousPairsScore = scorePreviousPairs(baseContext);

      expect(historyScore).toBe(previousPairsScore);
    });

    it('returns 0 when avoidPreviousPairs is disabled', () => {
      baseContext.settings.avoidPreviousPairs = 0;
      baseContext.previousPairs.set('s1::s2', 1);

      const score = scoreHistory(baseContext);
      expect(score).toBe(0);
    });
  });
});
