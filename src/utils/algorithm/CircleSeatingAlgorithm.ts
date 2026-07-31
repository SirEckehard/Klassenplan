// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  Student,
  ClassroomScene,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
} from '@/types';
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
import { randomInt, type RandomSource } from './rng';
import {
  calculateCircleDimensions,
  calculateCircleNeighbors,
  CIRCLE_ARRANGEMENT_MODE,
  angleToPosition,
} from '@/utils/math/circleGeometry';
import { shuffleArray } from './shuffle';
import { logDebug } from '@/utils';

/**
 * Simplified circle seating algorithm focusing on neighborhood preservation
 * Reduced from 633 to ~200 lines for better maintainability
 */
export class CircleSeatingAlgorithm {
  private students: Student[];
  private scene: ClassroomScene;
  private neighborhoodAnalysis: NeighborhoodAnalysis;
  private circleDimensions: ReturnType<typeof calculateCircleDimensions>;
  private rng: RandomSource;

  constructor(
    students: Student[],
    scene: ClassroomScene,
    _mixSettings?: Partial<MixSettings>,
    _seatingHistory?: SavedPlan[],
    currentSeating?: SeatingArrangement,
    rng: RandomSource = Math.random,
  ) {
    this.students = students;
    this.scene = scene;
    this.rng = rng;
    // Initialize analysis
    this.neighborhoodAnalysis = analyzeNeighborhoods(
      scene,
      students,
      currentSeating,
    );
    this.circleDimensions = calculateCircleDimensions(students.length);
  }

  /**
   * Main algorithm entry point - generates optimized circle layout
   */
  public generateOptimizedLayout(): CircleLayout {
    const startTime = performance.now();
    logDebug(
      'Starting circle seating generation',
      { studentCount: this.students.length },
      'CircleSeatingAlgorithm',
    );

    // Generate initial arrangement preserving strongest neighborhoods
    const initialLayout = this.generateNeighborhoodPreservingLayout();

    // Apply optimization with simple swapping
    const optimizedLayout = this.optimizeLayout(initialLayout, 30);

    const endTime = performance.now();
    logDebug(
      'Circle seating generation completed',
      { duration: `${(endTime - startTime).toFixed(1)}ms` },
      'CircleSeatingAlgorithm',
    );
    return optimizedLayout;
  }

  /**
   * Build layout prioritizing strongest neighborhood relationships
   */
  private generateNeighborhoodPreservingLayout(): CircleLayout {
    // Sort neighborhood pairs by strength (strongest first)
    const sortedPairs = [...this.neighborhoodAnalysis.neighborhoodPairs].sort(
      (a, b) => b.strength - a.strength,
    );

    const placedStudents = new Set<string>();
    const studentPositions: CircleStudentPosition[] = [];

    // Phase 1: Place strongest pairs first
    let currentAngle = 0;
    const angleStep = 360 / this.students.length;

    for (const pair of sortedPairs) {
      if (
        placedStudents.has(pair.student1Id) ||
        placedStudents.has(pair.student2Id)
      ) {
        continue; // One or both already placed
      }

      const student1 = this.students.find((s) => s.id === pair.student1Id)!;
      const student2 = this.students.find((s) => s.id === pair.student2Id)!;

      // Place the pair as neighbors in the circle
      const pos1 = angleToPosition(
        currentAngle,
        this.circleDimensions.center,
        this.circleDimensions.radius,
      );
      const pos2 = angleToPosition(
        currentAngle + angleStep,
        this.circleDimensions.center,
        this.circleDimensions.radius,
      );

      studentPositions.push({
        student: student1,
        angle: currentAngle,
        x: pos1.x,
        y: pos1.y,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      });

      studentPositions.push({
        student: student2,
        angle: (currentAngle + angleStep) % 360,
        x: pos2.x,
        y: pos2.y,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      });

      placedStudents.add(pair.student1Id);
      placedStudents.add(pair.student2Id);
      currentAngle = (currentAngle + 2 * angleStep) % 360;
    }

    // Phase 2: Place remaining students randomly
    const remainingStudents = shuffleArray(
      this.students.filter((s) => !placedStudents.has(s.id)),
    );
    for (const student of remainingStudents) {
      const pos = angleToPosition(
        currentAngle,
        this.circleDimensions.center,
        this.circleDimensions.radius,
      );

      studentPositions.push({
        student,
        angle: currentAngle,
        x: pos.x,
        y: pos.y,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      });

      currentAngle = (currentAngle + angleStep) % 360;
    }

    return this.buildCompleteLayout(studentPositions);
  }

  /**
   * Applies simple local optimization to improve layout
   */
  private optimizeLayout(
    layout: CircleLayout,
    maxIterations: number,
  ): CircleLayout {
    let currentLayout = { ...layout };
    let bestLayout = currentLayout;
    let bestScore = this.scoreLayout(currentLayout);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Try a random swap
      const newLayout = this.tryRandomSwap(currentLayout);
      const newScore = this.scoreLayout(newLayout);

      // Keep if it's better
      if (newScore > bestScore) {
        bestLayout = newLayout;
        bestScore = newScore;
        currentLayout = newLayout;
      }
    }

    return bestLayout;
  }

  /**
   * Tries a random student swap and returns new layout
   */
  private tryRandomSwap(layout: CircleLayout): CircleLayout {
    const newPositions = [...layout.students];

    // Pick two random positions to swap students
    const pos1 = randomInt(this.rng, newPositions.length);
    const pos2 = randomInt(this.rng, newPositions.length);

    if (pos1 !== pos2) {
      // Swap the students but keep their circle positions
      const tempStudent = newPositions[pos1]!.student;
      newPositions[pos1] = {
        ...newPositions[pos1]!,
        student: newPositions[pos2]!.student,
      };
      newPositions[pos2] = { ...newPositions[pos2]!, student: tempStudent };
    }

    return this.buildCompleteLayout(newPositions);
  }

  /**
   * Simple scoring function focusing on neighborhood preservation
   */
  private scoreLayout(layout: CircleLayout): number {
    let score = 0;

    // Primary score: neighborhood preservation (heavily weighted)
    score += layout.preservationRate * 1000;

    // Penalty for problematic adjacencies (restless students next to each other)
    score -= this.scoreProblematicAdjacencies(layout) * 50;

    return score;
  }

  /**
   * Penalizes problematic adjacencies (restless students next to each other)
   */
  private scoreProblematicAdjacencies(layout: CircleLayout): number {
    const circleNeighborMap = calculateCircleNeighbors(layout.students);
    let problematicPairs = 0;

    for (const position of layout.students) {
      if (position.student.restless) {
        const neighbors = circleNeighborMap.get(position.student.id) || [];

        for (const neighborId of neighbors) {
          const neighbor = this.students.find((s) => s.id === neighborId);
          if (neighbor?.restless) {
            problematicPairs++;
          }
        }
      }
    }

    return problematicPairs / 2; // Divide by 2 to avoid double counting
  }

  /**
   * Builds a complete CircleLayout from student positions
   */
  private buildCompleteLayout(
    studentPositions: CircleStudentPosition[],
  ): CircleLayout {
    // Calculate circle neighbor relationships
    const circleNeighborMap = calculateCircleNeighbors(studentPositions);

    // Update positions with neighborhood information
    const updatedPositions = studentPositions.map((position) => {
      const originalNeighbors =
        this.neighborhoodAnalysis.studentPartnerMap?.get(position.student.id) ||
        this.neighborhoodAnalysis.studentNeighborMap.get(position.student.id) ||
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

    // Calculate statistics
    const preservationRate = calculatePreservationRate(
      this.neighborhoodAnalysis,
      circleNeighborMap,
    );
    const updatedAnalysis = updateNeighborhoodPreservation(
      this.neighborhoodAnalysis,
      circleNeighborMap,
    );
    const newNeighborhoods = calculateNewNeighborhoods(
      circleNeighborMap,
      this.neighborhoodAnalysis,
    );

    return {
      students: updatedPositions,
      radius: this.circleDimensions.radius,
      center: this.circleDimensions.center,
      preservedNeighborhoods: Math.round(
        preservationRate * this.neighborhoodAnalysis.neighborhoodPairs.length,
      ),
      totalOriginalNeighborhoods:
        this.neighborhoodAnalysis.neighborhoodPairs.length,
      newNeighborhoods: newNeighborhoods.length,
      preservationRate,
      mode: CIRCLE_ARRANGEMENT_MODE,
      timestamp: Date.now(),
      neighborhoodPairs: updatedAnalysis.neighborhoodPairs,
    };
  }
}

/**
 * Main entry point for circle seating algorithm
 */
export function generateOptimizedCircleLayout(
  students: Student[],
  scene: ClassroomScene,
  mixSettings: Partial<MixSettings> = {},
  seatingHistory: SavedPlan[] = [],
  currentSeating?: SeatingArrangement,
  rng: RandomSource = Math.random,
): CircleLayout {
  const algorithm = new CircleSeatingAlgorithm(
    students,
    scene,
    mixSettings,
    seatingHistory,
    currentSeating,
    rng,
  );
  return algorithm.generateOptimizedLayout();
}
