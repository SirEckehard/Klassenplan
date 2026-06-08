import { describe, it, expect, beforeEach } from 'vitest';
import {
  scoreAvoidPartners,
  scoreWishPartners,
  scoreLockedWishPartner,
  scorePartners,
} from '../partnerScoring';
import type { ScoringContext } from '../scoringContext';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import {
  getSeatNeighborhoods,
  getSeatPositions,
} from '@/utils/math/seatGeometry';
import { emptyCounts } from '../scoringHelpers';
import { DEFAULT_NEIGHBOR_WEIGHTS } from '@/utils';

describe('partnerScoring', () => {
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

    const studentA = createMockStudent({ id: 'a', name: 'Alice' });
    const studentB = createMockStudent({ id: 'b', name: 'Bob' });
    const studentMap = new Map([
      [studentA.id, studentA],
      [studentB.id, studentB],
    ]);

    baseContext = {
      student: studentA,
      tableIndex: 0,
      seatIndex: 0,
      arrangement: [
        [null, null],
        [null, null],
      ],
      settings: {
        avoidConflictPartners: 10,
        considerWishPartners: 5,
      },
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
      studentById: studentMap,
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

  describe('scoreAvoidPartners', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.avoidConflictPartners = 0;
      baseContext.student = createMockStudent({
        id: 'a',
        avoidPartnerId: 'b',
      });
      const score = scoreAvoidPartners(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student has no avoid partner', () => {
      baseContext.student = createMockStudent({ id: 'a' });
      const score = scoreAvoidPartners(baseContext);
      expect(score).toBe(0);
    });

    it('heavily penalizes placing student with avoid partner', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      baseContext.arrangement[0]![1] = studentB; // Bob at partner seat
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        avoidPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.seatIndex = 0; // Alice's seat (partner to seat 1)

      const score = scoreAvoidPartners(baseContext);
      expect(score).toBe(20); // weight * 2 = 10 * 2
    });

    it('applies neighbor penalty when avoid partner at adjacent table', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      baseContext.arrangement[1]![0] = studentB; // Bob at different but adjacent table
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        avoidPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.tableIndex = 0;

      const score = scoreAvoidPartners(baseContext);
      // Base reward for different table: -10 * 0.3 = -3
      // Plus neighbor penalty (adjacent tables are detected as neighbors)
      // Total score should be positive due to neighbor penalty outweighing table reward
      expect(score).toBeGreaterThan(0);
    });

    it('penalizes placing at same table but not as partner', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      // For 4-seat table, seats 0-1 are partners, seats 2-3 are partners
      // Place Bob at seat 0, Alice at seat 2 (different pairs, same table)
      baseContext.seatCounts = [4, 2]; // Make first table 4 seats
      baseContext.arrangement[0] = [studentB, null, null, null];
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        avoidPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.seatIndex = 2; // Not a partner to seat 0

      const score = scoreAvoidPartners(baseContext);
      expect(score).toBe(8); // weight * 0.8 = 10 * 0.8
    });

    it('returns 0 when avoid partner does not exist in classroom', () => {
      baseContext.student = createMockStudent({
        id: 'a',
        avoidPartnerId: 'nonexistent',
      });

      const score = scoreAvoidPartners(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('scoreWishPartners', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.considerWishPartners = 0;
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'b',
      });
      const score = scoreWishPartners(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student has no wish partner', () => {
      baseContext.student = createMockStudent({ id: 'a' });
      const score = scoreWishPartners(baseContext);
      expect(score).toBe(0);
    });

    it('rewards placing student with wish partner', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      baseContext.arrangement[0]![1] = studentB; // Bob at partner seat
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.seatIndex = 0;

      const score = scoreWishPartners(baseContext);
      expect(score).toBe(-5); // -weight = -5
    });

    it('penalizes when partner seat occupied by someone else', () => {
      const studentC = createMockStudent({ id: 'c', name: 'Charlie' });
      baseContext.arrangement[0]![1] = studentC; // Charlie at partner seat
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      baseContext.seatIndex = 0;

      const score = scoreWishPartners(baseContext);
      expect(score).toBe(2.5); // weight * 0.5 = 5 * 0.5 (reduced penalty when seat occupied)
    });

    it('handles conflict when wish partner wants to avoid student', () => {
      const studentB = createMockStudent({
        id: 'b',
        name: 'Bob',
        avoidPartnerId: 'a',
      });
      baseContext.arrangement[0]![1] = studentB;
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.seatIndex = 0;

      const score = scoreWishPartners(baseContext);
      expect(score).toBe(10); // avoidConflictPartners weight (avoid wins)
    });

    it('rewards neighbor wish partner when partner seat is empty', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      baseContext.arrangement[1]![0] = studentB; // Bob at adjacent neighbor table
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.arrangement[0]![1] = null; // No direct partner

      const score = scoreWishPartners(baseContext);
      // Should reward due to neighbor wish partner at adjacent table
      expect(score).toBeLessThan(0);
    });

    it('returns 0 when partner seat empty and no neighbor match', () => {
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'nonexistent', // Wish partner doesn't exist or sit nearby
      });
      baseContext.arrangement[0]![1] = null; // Partner seat empty

      const score = scoreWishPartners(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('Single Table Neighbor Scoring', () => {
    let singleTableContext: ScoringContext;

    beforeEach(() => {
      // Create a scene with adjacent single tables
      const singleScene = createMockClassroomScene(3, {
        tables: [
          {
            x: 100,
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 160, // Adjacent to first table
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
          {
            x: 500, // Far away - not a neighbor
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 2,
            locked: false,
          },
        ],
        totalStudents: 3,
      });

      singleTableContext = {
        ...baseContext,
        scene: singleScene,
        seatCounts: [1, 1, 1],
        targets: [1, 1, 1],
        arrangement: [[null], [null], [null]],
        seatNeighborhoods: getSeatNeighborhoods(singleScene),
        seatPositions: getSeatPositions(singleScene),
      };
    });

    it('rewards wish partner at adjacent single table', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      singleTableContext.arrangement[1]![0] = studentB; // Bob at adjacent single table
      singleTableContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      singleTableContext.studentById.set('b', studentB);
      singleTableContext.tableIndex = 0;
      singleTableContext.seatIndex = 0;

      const score = scoreWishPartners(singleTableContext);
      // Should reward due to neighbor wish partner
      expect(score).toBeLessThan(0);
    });

    it('does not reward wish partner at distant single table', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      singleTableContext.arrangement[2]![0] = studentB; // Bob at far single table
      singleTableContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      singleTableContext.studentById.set('b', studentB);
      singleTableContext.tableIndex = 0;
      singleTableContext.seatIndex = 0;

      const score = scoreWishPartners(singleTableContext);
      // No reward - too far to be neighbors
      expect(score).toBe(0);
    });

    it('penalizes avoid partner at adjacent single table', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      singleTableContext.arrangement[1]![0] = studentB; // Bob at adjacent single table
      singleTableContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        avoidPartnerId: 'b',
      });
      singleTableContext.studentById.set('b', studentB);
      singleTableContext.tableIndex = 0;
      singleTableContext.seatIndex = 0;

      const score = scoreAvoidPartners(singleTableContext);
      // Should penalize (positive score) for neighbor avoid partner
      expect(score).toBeGreaterThan(0);
    });

    it('rewards placing avoid partner at distant single table', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      singleTableContext.arrangement[2]![0] = studentB; // Bob at far single table
      singleTableContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        avoidPartnerId: 'b',
      });
      singleTableContext.studentById.set('b', studentB);
      singleTableContext.tableIndex = 0;
      singleTableContext.seatIndex = 0;

      const score = scoreAvoidPartners(singleTableContext);
      // Should reward (negative score) - far away from avoided partner
      expect(score).toBeLessThan(0);
    });
  });

  describe('scoreLockedWishPartner', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.considerWishPartners = 0;
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'b',
      });
      const score = scoreLockedWishPartner(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student has no wish partner', () => {
      const score = scoreLockedWishPartner(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when wish partner is not locked', () => {
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'b',
      });
      const score = scoreLockedWishPartner(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when partner seat is occupied', () => {
      baseContext.arrangement[0]![1] = createMockStudent({ id: 'c' });
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'b',
      });
      baseContext.validLockedIds.add('b');
      baseContext.lockedPositions['b'] = { table: 0, seat: 0 };

      const score = scoreLockedWishPartner(baseContext);
      expect(score).toBe(0); // Only applies when partner seat is empty
    });

    it('rewards placing at same table as locked wish partner', () => {
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'b',
      });
      baseContext.validLockedIds.add('b');
      baseContext.lockedPositions['b'] = { table: 0, seat: 0 };
      baseContext.tableIndex = 0;

      const score = scoreLockedWishPartner(baseContext);
      expect(score).toBe(-2.5); // -weight * 0.5 = -5 * 0.5
    });

    it('penalizes placing at different table than locked wish partner', () => {
      baseContext.student = createMockStudent({
        id: 'a',
        wishPartnerId: 'b',
      });
      baseContext.validLockedIds.add('b');
      baseContext.lockedPositions['b'] = { table: 1, seat: 0 }; // Different table
      baseContext.tableIndex = 0;

      const score = scoreLockedWishPartner(baseContext);
      expect(score).toBe(1.5); // weight * 0.3 = 5 * 0.3 (penalty for first wish partner at different table)
    });
  });

  describe('scorePartners (combined)', () => {
    it('combines all partner scoring components', () => {
      const studentB = createMockStudent({ id: 'b', name: 'Bob' });
      baseContext.arrangement[0]![1] = studentB;
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.seatIndex = 0;

      const score = scorePartners(baseContext);

      // Should reward wish partner fulfillment
      expect(score).toBeLessThan(0);
    });

    it('avoid partner penalty overrides wish partner reward', () => {
      const studentB = createMockStudent({
        id: 'b',
        name: 'Bob',
        avoidPartnerId: 'a',
      });
      baseContext.arrangement[0]![1] = studentB;
      baseContext.student = createMockStudent({
        id: 'a',
        name: 'Alice',
        wishPartnerId: 'b',
      });
      baseContext.studentById.set('b', studentB);
      baseContext.seatIndex = 0;

      const score = scorePartners(baseContext);

      // Conflict: avoid should win, resulting in penalty
      expect(score).toBeGreaterThan(0);
    });

    it('returns 0 when all partner settings are disabled', () => {
      baseContext.settings.avoidConflictPartners = 0;
      baseContext.settings.considerWishPartners = 0;

      const score = scorePartners(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('Neighbor Detection for Single Tables', () => {
    it('detects neighbors between adjacent single tables', () => {
      const singleScene = createMockClassroomScene(4, {
        tables: [
          {
            x: 100,
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 160,
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
          {
            x: 220,
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 2,
            locked: false,
          },
          {
            x: 280,
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 3,
            locked: false,
          },
        ],
        totalStudents: 4,
      });

      const neighborhoods = getSeatNeighborhoods(singleScene);

      // All adjacent single tables should be detected as neighbors
      const seat0Neighbors = neighborhoods.get('0-0') ?? [];
      expect(seat0Neighbors.length).toBeGreaterThan(0);

      // Seat 0-0 should have seat 1-0 as a neighbor (adjacent table)
      const hasAdjacentNeighbor = seat0Neighbors.some(
        (n) => n.tableIndex === 1 && n.seatIndex === 0,
      );
      expect(hasAdjacentNeighbor).toBe(true);
    });
  });
});
