// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';

/**
 * Direction of the "front" of the classroom.
 * - 'right': Higher X values are closer to front (board on right side)
 * - 'left': Lower X values are closer to front (board on left side)
 * - 'top': Lower Y values are closer to front (board on top)
 * - 'bottom': Higher Y values are closer to front (board on bottom)
 */
export type FrontDirection = 'right' | 'left' | 'top' | 'bottom';

/**
 * Context describing classroom orientation based on blackboard position.
 */
export interface OrientationContext {
  /** Direction of the front of the classroom */
  frontDirection: FrontDirection;
  /** True if higher X values are closer to front (right = front) */
  frontIsHighX: boolean;
  /** True if higher Y values are closer to front (bottom = front) */
  frontIsHighY: boolean;
  /** Which axis is dominant for front/back calculation */
  dominantAxis: 'x' | 'y';
}

/** Default orientation when no board is present or board is centered */
const DEFAULT_ORIENTATION: OrientationContext = {
  frontDirection: 'right',
  frontIsHighX: true,
  frontIsHighY: false,
  dominantAxis: 'x',
};

/**
 * Determines the "front" direction based on blackboard position.
 *
 * Logic:
 * - Finds the first board feature (sorted by ID for stability)
 * - Calculates board center position
 * - Determines which edge the board is closest to
 * - Uses the closest edge to determine front direction
 * - Sets dominant axis based on board position
 *
 * @param scene - Classroom scene containing features
 * @returns Orientation context with front direction
 */
export function determineFrontDirection(
  scene: ClassroomScene,
): OrientationContext {
  const features = scene.features ?? [];

  // Find all board features and sort by ID for stable ordering
  const boards = features
    .filter((f) => f.type === 'board')
    .sort((a, b) => a.id.localeCompare(b.id));

  if (boards.length === 0) {
    return DEFAULT_ORIENTATION;
  }

  // Use the first board (most stable reference)
  const board = boards[0]!;

  // Calculate board center
  const boardCenterX = board.x + board.width / 2;
  const boardCenterY = board.y + board.height / 2;

  // Calculate distances from board center to each edge
  const distanceToLeft = boardCenterX;
  const distanceToRight = CLASSROOM_WIDTH - boardCenterX;
  const distanceToTop = boardCenterY;
  const distanceToBottom = CLASSROOM_HEIGHT - boardCenterY;

  // Find the minimum distance (closest edge)
  const minDistance = Math.min(
    distanceToLeft,
    distanceToRight,
    distanceToTop,
    distanceToBottom,
  );

  // Determine front direction based on closest edge
  // The front is where the board is (students face the board)
  if (minDistance === distanceToRight) {
    return {
      frontDirection: 'right',
      frontIsHighX: true,
      frontIsHighY: false,
      dominantAxis: 'x',
    };
  } else if (minDistance === distanceToLeft) {
    return {
      frontDirection: 'left',
      frontIsHighX: false,
      frontIsHighY: false,
      dominantAxis: 'x',
    };
  } else if (minDistance === distanceToTop) {
    return {
      frontDirection: 'top',
      frontIsHighX: false,
      frontIsHighY: false,
      dominantAxis: 'y',
    };
  } else if (minDistance === distanceToBottom) {
    return {
      frontDirection: 'bottom',
      frontIsHighX: false,
      frontIsHighY: true,
      dominantAxis: 'y',
    };
  }

  // Fallback: board is exactly centered - use default
  return DEFAULT_ORIENTATION;
}
