// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { determineFrontDirection } from '../orientationUtils';
import type { ClassroomScene, ClassroomFeature } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';

// Helper to create a scene with a board at specified X position (vertically centered for proper edge detection)
const createSceneWithBoard = (
  boardX: number,
  boardWidth = 200,
): ClassroomScene => {
  // Place board vertically centered so X position determines closest edge
  const boardY = CLASSROOM_HEIGHT / 2 - 25; // Center Y for 50-height board
  const board: ClassroomFeature = {
    id: 'board-1',
    type: 'board',
    x: boardX,
    y: boardY,
    width: boardWidth,
    height: 50,
    anchor: 'right',
    movable: true,
  };

  return {
    tables: [
      {
        x: 100,
        y: 200,
        width: 100,
        height: 60,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
      },
    ],
    totalStudents: 2,
    features: [board],
  };
};

// Helper to create a scene without a board
const createSceneWithoutBoard = (): ClassroomScene => ({
  tables: [
    {
      x: 100,
      y: 200,
      width: 100,
      height: 60,
      rotation: 0,
      seatCount: 2,
      locked: false,
      zIndex: 0,
    },
  ],
  totalStudents: 2,
  features: [],
});

// Helper to create a scene with multiple boards (both vertically centered)
const createSceneWithMultipleBoards = (): ClassroomScene => {
  const boardY = CLASSROOM_HEIGHT / 2 - 25; // Center Y for 50-height boards

  const boardLeft: ClassroomFeature = {
    id: 'board-a', // Alphabetically first
    type: 'board',
    x: 0, // Directly touching left edge
    y: boardY,
    width: 200,
    height: 50,
    anchor: 'left',
    movable: true,
  };

  const boardRight: ClassroomFeature = {
    id: 'board-b',
    type: 'board',
    x: CLASSROOM_WIDTH - 200, // Directly touching right edge
    y: boardY,
    width: 200,
    height: 50,
    anchor: 'right',
    movable: true,
  };

  return {
    tables: [
      {
        x: 400,
        y: 200,
        width: 100,
        height: 60,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
      },
    ],
    totalStudents: 2,
    features: [boardRight, boardLeft], // Intentionally out of order
  };
};

describe('determineFrontDirection', () => {
  it('returns right when board is on right side of classroom', () => {
    // Board on right side (x > center)
    const scene = createSceneWithBoard(CLASSROOM_WIDTH - 250);
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('right');
    expect(result.frontIsHighX).toBe(true);
    expect(result.dominantAxis).toBe('x');
  });

  it('returns left when board is on left side of classroom', () => {
    // Board on left side (x + width/2 < center)
    const scene = createSceneWithBoard(50);
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('left');
    expect(result.frontIsHighX).toBe(false);
    expect(result.dominantAxis).toBe('x');
  });

  it('falls back to right when no board is present', () => {
    const scene = createSceneWithoutBoard();
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('right');
    expect(result.frontIsHighX).toBe(true);
    expect(result.dominantAxis).toBe('x');
  });

  it('returns top when board is centered horizontally but closer to top/bottom edge', () => {
    // Board center at exactly classroom center X
    // Board is vertically centered at Y = CLASSROOM_HEIGHT/2 - 25 = 275
    const boardWidth = 200;
    const boardX = CLASSROOM_WIDTH / 2 - boardWidth / 2;
    const scene = createSceneWithBoard(boardX, boardWidth);
    const result = determineFrontDirection(scene);

    // Board center: X=450, Y=300
    // distanceToLeft = 450, distanceToRight = 450
    // distanceToTop = 300, distanceToBottom = 300
    // Min distance = 300 (top or bottom), so 'top' wins (checked first)
    expect(result.frontDirection).toBe('top');
    expect(result.frontIsHighY).toBe(false); // top = low Y = front
    expect(result.dominantAxis).toBe('y');
  });

  it('uses first board by ID when multiple boards exist', () => {
    const scene = createSceneWithMultipleBoards();
    const result = determineFrontDirection(scene);

    // First board by ID is 'board-a' which is on the left
    expect(result.frontDirection).toBe('left');
    expect(result.frontIsHighX).toBe(false);
  });

  it('handles empty features array', () => {
    const scene: ClassroomScene = {
      tables: [],
      totalStudents: 0,
      features: [],
    };
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('right');
    expect(result.frontIsHighX).toBe(true);
  });

  it('handles undefined features', () => {
    const scene: ClassroomScene = {
      tables: [],
      totalStudents: 0,
    };
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('right');
    expect(result.frontIsHighX).toBe(true);
  });

  it('ignores non-board features', () => {
    const windowFeature: ClassroomFeature = {
      id: 'window-1',
      type: 'window',
      x: 50,
      y: 100,
      width: 100,
      height: 50,
      anchor: 'left',
      movable: true,
    };

    const scene: ClassroomScene = {
      tables: [],
      totalStudents: 0,
      features: [windowFeature],
    };
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('right');
    expect(result.frontIsHighX).toBe(true);
  });

  it('ignores whiteboards when no board exists', () => {
    const whiteboard: ClassroomFeature = {
      id: 'whiteboard-1',
      type: 'whiteboard',
      x: 0,
      y: CLASSROOM_HEIGHT / 2 - 80,
      width: 24,
      height: 160,
      anchor: 'left',
      movable: false,
    };

    const scene: ClassroomScene = {
      tables: [],
      totalStudents: 0,
      features: [whiteboard],
    };
    const result = determineFrontDirection(scene);

    // Whiteboards must not define the front — falls back to the default
    expect(result.frontDirection).toBe('right');
    expect(result.frontIsHighX).toBe(true);
  });

  it('keeps the board as front reference when whiteboards exist', () => {
    const scene = createSceneWithBoard(0); // Board on the left edge
    scene.features?.push({
      id: 'whiteboard-1',
      type: 'whiteboard',
      x: CLASSROOM_WIDTH - 24,
      y: CLASSROOM_HEIGHT / 2 - 80,
      width: 24,
      height: 160,
      anchor: 'right',
      movable: false,
    });
    const result = determineFrontDirection(scene);

    expect(result.frontDirection).toBe('left');
    expect(result.frontIsHighX).toBe(false);
  });
});
