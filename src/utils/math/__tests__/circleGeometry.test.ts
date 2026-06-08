// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  calculateCircleDimensions,
  distributeStudentsInCircle,
  calculateCircleNeighbors,
  angleToPosition,
  calculateDistance,
  getAngleBetweenPoints,
  findOptimalStartAngle,
  calculateOptimalCurvature,
  calculateAcousticOptimization,
  calculateDynamicSpacing,
  validateCircleGeometry,
  CLASSROOM_BOUNDS,
} from '../circleGeometry';
import { createMockStudent } from '../../../__tests__/utils/testHelpers';
import type { CircleStudentPosition } from '../../../types/Circle';

describe('Circle Geometry Calculations', () => {
  describe('Basic Geometry Functions', () => {
    it('should calculate circle dimensions correctly', () => {
      const result = calculateCircleDimensions(12);

      expect(result.center.x).toBe(CLASSROOM_BOUNDS.width / 2);
      expect(result.center.y).toBe(CLASSROOM_BOUNDS.height / 2);
      expect(result.radius.horizontal).toBeGreaterThan(0);
      expect(result.radius.vertical).toBeGreaterThan(0);
      expect(result.studentSpacing).toBeGreaterThan(0);
    });

    it('should handle small student counts', () => {
      const result = calculateCircleDimensions(3);

      expect(result.radius.horizontal).toBeGreaterThanOrEqual(90); // minRadius
      expect(result.studentSpacing).toBeGreaterThan(40); // Reasonable spacing
    });

    it('should handle large student counts', () => {
      const result = calculateCircleDimensions(30);

      expect(result.radius.horizontal).toBeLessThanOrEqual(400); // maxRadius
      expect(result.radius.vertical).toBeLessThanOrEqual(400);

      // Should fit within classroom bounds
      expect(result.center.x + result.radius.horizontal).toBeLessThanOrEqual(
        CLASSROOM_BOUNDS.width - CLASSROOM_BOUNDS.padding,
      );
      expect(result.center.y + result.radius.vertical).toBeLessThanOrEqual(
        CLASSROOM_BOUNDS.height - CLASSROOM_BOUNDS.padding,
      );
    });

    it('should convert angles to positions correctly', () => {
      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const pos0 = angleToPosition(0, center, radius);
      expect(pos0.x).toBeCloseTo(center.x + radius.horizontal);
      expect(pos0.y).toBeCloseTo(center.y);

      const pos90 = angleToPosition(90, center, radius);
      expect(pos90.x).toBeCloseTo(center.x);
      expect(pos90.y).toBeCloseTo(center.y + radius.vertical);

      const pos180 = angleToPosition(180, center, radius);
      expect(pos180.x).toBeCloseTo(center.x - radius.horizontal);
      expect(pos180.y).toBeCloseTo(center.y);

      const pos270 = angleToPosition(270, center, radius);
      expect(pos270.x).toBeCloseTo(center.x);
      expect(pos270.y).toBeCloseTo(center.y - radius.vertical);
    });

    it('should calculate distances correctly', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };

      const distance = calculateDistance(point1, point2);
      expect(distance).toBeCloseTo(5); // 3-4-5 triangle
    });

    it('should calculate angles between points correctly', () => {
      const center = { x: 0, y: 0 };

      const angle0 = getAngleBetweenPoints(center, { x: 1, y: 0 });
      expect(angle0).toBeCloseTo(0);

      const angle90 = getAngleBetweenPoints(center, { x: 0, y: 1 });
      expect(angle90).toBeCloseTo(90);

      const angle180 = getAngleBetweenPoints(center, { x: -1, y: 0 });
      expect(angle180).toBeCloseTo(180);

      const angle270 = getAngleBetweenPoints(center, { x: 0, y: -1 });
      expect(angle270).toBeCloseTo(270);
    });
  });

  describe('Student Distribution', () => {
    it('should distribute students evenly around circle', () => {
      const students = Array.from({ length: 8 }, (_, i) =>
        createMockStudent({
          name: `Student${i}`,
          gender: i % 2 === 0 ? 'girl' : 'boy',
        }),
      );

      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const positions = distributeStudentsInCircle(students, center, radius);

      expect(positions).toHaveLength(8);

      // Check angle distribution
      const angles = positions.map((p) => p.angle).sort((a, b) => a - b);
      const expectedAngleStep = 360 / 8;

      for (let i = 0; i < angles.length; i++) {
        const expectedAngle = i * expectedAngleStep;
        expect(angles[i]).toBeCloseTo(expectedAngle, 1);
      }
    });

    it('should handle custom start angles', () => {
      const students = [createMockStudent({ name: 'Alice', gender: 'girl' })];
      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const positions = distributeStudentsInCircle(
        students,
        center,
        radius,
        90,
      );

      expect(positions[0]!.angle).toBeCloseTo(90);
    });

    it('should calculate correct positions for students', () => {
      const students = [createMockStudent({ name: 'Alice', gender: 'girl' })];
      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const positions = distributeStudentsInCircle(students, center, radius, 0);

      expect(positions[0]!.x).toBeCloseTo(center.x + radius.horizontal);
      expect(positions[0]!.y).toBeCloseTo(center.y);
    });
  });

  describe('Neighbor Calculation', () => {
    it('should calculate circle neighbors correctly', () => {
      const students = Array.from({ length: 6 }, (_, i) =>
        createMockStudent({ name: `Student${i}`, gender: 'girl' }),
      );

      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const positions = distributeStudentsInCircle(students, center, radius);
      const neighborMap = calculateCircleNeighbors(positions);

      expect(neighborMap.size).toBe(6);

      // Each student should have exactly 2 neighbors
      for (const [studentId, neighbors] of neighborMap) {
        expect(neighbors).toHaveLength(2);
        expect(neighbors).not.toContain(studentId); // Student shouldn't be their own neighbor
      }

      // Check circular connectivity
      const sortedPositions = [...positions].sort((a, b) => a.angle - b.angle);
      for (let i = 0; i < sortedPositions.length; i++) {
        const current = sortedPositions[i]!;
        const leftIndex =
          (i - 1 + sortedPositions.length) % sortedPositions.length;
        const rightIndex = (i + 1) % sortedPositions.length;
        const leftNeighbor = sortedPositions[leftIndex]!;
        const rightNeighbor = sortedPositions[rightIndex]!;

        const neighbors = neighborMap.get(current.student.id)!;
        expect(neighbors).toContain(leftNeighbor.student.id);
        expect(neighbors).toContain(rightNeighbor.student.id);
      }
    });

    it('should handle edge case with single student', () => {
      const students = [createMockStudent({ name: 'Alice', gender: 'girl' })];
      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const positions = distributeStudentsInCircle(students, center, radius);
      const neighborMap = calculateCircleNeighbors(positions);

      expect(neighborMap.size).toBe(1);
      const neighbors = neighborMap.get(students[0]!.id)!;
      expect(neighbors).toHaveLength(2);
      // With only one student, they are their own neighbors
      expect(neighbors[0]).toBe(students[0]!.id);
      expect(neighbors[1]).toBe(students[0]!.id);
    });

    it('should handle two students correctly', () => {
      const students = Array.from({ length: 2 }, (_, i) =>
        createMockStudent({ name: `Student${i}`, gender: 'girl' }),
      );

      const center = { x: 450, y: 300 };
      const radius = { horizontal: 200, vertical: 150 };

      const positions = distributeStudentsInCircle(students, center, radius);
      const neighborMap = calculateCircleNeighbors(positions);

      expect(neighborMap.size).toBe(2);

      // Each student should have the other as both neighbors
      const neighbors0 = neighborMap.get(students[0]!.id)!;
      const neighbors1 = neighborMap.get(students[1]!.id)!;

      expect(neighbors0).toHaveLength(2);
      expect(neighbors1).toHaveLength(2);
      expect(neighbors0[0]).toBe(students[1]!.id);
      expect(neighbors0[1]).toBe(students[1]!.id);
      expect(neighbors1[0]).toBe(students[0]!.id);
      expect(neighbors1[1]).toBe(students[0]!.id);
    });
  });

  describe('Advanced Geometry Calculations', () => {
    it('should calculate optimal curvature', () => {
      const result = calculateOptimalCurvature(12, 0.7);

      expect(result.horizontal).toBeGreaterThan(0);
      expect(result.vertical).toBeGreaterThan(0);
      expect(result.curvatureScore).toBeGreaterThanOrEqual(0);
      expect(result.curvatureScore).toBeLessThanOrEqual(1);
    });

    it('should handle different conversation intensities', () => {
      const lowIntensity = calculateOptimalCurvature(12, 0.2);
      const highIntensity = calculateOptimalCurvature(12, 0.9);

      expect(lowIntensity.curvatureScore).toBeLessThan(
        highIntensity.curvatureScore,
      );
    });

    it('should calculate acoustic optimization', () => {
      const students = [
        createMockStudent({
          name: 'Alice',
          gender: 'girl',
          needsFrontSeat: true,
        }),
        createMockStudent({ name: 'Bob', gender: 'boy' }),
        createMockStudent({ name: 'Charlie', gender: 'boy' }),
      ];

      const center = { x: 450, y: 300 };
      const radius = { horizontal: 150, vertical: 100 };

      const positions = distributeStudentsInCircle(students, center, radius);

      const result = calculateAcousticOptimization(positions);

      expect(result.acousticScore).toBeGreaterThanOrEqual(0);
      expect(result.acousticScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.conversationZones)).toBe(true);
    });

    it('should calculate dynamic spacing', () => {
      const students = Array.from({ length: 4 }, (_, i) =>
        createMockStudent({ name: `Student${i}`, gender: 'girl' }),
      );

      const center = { x: 450, y: 300 };
      const radius = { horizontal: 150, vertical: 100 };

      const positions = distributeStudentsInCircle(students, center, radius);
      const strengthMap = new Map([
        [`${students[0]!.id}-${students[1]!.id}`, 0.8],
        [`${students[1]!.id}-${students[2]!.id}`, 0.3],
        [`${students[2]!.id}-${students[3]!.id}`, 0.6],
        [`${students[3]!.id}-${students[0]!.id}`, 0.4],
      ]);

      const adjustedPositions = calculateDynamicSpacing(positions, strengthMap);

      expect(adjustedPositions).toHaveLength(4);

      // Positions should be adjusted but still reasonable
      for (const position of adjustedPositions) {
        expect(position.x).toBeGreaterThan(0);
        expect(position.y).toBeGreaterThan(0);
        expect(position.x).toBeLessThan(900);
        expect(position.y).toBeLessThan(600);
      }
    });

    it('should validate circle geometry', () => {
      const students = Array.from({ length: 6 }, (_, i) =>
        createMockStudent({ name: `Student${i}`, gender: 'girl' }),
      );

      const center = { x: 450, y: 300 };
      const radius = { horizontal: 150, vertical: 100 };

      const positions = distributeStudentsInCircle(students, center, radius);

      const validation = validateCircleGeometry(positions);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.minDistance).toBeGreaterThan(0);
      expect(validation.maxDistance).toBeGreaterThan(validation.minDistance);
      expect(validation.avgDistance).toBeGreaterThan(0);
    });

    it('should detect geometry issues', () => {
      // Create invalid positions (students too close)
      const students = [
        createMockStudent({ name: 'Alice', gender: 'girl' }),
        createMockStudent({ name: 'Bob', gender: 'boy' }),
      ];

      const positions: CircleStudentPosition[] = [
        {
          student: students[0]!,
          angle: 0,
          x: 450,
          y: 300,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        },
        {
          student: students[1]!,
          angle: 5,
          x: 455, // Too close (only 5 pixels apart)
          y: 300,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        },
      ];

      const validation = validateCircleGeometry(positions);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.minDistance).toBeLessThan(30);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty student list gracefully', () => {
      const result = calculateCircleDimensions(0);

      expect(result.center.x).toBe(CLASSROOM_BOUNDS.width / 2);
      expect(result.center.y).toBe(CLASSROOM_BOUNDS.height / 2);
      expect(result.radius.horizontal).toBeGreaterThan(0);
      expect(result.radius.vertical).toBeGreaterThan(0);
    });

    it('should find optimal start angle', () => {
      const students = Array.from({ length: 4 }, (_, i) =>
        createMockStudent({ name: `Student${i}`, gender: 'girl' }),
      );

      const studentIds = students.map((s) => s.id);
      const angle = findOptimalStartAngle(studentIds);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
    });

    it('should handle extreme classroom dimensions', () => {
      // Test with very large student count
      const result = calculateCircleDimensions(20);

      expect(result.radius.horizontal).toBeLessThanOrEqual(
        (CLASSROOM_BOUNDS.width - 2 * CLASSROOM_BOUNDS.padding) / 2,
      );
      expect(result.radius.vertical).toBeLessThanOrEqual(
        (CLASSROOM_BOUNDS.height - 2 * CLASSROOM_BOUNDS.padding) / 2,
      );
    });
  });
});
