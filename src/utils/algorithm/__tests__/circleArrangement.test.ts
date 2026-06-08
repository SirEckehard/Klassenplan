import { describe, it, expect } from 'vitest';
import { generateCircleLayout } from '../circleArrangement';
import type { Student, ClassroomScene } from '../../../types';
import type {
  CircleGenerationOptions,
  CircleStudentPosition,
} from '../../../types/Circle';

describe('circleArrangement', () => {
  const mockStudents: Student[] = [
    {
      id: '1',
      name: 'Anna',
      gender: 'girl',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    },
    {
      id: '2',
      name: 'Ben',
      gender: 'boy',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    },
    {
      id: '3',
      name: 'Clara',
      gender: 'girl',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    },
    {
      id: '4',
      name: 'David',
      gender: 'boy',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    },
  ];

  const mockClassroomScene: ClassroomScene = {
    tables: [
      {
        x: 100,
        y: 100,
        width: 55,
        height: 130,
        rotation: 0,
        seatCount: 2,
        templateType: 'double',
        locked: false,
        zIndex: 1,
      },
      {
        x: 200,
        y: 100,
        width: 55,
        height: 130,
        rotation: 0,
        seatCount: 2,
        templateType: 'double',
        locked: false,
        zIndex: 2,
      },
    ],
    totalStudents: 4,
  };

  describe('generateCircleLayout', () => {
    it('generates a basic circle layout', () => {
      const layout = generateCircleLayout(mockStudents, mockClassroomScene);

      expect(layout.students).toHaveLength(4);
      expect(layout.center).toMatchObject({ x: 450, y: 300 });
      expect(layout.radius.horizontal).toBeGreaterThan(0);
      expect(layout.radius.vertical).toBeGreaterThan(0);
      expect(layout.mode).toBe('preserve-neighbors');
      expect(layout.preservationRate).toBeGreaterThanOrEqual(0);
      expect(layout.preservationRate).toBeLessThanOrEqual(1);
    });

    it('calculates student positions in circle', () => {
      const layout = generateCircleLayout(mockStudents, mockClassroomScene);

      layout.students.forEach((studentPos: CircleStudentPosition) => {
        expect(studentPos.student).toBeDefined();
        expect(studentPos.angle).toBeGreaterThanOrEqual(0);
        expect(studentPos.angle).toBeLessThan(360);
        expect(studentPos.x).toBeGreaterThan(0);
        expect(studentPos.y).toBeGreaterThan(0);
        expect(Array.isArray(studentPos.preservedNeighbors)).toBe(true);
        expect(Array.isArray(studentPos.lostNeighbors)).toBe(true);
        expect(Array.isArray(studentPos.newNeighbors)).toBe(true);
      });
    });

    it('calculates circle dimensions correctly', () => {
      const layout = generateCircleLayout(mockStudents, mockClassroomScene);

      expect(layout.center.x).toBeGreaterThan(0);
      expect(layout.center.y).toBeGreaterThan(0);
      expect(layout.radius.horizontal).toBeGreaterThan(0);
      expect(layout.radius.vertical).toBeGreaterThan(0);
    });

    it('respects different arrangement modes', () => {
      const options: Partial<CircleGenerationOptions> = {
        mode: 'preserve-neighbors',
      };
      const layout = generateCircleLayout(
        mockStudents,
        mockClassroomScene,
        options,
      );

      expect(layout.mode).toBe('preserve-neighbors');
      expect(layout.students).toHaveLength(mockStudents.length);
    });

    it('handles empty student list', () => {
      const layout = generateCircleLayout([], mockClassroomScene);

      expect(layout.students).toHaveLength(0);
      expect(layout.preservationRate).toBe(1); // No neighborhoods to preserve = 100% preserved
    });

    it('calculates neighborhood statistics correctly', () => {
      const layout = generateCircleLayout(mockStudents, mockClassroomScene);

      expect(layout.totalOriginalNeighborhoods).toBeGreaterThanOrEqual(0);
      expect(layout.preservedNeighborhoods).toBeGreaterThanOrEqual(0);
      expect(layout.preservedNeighborhoods).toBeLessThanOrEqual(
        layout.totalOriginalNeighborhoods,
      );
      expect(layout.newNeighborhoods).toBeGreaterThanOrEqual(0);
      expect(layout.neighborhoodPairs).toBeDefined();
      expect(Array.isArray(layout.neighborhoodPairs)).toBe(true);
    });

    it('handles special needs positioning', () => {
      const studentsWithSpecialNeeds: Student[] = [
        { ...mockStudents[0], needsFrontSeat: true },
        { ...mockStudents[1] },
        { ...mockStudents[2], needsFrontSeat: true },
        { ...mockStudents[3] },
      ];

      const layout = generateCircleLayout(
        studentsWithSpecialNeeds,
        mockClassroomScene,
      );

      expect(layout.students).toHaveLength(studentsWithSpecialNeeds.length);
      expect(layout.mode).toBe('preserve-neighbors');
    });
  });
});
