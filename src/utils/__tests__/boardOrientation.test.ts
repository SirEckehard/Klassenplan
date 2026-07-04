// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { ClassroomScene, ClassroomFeature } from '@/types';
import {
  getBoardEdge,
  getPresentationRotation,
} from '@/utils/ui/boardOrientation';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';

function sceneWithBoard(board?: Partial<ClassroomFeature>): ClassroomScene {
  return {
    tables: [],
    totalStudents: 0,
    features: board
      ? [
          {
            id: 'board-main',
            type: 'board',
            x: 0,
            y: 0,
            width: 24,
            height: 200,
            anchor: 'right',
            movable: false,
            ...board,
          },
        ]
      : [],
  };
}

describe('boardOrientation', () => {
  it('reads the board edge from the anchor', () => {
    expect(getBoardEdge(sceneWithBoard({ anchor: 'right' }))).toBe('right');
    expect(getBoardEdge(sceneWithBoard({ anchor: 'left' }))).toBe('left');
    expect(getBoardEdge(sceneWithBoard({ anchor: 'top' }))).toBe('top');
    expect(getBoardEdge(sceneWithBoard({ anchor: 'bottom' }))).toBe('bottom');
  });

  it('falls back to bottom without a board', () => {
    expect(getBoardEdge(sceneWithBoard())).toBe('bottom');
  });

  it('derives the nearest edge for a freely-placed board', () => {
    // Near the left edge.
    expect(
      getBoardEdge(
        sceneWithBoard({ anchor: 'free', x: 0, y: 250, width: 20, height: 100 }),
      ),
    ).toBe('left');
    // Near the top edge.
    expect(
      getBoardEdge(
        sceneWithBoard({
          anchor: 'free',
          x: CLASSROOM_WIDTH / 2 - 50,
          y: 0,
          width: 100,
          height: 20,
        }),
      ),
    ).toBe('top');
  });

  it('rotates a right-anchored board to the bottom for teacher, top for student', () => {
    const scene = sceneWithBoard({ anchor: 'right' });
    // Matches SceneSvg portrait export (+90 = "Tafel nach unten").
    expect(getPresentationRotation(scene, 'teacher')).toBe(90);
    expect(getPresentationRotation(scene, 'student')).toBe(270);
  });

  it('gives teacher/student a 180° difference for every edge', () => {
    (['left', 'right', 'top', 'bottom'] as const).forEach((anchor) => {
      const scene = sceneWithBoard({ anchor });
      const teacher = getPresentationRotation(scene, 'teacher');
      const student = getPresentationRotation(scene, 'student');
      expect((student - teacher + 360) % 360).toBe(180);
    });
  });

  it('keeps a bottom board upright for the teacher (no rotation)', () => {
    const scene = sceneWithBoard({
      anchor: 'bottom',
      x: 0,
      y: CLASSROOM_HEIGHT - 20,
      width: 200,
      height: 20,
    });
    expect(getPresentationRotation(scene, 'teacher')).toBe(0);
    expect(getPresentationRotation(scene, 'student')).toBe(180);
  });
});
