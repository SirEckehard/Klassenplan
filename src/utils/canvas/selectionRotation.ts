// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature, ClassroomTable } from '@/types';
import { getRotatedAabbHalfExtents, normalizeRotation } from '../math/rotation';
import { clampCenterToRoom } from './featureResize';

/**
 * Turning a selection is one operation whichever way it is asked for — the
 * handle of a table or of a room element, Q/E, the inspector — and it moves
 * tables and freely placed room elements (cabinet, divider, lectern) alike.
 * The pieces here are what all of them share.
 */

/** Rotations to set, in degrees: tables by index, room elements by id. */
export interface SceneRotations {
  tables: ReadonlyMap<number, number>;
  features: ReadonlyMap<string, number>;
}

/** What a turn acts on, with the angle each element stands at. */
export interface RotationTargets {
  tables: ReadonlyArray<{ index: number; rotation: number }>;
  features: ReadonlyArray<{ id: string; rotation: number }>;
}

/**
 * Whether a room element turns: the freely placed, movable ones. A window, a
 * door or the board takes its angle from the wall it sits on.
 */
export const isRotatableFeature = (feature: ClassroomFeature): boolean =>
  feature.anchor === 'free' && feature.movable;

/**
 * The elements a turn of these ids moves: every unlocked table and every
 * rotatable room element among them. Locked tables stay where they are, as
 * they do under a drag.
 */
export function collectRotationTargets(
  tables: readonly ClassroomTable[],
  features: readonly ClassroomFeature[],
  tableIndices: readonly number[],
  featureIds: readonly string[],
): RotationTargets {
  return {
    tables: [...new Set(tableIndices)].flatMap((index) => {
      const table = tables[index];
      return table && !table.locked
        ? [{ index, rotation: table.rotation }]
        : [];
    }),
    features: features
      .filter(
        (feature) =>
          featureIds.includes(feature.id) && isRotatableFeature(feature),
      )
      .map((feature) => ({ id: feature.id, rotation: feature.rotation ?? 0 })),
  };
}

export const hasRotationTargets = (targets: RotationTargets): boolean =>
  targets.tables.length > 0 || targets.features.length > 0;

/** The angle every target turns to, derived from the angle it stands at. */
export function rotateTargets(
  targets: RotationTargets,
  next: (rotation: number) => number,
): SceneRotations {
  return {
    tables: new Map(
      targets.tables.map(({ index, rotation }) => [
        index,
        normalizeRotation(next(rotation)),
      ]),
    ),
    features: new Map(
      targets.features.map(({ id, rotation }) => [
        id,
        normalizeRotation(next(rotation)),
      ]),
    ),
  };
}

/** Whether any target would end up at another angle than it stands at. */
export function rotationsChangeTargets(
  targets: RotationTargets,
  rotations: SceneRotations,
): boolean {
  return (
    targets.tables.some(
      ({ index, rotation }) => rotations.tables.get(index) !== rotation,
    ) ||
    targets.features.some(
      ({ id, rotation }) => rotations.features.get(id) !== rotation,
    )
  );
}

export function applyTableRotations(
  tables: ClassroomTable[],
  rotations: ReadonlyMap<number, number>,
): ClassroomTable[] {
  if (rotations.size === 0) return tables;
  return tables.map((table, index) => {
    const rotation = rotations.get(index);
    return rotation === undefined ? table : { ...table, rotation };
  });
}

/**
 * Sets the given angles. An element turns around its own centre and is then
 * pulled back inside the room, so a cabinet turned against a wall does not end
 * up sticking out of it.
 */
export function applyFeatureRotations(
  features: ClassroomFeature[],
  rotations: ReadonlyMap<string, number>,
  room: { width: number; height: number },
): ClassroomFeature[] {
  if (rotations.size === 0) return features;
  return features.map((feature) => {
    const rotation = rotations.get(feature.id);
    if (rotation === undefined) return feature;
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      feature.width,
      feature.height,
      rotation,
    );
    const centerX = clampCenterToRoom(
      feature.x + feature.width / 2,
      halfWidth,
      room.width,
    );
    const centerY = clampCenterToRoom(
      feature.y + feature.height / 2,
      halfHeight,
      room.height,
    );
    return {
      ...feature,
      rotation,
      x: centerX - feature.width / 2,
      y: centerY - feature.height / 2,
    };
  });
}
