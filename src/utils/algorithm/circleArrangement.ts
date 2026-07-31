// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student, ClassroomScene, SeatingArrangement } from '@/types';
import type {
  CircleLayout,
  CircleStudentPosition,
  NeighborhoodAnalysis,
} from '@/types/Circle';
import {
  analyzeNeighborhoods,
  calculatePreservationRate,
  updateNeighborhoodPreservation,
  calculateNewNeighborhoods,
} from './neighborhoodAnalysis';
import {
  calculateCircleDimensions,
  distributeStudentsInCircle,
  calculateCircleNeighbors,
  CIRCLE_ARRANGEMENT_MODE,
} from '@/utils/math/circleGeometry';
import { randomInt, type RandomSource } from './rng';

/**
 * Main function to generate circle layouts with different algorithms
 */
export function generateCircleLayout(
  students: Student[],
  classroomScene: ClassroomScene,
  currentSeating?: SeatingArrangement,
  rng: RandomSource = Math.random,
): CircleLayout {
  // Analyze current neighborhoods from table layout
  const neighborhoodAnalysis = analyzeNeighborhoods(
    classroomScene,
    students,
    currentSeating,
  );

  // Calculate circle dimensions
  const { center, radius } = calculateCircleDimensions(students.length);

  let studentPositions: CircleStudentPosition[] =
    preserveNeighborhoodsArrangement(
      students,
      neighborhoodAnalysis,
      center,
      radius,
      rng,
    );

  // Calculate actual neighbor relationships in circle
  const circleNeighborMap = calculateCircleNeighbors(studentPositions);

  // Update positions with neighborhood information
  studentPositions = updatePositionsWithNeighborhoodInfo(
    studentPositions,
    neighborhoodAnalysis,
    circleNeighborMap,
  );

  // Calculate statistics
  const preservationRate = calculatePreservationRate(
    neighborhoodAnalysis,
    circleNeighborMap,
  );
  const updatedAnalysis = updateNeighborhoodPreservation(
    neighborhoodAnalysis,
    circleNeighborMap,
  );

  const newNeighborhoods = calculateNewNeighborhoods(
    circleNeighborMap,
    neighborhoodAnalysis,
  );

  return {
    students: studentPositions,
    radius,
    center,
    preservedNeighborhoods: Math.round(
      preservationRate * neighborhoodAnalysis.neighborhoodPairs.length,
    ),
    totalOriginalNeighborhoods: neighborhoodAnalysis.neighborhoodPairs.length,
    newNeighborhoods: newNeighborhoods.length,
    preservationRate,
    mode: CIRCLE_ARRANGEMENT_MODE,
    timestamp: Date.now(),
    neighborhoodPairs: updatedAnalysis.neighborhoodPairs,
  };
}

/**
 * Algorithm 1: Preserve Neighborhoods
 * Tries to maintain as many adjacent relationships from the table layout as possible
 */
function preserveNeighborhoodsArrangement(
  students: Student[],
  neighborhoodAnalysis: NeighborhoodAnalysis,
  center: { x: number; y: number },
  radius: { horizontal: number; vertical: number },
  rng: RandomSource,
): CircleStudentPosition[] {
  // Start with basic distribution
  let positions = distributeStudentsInCircle(students, center, radius);

  // Try to improve by swapping students to preserve more neighborhoods
  positions = optimizeForNeighborhoodPreservation(
    positions,
    neighborhoodAnalysis,
    rng,
  );

  return positions;
}

/**
 * Optimizes student positions to preserve more neighborhoods
 */
function optimizeForNeighborhoodPreservation(
  positions: CircleStudentPosition[],
  neighborhoodAnalysis: NeighborhoodAnalysis,
  rng: RandomSource,
  maxIterations: number = 100,
): CircleStudentPosition[] {
  let bestPositions = [...positions];
  let bestScore = calculateNeighborhoodScore(positions, neighborhoodAnalysis);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Perform a lightweight random search to improve preservation without heavy computation
    const newPositions = [...positions];
    const i = randomInt(rng, newPositions.length);
    const j = randomInt(rng, newPositions.length);

    if (i !== j) {
      // Swap students but keep their circle positions
      const tempStudent = newPositions[i]!.student;
      newPositions[i]!.student = newPositions[j]!.student;
      newPositions[j]!.student = tempStudent;

      const score = calculateNeighborhoodScore(
        newPositions,
        neighborhoodAnalysis,
      );
      if (score > bestScore) {
        bestPositions = newPositions;
        bestScore = score;
      }
    }
  }

  return bestPositions;
}

/**
 * Calculates a score for how well neighborhoods are preserved
 */
function calculateNeighborhoodScore(
  positions: CircleStudentPosition[],
  neighborhoodAnalysis: NeighborhoodAnalysis,
): number {
  const circleNeighborMap = calculateCircleNeighbors(positions);
  return calculatePreservationRate(neighborhoodAnalysis, circleNeighborMap);
}

/**
 * Updates student positions with detailed neighborhood information
 */
function updatePositionsWithNeighborhoodInfo(
  positions: CircleStudentPosition[],
  neighborhoodAnalysis: NeighborhoodAnalysis,
  circleNeighborMap: Map<string, string[]>,
): CircleStudentPosition[] {
  return positions.map((position) => {
    const originalNeighbors =
      neighborhoodAnalysis.studentPartnerMap?.get(position.student.id) ||
      neighborhoodAnalysis.studentNeighborMap.get(position.student.id) ||
      [];
    const circleNeighbors = circleNeighborMap.get(position.student.id) || [];

    const preservedNeighbors = originalNeighbors.filter((id: string) =>
      circleNeighbors.includes(id),
    );
    const lostNeighbors = originalNeighbors.filter(
      (id: string) => !circleNeighbors.includes(id),
    );
    const newNeighbors = circleNeighbors.filter(
      (id: string) => !originalNeighbors.includes(id),
    );

    return {
      ...position,
      preservedNeighbors,
      lostNeighbors,
      newNeighbors,
    };
  });
}
