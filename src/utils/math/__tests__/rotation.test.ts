// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  snapRotationAngle,
  normalizeRotation,
  DEFAULT_ROTATION_SNAP_STEP,
  DEFAULT_ROTATION_SNAP_TOLERANCE,
} from '../../../utils/math/rotation';

describe('normalizeRotation', () => {
  it('normalizes angles into the 0-360 range', () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(0)).toBe(0);
  });

  it('returns 0 for invalid numbers', () => {
    expect(normalizeRotation(Number.NaN)).toBe(0);
    expect(normalizeRotation(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('snapRotationAngle', () => {
  it('snaps to the nearest multiple within tolerance', () => {
    const result = snapRotationAngle(92, {
      step: DEFAULT_ROTATION_SNAP_STEP,
      tolerance: DEFAULT_ROTATION_SNAP_TOLERANCE,
    });
    expect(result.snapped).toBe(true);
    expect(result.value).toBe(90);
    expect(result.normalized).toBe(90);
  });

  it('does not snap when outside tolerance', () => {
    const result = snapRotationAngle(70, {
      step: DEFAULT_ROTATION_SNAP_STEP,
      tolerance: 4,
    });
    expect(result.snapped).toBe(false);
    expect(result.value).toBe(70);
    expect(result.normalized).toBe(70);
  });

  it('supports snapping of negative angles', () => {
    const result = snapRotationAngle(-88, {
      step: DEFAULT_ROTATION_SNAP_STEP,
      tolerance: DEFAULT_ROTATION_SNAP_TOLERANCE,
    });
    expect(result.snapped).toBe(true);
    expect(result.value).toBe(-90);
    expect(result.normalized).toBe(270);
  });

  it('falls back gracefully for invalid inputs', () => {
    const result = snapRotationAngle(Number.NaN);
    expect(result.snapped).toBe(false);
    expect(result.value).toBe(0);
    expect(result.normalized).toBe(0);
  });
});
