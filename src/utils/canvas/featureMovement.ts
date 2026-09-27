// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature } from '@/types';
import { getRotatedAabbHalfExtents } from '../math/rotation';
import { clampCenterToRoom } from './featureResize';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Moves the selected room elements by `delta`, as the arrow keys do.
 *
 * A freely placed element (cabinet, divider, lectern) moves as a drag moves
 * it, its turned footprint kept inside the room. One on a wall slides along
 * that wall and never off it: sideways on the top and bottom walls, up and
 * down on the side walls — the other half of the step does not apply to it.
 */
export function moveFeaturesBy(
  features: readonly ClassroomFeature[],
  selectedIds: readonly string[],
  delta: { x: number; y: number },
  room: { width: number; height: number },
): ClassroomFeature[] {
  const selected = new Set(selectedIds);
  return features.map((feature) => {
    if (!selected.has(feature.id)) return feature;

    if (feature.anchor === 'free') {
      if (!feature.movable) return feature;
      const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
        feature.width,
        feature.height,
        feature.rotation ?? 0,
      );
      const centerX = clampCenterToRoom(
        feature.x + feature.width / 2 + delta.x,
        halfWidth,
        room.width,
      );
      const centerY = clampCenterToRoom(
        feature.y + feature.height / 2 + delta.y,
        halfHeight,
        room.height,
      );
      return {
        ...feature,
        x: centerX - feature.width / 2,
        y: centerY - feature.height / 2,
      };
    }

    if (feature.anchor === 'top' || feature.anchor === 'bottom') {
      if (delta.x === 0) return feature;
      return {
        ...feature,
        x: clamp(feature.x + delta.x, 0, room.width - feature.width),
      };
    }

    if (delta.y === 0) return feature;
    return {
      ...feature,
      y: clamp(feature.y + delta.y, 0, room.height - feature.height),
    };
  });
}
