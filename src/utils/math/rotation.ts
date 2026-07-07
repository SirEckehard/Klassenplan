// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export interface RotationSnapOptions {
  step?: number;
  tolerance?: number;
}

export interface RotationSnapResult {
  value: number;
  normalized: number;
  snapped: boolean;
  target: number;
}

export const DEFAULT_ROTATION_SNAP_STEP = 45;
export const DEFAULT_ROTATION_SNAP_TOLERANCE = 6;
const FULL_ROTATION = 360;

export const normalizeRotation = (angle: number): number => {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  const normalized = angle % FULL_ROTATION;
  return normalized < 0 ? normalized + FULL_ROTATION : normalized;
};

/**
 * Half extents of the axis-aligned bounding box of a `width`×`height` rect
 * rotated by `rotationDeg` around its center. Used to clamp rotated movable
 * features (cabinet, divider, …) to the classroom bounds.
 */
export const getRotatedAabbHalfExtents = (
  width: number,
  height: number,
  rotationDeg: number,
): { halfWidth: number; halfHeight: number } => {
  const radians = (normalizeRotation(rotationDeg) * Math.PI) / 180;
  // Round away float noise (cos(90°) ≈ 6e-17) so right-angle rotations
  // yield exact extents and clean persisted positions.
  const cos = Math.round(Math.abs(Math.cos(radians)) * 1e12) / 1e12;
  const sin = Math.round(Math.abs(Math.sin(radians)) * 1e12) / 1e12;
  return {
    halfWidth: (width * cos + height * sin) / 2,
    halfHeight: (width * sin + height * cos) / 2,
  };
};

export const snapRotationAngle = (
  angle: number,
  options: RotationSnapOptions = {},
): RotationSnapResult => {
  if (!Number.isFinite(angle)) {
    return {
      value: 0,
      normalized: 0,
      snapped: false,
      target: 0,
    };
  }

  const step =
    options.step && options.step > 0
      ? options.step
      : DEFAULT_ROTATION_SNAP_STEP;
  const tolerance =
    options.tolerance && options.tolerance >= 0
      ? options.tolerance
      : DEFAULT_ROTATION_SNAP_TOLERANCE;

  const nearestMultiple = Math.round(angle / step) * step;
  const delta = Math.abs(nearestMultiple - angle);

  if (delta <= tolerance) {
    const normalized = normalizeRotation(nearestMultiple);
    return {
      value: nearestMultiple,
      normalized,
      snapped: true,
      target: normalized,
    };
  }

  const normalized = normalizeRotation(angle);
  return {
    value: angle,
    normalized,
    snapped: false,
    target: normalized,
  };
};
