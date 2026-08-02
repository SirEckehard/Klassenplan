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
  calculateDynamicSpacing,
  CLASSROOM_BOUNDS,
} from '../circleGeometry';
import { createMockStudent } from '../../../__tests__/utils/testHelpers';

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
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty student list gracefully', () => {
      const result = calculateCircleDimensions(0);

      expect(result.center.x).toBe(CLASSROOM_BOUNDS.width / 2);
      expect(result.center.y).toBe(CLASSROOM_BOUNDS.height / 2);
      expect(result.radius.horizontal).toBeGreaterThan(0);
      expect(result.radius.vertical).toBeGreaterThan(0);
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
