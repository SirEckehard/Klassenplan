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
