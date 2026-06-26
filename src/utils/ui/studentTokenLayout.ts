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
  /**
   * Card mode only: where the name label band sits beneath the large avatar.
   * `null`/absent in compact and outward modes (the caller keeps the name at the
   * token centre as before).
   */
  nameBand?: { x: number; y: number; width: number; height: number; fontSize: number } | null;
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
  /**
   * "Learn names" density: a large photo fills the upper part of the token and
   * the name moves into a label band at the bottom (see returned `nameBand`).
   * Ignored together with `outward`. Falls back to the compact layout when the
   * token is too small for a worthwhile card avatar.
   */
  card?: boolean;
}

/** Smallest avatar radius worth drawing; below this we render the name only. */
const MIN_AVATAR_RADIUS = 7;
/** Gap kept between the avatar's bottom and the name's top edge. */
const AVATAR_NAME_GAP = 2;
/** Bounds for the radially-docked outside avatar (half the token radius). */
const OUTSIDE_AVATAR_MIN_RADIUS = 8;
const OUTSIDE_AVATAR_MAX_RADIUS = 18;
/**
 * Smallest card avatar worth drawing. Below this the token is too cramped for a
 * meaningful photo card, so we fall back to the compact "avatar above name"
 * layout instead (keeps tiny/rotated seats legible).
 */
const CARD_MIN_AVATAR_RADIUS = 12;
/** Inner padding kept around the card avatar and name band. */
const CARD_PADDING = 2;
/** Gap between the card avatar's bottom and the name band's top. */
const CARD_AVATAR_BAND_GAP = 2;

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
    card,
  } = params;

  if (!hasPhoto) {
    return { avatar: null };
  }

  // "Learn names" card density: a large photo fills the upper part of the seat
  // with the name in a label band at the bottom. Only meaningful for rect seats
  // (the circle keeps its outward avatar); falls back to compact when too small.
  if (card && !outward) {
    const top = centerY - height / 2 + CARD_PADDING;
    const bottom = centerY + height / 2 - CARD_PADDING;
    const innerWidth = width - CARD_PADDING * 2;
    // Reserve a name band at the bottom, sized to the name's font with padding.
    const bandHeight = Math.min(
      height * 0.34,
      Math.max(nameFontSize + 3, height * 0.24),
    );
    const avatarSpace = bottom - top - bandHeight - CARD_AVATAR_BAND_GAP;
    const radiusByHeight = avatarSpace / 2;
    const radiusByWidth = innerWidth / 2;
    const radius = Math.min(radiusByHeight, radiusByWidth);

    if (radius >= CARD_MIN_AVATAR_RADIUS) {
      const bandTop = bottom - bandHeight;
      return {
        avatar: { cx: centerX, cy: top + radius, r: radius },
        nameBand: {
          x: centerX - innerWidth / 2,
          y: bandTop,
          width: innerWidth,
          height: bandHeight,
          fontSize: Math.min(nameFontSize, bandHeight * 0.72),
        },
      };
    }
    // Too small for a card — fall through to the compact layout below.
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
