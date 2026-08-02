// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomTable } from '@/types';
import { GRID_SNAP_SIZE, convertClientPointToSvgCoordinates } from '@/utils';
import { normalizeRotation } from '@/utils/math/rotation';

/**
 * Precise positioning utilities for table placement and grid snapping
 * Addresses floating-point precision issues in copy/paste and drag operations
 */

export interface Position {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type RotationAwareTable = Pick<
  ClassroomTable,
  'x' | 'y' | 'width' | 'height' | 'rotation'
>;

const RIGHT_ANGLE_TOLERANCE = 0.001;

const isRightAngleRotation = (rotation: number): boolean => {
  const remainder = rotation % 90;
  return (
    Math.abs(remainder) < RIGHT_ANGLE_TOLERANCE ||
    Math.abs(remainder - 90) < RIGHT_ANGLE_TOLERANCE
  );
};

const isHorizontalRotation = (rotation: number): boolean =>
  Math.abs(rotation - 90) < RIGHT_ANGLE_TOLERANCE ||
  Math.abs(rotation - 270) < RIGHT_ANGLE_TOLERANCE;

const getNormalizedRotation = (rotation: number | undefined): number =>
  normalizeRotation(rotation ?? 0);

export const getRotationAdjustedDimensions = (
  table: Pick<ClassroomTable, 'width' | 'height' | 'rotation'>,
): { width: number; height: number } => {
  const normalized = getNormalizedRotation(table.rotation);
  if (!isRightAngleRotation(normalized)) {
    return { width: table.width, height: table.height };
  }
  if (!isHorizontalRotation(normalized)) {
    return { width: table.width, height: table.height };
  }
  return { width: table.height, height: table.width };
};

export const getRotationAdjustedPosition = (
  table: RotationAwareTable,
): Position => {
  const normalized = getNormalizedRotation(table.rotation);
  if (!isHorizontalRotation(normalized)) {
    return { x: table.x, y: table.y };
  }
  const centerX = table.x + table.width / 2;
  const centerY = table.y + table.height / 2;
  const { width, height } = getRotationAdjustedDimensions(table);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
  };
};

export const clampTablePositionWithinBounds = (
  table: Pick<ClassroomTable, 'width' | 'height' | 'rotation'>,
  position: Position,
  classroomBounds: { width: number; height: number },
): Position => {
  const normalized = getNormalizedRotation(table.rotation);
  const { width: effectiveWidth, height: effectiveHeight } =
    getRotationAdjustedDimensions(table);

  if (isHorizontalRotation(normalized)) {
    const centerX = position.x + table.width / 2;
    const centerY = position.y + table.height / 2;
    const minCenterX = effectiveWidth / 2;
    const maxCenterX = classroomBounds.width - effectiveWidth / 2;
    const minCenterY = effectiveHeight / 2;
    const maxCenterY = classroomBounds.height - effectiveHeight / 2;
    const clampedCenterX = Math.min(Math.max(centerX, minCenterX), maxCenterX);
    const clampedCenterY = Math.min(Math.max(centerY, minCenterY), maxCenterY);
    return {
      x: clampedCenterX - table.width / 2,
      y: clampedCenterY - table.height / 2,
    };
  }

  return {
    x: Math.min(
      Math.max(position.x, 0),
      classroomBounds.width - effectiveWidth,
    ),
    y: Math.min(
      Math.max(position.y, 0),
      classroomBounds.height - effectiveHeight,
    ),
  };
};

/**
 * Robust grid snapping function with tolerance to prevent unnecessary snapping
 * Only snaps if the value is sufficiently far from the grid line
 */
export function preciseSnap(
  value: number,
  gridSize: number = GRID_SNAP_SIZE,
  tolerance: number = 0.1,
): number {
  const snapped = Math.round(value / gridSize) * gridSize;

  // Only snap if the difference is significant enough
  // This prevents micro-adjustments that cause drift
  return Math.abs(value - snapped) < tolerance ? value : snapped;
}

/**
 * Snap a position to the grid with precision
 */
export function snapPosition(
  position: Position,
  gridSize: number = GRID_SNAP_SIZE,
  tolerance: number = 0.1,
): Position {
  return {
    x: preciseSnap(position.x, gridSize, tolerance),
    y: preciseSnap(position.y, gridSize, tolerance),
  };
}

/**
 * Calculate the bounds of a group of tables
 * Used for clipboard operations to maintain relative positioning
 */
export function calculateTableGroupBounds(tables: ClassroomTable[]): Bounds {
  if (tables.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const bounds = tables.reduce(
    (acc, table) => {
      const adjustedPosition = getRotationAdjustedPosition(table);
      const adjustedSize = getRotationAdjustedDimensions(table);
      const minX = Math.min(acc.minX, adjustedPosition.x);
      const minY = Math.min(acc.minY, adjustedPosition.y);
      const maxX = Math.max(acc.maxX, adjustedPosition.x + adjustedSize.width);
      const maxY = Math.max(acc.maxY, adjustedPosition.y + adjustedSize.height);
      return { minX, minY, maxX, maxY };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * Position tables maintaining their relative arrangement
 * Used for paste operations to preserve table relationships
 */
export function positionTablesRelative(
  tables: ClassroomTable[],
  targetCenter: Position,
  classroomBounds: { width: number; height: number },
  snapToGrid: boolean = true,
  addPasteOffset: boolean = true,
): ClassroomTable[] {
  if (tables.length === 0) return [];

  const groupBounds = calculateTableGroupBounds(tables);
  const currentCenter = {
    x: groupBounds.x + groupBounds.width / 2,
    y: groupBounds.y + groupBounds.height / 2,
  };

  // Add paste offset for better visual feedback when pasting
  const PASTE_OFFSET = 20;
  const effectiveTarget = addPasteOffset
    ? { x: targetCenter.x + PASTE_OFFSET, y: targetCenter.y + PASTE_OFFSET }
    : targetCenter;

  // Calculate translation to move group center to effective target
  const translation = {
    x: effectiveTarget.x - currentCenter.x,
    y: effectiveTarget.y - currentCenter.y,
  };

  // Apply translation and constraints to each table
  return tables.map((table) => {
    // Calculate new position
    let newX = table.x + translation.x;
    let newY = table.y + translation.y;

    // Apply grid snapping if enabled (only once, at the end)
    if (snapToGrid) {
      const snapped = snapPosition({ x: newX, y: newY });
      newX = snapped.x;
      newY = snapped.y;
    }

    // Ensure table stays within classroom bounds using rotation-aware dimensions
    const clamped = clampTablePositionWithinBounds(
      table,
      { x: newX, y: newY },
      classroomBounds,
    );
    newX = clamped.x;
    newY = clamped.y;

    return {
      ...table,
      x: newX,
      y: newY,
    };
  });
}

/**
 * Calculate precise delta movement for drag operations
 * Avoids intermediate snapping that can cause drift
 */
export function calculateDragDelta(
  startMouse: Position,
  currentMouse: Position,
  snapToGrid: boolean = true,
): Position {
  const rawDelta = {
    x: currentMouse.x - startMouse.x,
    y: currentMouse.y - startMouse.y,
  };

  // Only snap the delta if grid snapping is enabled
  // This prevents cumulative rounding errors
  if (snapToGrid) {
    return snapPosition(rawDelta);
  }

  return rawDelta;
}

/**
 * Apply drag movement to tables with bounds checking
 */
export function applyDragMovement(
  tables: ClassroomTable[],
  tableIndices: number[],
  startPositions: Position[],
  delta: Position,
  classroomBounds: { width: number; height: number },
): ClassroomTable[] {
  return tables.map((table, index) => {
    const dragIndex = tableIndices.indexOf(index);

    if (dragIndex === -1) {
      // Table is not being dragged
      return table;
    }

    const startPos = startPositions[dragIndex];
    if (!startPos) {
      return table;
    }

    // Calculate new position from original start position + delta
    // This avoids accumulating rounding errors from multiple updates
    let newX = startPos.x + delta.x;
    let newY = startPos.y + delta.y;

    // Keep table within classroom bounds using rotation-aware dimensions
    const clamped = clampTablePositionWithinBounds(
      table,
      { x: newX, y: newY },
      classroomBounds,
    );
    newX = clamped.x;
    newY = clamped.y;

    return {
      ...table,
      x: newX,
      y: newY,
    };
  });
}

/**
 * Convert screen coordinates to SVG coordinates with precision
 */
export function screenToSVGCoordinates(
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement,
): Position {
  return convertClientPointToSvgCoordinates({
    svg: svgElement,
    clientX: screenX,
    clientY: screenY,
  });
}

/**
 * Validate that tables don't overlap after positioning
 * Used for debugging and quality assurance
 */
export function validateTablePositioning(tables: ClassroomTable[]): {
  isValid: boolean;
  overlaps: Array<{ table1: number; table2: number }>;
} {
  const overlaps: Array<{ table1: number; table2: number }> = [];

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const table1 = tables[i];
      const table2 = tables[j];

      if (!table1 || !table2) continue;

      // Check for overlap
      const overlap = !(
        table1.x + table1.width <= table2.x ||
        table2.x + table2.width <= table1.x ||
        table1.y + table1.height <= table2.y ||
        table2.y + table2.height <= table1.y
      );

      if (overlap) {
        overlaps.push({ table1: i, table2: j });
      }
    }
  }

  return {
    isValid: overlaps.length === 0,
    overlaps,
  };
}
