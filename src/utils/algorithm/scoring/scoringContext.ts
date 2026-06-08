// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  Student,
  SeatingArrangement,
  MixSettings,
  ClassroomScene,
  NeighborWeightConfig,
} from '@/types';
import type { PreviousPairWeights } from '@/utils/pairs';
import type { SeatNeighborhoodMap } from '@/utils/math/seatGeometry';
import type { GenderCounts } from '../genderBalance';

/**
 * Context data provided to all scoring strategies.
 * Contains all information needed to evaluate a seat placement.
 */
export interface ScoringContext {
  // Student being placed
  student: Student;

  // Target position
  tableIndex: number;
  seatIndex: number;

  // Current seating arrangement
  arrangement: SeatingArrangement;

  // Algorithm settings
  settings: Partial<MixSettings>;

  // Classroom layout
  scene: ClassroomScene;

  // Pre-computed data
  seatCounts: number[];
  targets: number[];
  seatNeighborhoods: SeatNeighborhoodMap;
  seatPositions: Map<string, { x: number; y: number }>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** True if higher X values are closer to front (board on right side) */
  frontIsHighX: boolean;
  /** True if higher Y values are closer to front (board on bottom) */
  frontIsHighY: boolean;
  /** Which axis is dominant for front/back calculation */
  dominantAxis: 'x' | 'y';
  globalCounts: GenderCounts;

  // Student lookup
  studentById: Map<string, Student>;
  validLockedIds: Set<string>;

  // Previous pairs (for history avoidance)
  previousPairs: PreviousPairWeights;

  // Locked positions
  lockedPositions: Record<string, { table: number; seat: number }>;

  // Directional weights for scoring
  behavioralNeighborWeights: NeighborWeightConfig;
  genderNeighborWeights: NeighborWeightConfig;
  featureDistances: {
    window: Map<string, number>;
    door: Map<string, number>;
  };
  maxWindowDistance: number;
  maxDoorDistance: number;
}

/**
 * Scoring strategy interface.
 * Each strategy evaluates one aspect of seat placement quality.
 */
export interface ScoringStrategy {
  name: string;
  score(context: ScoringContext): number;
}
