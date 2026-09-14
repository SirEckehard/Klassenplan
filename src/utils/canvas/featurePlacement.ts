// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Placement math for room elements (windows, doors, boards, cabinets, …): wall
 * snapping and orientation for fixed elements, room clamping for movable ones,
 * the anchor rotation and the magnetic guide snap. Shared by the feature drag,
 * the palette drop and paste, so all of them land on identical coordinates.
 */
import type {
  ClassroomFeature,
  ClassroomFeatureAnchor,
  ClassroomFeatureType,
} from '@/types';
import { GRID_SNAP_SIZE } from '../constants';
import { getRotatedAabbHalfExtents } from '../math/rotation';
import {
  ALIGNMENT_GUIDE_EPSILON,
  computeAlignmentSnap,
  getRotatedAabb,
  type AlignmentGuide,
  type AlignmentRect,
} from './alignmentGuides';
import { clampCenterToRoom } from './featureResize';

export type FeaturePlacement = {
  x: number;
  y: number;
  anchor: ClassroomFeatureAnchor;
  width: number;
  height: number;
};

/**
 * Structural size input for the placement helpers. Both palette templates and
 * live features satisfy this, so moving/pasting a resized feature keeps its
 * per-instance dimensions instead of resetting to the template defaults.
 */
export type FeatureSize = {
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Applies the magnetic guide snap to a movable feature placement and returns
 * the exactly-hit guides for the final (re-clamped) position. Shared by the
 * live feature drag, the palette ghost and the palette drop so all three land
 * on identical coordinates.
 */
export const snapMovablePlacementToGuides = <P extends FeaturePlacement>(
  placement: P,
  size: FeatureSize,
  rotation: number,
  targets: AlignmentRect[],
  classroomWidth: number,
  classroomHeight: number,
): { placement: P; guides: AlignmentGuide[] } => {
  const canvasDims = { width: classroomWidth, height: classroomHeight };
  const aabbOf = (frame: { x: number; y: number }) =>
    getRotatedAabb({
      x: frame.x,
      y: frame.y,
      width: size.width,
      height: size.height,
      rotation,
    });
  const { offset } = computeAlignmentSnap(
    aabbOf(placement),
    targets,
    canvasDims,
  );
  let next = placement;
  if (offset.x !== 0 || offset.y !== 0) {
    // Guide snap wins over grid snap, but the room bounds stay the last word.
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      size.width,
      size.height,
      rotation,
    );
    const centerX = clampCenterToRoom(
      placement.x + size.width / 2 + offset.x,
      halfWidth,
      classroomWidth,
    );
    const centerY = clampCenterToRoom(
      placement.y + size.height / 2 + offset.y,
      halfHeight,
      classroomHeight,
    );
    next = {
      ...placement,
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
    };
  }
  const { guides } = computeAlignmentSnap(
    aabbOf(next),
    targets,
    canvasDims,
    ALIGNMENT_GUIDE_EPSILON,
  );
  return { placement: next, guides };
};

const snapToGridValue = (value: number, shouldSnap: boolean) =>
  shouldSnap ? Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE : value;

const determineAnchorForPoint = (
  x: number,
  y: number,
  classroomWidth: number,
  classroomHeight: number,
): ClassroomFeatureAnchor => {
  const distances = {
    left: x,
    right: classroomWidth - x,
    top: y,
    bottom: classroomHeight - y,
  } as const;

  let anchor: ClassroomFeatureAnchor = 'left';
  let minDistance = Number.POSITIVE_INFINITY;

  (['left', 'right', 'top', 'bottom'] as const).forEach((key) => {
    if (distances[key] < minDistance) {
      anchor = key;
      minDistance = distances[key];
    }
  });

  return anchor;
};

const getOrientedDimensions = (
  size: FeatureSize,
  anchor: ClassroomFeatureAnchor,
) => {
  const isHorizontalWall = anchor === 'top' || anchor === 'bottom';
  const isVerticalWall = anchor === 'left' || anchor === 'right';

  let width = size.width;
  let height = size.height;

  if (isHorizontalWall) {
    if (height > width) {
      width = size.height;
      height = size.width;
    }
  } else if (isVerticalWall) {
    if (width > height) {
      width = size.height;
      height = size.width;
    }
  }

  return { width, height };
};

export const placeMovableFeatureBase = (
  size: FeatureSize,
  desiredX: number,
  desiredY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
  rotation = 0,
): FeaturePlacement => {
  // Rotation happens around the feature center, so the clamp works on the
  // center against the rotated footprint (AABB). This lets e.g. a
  // 90°-rotated cabinet sit flush against the side walls; the returned
  // top-left of the unrotated rect may legitimately be negative.
  const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
    size.width,
    size.height,
    rotation,
  );
  const centerX = clampCenterToRoom(
    snapToGridValue(desiredX, snapToGrid) + size.width / 2,
    halfWidth,
    classroomWidth,
  );
  const centerY = clampCenterToRoom(
    snapToGridValue(desiredY, snapToGrid) + size.height / 2,
    halfHeight,
    classroomHeight,
  );
  return {
    x: centerX - size.width / 2,
    y: centerY - size.height / 2,
    anchor: 'free',
    width: size.width,
    height: size.height,
  };
};

export const placeFixedFeatureBase = (
  size: FeatureSize,
  pointerX: number,
  pointerY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
): FeaturePlacement => {
  const anchor = determineAnchorForPoint(
    pointerX,
    pointerY,
    classroomWidth,
    classroomHeight,
  );

  const { width: orientedWidth, height: orientedHeight } =
    getOrientedDimensions(size, anchor);

  switch (anchor) {
    case 'left':
      return {
        x: 0,
        y: clamp(
          snapToGridValue(pointerY - orientedHeight / 2, snapToGrid),
          0,
          classroomHeight - orientedHeight,
        ),
        anchor,
        width: orientedWidth,
        height: orientedHeight,
      };
    case 'right':
      return {
        x: classroomWidth - orientedWidth,
        y: clamp(
          snapToGridValue(pointerY - orientedHeight / 2, snapToGrid),
          0,
          classroomHeight - orientedHeight,
        ),
        anchor,
        width: orientedWidth,
        height: orientedHeight,
      };
    case 'top':
      return {
        x: clamp(
          snapToGridValue(pointerX - orientedWidth / 2, snapToGrid),
          0,
          classroomWidth - orientedWidth,
        ),
        y: 0,
        anchor,
        width: orientedWidth,
        height: orientedHeight,
      };
    case 'bottom':
    default:
      return {
        x: clamp(
          snapToGridValue(pointerX - orientedWidth / 2, snapToGrid),
          0,
          classroomWidth - orientedWidth,
        ),
        y: classroomHeight - orientedHeight,
        anchor: 'bottom',
        width: orientedWidth,
        height: orientedHeight,
      };
  }
};

/**
 * Rotation a wall-mounted feature type gets for the given anchor; other types
 * (and the free anchor) keep the provided fallback rotation.
 */
const getFeatureAnchorRotation = (
  type: ClassroomFeatureType,
  anchor: ClassroomFeatureAnchor,
  fallback: number,
): number => {
  if (
    type !== 'window' &&
    type !== 'door' &&
    type !== 'board' &&
    type !== 'whiteboard'
  ) {
    return fallback;
  }

  switch (anchor) {
    case 'left':
      return 0;
    case 'right':
      return 180;
    case 'top':
      return -90;
    case 'bottom':
      return 90;
    case 'free':
    default:
      return fallback;
  }
};

export const rotateFeatureForAnchor = (
  feature: ClassroomFeature,
  anchor: ClassroomFeatureAnchor,
): ClassroomFeature => {
  const rotation = getFeatureAnchorRotation(
    feature.type,
    anchor,
    feature.rotation ?? 0,
  );
  return rotation === (feature.rotation ?? 0)
    ? feature
    : { ...feature, rotation };
};

export type FeatureDropPlacement = FeaturePlacement & {
  rotation: number;
  movable: boolean;
};

/**
 * What the drop placement reads from a palette template. `FeatureTemplate`
 * (`src/hooks/canvas/featureTemplates.ts`) satisfies it; the shape is spelled
 * out here because utils do not import the hook layer.
 */
export type FeatureDropTemplate = FeatureSize & {
  type: ClassroomFeatureType;
  movable: boolean;
};

/**
 * Placement math shared by the palette drag preview and the actual drop so
 * the live ghost sits exactly where the feature will land (including wall
 * snapping and the anchor rotation).
 */
export const computeFeatureDropPlacement = (
  template: FeatureDropTemplate,
  sceneX: number,
  sceneY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
): FeatureDropPlacement => {
  const initialRotation = template.type === 'podium' ? 90 : 0;

  if (template.movable) {
    const placement = placeMovableFeatureBase(
      template,
      sceneX - template.width / 2,
      sceneY - template.height / 2,
      snapToGrid,
      classroomWidth,
      classroomHeight,
      initialRotation,
    );
    return { ...placement, rotation: initialRotation, movable: true };
  }

  const placement = placeFixedFeatureBase(
    template,
    sceneX,
    sceneY,
    snapToGrid,
    classroomWidth,
    classroomHeight,
  );
  return {
    ...placement,
    rotation: getFeatureAnchorRotation(
      template.type,
      placement.anchor,
      initialRotation,
    ),
    movable: false,
  };
};
