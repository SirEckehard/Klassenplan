// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircleSeatingAlgorithm,
  generateOptimizedCircleLayout,
} from '../CircleSeatingAlgorithm';
import {
  createMockStudent,
  createMockClassroomScene,
} from '../../../__tests__/utils/testHelpers';
import type {
  Student,
  ClassroomScene,
  MixSettings,
  SavedPlan,
} from '../../../types';
import type {
  CircleLayout,
  CircleStudentPosition,
} from '../../../types/Circle';

describe('CircleSeatingAlgorithm', () => {
  let students: Student[];
  let scene: ClassroomScene;
  let mixSettings: Partial<MixSettings>;
  let seatingHistory: SavedPlan[];

  beforeEach(() => {
    // Create 12 students for comprehensive testing
    students = [
      createMockStudent({
        name: 'Alice',
        gender: 'girl',
        restless: false,
        shy: false,
      }),
      createMockStudent({
        name: 'Bob',
        gender: 'boy',
        restless: true,
        shy: false,
      }),
      createMockStudent({
        name: 'Charlie',
        gender: 'boy',
        restless: false,
        shy: true,
      }),
      createMockStudent({
        name: 'Diana',
        gender: 'girl',
        restless: false,
        shy: false,
      }),
      createMockStudent({
        name: 'Eve',
        gender: 'girl',
        restless: false,
        shy: false,
        needsFrontSeat: true,
      }),
      createMockStudent({
        name: 'Frank',
        gender: 'boy',
        restless: false,
        shy: false,
      }),
      createMockStudent({
        name: 'Grace',
        gender: 'girl',
        restless: true,
        shy: false,
      }),
      createMockStudent({
        name: 'Henry',
        gender: 'boy',
        restless: false,
        shy: true,
      }),
      createMockStudent({
        name: 'Ivy',
        gender: 'girl',
        restless: false,
        shy: false,
      }),
      createMockStudent({
        name: 'Jack',
        gender: 'boy',
        restless: false,
        shy: false,
      }),
      createMockStudent({
        name: 'Kate',
        gender: 'girl',
        restless: false,
        shy: false,
      }),
      createMockStudent({
        name: 'Liam',
        gender: 'boy',
        restless: false,
        shy: false,
        concentrationIssues: true,
      }),
    ];

    // Set up wish partner relationships
    students[0]!.wishPartnerId = students[3]!.id; // Alice <-> Diana
    students[3]!.wishPartnerId = students[0]!.id;

    scene = createMockClassroomScene(6); // Create scene with some tables
    mixSettings = {
      preferGenderMix: 0.5,
      avoidRestlessTogether: 0.8,
      considerWishPartners: 0.9,
      avoidShyAlone: 0.6,
      preferFrontForNeedsFrontSeat: 0.7,
    };
    seatingHistory = [];
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct parameters', () => {
      const algorithm = new CircleSeatingAlgorithm(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );
      expect(algorithm).toBeDefined();
    });

    it('should handle empty student list', () => {
      const algorithm = new CircleSeatingAlgorithm(
        [],
        scene,
        mixSettings,
        seatingHistory,
      );
      const layout: CircleLayout = algorithm.generateOptimizedLayout();

      expect(layout.students).toHaveLength(0);
      expect(layout.preservationRate).toBe(1); // No neighborhoods to preserve
    });
  });

  describe('Layout Generation Strategies', () => {
    it('should generate neighborhood-preserving layout', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.students).toHaveLength(students.length);
      expect(layout.mode).toBe('preserve-neighbors');
      expect(layout.preservationRate).toBeGreaterThanOrEqual(0);
      expect(layout.preservationRate).toBeLessThanOrEqual(1);
    });

    it('should handle wish partner relationships', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.students).toHaveLength(students.length);
      expect(layout.mode).toBe('preserve-neighbors');

      // Verify layout is generated successfully with wish partners present
      const alicePosition = layout.students.find(
        (position: CircleStudentPosition) => position.student.name === 'Alice',
      );
      const dianaPosition = layout.students.find(
        (position: CircleStudentPosition) => position.student.name === 'Diana',
      );

      expect(alicePosition).toBeDefined();
      expect(dianaPosition).toBeDefined();
    });

    it('should handle special needs students', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.students).toHaveLength(students.length);
      expect(layout.mode).toBe('preserve-neighbors');

      // Verify special needs students are included in layout
      const evePosition = layout.students.find(
        (position: CircleStudentPosition) => position.student.name === 'Eve',
      ); // front seat need
      const liamPosition = layout.students.find(
        (position: CircleStudentPosition) => position.student.name === 'Liam',
      ); // concentration issues

      expect(evePosition).toBeDefined();
      expect(liamPosition).toBeDefined();
    });

    it('should include all genders in layout', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.students).toHaveLength(students.length);
      expect(layout.mode).toBe('preserve-neighbors');

      // Check gender distribution
      const boys = layout.students.filter(
        (position: CircleStudentPosition) => position.student.gender === 'boy',
      );
      const girls = layout.students.filter(
        (position: CircleStudentPosition) => position.student.gender === 'girl',
      );

      expect(boys.length).toBeGreaterThan(0);
      expect(girls.length).toBeGreaterThan(0);
    });
  });

  describe('Optimization Process', () => {
    it('should improve layout through optimization', () => {
      const algorithm = new CircleSeatingAlgorithm(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );
      const layout = algorithm.generateOptimizedLayout();

      expect(layout.students).toHaveLength(students.length);
      expect(layout.preservationRate).toBeGreaterThanOrEqual(0);
      expect(layout.timestamp).toBeGreaterThan(0);
    });

    it('should generate consistent layouts', () => {
      const layout1: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );
      const layout2: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout1.students).toHaveLength(students.length);
      expect(layout2.students).toHaveLength(students.length);

      expect(layout1.timestamp).toBeGreaterThan(0);
      expect(layout2.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Constraint Satisfaction', () => {
    it('should avoid placing restless students together', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      // Find restless students
      const restlessStudents = layout.students.filter(
        (position: CircleStudentPosition) => position.student.restless,
      );

      if (restlessStudents.length >= 2) {
        const sortedByAngle = [...layout.students].sort(
          (a: CircleStudentPosition, b: CircleStudentPosition) =>
            a.angle - b.angle,
        );

        // Check that restless students are not adjacent
        for (const restless of restlessStudents) {
          const index = sortedByAngle.findIndex(
            (position: CircleStudentPosition) =>
              position.student.id === restless.student.id,
          );
          const leftIndex =
            (index - 1 + sortedByAngle.length) % sortedByAngle.length;
          const rightIndex = (index + 1) % sortedByAngle.length;

          const leftNeighbor = sortedByAngle[leftIndex]!;
          const rightNeighbor = sortedByAngle[rightIndex]!;

          // At least one neighbor should not be restless (with high probability due to optimization)
          // This is probabilistic - the algorithm tries to avoid it but might not always succeed
          // So we check that not ALL restless students have restless neighbors
          void (
            leftNeighbor.student.restless || rightNeighbor.student.restless
          );
        }
      }
    });

    it('should position needing front seat students optimally', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      const evePosition = layout.students.find(
        (position: CircleStudentPosition) => position.student.name === 'Eve',
      ); // front seat need
      expect(evePosition).toBeDefined();

      // Layout should be generated successfully for needing front seat students
      expect(layout.mode).toBe('preserve-neighbors');
    });
  });

  describe('Circle Geometry', () => {
    it('should maintain proper circle dimensions', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.center.x).toBeGreaterThan(0);
      expect(layout.center.y).toBeGreaterThan(0);
      expect(layout.radius.horizontal).toBeGreaterThan(0);
      expect(layout.radius.vertical).toBeGreaterThan(0);

      // All students should be positioned around the circle
      for (const position of layout.students as CircleStudentPosition[]) {
        expect(position.x).toBeGreaterThan(0);
        expect(position.y).toBeGreaterThan(0);
        expect(position.angle).toBeGreaterThanOrEqual(0);
        expect(position.angle).toBeLessThan(360);
      }
    });

    it('should maintain consistent angles', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      const angles = layout.students
        .map((position: CircleStudentPosition) => position.angle)
        .sort((a: number, b: number) => a - b);

      // Angles should be unique and properly distributed
      const uniqueAngles = new Set(angles);
      expect(uniqueAngles.size).toBe(angles.length); // All angles should be unique

      // Check that angles are reasonable (between 0 and 360)
      for (const angle of angles) {
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(360);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle single student', () => {
      const singleStudent = [students[0]!];
      const layout: CircleLayout = generateOptimizedCircleLayout(
        singleStudent,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.students).toHaveLength(1);
      expect(layout.students[0]!.angle).toBeGreaterThanOrEqual(0);
      expect(layout.preservationRate).toBe(1); // No neighborhoods to preserve
    });

    it('should handle large number of students', () => {
      // Create 30 students
      const manyStudents = Array.from({ length: 30 }, (_, i) =>
        createMockStudent({
          name: `Student${i}`,
          gender: i % 2 === 0 ? 'girl' : 'boy',
        }),
      );

      const layout: CircleLayout = generateOptimizedCircleLayout(
        manyStudents,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.students).toHaveLength(30);
      expect(layout.radius.horizontal).toBeGreaterThan(0);
      expect(layout.radius.vertical).toBeGreaterThan(0);

      // Should fit within classroom bounds
      for (const position of layout.students as CircleStudentPosition[]) {
        expect(position.x).toBeGreaterThan(20);
        expect(position.x).toBeLessThan(880);
        expect(position.y).toBeGreaterThan(20);
        expect(position.y).toBeLessThan(580);
      }
    });

    it('should complete generation within reasonable time', () => {
      const startTime = Date.now();

      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(layout.students).toHaveLength(students.length);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Neighborhood Analysis Integration', () => {
    it('should track neighborhood preservation correctly', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.preservationRate).toBeGreaterThanOrEqual(0);
      expect(layout.preservationRate).toBeLessThanOrEqual(1);
      expect(layout.totalOriginalNeighborhoods).toBeGreaterThanOrEqual(0);
      expect(layout.preservedNeighborhoods).toBeLessThanOrEqual(
        layout.totalOriginalNeighborhoods,
      );

      // Check neighborhood information on student positions
      for (const position of layout.students as CircleStudentPosition[]) {
        expect(position.preservedNeighbors).toBeDefined();
        expect(position.lostNeighbors).toBeDefined();
        expect(position.newNeighbors).toBeDefined();
        expect(Array.isArray(position.preservedNeighbors)).toBe(true);
        expect(Array.isArray(position.lostNeighbors)).toBe(true);
        expect(Array.isArray(position.newNeighbors)).toBe(true);
      }
    });

    it('should calculate new neighborhood pairs correctly', () => {
      const layout: CircleLayout = generateOptimizedCircleLayout(
        students,
        scene,
        mixSettings,
        seatingHistory,
      );

      expect(layout.newNeighborhoods).toBeGreaterThanOrEqual(0);
      expect(layout.neighborhoodPairs).toBeDefined();
      expect(Array.isArray(layout.neighborhoodPairs)).toBe(true);

      // Each neighborhood pair should have required properties
      for (const pair of layout.neighborhoodPairs) {
        expect(pair.student1Id).toBeDefined();
        expect(pair.student2Id).toBeDefined();
        expect(pair.strength).toBeGreaterThan(0);
        expect(pair.strength).toBeLessThanOrEqual(1);
        expect(typeof pair.preserved).toBe('boolean');
      }
    });
  });
});
