// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Which of a set of points an arrow key leads to — the plan's seats have no
 * order a keyboard could walk, only a place on the drawing.
 *
 * A candidate counts only when it lies ahead in the arrow's direction. Of
 * those the nearest wins, where a step sideways costs twice a step ahead: from
 * a seat at the end of a row, → reaches the first seat of the next table in
 * that row rather than one diagonally above it that happens to be a little
 * closer. The weighting is the one spatial navigation in browsers uses.
 */
export type ArrowDirection = 'left' | 'right' | 'up' | 'down';

type Point = { x: number; y: number };

const ARROW_KEYS: Readonly<Record<string, ArrowDirection>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

/** The direction an arrow key points in, or null for any other key. */
export function arrowDirection(key: string): ArrowDirection | null {
  return ARROW_KEYS[key] ?? null;
}

// Below this, two centres count as level: seats of one table drawn a pixel
// apart must not be "ahead" of each other.
const AHEAD_THRESHOLD = 1;

/** Index of the candidate the arrow leads to, or -1 when nothing lies ahead. */
export function nearestInDirection(
  from: Point,
  candidates: ReadonlyArray<Point>,
  direction: ArrowDirection,
): number {
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((point, index) => {
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    const ahead =
      direction === 'right'
        ? dx
        : direction === 'left'
          ? -dx
          : direction === 'down'
            ? dy
            : -dy;
    if (ahead < AHEAD_THRESHOLD) return;
    const aside = direction === 'left' || direction === 'right' ? dy : dx;
    const score = ahead + 2 * Math.abs(aside);
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}
