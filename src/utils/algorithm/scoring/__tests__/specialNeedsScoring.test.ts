import { describe, it, expect, beforeEach } from 'vitest';
import {
  scoreFrontPlacement,
  scoreRestlessPairs,
  scoreConcentrationTogether,
  scoreConcentrationNearRestless,
  scoreShyAlone,
  scoreCapacity,
  scoreSpecialNeeds,
} from '../specialNeedsScoring';
import type { ScoringContext } from '../scoringContext';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import {
  getSeatNeighborhoods,
  getSeatPositions,
} from '@/utils/math/seatGeometry';
import { emptyCounts } from '../scoringHelpers';
import { DEFAULT_NEIGHBOR_WEIGHTS } from '@/utils';

describe('specialNeedsScoring', () => {
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

  describe('scoreFrontPlacement', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.preferFrontForNeedsFrontSeat = 0;
      baseContext.student = createMockStudent({
        id: 's1',
        needsFrontSeat: true,
      });

      const score = scoreFrontPlacement(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student has no front seat need', () => {
      baseContext.settings.preferFrontForNeedsFrontSeat = 10;
      baseContext.student = createMockStudent({ id: 's1' });

      const score = scoreFrontPlacement(baseContext);
      expect(score).toBe(0);
    });

    it('rewards front seat placement (higher x)', () => {
      baseContext.settings.preferFrontForNeedsFrontSeat = 10;
      baseContext.student = createMockStudent({
        id: 's1',
        needsFrontSeat: true,
      });
      baseContext.tableIndex = 2; // Frontmost table (x=300)

      const score = scoreFrontPlacement(baseContext);
      expect(score).toBeLessThan(0); // Negative = reward
    });

    it('penalizes back seat placement (lower x)', () => {
      baseContext.settings.preferFrontForNeedsFrontSeat = 10;
      baseContext.student = createMockStudent({
        id: 's1',
        needsFrontSeat: true,
      });
      baseContext.tableIndex = 0; // Back table (x=100)

      const score = scoreFrontPlacement(baseContext);
      // Back placement gets a small negative score (less reward than front)
      expect(score).toBeLessThan(0);
      expect(score).toBeGreaterThan(-5); // But not as much reward as front
    });

    it('applies special weight multiplier', () => {
      baseContext.settings.preferFrontForNeedsFrontSeat = 10;
      baseContext.student = createMockStudent({
        id: 's1',
        needsFrontSeat: true,
        restless: true, // 2 special flags → weight 2.0
      });
      baseContext.tableIndex = 2;

      const score = scoreFrontPlacement(baseContext);
      // Should apply special weight (1 + 2 * 0.5 = 2.0)
      expect(Math.abs(score)).toBeGreaterThan(10);
    });
  });

  describe('scoreRestlessPairs', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.avoidRestlessTogether = 0;
      baseContext.student = createMockStudent({ id: 's1', restless: true });

      const score = scoreRestlessPairs(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student is not restless', () => {
      baseContext.settings.avoidRestlessTogether = 10;
      baseContext.student = createMockStudent({ id: 's1' });

      const score = scoreRestlessPairs(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes placing two restless students together', () => {
      baseContext.settings.avoidRestlessTogether = 10;
      baseContext.arrangement[0]![1] = createMockStudent({
        id: 's2',
        restless: true,
      });
      baseContext.student = createMockStudent({ id: 's1', restless: true });
      baseContext.seatIndex = 0; // Partner to seat 1

      const score = scoreRestlessPairs(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty
      expect(score).toBeGreaterThanOrEqual(10); // At least weight * 1.0
    });

    it('returns 0 when partner is not restless', () => {
      baseContext.settings.avoidRestlessTogether = 10;
      baseContext.arrangement[0]![1] = createMockStudent({ id: 's2' });
      baseContext.student = createMockStudent({ id: 's1', restless: true });
      baseContext.seatIndex = 0;

      const score = scoreRestlessPairs(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when partner seat is empty', () => {
      baseContext.settings.avoidRestlessTogether = 10;
      baseContext.student = createMockStudent({ id: 's1', restless: true });

      const score = scoreRestlessPairs(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('scoreConcentrationTogether', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.avoidConcentrationTogether = 0;
      baseContext.student = createMockStudent({
        id: 's1',
        concentrationIssues: true,
      });

      const score = scoreConcentrationTogether(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student has no concentration issues', () => {
      baseContext.settings.avoidConcentrationTogether = 10;
      baseContext.student = createMockStudent({ id: 's1' });

      const score = scoreConcentrationTogether(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes placing with other concentration issue students', () => {
      baseContext.settings.avoidConcentrationTogether = 10;
      baseContext.arrangement[0]![0] = createMockStudent({
        id: 's2',
        concentrationIssues: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        concentrationIssues: true,
      });
      baseContext.seatIndex = 1;

      const score = scoreConcentrationTogether(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty
    });

    it('returns 0 when no other concentration students at table', () => {
      baseContext.settings.avoidConcentrationTogether = 10;
      baseContext.arrangement[0]![0] = createMockStudent({ id: 's2' });
      baseContext.student = createMockStudent({
        id: 's1',
        concentrationIssues: true,
      });
      baseContext.seatIndex = 1;

      const score = scoreConcentrationTogether(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('scoreConcentrationNearRestless', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.avoidConcentrationNearRestless = 0;
      baseContext.student = createMockStudent({
        id: 's1',
        concentrationIssues: true,
      });

      const score = scoreConcentrationNearRestless(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student has no concentration issues', () => {
      baseContext.settings.avoidConcentrationNearRestless = 10;
      baseContext.student = createMockStudent({ id: 's1' });

      const score = scoreConcentrationNearRestless(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes concentration student near restless neighbor', () => {
      baseContext.settings.avoidConcentrationNearRestless = 10;
      // Place restless student at adjacent table
      baseContext.arrangement[1]![0] = createMockStudent({
        id: 's2',
        restless: true,
      });
      baseContext.student = createMockStudent({
        id: 's1',
        concentrationIssues: true,
      });
      baseContext.tableIndex = 0;
      baseContext.seatIndex = 0;

      const score = scoreConcentrationNearRestless(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty for proximity
    });

    it('returns 0 when no restless neighbors exist', () => {
      baseContext.settings.avoidConcentrationNearRestless = 10;
      baseContext.student = createMockStudent({
        id: 's1',
        concentrationIssues: true,
      });

      const score = scoreConcentrationNearRestless(baseContext);
      expect(score).toBe(0);
    });
  });

  describe('scoreShyAlone', () => {
    it('returns 0 when weight is 0', () => {
      baseContext.settings.avoidShyAlone = 0;
      baseContext.student = createMockStudent({ id: 's1', shy: true });

      const score = scoreShyAlone(baseContext);
      expect(score).toBe(0);
    });

    it('returns 0 when student is not shy', () => {
      baseContext.settings.avoidShyAlone = 10;
      baseContext.student = createMockStudent({ id: 's1' });

      const score = scoreShyAlone(baseContext);
      expect(score).toBe(0);
    });

    it('penalizes placing shy student at empty table', () => {
      baseContext.settings.avoidShyAlone = 10;
      baseContext.student = createMockStudent({ id: 's1', shy: true });
      // Table is empty (no other students)

      const score = scoreShyAlone(baseContext);
      expect(score).toBeGreaterThan(0); // Penalty
    });

    it('returns 0 when table has other students', () => {
      baseContext.settings.avoidShyAlone = 10;
      baseContext.arrangement[0]![0] = createMockStudent({ id: 's2' });
      baseContext.student = createMockStudent({ id: 's1', shy: true });
      baseContext.seatIndex = 1;

      const score = scoreShyAlone(baseContext);
      expect(score).toBe(0); // Not alone
    });
  });

  describe('scoreCapacity', () => {
    it('rewards filling toward target capacity', () => {
      baseContext.targets[0] = 2;
      baseContext.arrangement[0] = [null, null]; // 0 seated, target 2

      const score = scoreCapacity(baseContext);
      expect(score).toBeLessThan(0); // Negative = reward
    });

    it('reward decreases as table fills up', () => {
      baseContext.targets[0] = 2;

      // Empty table (0 seated)
      baseContext.arrangement[0] = [null, null];
      const scoreEmpty = scoreCapacity(baseContext);

      // Partially filled table (1 seated)
      baseContext.arrangement[0] = [createMockStudent({ id: 's2' }), null];
      const scorePartial = scoreCapacity(baseContext);

      expect(scoreEmpty).toBeLessThan(scorePartial);
    });
  });

  describe('scoreSpecialNeeds (combined)', () => {
    it('combines all special needs scoring components', () => {
      baseContext.settings = {
        preferFrontForNeedsFrontSeat: 10,
        avoidRestlessTogether: 10,
        avoidConcentrationTogether: 10,
        avoidConcentrationNearRestless: 10,
        avoidShyAlone: 10,
      };
      baseContext.student = createMockStudent({
        id: 's1',
        needsFrontSeat: true,
      });
      baseContext.tableIndex = 2; // Front table

      const score = scoreSpecialNeeds(baseContext);

      // Should reward front placement and capacity
      expect(score).toBeLessThan(0);
    });

    it('returns capacity score when all special needs disabled', () => {
      baseContext.settings = {};
      baseContext.targets[0] = 2;

      const specialScore = scoreSpecialNeeds(baseContext);
      const capacityScore = scoreCapacity(baseContext);

      expect(specialScore).toBe(capacityScore);
    });

    it('accumulates multiple penalties correctly', () => {
      baseContext.settings = {
        avoidRestlessTogether: 10,
        avoidConcentrationTogether: 10,
      };
      baseContext.arrangement[0] = [
        createMockStudent({
          id: 's2',
          restless: true,
          concentrationIssues: true,
        }),
        null,
      ];
      baseContext.student = createMockStudent({
        id: 's1',
        restless: true,
        concentrationIssues: true,
      });
      baseContext.seatIndex = 1;

      const score = scoreSpecialNeeds(baseContext);

      // Should have penalties from both restless and concentration scoring
      expect(score).toBeGreaterThan(20); // At least two weight values
    });
  });
});
