// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomFeature,
  ClassroomFeatureAnchor,
  ClassroomTable,
} from '@/types';
import { getRotatedAabbHalfExtents } from '@/utils/math/rotation';

/** Space left between the tables and a wall element drawn up to them. */
const WALL_GAP = 24;
/**
 * How far from the tables freely placed furniture may stand and still be
 * framed: about a gangway, which takes in the teacher's desk before the first
 * row and leaves out a cabinet in a corner.
 */
const FURNITURE_REACH = 96;
/**
 * What a wall element cut to the tables' extent keeps of its length at the
 * least — a door's width — so a door in a far corner still reads as one.
 */
const MIN_ALONG_WALL = 70;

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
  anchor?: ClassroomFeatureAnchor;
};

/**
 * The rotation an item is drawn with. A wall element stores the turn a drop
 * on its wall gave it, but its width and height are already laid along that
 * wall and `FeatureShape` draws it upright — boxing it turned stood a window
 * front across the room.
 */
const drawnRotation = (item: Placed) =>
  item.anchor === undefined || item.anchor === 'free'
    ? (item.rotation ?? 0)
    : 0;

const boxAround = (items: readonly Placed[]): Box | null =>
  items.reduce<Box | null>((box, item) => {
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      item.width,
      item.height,
      drawnRotation(item),
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
 * Where a wall element lies along its wall in the frame: the stretch of it
 * beside the tables (`min`…`max`). One that reaches beyond them — a window
 * front along the whole wall — is cut to them, or its length alone would set
 * the frame. One that runs beside them for less than `MIN_ALONG_WALL` keeps
 * its length with its centre held within their extent.
 */
const alongWall = (
  start: number,
  length: number,
  min: number,
  max: number,
): { start: number; length: number } => {
  const from = Math.max(start, min);
  const to = Math.min(start + length, max);
  if (to - from >= Math.min(length, MIN_ALONG_WALL)) {
    return { start: from, length: to - from };
  }
  const center = clamp(start + length / 2, min, max);
  return { start: center - length / 2, length };
};

/**
 * The room elements a projection framed on the tables draws, and where.
 *
 * The frame around the plan used to reach out to the walls, because that is
 * where the board and the windows hang: on an interactive whiteboard the
 * tables filled a quarter of the screen and the names came out half their
 * size. Each wall element — board, window, door — now keeps its side of the
 * room, the board in front and the windows on their side, but stands
 * `WALL_GAP` from the outermost table; along its wall it is held within the
 * tables' extent (`alongWall`): a window front longer than the rows is cut to
 * them, and a door in a far corner is still hinted at the frame's edge. An
 * element already nearer the tables stays where it is. Freely placed
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
    let { x, y, width, height } = feature;

    switch (feature.anchor) {
      case 'top':
        y = Math.max(y, furniture.minY - WALL_GAP - height);
        ({ start: x, length: width } = alongWall(
          x,
          width,
          furniture.minX,
          furniture.maxX,
        ));
        break;
      case 'bottom':
        y = Math.min(y, furniture.maxY + WALL_GAP);
        ({ start: x, length: width } = alongWall(
          x,
          width,
          furniture.minX,
          furniture.maxX,
        ));
        break;
      case 'left':
        x = Math.max(x, furniture.minX - WALL_GAP - width);
        ({ start: y, length: height } = alongWall(
          y,
          height,
          furniture.minY,
          furniture.maxY,
        ));
        break;
      case 'right':
        x = Math.min(x, furniture.maxX + WALL_GAP);
        ({ start: y, length: height } = alongWall(
          y,
          height,
          furniture.minY,
          furniture.maxY,
        ));
        break;
    }

    return [
      x === feature.x &&
      y === feature.y &&
      width === feature.width &&
      height === feature.height
        ? feature
        : { ...feature, x, y, width, height },
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
