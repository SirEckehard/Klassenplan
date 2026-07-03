// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Derives the projection rotation for the presentation view from the actual
 * position of the board ("Tafel") in the scene. The board is a freely movable
 * feature, so the rotation must be computed, not hard-coded.
 *
 * Teacher view keeps the board at the bottom (as if standing at the front);
 * student view rotates a further 180° so the board is at the top and left/right
 * are swapped — the room as the class actually sees it.
 */
import type { ClassroomScene } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';

export type BoardEdge = 'top' | 'bottom' | 'left' | 'right';
export type PresentationPerspective = 'teacher' | 'student';

/** Nearest classroom edge for a freely-placed board, by its centre point. */
function nearestEdge(centerX: number, centerY: number): BoardEdge {
  const distances: Record<BoardEdge, number> = {
    left: centerX,
    right: CLASSROOM_WIDTH - centerX,
    top: centerY,
    bottom: CLASSROOM_HEIGHT - centerY,
  };
  return (Object.keys(distances) as BoardEdge[]).reduce((best, edge) =>
    distances[edge] < distances[best] ? edge : best,
  );
}

/** The classroom edge the board sits on. Falls back to `bottom` without a board. */
export function getBoardEdge(scene: ClassroomScene): BoardEdge {
  const board = scene.features?.find((feature) => feature.type === 'board');
  if (!board) return 'bottom';
  if (board.anchor !== 'free') return board.anchor;
  return nearestEdge(board.x + board.width / 2, board.y + board.height / 2);
}

/**
 * SVG rotation (degrees, clockwise) that brings a given edge to the bottom of
 * the viewport. Matches `SceneSvg`'s portrait export (right-anchored board +90°
 * = "Tafel nach unten").
 */
const EDGE_TO_BOTTOM: Record<BoardEdge, number> = {
  bottom: 0,
  right: 90,
  top: 180,
  left: 270,
};

/**
 * Rotation for the whole classroom so the board lands at the bottom (teacher)
 * or top (student). Always a multiple of 90° in `[0, 360)`.
 */
export function getPresentationRotation(
  scene: ClassroomScene,
  perspective: PresentationPerspective,
): number {
  const base = EDGE_TO_BOTTOM[getBoardEdge(scene)];
  const rotation = base + (perspective === 'student' ? 180 : 0);
  return ((rotation % 360) + 360) % 360;
}
