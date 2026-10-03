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

/** An axis-aligned box in scene units. */
export type FrameBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
type Box = FrameBox;

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

/**
 * Axis-aligned box around everything that gets drawn, in scene units: the
 * tables, the room elements (each by its rotated outline) and any further
 * boxes, such as the photos docked outside the seats. Null when nothing is
 * drawn.
 *
 * The room is a fixed 900×600 no matter how much of it is furnished, so
 * framing the whole rectangle wastes the screen and the sheet. Framing what is
 * drawn instead — after `featuresForTableFrame` has brought the board, the
 * windows and the door in from their walls — makes the names as large as the
 * wall or the page allows.
 */
export function frameContentBounds(
  tables: readonly Placed[],
  features: readonly Placed[],
  extra: readonly FrameBox[] = [],
): FrameBox | null {
  const placed = boxAround([...tables, ...features]);
  return [...(placed ? [placed] : []), ...extra].reduce<FrameBox | null>(
    (box, next) =>
      box
        ? {
            minX: Math.min(box.minX, next.minX),
            minY: Math.min(box.minY, next.minY),
            maxX: Math.max(box.maxX, next.maxX),
            maxY: Math.max(box.maxY, next.maxY),
          }
        : next,
    null,
  );
}

/**
 * The box `box` becomes when the scene turns by `rotation` — a multiple of
 * 90°, clockwise as in SVG — about `center`. Mapping two opposite corners and
 * re-ordering them is enough at a quarter turn.
 */
export function turnBox(
  box: FrameBox,
  rotation: number,
  center: { x: number; y: number },
): FrameBox {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.round(Math.cos(radians));
  const sin = Math.round(Math.sin(radians));
  const turn = (x: number, y: number) => {
    const dx = x - center.x;
    const dy = y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  };
  const a = turn(box.minX, box.minY);
  const b = turn(box.maxX, box.maxY);
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}
