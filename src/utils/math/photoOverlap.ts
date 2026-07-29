// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomTable } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';
import {
  calculateSeatLayout,
  determineSeatEdge,
} from '@/utils/math/positionCalculations';

/** Predicted photo avatar circle for one seat, in scene coordinates. */
export interface PhotoCircle {
  tableIndex: number;
  seatIndex: number;
  x: number;
  y: number;
  radius: number;
}

// Photos dock tangentially against the outer edge of the 1px table border
// (half of it), mirroring the chair-dot placement in SceneTable.
const TABLE_BORDER_HALF = 0.5;

// Tolerance so photos of grid-snapped neighbouring tables that exactly touch
// (or kiss the wall) are not flagged as collisions.
const COLLISION_EPSILON = 0.5;

/**
 * Radius of the photo avatar drawn for a seat. Scales with the seat but stays
 * small enough that neighbouring photos on the same table edge (≈ one seat
 * width/height apart) don't overlap (diameter ≈ 0.7 × the smaller seat
 * dimension). Single source of truth shared with SceneTable's rendering.
 */
export const getPhotoRadius = (seatWidth: number, seatHeight: number): number =>
  Math.max(9, Math.min(18, Math.min(seatWidth, seatHeight) * 0.35));

/**
 * Predict the photo circle of every seat in the given tables, reproducing the
 * geometry SceneTable uses to render photo avatars: seat center snapped to the
 * facing table edge, offset outward by the photo radius, then rotated around
 * the table center.
 */
export const computePhotoCircles = (
  tables: readonly ClassroomTable[],
): PhotoCircle[] => {
  const circles: PhotoCircle[] = [];

  tables.forEach((table, tableIndex) => {
    const layout = calculateSeatLayout(table);
    const { cols, rows, seatWidth, seatHeight, positions } = layout;
    const radius = getPhotoRadius(seatWidth, seatHeight);
    const centerX = table.x + table.width / 2;
    const centerY = table.y + table.height / 2;
    const rotation = table.rotation ?? 0;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    positions.forEach((position, seatIndex) => {
      const edge = determineSeatEdge(
        table.templateType,
        position,
        { cols, rows },
        table.seatCount,
      );
      // Seat center in table-local coords, one axis snapped to the facing edge
      // and pushed along its outward normal so the circle sits outside the
      // table (same math as SceneTable's chairDots + photo offset).
      let cx = position.col * seatWidth + seatWidth / 2;
      let cy = position.row * seatHeight + seatHeight / 2;
      const offset = radius + TABLE_BORDER_HALF;
      if (edge === 'left') {
        cx = -offset;
      } else if (edge === 'right') {
        cx = table.width + offset;
      } else if (edge === 'top') {
        cy = -offset;
      } else {
        cy = table.height + offset;
      }

      // Rotate the scene-space point around the table center.
      const dx = table.x + cx - centerX;
      const dy = table.y + cy - centerY;
      circles.push({
        tableIndex,
        seatIndex,
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
        radius,
      });
    });
  });

  return circles;
};

/**
 * Filter to circles that collide: overlapping another circle or crossing the
 * classroom walls. Room features are ignored on purpose — they render behind
 * tables, so photos always cover them. Pairwise O(n²) is fine for ≤ 36 seats.
 */
export const findPhotoCollisions = (
  circles: readonly PhotoCircle[],
): PhotoCircle[] => {
  const colliding = new Set<PhotoCircle>();

  circles.forEach((circle) => {
    if (
      circle.x - circle.radius < -COLLISION_EPSILON ||
      circle.x + circle.radius > CLASSROOM_WIDTH + COLLISION_EPSILON ||
      circle.y - circle.radius < -COLLISION_EPSILON ||
      circle.y + circle.radius > CLASSROOM_HEIGHT + COLLISION_EPSILON
    ) {
      colliding.add(circle);
    }
  });

  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      const a = circles[i]!;
      const b = circles[j]!;
      const minDistance = a.radius + b.radius - COLLISION_EPSILON;
      if (Math.hypot(a.x - b.x, a.y - b.y) < minDistance) {
        colliding.add(a);
        colliding.add(b);
      }
    }
  }

  // Preserve stable table/seat order for deterministic rendering.
  return circles.filter((circle) => colliding.has(circle));
};

/**
 * Predicted photo circles of all seats that would collide with each other or
 * with the classroom walls once photos are shown.
 */
export const getPhotoCollisions = (
  tables: readonly ClassroomTable[],
): PhotoCircle[] => findPhotoCollisions(computePhotoCircles(tables));
