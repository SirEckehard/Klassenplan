// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature } from '@/types';
import { GRID_SNAP_SIZE, MIN_FEATURE_SIZE } from '../constants';
import { normalizeRotation } from '../math/rotation';

/**
 * Handle of the feature frame a resize grip is attached to (local
 * coordinates): the four edge midpoints plus the four corners.
 */
export type FeatureResizeHandle =
  'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type FeatureResizeAxisEdge = 'n' | 'e' | 's' | 'w';

/** Position and size of a feature's unrotated frame in scene coordinates. */
export type FeatureFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FeatureResizeOptions = {
  snapToGrid: boolean;
  classroomWidth: number;
  classroomHeight: number;
};

const EPSILON = 1e-9;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Clamps a feature center so its (rotated) footprint stays inside the room.
 * Falls back to centering when the footprint is larger than the room.
 */
export const clampCenterToRoom = (
  value: number,
  halfExtent: number,
  size: number,
) =>
  halfExtent * 2 > size
    ? size / 2
    : clampValue(value, halfExtent, size - halfExtent);

const snapDimension = (value: number, shouldSnap: boolean) =>
  shouldSnap ? Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE : value;

/**
 * Resize handles a feature exposes. Free features resize like OS windows —
 * every edge and corner. Wall-mounted features (window, door, board,
 * whiteboard) have no real depth in the room, so they only resize in length
 * along their wall, via the handles at both ends.
 */
export function getFeatureResizeHandles(
  feature: ClassroomFeature,
): FeatureResizeHandle[] {
  switch (feature.anchor) {
    case 'left':
    case 'right':
      return ['n', 's'];
    case 'top':
    case 'bottom':
      return ['e', 'w'];
    case 'free':
    default:
      return ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  }
}

/** Scene-space direction (deg, y down) each handle drags toward. */
const HANDLE_ANGLE: Record<FeatureResizeHandle, number> = {
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: 225,
  n: 270,
  ne: 315,
};

const RESIZE_CURSORS = [
  'ew-resize',
  'nwse-resize',
  'ns-resize',
  'nesw-resize',
] as const;

/**
 * CSS cursor for a resize handle, taking the feature rotation into account so
 * the arrows keep pointing along the actual drag direction on screen.
 */
export const getResizeCursor = (
  handle: FeatureResizeHandle,
  rotationDeg = 0,
): string => {
  const angle = (((HANDLE_ANGLE[handle] + rotationDeg) % 180) + 180) % 180;
  return RESIZE_CURSORS[Math.round(angle / 45) % 4];
};

const resizeWallAnchoredAxis = (
  feature: ClassroomFeature,
  edge: FeatureResizeAxisEdge,
  sceneDelta: { x: number; y: number },
  start: FeatureFrame,
  minDimension: number,
  { snapToGrid, classroomWidth, classroomHeight }: FeatureResizeOptions,
): FeatureFrame => {
  const isWidthEdge = edge === 'e' || edge === 'w';
  const direction = edge === 'e' || edge === 's' ? 1 : -1;
  const startDimension = isWidthEdge ? start.width : start.height;
  const axisDelta = (isWidthEdge ? sceneDelta.x : sceneDelta.y) * direction;
  // The opposite edge stays fixed, so the room border limits growth toward
  // the dragged side.
  const maxDimension = isWidthEdge
    ? edge === 'e'
      ? classroomWidth - start.x
      : start.x + start.width
    : edge === 's'
      ? classroomHeight - start.y
      : start.y + start.height;
  const dimension = clampValue(
    snapDimension(startDimension + axisDelta, snapToGrid),
    minDimension,
    maxDimension,
  );

  let { x, y, width, height } = start;
  if (isWidthEdge) {
    width = dimension;
    if (edge === 'w') {
      x = start.x + start.width - dimension;
    }
  } else {
    height = dimension;
    if (edge === 'n') {
      y = start.y + start.height - dimension;
    }
  }

  // Keep wall features flush against their wall regardless of rounding.
  switch (feature.anchor) {
    case 'left':
      x = 0;
      break;
    case 'right':
      x = classroomWidth - width;
      break;
    case 'top':
      y = 0;
      break;
    case 'bottom':
      y = classroomHeight - height;
      break;
    default:
      break;
  }
  x = clampValue(x, 0, Math.max(0, classroomWidth - width));
  y = clampValue(y, 0, Math.max(0, classroomHeight - height));

  return { x, y, width, height };
};

const resizeFreeAxis = (
  feature: ClassroomFeature,
  edge: FeatureResizeAxisEdge,
  sceneDelta: { x: number; y: number },
  start: FeatureFrame,
  minDimension: number,
  { snapToGrid, classroomWidth, classroomHeight }: FeatureResizeOptions,
): FeatureFrame => {
  const isWidthEdge = edge === 'e' || edge === 'w';
  const direction = edge === 'e' || edge === 's' ? 1 : -1;
  const startDimension = isWidthEdge ? start.width : start.height;
  const otherHalf = (isWidthEdge ? start.height : start.width) / 2;
  const rotation = feature.rotation ?? 0;
  const radians = (normalizeRotation(rotation) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // Local axis the dragged edge moves along, expressed in scene coordinates,
  // plus the perpendicular axis spanning the edge itself.
  const axis = isWidthEdge ? { x: cos, y: sin } : { x: -sin, y: cos };
  const perp = isWidthEdge ? { x: -sin, y: cos } : { x: cos, y: sin };
  const axisDir = { x: axis.x * direction, y: axis.y * direction };

  const axisDelta = (sceneDelta.x * axis.x + sceneDelta.y * axis.y) * direction;
  let dimension = Math.max(
    snapDimension(startDimension + axisDelta, snapToGrid),
    minDimension,
  );

  // The opposite edge stays fixed while the dragged edge sweeps along
  // `axisDir`. Its two corners are `fixedEdgeCenter ± perp·otherHalf +
  // axisDir·dimension`; requiring them to stay inside the room bounds the
  // dimension in closed form (the fixed corners are inside already, since
  // the start frame was valid).
  const fixedEdgeCenter = {
    x: start.x + start.width / 2 - axisDir.x * (startDimension / 2),
    y: start.y + start.height / 2 - axisDir.y * (startDimension / 2),
  };
  let maxDimension = Number.POSITIVE_INFINITY;
  for (const perpSign of [-1, 1]) {
    const cornerX = fixedEdgeCenter.x + perp.x * otherHalf * perpSign;
    const cornerY = fixedEdgeCenter.y + perp.y * otherHalf * perpSign;
    if (axisDir.x > EPSILON) {
      maxDimension = Math.min(
        maxDimension,
        (classroomWidth - cornerX) / axisDir.x,
      );
    } else if (axisDir.x < -EPSILON) {
      maxDimension = Math.min(maxDimension, cornerX / -axisDir.x);
    }
    if (axisDir.y > EPSILON) {
      maxDimension = Math.min(
        maxDimension,
        (classroomHeight - cornerY) / axisDir.y,
      );
    } else if (axisDir.y < -EPSILON) {
      maxDimension = Math.min(maxDimension, cornerY / -axisDir.y);
    }
  }
  dimension = clampValue(
    dimension,
    minDimension,
    Math.max(minDimension, maxDimension),
  );

  // Rotation happens around the center, so with the opposite edge fixed the
  // center sits half the new dimension away from it along the drag axis.
  const width = isWidthEdge ? dimension : start.width;
  const height = isWidthEdge ? start.height : dimension;
  const centerX = fixedEdgeCenter.x + axisDir.x * (dimension / 2);
  const centerY = fixedEdgeCenter.y + axisDir.y * (dimension / 2);

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
};

const resizeAxis = (
  feature: ClassroomFeature,
  edge: FeatureResizeAxisEdge,
  sceneDelta: { x: number; y: number },
  start: FeatureFrame,
  options: FeatureResizeOptions,
): FeatureFrame => {
  const startDimension =
    edge === 'e' || edge === 'w' ? start.width : start.height;
  const minDimension = Math.min(MIN_FEATURE_SIZE, startDimension);
  return feature.anchor !== 'free'
    ? resizeWallAnchoredAxis(
        feature,
        edge,
        sceneDelta,
        start,
        minDimension,
        options,
      )
    : resizeFreeAxis(feature, edge, sceneDelta, start, minDimension, options);
};

/**
 * Applies a resize drag to a feature. `sceneDelta` is the pointer movement in
 * scene coordinates since drag start, `start` the feature frame at drag
 * start. Corner handles resize both axes; either way the opposite edge(s)
 * stay visually fixed. The result is clamped so the (rotated) footprint stays
 * inside the room and never shrinks below MIN_FEATURE_SIZE (or the start
 * dimension, when that is already smaller). Wall-anchored features stay flush
 * against their wall; they render unrotated, so their delta maps straight
 * onto the scene axes.
 */
export function resizeFeature(
  feature: ClassroomFeature,
  handle: FeatureResizeHandle,
  sceneDelta: { x: number; y: number },
  start: FeatureFrame,
  options: FeatureResizeOptions,
): FeatureFrame {
  const widthEdge: FeatureResizeAxisEdge | null = handle.includes('e')
    ? 'e'
    : handle.includes('w')
      ? 'w'
      : null;
  const heightEdge: FeatureResizeAxisEdge | null = handle.includes('n')
    ? 'n'
    : handle.includes('s')
      ? 's'
      : null;

  // The two axes are orthogonal, so a corner drag is the composition of its
  // edge drags; the second pass starts from the first pass's frame.
  let frame = start;
  if (widthEdge) {
    frame = resizeAxis(feature, widthEdge, sceneDelta, frame, options);
  }
  if (heightEdge) {
    frame = resizeAxis(feature, heightEdge, sceneDelta, frame, options);
  }
  return frame;
}
