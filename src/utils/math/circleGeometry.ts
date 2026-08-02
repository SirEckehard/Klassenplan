// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { CircleStudentPosition, CircleLayout } from '@/types/Circle';
import type { Student } from '@/types';
import { calculateSeatPosition } from '@/utils/math/positionCalculations';

/**
 * Standard classroom dimensions (matching existing classroom setup)
 */
export const CLASSROOM_BOUNDS = {
  width: 900,
  height: 600,
  padding: 30, // Minimal padding for maximum circle utilization
};

/**
 * The one arrangement the circle generator implements: keep table neighbours
 * next to each other. Written into every layout for backup compatibility.
 */
export const CIRCLE_ARRANGEMENT_MODE: CircleLayout['mode'] =
  'preserve-neighbors';

/**
 * Calculates optimal circle dimensions for given number of students
 */
export function calculateCircleDimensions(studentCount: number): {
  center: { x: number; y: number };
  radius: { horizontal: number; vertical: number };
  studentSpacing: number;
} {
  // Fixed settings for simplified version
  const ovalRatio = 1.3;
  const minRadius = 90;
  const maxRadius = 400;

  // Calculate available space constraints first
  const maxHorizontalRadius =
    (CLASSROOM_BOUNDS.width - 2 * CLASSROOM_BOUNDS.padding) / 2;
  const maxVerticalRadius =
    (CLASSROOM_BOUNDS.height - 2 * CLASSROOM_BOUNDS.padding) / 2;

  // Calculate minimum circumference needed for comfortable student spacing
  const minSpacingPerStudent = 25; // Minimum spacing per student
  const minCircumference = studentCount * minSpacingPerStudent;
  const minRequiredRadius = minCircumference / (2 * Math.PI);

  // Use maximum available space, but not less than minimum required
  let baseRadius = Math.max(
    minRequiredRadius, // Must fit all students comfortably
    Math.min(maxVerticalRadius, maxRadius), // Use max available vertical space
  );

  // Apply fixed constraints
  baseRadius = Math.max(baseRadius, minRadius);
  baseRadius = Math.min(baseRadius, maxRadius);

  // Create oval shape
  const horizontalRadius = baseRadius * ovalRatio;
  const verticalRadius = baseRadius;

  // Final size constraints (already calculated above)
  const finalHorizontalRadius = Math.min(horizontalRadius, maxHorizontalRadius);
  const finalVerticalRadius = Math.min(verticalRadius, maxVerticalRadius);

  // Center the circle in the classroom
  const center = {
    x: CLASSROOM_BOUNDS.width / 2,
    y: CLASSROOM_BOUNDS.height / 2,
  };

  // Calculate actual spacing achieved
  const actualCircumference =
    Math.PI * (finalHorizontalRadius + finalVerticalRadius); // Approximation for oval
  const studentSpacing =
    studentCount === 0 ? 0 : actualCircumference / studentCount;

  return {
    center,
    radius: {
      horizontal: finalHorizontalRadius,
      vertical: finalVerticalRadius,
    },
    studentSpacing,
  };
}

/**
 * Converts an angle and oval dimensions to SVG coordinates
 */
export function angleToPosition(
  angle: number, // 0-360 degrees
  center: { x: number; y: number },
  radius: { horizontal: number; vertical: number },
): { x: number; y: number } {
  return calculateSeatPosition({
    mode: 'circle',
    angle,
    center,
    radius,
  });
}

/**
 * Distributes students evenly around an oval circle
 */
export function distributeStudentsInCircle(
  students: Student[],
  center: { x: number; y: number },
  radius: { horizontal: number; vertical: number },
  startAngle: number = 0, // Where to start placing students (0 = right, 90 = bottom, 180 = left, 270 = top)
): CircleStudentPosition[] {
  const angleStep = 360 / students.length;

  return students.map((student, index) => {
    const angle = startAngle + index * angleStep;
    const position = angleToPosition(angle, center, radius);

    return {
      student,
      angle: angle % 360,
      x: position.x,
      y: position.y,
      preservedNeighbors: [], // Will be calculated later
      lostNeighbors: [], // Will be calculated later
      newNeighbors: [], // Will be calculated later
    };
  });
}

/**
 * Calculates neighbor relationships in circle arrangement
 * In a circle, each student has exactly 2 neighbors (left and right)
 */
export function calculateCircleNeighbors(
  positions: CircleStudentPosition[],
): Map<string, string[]> {
  const neighborMap = new Map<string, string[]>();

  // Sort positions by angle to determine circle order
  const sortedPositions = [...positions].sort((a, b) => a.angle - b.angle);

  sortedPositions.forEach((position, index) => {
    const leftIndex =
      (index - 1 + sortedPositions.length) % sortedPositions.length;
    const rightIndex = (index + 1) % sortedPositions.length;

    const leftNeighbor = sortedPositions[leftIndex]!;
    const rightNeighbor = sortedPositions[rightIndex]!;

    neighborMap.set(position.student.id, [
      leftNeighbor.student.id,
      rightNeighbor.student.id,
    ]);
  });

  return neighborMap;
}

/**
 * Calculates distance between two points
 */
export function calculateDistance(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Gets the angle between two points (in degrees)
 */
export function getAngleBetweenPoints(
  center: { x: number; y: number },
  point: { x: number; y: number },
): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const radians = Math.atan2(dy, dx);
  let degrees = (radians * 180) / Math.PI;

  // Normalize to 0-360
  if (degrees < 0) {
    degrees += 360;
  }

  return degrees;
}

/**
 * Calculates dynamic spacing adjustments based on student relationships
 * Returns modified positions for better social dynamics
 */
export function calculateDynamicSpacing(
  studentPositions: CircleStudentPosition[],
  neighborhoodStrengths: Map<string, number>,
): CircleStudentPosition[] {
  const adjustedPositions = [...studentPositions];
  const center = {
    x:
      adjustedPositions.reduce((sum, pos) => sum + pos.x, 0) /
      adjustedPositions.length,
    y:
      adjustedPositions.reduce((sum, pos) => sum + pos.y, 0) /
      adjustedPositions.length,
  };

  // Sort by angle for circular processing
  adjustedPositions.sort((a, b) => a.angle - b.angle);

  for (let i = 0; i < adjustedPositions.length; i++) {
    const current = adjustedPositions[i]!;
    const leftIndex =
      (i - 1 + adjustedPositions.length) % adjustedPositions.length;
    const rightIndex = (i + 1) % adjustedPositions.length;

    const leftNeighbor = adjustedPositions[leftIndex]!;
    const rightNeighbor = adjustedPositions[rightIndex]!;

    // Get relationship strengths
    const leftStrength =
      neighborhoodStrengths.get(
        `${current.student.id}-${leftNeighbor.student.id}`,
      ) || 0.3;
    const rightStrength =
      neighborhoodStrengths.get(
        `${current.student.id}-${rightNeighbor.student.id}`,
      ) || 0.3;

    // Calculate micro-adjustments (small position tweaks)
    const averageStrength = (leftStrength + rightStrength) / 2;

    // Strong relationships: move slightly inward (closer to neighbors)
    // Weak relationships: move slightly outward (more personal space)
    const radiusAdjustment = (averageStrength - 0.5) * 10; // Max ±5 pixels

    const currentDistance = calculateDistance(current, center);
    const newDistance = Math.max(50, currentDistance + radiusAdjustment);

    // Recalculate position with adjusted radius
    const angle = (current.angle * Math.PI) / 180;
    current.x = center.x + newDistance * Math.cos(angle);
    current.y = center.y + newDistance * Math.sin(angle);
  }

  return adjustedPositions;
}
