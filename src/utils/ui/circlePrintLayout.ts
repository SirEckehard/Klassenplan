// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Where the circle lands on a printed sheet, and how large its places are.
 *
 * The circle used to be fitted into the 900×600 room first and the room into
 * the page, with places of a fixed 16 to 30 points — on a portrait sheet the
 * ring stayed in a landscape box, and the places were small whatever the
 * class. Here the ring itself, with its places and the photos docked outside
 * them, is fitted to the area the page leaves for it, and a place is as large
 * as the gap to its nearest neighbour allows.
 */

/** Smallest place on paper, in points. */
export const PRINT_TOKEN_MIN_RADIUS = 14;
/** Largest place, so a small class does not fill the page with discs. */
export const PRINT_TOKEN_MAX_RADIUS = 48;
/** Largest photo docked outside a place (the screen keeps 18). */
export const PRINT_AVATAR_MAX_RADIUS = 24;
const PRINT_AVATAR_MIN_RADIUS = 8;
/** A place's radius as a share of the distance to its nearest neighbour. */
const TOKEN_SPACING = 0.45;
/** Room for the outline around the outermost places. */
const EDGE = 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** The photo docked outside a printed place (see `computeTokenPhotoLayout`). */
export const printAvatarRadius = (tokenRadius: number) =>
  clamp(tokenRadius * 0.5, PRINT_AVATAR_MIN_RADIUS, PRINT_AVATAR_MAX_RADIUS);

export type PrintRing = {
  /** Points on the page per unit of the layout's radii. */
  scale: number;
  tokenRadius: number;
  centerX: number;
  centerY: number;
  /** Centre of each place, by student id. */
  positions: Map<string, { x: number; y: number }>;
};

/**
 * Fit the ring into `area`.
 *
 * @param placements - The students' angles on the oval, in degrees
 * @param radius - The oval's radii as the circle layout stores them
 * @param portrait - Turns the oval a quarter, as the portrait sheet always has
 * @param withPhotos - Whether photos are docked outside the places
 */
export function fitPrintRing({
  placements,
  radius,
  area,
  portrait,
  withPhotos,
}: {
  placements: ReadonlyArray<{ id: string; angle: number }>;
  radius: { horizontal: number; vertical: number };
  area: { x: number; y: number; width: number; height: number };
  portrait: boolean;
  withPhotos: boolean;
}): PrintRing {
  const radiusX = radius.horizontal > 0 ? radius.horizontal : 200;
  const radiusY = radius.vertical > 0 ? radius.vertical : 150;
  // Positions at scale 1 around the ring's centre; portrait turns (x, y)
  // into (-y, x).
  const unit = placements
    .filter(({ angle }) => Number.isFinite(angle))
    .map(({ id, angle }) => {
      const radians = (angle * Math.PI) / 180;
      const x = Math.cos(radians) * radiusX;
      const y = Math.sin(radians) * radiusY;
      return portrait ? { id, x: -y, y: x } : { id, x, y };
    });
  const extentX = portrait ? radiusY : radiusX;
  const extentY = portrait ? radiusX : radiusY;

  let nearest = Infinity;
  for (let i = 0; i < unit.length; i++) {
    for (let j = i + 1; j < unit.length; j++) {
      nearest = Math.min(
        nearest,
        Math.hypot(unit[i].x - unit[j].x, unit[i].y - unit[j].y),
      );
    }
  }

  const tokenRadiusAt = (scale: number) =>
    Number.isFinite(nearest)
      ? clamp(
          TOKEN_SPACING * nearest * scale,
          PRINT_TOKEN_MIN_RADIUS,
          PRINT_TOKEN_MAX_RADIUS,
        )
      : PRINT_TOKEN_MAX_RADIUS;
  const reachAt = (scale: number) => {
    const tokenRadius = tokenRadiusAt(scale);
    return (
      tokenRadius + (withPhotos ? 2 * printAvatarRadius(tokenRadius) : 0) + EDGE
    );
  };
  const fits = (scale: number) =>
    scale * extentX + reachAt(scale) <= area.width / 2 &&
    scale * extentY + reachAt(scale) <= area.height / 2;

  // Everything grows with the scale, so the largest one that fits is found by
  // halving the interval.
  let low = 0;
  let high = Math.min(area.width / 2 / extentX, area.height / 2 / extentY);
  if (fits(high)) {
    low = high;
  } else {
    for (let step = 0; step < 30; step++) {
      const middle = (low + high) / 2;
      if (fits(middle)) {
        low = middle;
      } else {
        high = middle;
      }
    }
  }

  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;
  return {
    scale: low,
    tokenRadius: tokenRadiusAt(low),
    centerX,
    centerY,
    positions: new Map(
      unit.map(({ id, x, y }) => [
        id,
        { x: centerX + x * low, y: centerY + y * low },
      ]),
    ),
  };
}
