import { describe, expect, test } from 'vitest';
import { scoreEnvironment } from '../environmentScoring';
import type { ScoringContext } from '../scoringContext';

const createContext = (overrides: Partial<ScoringContext>): ScoringContext => ({
  student: {
    id: 's-1',
    name: 'Test',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    prefersWindow: false,
    prefersDoor: false,
  },
  tableIndex: 0,
  seatIndex: 0,
  arrangement: [[]],
  settings: {
    avoidPreviousPairs: 0,
    avoidRestlessTogether: 0,
    avoidConcentrationTogether: 0,
    avoidConcentrationNearRestless: 0,
    avoidShyAlone: 0,
    preferGenderMix: 0,
    considerWishPartners: 0,
    avoidConflictPartners: 0,
    peerTutoring: 0,
    homogeneousPerformanceGroups: 0,
    preferFrontForNeedsFrontSeat: 0,
    preferFrontForSmallerStudents: 0,
    preferWindowSeats: 0,
    preferDoorSeats: 0,
    neighborWeights: {
      behavioral: { direct: 1, side: 1, front: 1, back: 1 },
      gender: { direct: 1, side: 1, front: 1, back: 1 },
    },
  },
  scene: {
    tables: [],
    totalStudents: 0,
    features: [],
  },
  seatCounts: [0],
  targets: [0],
  seatNeighborhoods: new Map(),
  seatPositions: new Map(),
  minX: 0,
  maxX: 0,
  frontIsHighX: true, // Default: right = front
  frontIsHighY: false,
  dominantAxis: 'x',
  minY: 100,
  maxY: 300,
  globalCounts: { boy: 0, girl: 0, diverse: 0 },
  studentById: new Map(),
  validLockedIds: new Set(),
  previousPairs: new Map(),
  lockedPositions: {},
  behavioralNeighborWeights: { direct: 1, side: 1, front: 1, back: 1 },
  genderNeighborWeights: { direct: 1, side: 1, front: 1, back: 1 },
  featureDistances: {
    window: new Map(),
    door: new Map(),
  },
  maxWindowDistance: 1,
  maxDoorDistance: 1,
  ...overrides,
});

describe('scoreEnvironment', () => {
  test('penalizes distance from preferred window seats', () => {
    const context = createContext({
      student: {
        id: 's-1',
        name: 'Window Lover',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        prefersWindow: true,
        prefersDoor: false,
      },
      settings: {
        avoidPreviousPairs: 0,
        avoidRestlessTogether: 0,
        avoidConcentrationTogether: 0,
        avoidConcentrationNearRestless: 0,
        avoidShyAlone: 0,
        preferGenderMix: 0,
        considerWishPartners: 0,
        avoidConflictPartners: 0,
        peerTutoring: 0,
        homogeneousPerformanceGroups: 0,
        preferFrontForNeedsFrontSeat: 0,
        preferFrontForSmallerStudents: 0,
        preferWindowSeats: 5,
        preferDoorSeats: 0,
        neighborWeights: {
          behavioral: { direct: 1, side: 1, front: 1, back: 1 },
          gender: { direct: 1, side: 1, front: 1, back: 1 },
        },
      },
      featureDistances: {
        window: new Map([['0-0', 10]]),
        door: new Map([['0-0', Number.POSITIVE_INFINITY]]),
      },
      maxWindowDistance: 100,
      maxDoorDistance: 100,
    });

    expect(scoreEnvironment(context)).toBeCloseTo(0.5, 4);
  });

  test('returns zero when no relevant preference is set', () => {
    const context = createContext({
      featureDistances: {
        window: new Map([['0-0', 30]]),
        door: new Map([['0-0', 40]]),
      },
      maxWindowDistance: 100,
      maxDoorDistance: 100,
    });

    expect(scoreEnvironment(context)).toBe(0);
  });

  test('penalizes distance from preferred door seats', () => {
    const context = createContext({
      student: {
        id: 's-2',
        name: 'Door Fan',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        prefersWindow: false,
        prefersDoor: true,
      },
      settings: {
        avoidPreviousPairs: 0,
        avoidRestlessTogether: 0,
        avoidConcentrationTogether: 0,
        avoidConcentrationNearRestless: 0,
        avoidShyAlone: 0,
        preferGenderMix: 0,
        considerWishPartners: 0,
        avoidConflictPartners: 0,
        peerTutoring: 0,
        homogeneousPerformanceGroups: 0,
        preferFrontForNeedsFrontSeat: 0,
        preferFrontForSmallerStudents: 0,
        preferWindowSeats: 0,
        preferDoorSeats: 4,
        neighborWeights: {
          behavioral: { direct: 1, side: 1, front: 1, back: 1 },
          gender: { direct: 1, side: 1, front: 1, back: 1 },
        },
      },
      featureDistances: {
        window: new Map([['0-0', Number.POSITIVE_INFINITY]]),
        door: new Map([['0-0', 20]]),
      },
      maxDoorDistance: 80,
      maxWindowDistance: 80,
    });

    expect(scoreEnvironment(context)).toBeCloseTo(1, 4);
  });
});
