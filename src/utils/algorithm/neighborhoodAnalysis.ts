// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student, ClassroomScene, SeatingArrangement } from '@/types';
import type { NeighborhoodAnalysis, NeighborhoodPair } from '@/types/Circle';
import { getAdjacentSeats, seatPairsFor } from '@/utils/math/seatGeometry';

/**
 * Analyzes neighborhood relationships from the current table layout
 */
export function analyzeNeighborhoods(
  scene: ClassroomScene,
  students: Student[],
  arrangement?: SeatingArrangement,
): NeighborhoodAnalysis {
  const adjacentSeats = getAdjacentSeats(scene);
  const studentMap = createStudentMap(arrangement);
  const studentPartnerMap = createPartnerMap(scene, students, arrangement);

  const neighborhoodPairs: NeighborhoodPair[] = [];
  const studentNeighborMap = new Map<string, string[]>();

  // Initialize neighbor map for all students
  students.forEach((student) => {
    studentNeighborMap.set(student.id, []);
  });

  // Process all adjacency relationships
  for (const [seatKey, adjacentSeatList] of adjacentSeats) {
    const currentStudent = studentMap.get(seatKey);
    if (!currentStudent) continue;

    const currentNeighbors = studentNeighborMap.get(currentStudent.id) || [];

    for (const adjacentSeat of adjacentSeatList) {
      const adjacentSeatKey = `${adjacentSeat.t}-${adjacentSeat.s}`;
      const adjacentStudent = studentMap.get(adjacentSeatKey);

      if (!adjacentStudent) continue;

      // Avoid duplicate pairs (A-B and B-A)
      const pairExists = neighborhoodPairs.some(
        (pair) =>
          (pair.student1Id === currentStudent.id &&
            pair.student2Id === adjacentStudent.id) ||
          (pair.student1Id === adjacentStudent.id &&
            pair.student2Id === currentStudent.id),
      );

      if (!pairExists) {
        // Only treat direct table partners as valid connections for circle mode
        const partnersForCurrent =
          studentPartnerMap.get(currentStudent.id) || [];
        if (!partnersForCurrent.includes(adjacentStudent.id)) {
          continue;
        }

        // Calculate relationship strength based on various factors
        const strength = calculateRelationshipStrength(
          currentStudent,
          adjacentStudent,
        );

        neighborhoodPairs.push({
          student1Id: currentStudent.id,
          student2Id: adjacentStudent.id,
          strength,
          preserved: false, // Will be updated during circle generation
        });

        // Update bidirectional neighbor map
        if (!currentNeighbors.includes(adjacentStudent.id)) {
          currentNeighbors.push(adjacentStudent.id);
        }

        const adjacentNeighbors =
          studentNeighborMap.get(adjacentStudent.id) || [];
        if (!adjacentNeighbors.includes(currentStudent.id)) {
          adjacentNeighbors.push(currentStudent.id);
        }
      }
    }

    studentNeighborMap.set(currentStudent.id, currentNeighbors);
  }

  // Calculate statistics
  const totalNeighborConnections = Array.from(
    studentNeighborMap.values(),
  ).reduce((sum, neighbors) => sum + neighbors.length, 0);
  const averageNeighbors = totalNeighborConnections / students.length;

  // Find isolated students (no direct neighbors)
  const isolatedStudents = students
    .filter((student) => {
      const neighbors = studentNeighborMap.get(student.id) || [];
      return neighbors.length === 0;
    })
    .map((student) => student.id);

  return {
    totalStudents: students.length,
    neighborhoodPairs,
    studentNeighborMap,
    studentPartnerMap,
    averageNeighbors,
    isolatedStudents,
  };
}

/**
 * Creates a mapping from seat positions to students
 */
function createStudentMap(
  arrangement?: SeatingArrangement,
): Map<string, Student> {
  const studentMap = new Map<string, Student>();

  if (arrangement) {
    // Use the provided seating arrangement
    arrangement.forEach((table, tableIndex) => {
      table.forEach((student, seatIndex) => {
        if (student) {
          const seatKey = `${tableIndex}-${seatIndex}`;
          studentMap.set(seatKey, student);
        }
      });
    });
  } else {
    // If no arrangement provided, assume all students are placed somehow
    // This is a fallback for when we don't have a current arrangement
    // In practice, the Circle algorithm should provide an arrangement or use empty analysis
    return studentMap;
  }

  return studentMap;
}

/**
 * Creates a mapping of direct table partners for each student
 */
function createPartnerMap(
  scene: ClassroomScene,
  students: Student[],
  arrangement?: SeatingArrangement,
): Map<string, string[]> {
  const partnerMap = new Map<string, string[]>();

  students.forEach((student) => {
    partnerMap.set(student.id, []);
  });

  if (!arrangement) {
    return partnerMap;
  }

  scene.tables.forEach((table, tableIndex) => {
    const seating = arrangement[tableIndex];
    if (!seating) {
      return;
    }

    const partnerPairs = seatPairsFor(table.seatCount);

    partnerPairs.forEach(([seatA, seatB]) => {
      const studentA = seating[seatA];
      const studentB = seating[seatB];

      if (!studentA || !studentB) {
        return;
      }

      const partnersForA = partnerMap.get(studentA.id);
      const partnersForB = partnerMap.get(studentB.id);

      if (partnersForA && !partnersForA.includes(studentB.id)) {
        partnersForA.push(studentB.id);
      }

      if (partnersForB && !partnersForB.includes(studentA.id)) {
        partnersForB.push(studentA.id);
      }
    });
  });

  return partnerMap;
}

/**
 * Calculates the strength of a relationship between two students
 * Higher values indicate stronger relationships that should be preserved
 */
function calculateRelationshipStrength(
  student1: Student,
  student2: Student,
): number {
  let strength = 0.5; // Base strength for any adjacency

  // Wish partners get highest priority
  if (
    student1.wishPartnerId === student2.id ||
    student2.wishPartnerId === student1.id
  ) {
    strength += 0.4;
  }

  // Same gender pairs get slight bonus for social comfort
  if (student1.gender === student2.gender) {
    strength += 0.1;
  }

  // Students with special needs might need consistent neighbors
  const student1HasSpecialNeeds = hasSpecialNeeds(student1);
  const student2HasSpecialNeeds = hasSpecialNeeds(student2);

  if (student1HasSpecialNeeds || student2HasSpecialNeeds) {
    strength += 0.2; // Prioritize stability for special needs
  }

  // Cap at 1.0
  return Math.min(strength, 1.0);
}

/**
 * Checks if a student has any special needs that might benefit from stable seating
 */
function hasSpecialNeeds(student: Student): boolean {
  return !!(
    student.needsFrontSeat ||
    student.concentrationIssues ||
    student.restless ||
    student.shy
  );
}

/**
 * Finds the best neighbors for a student based on current table layout
 */
export function getBestNeighborsForStudent(
  studentId: string,
  analysis: NeighborhoodAnalysis,
): { studentId: string; strength: number }[] {
  const neighborIds = analysis.studentNeighborMap.get(studentId) || [];

  return neighborIds
    .map((neighborId) => {
      const pair = analysis.neighborhoodPairs.find(
        (p) =>
          (p.student1Id === studentId && p.student2Id === neighborId) ||
          (p.student1Id === neighborId && p.student2Id === studentId),
      );

      return {
        studentId: neighborId,
        strength: pair?.strength || 0.5,
      };
    })
    .sort((a, b) => b.strength - a.strength);
}

/**
 * Calculates how many neighborhoods would be preserved with a given circle arrangement
 */
export function calculatePreservationRate(
  originalAnalysis: NeighborhoodAnalysis,
  circleNeighborMap: Map<string, string[]>,
): number {
  if (originalAnalysis.neighborhoodPairs.length === 0) {
    return 1.0; // No neighborhoods to preserve
  }

  let preservedCount = 0;

  for (const pair of originalAnalysis.neighborhoodPairs) {
    const student1Neighbors = circleNeighborMap.get(pair.student1Id) || [];
    const student2Neighbors = circleNeighborMap.get(pair.student2Id) || [];

    // Check if the pair is still neighbors in the circle
    const stillNeighbors =
      student1Neighbors.includes(pair.student2Id) ||
      student2Neighbors.includes(pair.student1Id);

    if (stillNeighbors) {
      preservedCount++;
    }
  }

  return preservedCount / originalAnalysis.neighborhoodPairs.length;
}

/**
 * Updates neighborhood pairs with preservation status after circle generation
 */
export function updateNeighborhoodPreservation(
  analysis: NeighborhoodAnalysis,
  circleNeighborMap: Map<string, string[]>,
): NeighborhoodAnalysis {
  const updatedPairs = analysis.neighborhoodPairs.map((pair) => {
    const student1Neighbors = circleNeighborMap.get(pair.student1Id) || [];
    const student2Neighbors = circleNeighborMap.get(pair.student2Id) || [];

    const preserved =
      student1Neighbors.includes(pair.student2Id) ||
      student2Neighbors.includes(pair.student1Id);

    return { ...pair, preserved };
  });

  return {
    ...analysis,
    neighborhoodPairs: updatedPairs,
  };
}

/**
 * Generates a human-readable summary of neighborhood analysis
 */
export function generateNeighborhoodSummary(
  analysis: NeighborhoodAnalysis,
): string {
  const totalPairs = analysis.neighborhoodPairs.length;
  const avgNeighbors = analysis.averageNeighbors.toFixed(1);
  const isolated = analysis.isolatedStudents.length;

  let summary = `${totalPairs} Nachbarschaftspaare gefunden. `;
  summary += `Durchschnittlich ${avgNeighbors} Nachbarn pro Schüler.`;

  if (isolated > 0) {
    summary += ` ${isolated} Schüler ohne direkte Nachbarn.`;
  }

  return summary;
}

/**
 * Calculates new neighborhood relationships formed in the circle
 * that did not exist in the original table layout.
 *
 * @param circleNeighborMap - Map of student IDs to their circle neighbors
 * @param neighborhoodAnalysis - Original neighborhood analysis from table layout
 * @returns Array of new neighborhood pairs with initial strength values
 */
export function calculateNewNeighborhoods(
  circleNeighborMap: Map<string, string[]>,
  neighborhoodAnalysis: NeighborhoodAnalysis,
): NeighborhoodPair[] {
  const newPairs: NeighborhoodPair[] = [];
  const existingPairKeys = new Set(
    neighborhoodAnalysis.neighborhoodPairs.map(
      (pair) => `${pair.student1Id}-${pair.student2Id}`,
    ),
  );

  for (const [studentId, neighbors] of circleNeighborMap) {
    for (const neighborId of neighbors) {
      // Avoid duplicate pairs (A-B and B-A)
      const pairKey1 = `${studentId}-${neighborId}`;
      const pairKey2 = `${neighborId}-${studentId}`;

      if (!existingPairKeys.has(pairKey1) && !existingPairKeys.has(pairKey2)) {
        newPairs.push({
          student1Id: studentId,
          student2Id: neighborId,
          strength: 0.3, // New relationships start with lower strength
          preserved: false,
        });

        existingPairKeys.add(pairKey1);
      }
    }
  }

  return newPairs;
}
