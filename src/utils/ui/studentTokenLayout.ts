// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Shared "name tag" geometry for student tokens (seat rectangles and circle
 * slots). The student photo is placed as a small circular avatar **centered on
 * the vertical axis, directly above the (centered) name** — never in a corner.
 *
 * Why the vertical axis matters: in the seating plan the name/photo group is
 * counter-rotated about the seat centre to stay upright while the table rotates.
 * A point on that rotation axis keeps a constant screen offset from the seat
 * centre, so an axis-aligned avatar always sits directly above the name at any
 * table rotation. A corner-anchored avatar (offset in x *and* y) visually drifts
 * off the tilted seat — the bug this replaces.
 *
 * The name itself stays vertically centred (unchanged), so existing name/needs
 * spacing is untouched; the avatar only occupies the otherwise-empty top zone
 * and gracefully disappears when the token is too small (like the badge pill).
 *
 * Circle slots (Sitzkreis) instead dock the avatar **radially outside** the
 * token via the `outward` param: the photo sits just beyond the token's outer
 * edge so it never overlaps the name, and its radius is self-contained (it does
 * not depend on the cramped space above the name — that previously made the
 * avatar vanish in the smaller PDF/print circles).
 */

export interface TokenPhotoLayout {
  /**
   * Circular avatar geometry in the token's local coordinates, or `null` when
   * there is no photo or not enough room (caller then renders the name only).
   */
  avatar: { cx: number; cy: number; r: number } | null;
}

export interface TokenPhotoLayoutParams {
  /** 'rect' = seat, 'circle' = circle slot. Affects top padding and avatar ratio. */
  shape: 'rect' | 'circle';
  /** Token centre in local coordinates (seat centre / circle slot centre). */
  centerX: number;
  centerY: number;
  /** rect: seat width/height. circle: the diameter for both. */
  width: number;
  height: number;
  hasPhoto: boolean;
  /** Rendered name font size, used to estimate the name's top edge. */
  nameFontSize: number;
  /**
   * When set, the avatar is docked radially **outside** the token instead of
   * above the name. `dirX`/`dirY` is the (not necessarily normalised) outward
   * direction from the token centre; `tokenRadius` is the token's outer radius.
   * The avatar's inner edge touches the token edge.
   */
  outward?: { dirX: number; dirY: number; tokenRadius: number };
}

/** Smallest avatar radius worth drawing; below this we render the name only. */
const MIN_AVATAR_RADIUS = 7;
/** Gap kept between the avatar's bottom and the name's top edge. */
const AVATAR_NAME_GAP = 2;
/** Bounds for the radially-docked outside avatar (half the token radius). */
const OUTSIDE_AVATAR_MIN_RADIUS = 8;
const OUTSIDE_AVATAR_MAX_RADIUS = 18;

/**
 * Compute the avatar placement for a student token. Pure / side-effect free so
 * it can be unit tested and shared by the live views and the PDF exports.
 */
export function computeTokenPhotoLayout(
  params: TokenPhotoLayoutParams,
): TokenPhotoLayout {
  const {
    shape,
    centerX,
    centerY,
    width,
    height,
    hasPhoto,
    nameFontSize,
    outward,
  } = params;

  if (!hasPhoto) {
    return { avatar: null };
  }

  // Radially-docked avatar just outside the token edge (Sitzkreis). The radius
  // is self-contained so it stays visible even in the small print/export circles.
  if (outward) {
    const length = Math.hypot(outward.dirX, outward.dirY) || 1;
    const nx = outward.dirX / length;
    const ny = outward.dirY / length;
    const r = Math.min(
      OUTSIDE_AVATAR_MAX_RADIUS,
      Math.max(OUTSIDE_AVATAR_MIN_RADIUS, outward.tokenRadius * 0.5),
    );
    const distance = outward.tokenRadius + r;
    return {
      avatar: { cx: centerX + nx * distance, cy: centerY + ny * distance, r },
    };
  }

  // Approximate top edge of the centred name (cap-height ≈ 0.6 × font size).
  const nameTop = centerY - nameFontSize * 0.6;
  const topPad = shape === 'circle' ? 3 : 2;
  const topEdge = centerY - height / 2 + topPad;

  // Largest radius that fits between the top edge and the name (height-bound),
  // never wider than a sensible share of the token width (width-bound).
  const radiusByHeight = (nameTop - topEdge - AVATAR_NAME_GAP) / 2;
  const radiusByWidth = width * (shape === 'circle' ? 0.18 : 0.22);
  const radius = Math.min(radiusByHeight, radiusByWidth);

  if (radius < MIN_AVATAR_RADIUS) {
    return { avatar: null };
  }

  return { avatar: { cx: centerX, cy: topEdge + radius, r: radius } };
}
