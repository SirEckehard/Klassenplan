// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature, ClassroomTable } from '@/types';
import { getRotatedAabbHalfExtents } from '@/utils/math/rotation';

/** Space left between the tables and a wall element drawn up to them. */
const WALL_GAP = 24;
/**
 * How far from the tables freely placed furniture may stand and still be
 * framed: about a gangway, which takes in the teacher's desk before the first
 * row and leaves out a cabinet in a corner.
 */
const FURNITURE_REACH = 96;

type Box = { minX: number; minY: number; maxX: number; maxY: number };

type Placed = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

const boxAround = (items: readonly Placed[]): Box | null =>
  items.reduce<Box | null>((box, item) => {
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      item.width,
      item.height,
      item.rotation ?? 0,
    );
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const next = {
      minX: centerX - halfWidth,
      minY: centerY - halfHeight,
      maxX: centerX + halfWidth,
      maxY: centerY + halfHeight,
    };
    return box
      ? {
          minX: Math.min(box.minX, next.minX),
          minY: Math.min(box.minY, next.minY),
          maxX: Math.max(box.maxX, next.maxX),
          maxY: Math.max(box.maxY, next.maxY),
        }
      : next;
  }, null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const overlaps = (a: Box, b: Box) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

/**
 * The room elements a projection framed on the tables draws, and where.
 *
 * The frame around the plan used to reach out to the walls, because that is
 * where the board and the windows hang: on an interactive whiteboard the
 * tables filled a quarter of the screen and the names came out half their
 * size. Each wall element — board, window, door — now keeps its side of the
 * room, the board in front and the windows on their side, but stands
 * `WALL_GAP` from the outermost table; along its wall it is held within the
 * tables' extent, so a door in a far corner is still hinted at the frame's
 * edge. An element already nearer the tables stays where it is. Freely placed
 * furniture is not moved: within `FURNITURE_REACH` of the tables it is framed
 * with them, farther away it is left out, or a cabinet in a corner would pull
 * the frame back out to the walls. Without tables the room is drawn as it is.
 */
export function featuresForTableFrame(
  tables: readonly ClassroomTable[],
  features: readonly ClassroomFeature[],
): ClassroomFeature[] {
  const tableBox = boxAround(tables);
  if (!tableBox) {
    return [...features];
  }
  const reach = {
    minX: tableBox.minX - FURNITURE_REACH,
    minY: tableBox.minY - FURNITURE_REACH,
    maxX: tableBox.maxX + FURNITURE_REACH,
    maxY: tableBox.maxY + FURNITURE_REACH,
  };
  const furnitureNearby = features.filter((feature) => {
    if (feature.anchor !== 'free') return false;
    const box = boxAround([feature]);
    return box !== null && overlaps(box, reach);
  });
  const furniture = boxAround([...tables, ...furnitureNearby]) ?? tableBox;

  return features.flatMap((feature) => {
    if (feature.anchor === 'free') {
      return furnitureNearby.includes(feature) ? [feature] : [];
    }
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      feature.width,
      feature.height,
      feature.rotation ?? 0,
    );
    let centerX = feature.x + feature.width / 2;
    let centerY = feature.y + feature.height / 2;

    switch (feature.anchor) {
      case 'top':
        centerY = Math.max(centerY, furniture.minY - WALL_GAP - halfHeight);
        centerX = clamp(centerX, furniture.minX, furniture.maxX);
        break;
      case 'bottom':
        centerY = Math.min(centerY, furniture.maxY + WALL_GAP + halfHeight);
        centerX = clamp(centerX, furniture.minX, furniture.maxX);
        break;
      case 'left':
        centerX = Math.max(centerX, furniture.minX - WALL_GAP - halfWidth);
        centerY = clamp(centerY, furniture.minY, furniture.maxY);
        break;
      case 'right':
        centerX = Math.min(centerX, furniture.maxX + WALL_GAP + halfWidth);
        centerY = clamp(centerY, furniture.minY, furniture.maxY);
        break;
    }

    const x = centerX - feature.width / 2;
    const y = centerY - feature.height / 2;
    return [
      x === feature.x && y === feature.y ? feature : { ...feature, x, y },
    ];
  });
}
