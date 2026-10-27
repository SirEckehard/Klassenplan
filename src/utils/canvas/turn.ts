// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A room drawn a quarter turn from how it is stored, for a screen held
 * upright (`utils/ui/portraitPlan.ts`). The plan draws a turned copy; the
 * room, which writes geometry, turns its drawing as a whole and turns every
 * pointer and arrow key back, so the stored room never sees the turn.
 *
 * A turn is clockwise in SVG degrees: 90 brings the right wall to the bottom,
 * 270 the left wall. The room is `width` × `height` as stored; drawn turned
 * it is `height` × `width`.
 */

/** A quarter turn, clockwise in SVG degrees. */
export type PlanTurn = 90 | 270;

type Point = { x: number; y: number };

/** Where a point of the stored room is drawn. */
export function turnPoint(
  turn: PlanTurn,
  point: Point,
  width: number,
  height: number,
): Point {
  return turn === 90
    ? { x: height - point.y, y: point.x }
    : { x: point.y, y: width - point.x };
}

/** The point of the stored room drawn at `point`. */
export function unturnPoint(
  turn: PlanTurn,
  point: Point,
  width: number,
  height: number,
): Point {
  return turn === 90
    ? { x: point.y, y: height - point.x }
    : { x: width - point.y, y: point.x };
}

/** The SVG transform that draws the stored room turned. */
export function turnTransform(
  turn: PlanTurn,
  width: number,
  height: number,
): string {
  return turn === 90
    ? `translate(${height} 0) rotate(90)`
    : `translate(0 ${width}) rotate(270)`;
}

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

const UNTURNED_DIRECTION: Record<
  PlanTurn,
  Record<ArrowDirection, ArrowDirection>
> = {
  // Drawn clockwise: what is up on screen is left in the stored room.
  90: { up: 'left', down: 'right', left: 'down', right: 'up' },
  270: { up: 'right', down: 'left', left: 'up', right: 'down' },
};

/**
 * The direction in the stored room of an arrow key pressed while the room is
 * drawn turned, so ↑ moves a table up on screen.
 */
export function unturnDirection<D extends ArrowDirection>(
  turn: PlanTurn | null,
  direction: D,
): ArrowDirection {
  return turn === null ? direction : UNTURNED_DIRECTION[turn][direction];
}

/** Reads the turn a drawing carries on its `<svg>` (`data-turn`). */
export function readSvgTurn(svg: Element): PlanTurn | null {
  const value = svg.getAttribute('data-turn');
  return value === '90' ? 90 : value === '270' ? 270 : null;
}
