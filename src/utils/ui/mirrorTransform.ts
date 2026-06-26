// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Helpers for the "student perspective" mirror (smartboard projection): the
 * whole seating plan is flipped left↔right so a student looking at the projected
 * plan finds themselves as in a mirror (teacher's "back-left" → student's
 * "bottom-right"); front/back is preserved.
 *
 * Strategy: mirror only the *positions* by flipping the position group about its
 * vertical axis ({@link getMirrorGroupTransform}). Readable content (names,
 * badges, labels) would then appear mirror-imaged, so each such glyph re-applies
 * a local flip about its own centre ({@link getMirrorCounterTransform}) — the
 * position stays mirrored, the glyph reads normally.
 */

/**
 * Transform for the group that holds all mirror-able positions. Flips about the
 * vertical axis at `width / 2` (expressed as translate+scale so it composes with
 * the SVG `viewBox`). Returns `undefined` when not mirrored so callers can omit
 * the attribute entirely.
 */
export function getMirrorGroupTransform(
  width: number,
  mirrored: boolean,
): string | undefined {
  return mirrored ? `translate(${width} 0) scale(-1 1)` : undefined;
}

/**
 * Local counter-flip about a vertical axis at `centerX` (in the element's own
 * coordinate system) that un-mirrors a glyph while keeping its mirrored
 * position. Returns `undefined` when not mirrored.
 */
export function getMirrorCounterTransform(
  centerX: number,
  mirrored: boolean,
): string | undefined {
  return mirrored ? `translate(${2 * centerX} 0) scale(-1 1)` : undefined;
}

/** Join transform fragments, dropping empties; returns `undefined` if all empty. */
export function composeTransforms(
  ...parts: (string | undefined | false | null)[]
): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part));
  return filtered.length > 0 ? filtered.join(' ') : undefined;
}
