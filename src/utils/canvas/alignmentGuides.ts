// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature, ClassroomTable } from '@/types';
import type { FeatureVisibilityFlags } from '../ui/featureStyles';
import { getRotatedAabbHalfExtents } from '../math/rotation';

/** Snap distance to an alignment guide, in scene units (same as GRID_SNAP_SIZE). */
export const ALIGNMENT_GUIDE_TOLERANCE = 5;
/**
 * Threshold treating a guide as exactly hit. Used for the render pass on the
 * final clamped position so only truly aligned guides are shown.
 */
export const ALIGNMENT_GUIDE_EPSILON = 0.1;

/** Axis-aligned bounding box in scene coordinates. */
export interface AlignmentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AlignmentGuideKind = 'edge' | 'center' | 'canvasCenter';

export interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  /** Scene x (vertical) or scene y (horizontal) of the guide line. */
  position: number;
  kind: AlignmentGuideKind;
}

export interface AlignmentSnapResult {
  /** Offset to add to the moving rect; 0 per axis when no candidate is in tolerance. */
  offset: { x: number; y: number };
  /** Guides coinciding (≤ epsilon) with the moving rect after the offset. */
  guides: AlignmentGuide[];
}

interface AlignmentCandidate {
  position: number;
  kind: AlignmentGuideKind;
}

interface RotatableRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/** Exact AABB of a possibly rotated rect (rotation around its center). */
export const getRotatedAabb = (item: RotatableRect): AlignmentRect => {
  const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
    item.width,
    item.height,
    item.rotation ?? 0,
  );
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;
  return {
    x: centerX - halfWidth,
    y: centerY - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  };
};

/** Union AABB of a group of possibly rotated rects; null for empty input. */
export const getGroupAabb = (items: RotatableRect[]): AlignmentRect | null => {
  if (items.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    const aabb = getRotatedAabb(item);
    minX = Math.min(minX, aabb.x);
    minY = Math.min(minY, aabb.y);
    maxX = Math.max(maxX, aabb.x + aabb.width);
    maxY = Math.max(maxY, aabb.y + aabb.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const collectCandidates = (
  targets: AlignmentRect[],
  axis: 'x' | 'y',
  canvasCenter: number,
): AlignmentCandidate[] => {
  const candidates: AlignmentCandidate[] = [];
  for (const target of targets) {
    const start = axis === 'x' ? target.x : target.y;
    const size = axis === 'x' ? target.width : target.height;
    candidates.push(
      { position: start, kind: 'edge' },
      { position: start + size / 2, kind: 'center' },
      { position: start + size, kind: 'edge' },
    );
  }
  candidates.push({ position: canvasCenter, kind: 'canvasCenter' });
  return candidates;
};

const movingValues = (moving: AlignmentRect, axis: 'x' | 'y'): number[] => {
  const start = axis === 'x' ? moving.x : moving.y;
  const size = axis === 'x' ? moving.width : moving.height;
  return [start, start + size / 2, start + size];
};

const findAxisOffset = (
  candidates: AlignmentCandidate[],
  values: number[],
  tolerance: number,
): number => {
  let bestDistance = Infinity;
  let bestOffset = 0;
  for (const candidate of candidates) {
    for (const value of values) {
      const distance = Math.abs(candidate.position - value);
      if (distance <= tolerance && distance < bestDistance) {
        bestDistance = distance;
        bestOffset = candidate.position - value;
      }
    }
  }
  return bestOffset;
};

const collectHitGuides = (
  candidates: AlignmentCandidate[],
  values: number[],
  orientation: AlignmentGuide['orientation'],
  guides: Map<string, AlignmentGuide>,
): void => {
  for (const candidate of candidates) {
    const isHit = values.some(
      (value) =>
        Math.abs(candidate.position - value) <= ALIGNMENT_GUIDE_EPSILON,
    );
    if (!isHit) {
      continue;
    }
    // Round the dedupe key so float noise cannot duplicate a line.
    const key = `${orientation}:${Math.round(candidate.position * 1000)}`;
    const existing = guides.get(key);
    if (!existing || candidate.kind === 'canvasCenter') {
      guides.set(key, {
        orientation,
        position: candidate.position,
        kind: existing ? 'canvasCenter' : candidate.kind,
      });
    }
  }
};

/**
 * Computes the magnetic snap offset and the exactly-hit guides for a moving
 * AABB against target AABBs and the canvas center lines. Axes are handled
 * independently; the closest candidate within tolerance wins per axis.
 */
export const computeAlignmentSnap = (
  moving: AlignmentRect,
  targets: AlignmentRect[],
  canvas: { width: number; height: number },
  tolerance: number = ALIGNMENT_GUIDE_TOLERANCE,
): AlignmentSnapResult => {
  const verticalCandidates = collectCandidates(targets, 'x', canvas.width / 2);
  const horizontalCandidates = collectCandidates(
    targets,
    'y',
    canvas.height / 2,
  );

  const offset = {
    x: findAxisOffset(verticalCandidates, movingValues(moving, 'x'), tolerance),
    y: findAxisOffset(
      horizontalCandidates,
      movingValues(moving, 'y'),
      tolerance,
    ),
  };

  const shifted: AlignmentRect = {
    ...moving,
    x: moving.x + offset.x,
    y: moving.y + offset.y,
  };
  const guides = new Map<string, AlignmentGuide>();
  collectHitGuides(
    verticalCandidates,
    movingValues(shifted, 'x'),
    'vertical',
    guides,
  );
  collectHitGuides(
    horizontalCandidates,
    movingValues(shifted, 'y'),
    'horizontal',
    guides,
  );

  return { offset, guides: [...guides.values()] };
};

/**
 * Drag-path helper: shifts the drag-start AABB by the tentative delta, snaps
 * it to the guides and returns the adjusted delta.
 */
export const applyAlignmentToDelta = (
  delta: { x: number; y: number },
  movingStartAabb: AlignmentRect,
  targets: AlignmentRect[],
  canvas: { width: number; height: number },
  tolerance: number = ALIGNMENT_GUIDE_TOLERANCE,
): { delta: { x: number; y: number }; guides: AlignmentGuide[] } => {
  const shifted: AlignmentRect = {
    ...movingStartAabb,
    x: movingStartAabb.x + delta.x,
    y: movingStartAabb.y + delta.y,
  };
  const snap = computeAlignmentSnap(shifted, targets, canvas, tolerance);
  return {
    delta: { x: delta.x + snap.offset.x, y: delta.y + snap.offset.y },
    guides: snap.guides,
  };
};

/**
 * Builds the static alignment targets for a drag: all tables except the
 * dragged ones plus all visible features except the dragged ones.
 */
export const selectAlignmentTargets = (
  tables: ClassroomTable[],
  excludedTableIndices: number[],
  features: ClassroomFeature[],
  excludedFeatureIds: string[],
  featureVisibility?: FeatureVisibilityFlags,
): AlignmentRect[] => {
  const excludedIndices = new Set(excludedTableIndices);
  const excludedIds = new Set(excludedFeatureIds);
  const targets: AlignmentRect[] = [];
  tables.forEach((table, index) => {
    if (!excludedIndices.has(index)) {
      targets.push(getRotatedAabb(table));
    }
  });
  for (const feature of features) {
    if (
      excludedIds.has(feature.id) ||
      feature.visible === false ||
      featureVisibility?.[feature.type] === false
    ) {
      continue;
    }
    targets.push(getRotatedAabb(feature));
  }
  return targets;
};
