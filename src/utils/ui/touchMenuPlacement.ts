// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/** Space kept between the menu and the edge of the room it opens in. */
const EDGE_MARGIN = 8;
/** Space between the fingertip and a menu above it. */
const GAP_ABOVE = 16;
/**
 * How far a menu beside or below the finger keeps from the point it pressed:
 * a fingertip covers about 44px, and a little more keeps it in sight.
 */
const FINGER_CLEARANCE = 32;

interface TouchMenuPlacementInput {
  /** Where the finger pressed, relative to the menu's container. */
  x: number;
  y: number;
  menuWidth: number;
  menuHeight: number;
  containerWidth: number;
  containerHeight: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(max, min));

/**
 * Where a menu opened by a long press goes: above the finger, else beside it,
 * else below it — never under it.
 *
 * The finger that opened the menu lifts right after, and wherever it lifts
 * is where the browser may send its click. Clamped into the room, a menu for
 * a table near the top edge used to slide down under the finger, and the lift
 * chose whichever entry lay there. Above comes first because the hand lies
 * below the finger; the side keeps the menu in sight at the finger's height.
 * Only when none of the four fits is the menu clamped above it as before.
 */
export function placeTouchMenu({
  x,
  y,
  menuWidth,
  menuHeight,
  containerWidth,
  containerHeight,
}: TouchMenuPlacementInput): { left: number; top: number } {
  const maxLeft = containerWidth - menuWidth - EDGE_MARGIN;
  const maxTop = containerHeight - menuHeight - EDGE_MARGIN;
  const centredLeft = clamp(x - menuWidth / 2, EDGE_MARGIN, maxLeft);
  const middleTop = clamp(y - menuHeight / 2, EDGE_MARGIN, maxTop);

  const above = y - GAP_ABOVE - menuHeight;
  if (above >= EDGE_MARGIN) {
    return { left: centredLeft, top: above };
  }
  const right = x + FINGER_CLEARANCE;
  if (right <= maxLeft) {
    return { left: right, top: middleTop };
  }
  const left = x - FINGER_CLEARANCE - menuWidth;
  if (left >= EDGE_MARGIN) {
    return { left, top: middleTop };
  }
  const below = y + FINGER_CLEARANCE;
  if (below <= maxTop) {
    return { left: centredLeft, top: below };
  }
  return { left: centredLeft, top: clamp(above, EDGE_MARGIN, maxTop) };
}
