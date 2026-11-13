// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The seat under a finger in the projection (decision 0045), on a table as it
 * stands and turned.
 */
import { describe, expect, it } from 'vitest';
import type { ClassroomScene, ClassroomTable, Student } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import { occupiedSeatShapes, seatAtPoint } from '../presentationSeats';

const double = (rotation: number): ClassroomTable => ({
  x: 400,
  y: 200,
  width: 55,
  height: 130,
  rotation,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

const ada = createMockStudent({ id: 'ada', name: 'Ada' }) as Student;
const ben = createMockStudent({ id: 'ben', name: 'Ben' }) as Student;

describe('the seats of the projection', () => {
  it.each([0, 90, 33])(
    'finds the seat under its own centre, turned %i°',
    (rotation) => {
      const scene: ClassroomScene = {
        tables: [double(rotation)],
        totalStudents: 2,
      };
      const shapes = occupiedSeatShapes(scene, [[ada, ben]]);

      for (const shape of shapes) {
        expect(seatAtPoint(shapes, { x: shape.x, y: shape.y })?.studentId).toBe(
          shape.studentId,
        );
      }
      expect(seatAtPoint(shapes, { x: 10, y: 10 })).toBeNull();
    },
  );

  it('leaves out empty seats', () => {
    const scene: ClassroomScene = { tables: [double(0)], totalStudents: 1 };
    const shapes = occupiedSeatShapes(scene, [[ada, null]]);

    expect(shapes.map((shape) => shape.studentId)).toEqual(['ada']);
  });

  it('tells two seats of a desk apart', () => {
    const scene: ClassroomScene = { tables: [double(0)], totalStudents: 2 };
    const shapes = occupiedSeatShapes(scene, [[ada, ben]]);
    const [first, second] = shapes;

    expect(
      seatAtPoint(shapes, {
        x: first!.x,
        y: first!.y + Math.sign(second!.y - first!.y) * (first!.height / 2 - 2),
      })?.studentId,
    ).toBe('ada');
  });
});
