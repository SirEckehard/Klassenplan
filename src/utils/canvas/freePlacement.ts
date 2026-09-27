// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Where something new can stand in the room without landing on what is
 * already there — the answer a click on a toolbar entry needs, since a drag
 * brings its own place and a click or Enter does not.
 */
import type {
  ClassroomFeature,
  ClassroomFeatureAnchor,
  ClassroomTable,
} from '@/types';
import { getRotatedAabb, type AlignmentRect } from './alignmentGuides';

type Size = { width: number; height: number };
type Point = { x: number; y: number };

/**
 * What a room element covers as it is drawn: a free one turns about its
 * centre, one on a wall keeps its box — its angle only turns the icon.
 */
export const featureFootprint = (feature: ClassroomFeature): AlignmentRect =>
  feature.anchor === 'free'
    ? getRotatedAabb(feature)
    : {
        x: feature.x,
        y: feature.y,
        width: feature.width,
        height: feature.height,
      };

/** Everything that takes up space in the room, tables turned as they stand. */
export const collectRoomObstacles = (
  tables: readonly ClassroomTable[],
  features: readonly ClassroomFeature[],
): AlignmentRect[] => [
  ...tables.map((table) => getRotatedAabb(table)),
  ...features
    .filter((feature) => feature.visible !== false)
    .map(featureFootprint),
];

/** Whether two boxes come closer than `gap` to each other. */
const crowds = (a: AlignmentRect, b: AlignmentRect, gap: number): boolean =>
  a.x < b.x + b.width + gap &&
  b.x < a.x + a.width + gap &&
  a.y < b.y + b.height + gap &&
  b.y < a.y + a.height + gap;

export type FreeSpotOptions = {
  /** Distance between the positions tried; a multiple of the snap grid. */
  step?: number;
  /** Room kept to everything already standing. */
  gap?: number;
  /** Room kept to the walls. */
  margin?: number;
};

/**
 * The top-left corner of the free spot nearest the middle of the room for a
 * box of `size`, keeping `gap` to every obstacle and `margin` to the walls.
 * The middle is where a new thing is easiest to see; a paste lands there too.
 * Null once the room has no such spot left.
 */
export function findFreeSpot(
  size: Size,
  obstacles: readonly AlignmentRect[],
  room: Size,
  { step = 10, gap = 20, margin = 20 }: FreeSpotOptions = {},
): Point | null {
  const centreX = room.width / 2;
  const centreY = room.height / 2;
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (let y = margin; y + size.height <= room.height - margin; y += step) {
    for (let x = margin; x + size.width <= room.width - margin; x += step) {
      const distance = Math.hypot(
        x + size.width / 2 - centreX,
        y + size.height / 2 - centreY,
      );
      if (distance >= bestDistance) continue;
      const candidate = { x, y, width: size.width, height: size.height };
      if (obstacles.some((obstacle) => crowds(candidate, obstacle, gap))) {
        continue;
      }
      best = { x, y };
      bestDistance = distance;
    }
  }
  return best;
}

/** The walls in the order a new wall element tries them. */
const WALLS: ReadonlyArray<Exclude<ClassroomFeatureAnchor, 'free'>> = [
  'top',
  'right',
  'bottom',
  'left',
];

/**
 * A point on the room's edge, `along` the wall from its start, that a wall
 * element dropped there would snap to — the same way a drag places it.
 */
const pointOnWall = (
  wall: Exclude<ClassroomFeatureAnchor, 'free'>,
  along: number,
  room: Size,
): Point => {
  switch (wall) {
    case 'top':
      return { x: along, y: 0 };
    case 'bottom':
      return { x: along, y: room.height };
    case 'left':
      return { x: 0, y: along };
    case 'right':
    default:
      return { x: room.width, y: along };
  }
};

/**
 * The first place along the walls where a wall element fits beside the ones
 * already hanging there: wall by wall — top, right, bottom, left — from the
 * middle of each outwards. `place` turns a point on the edge into the box the
 * element would take there (the drop's own placement), so the element lands
 * exactly as a drag would put it. Null when every wall is taken.
 */
export function findFreeWallSpot(
  place: (point: Point) => AlignmentRect,
  obstacles: readonly AlignmentRect[],
  room: Size,
  { step = 10, gap = 10 }: Pick<FreeSpotOptions, 'step' | 'gap'> = {},
): Point | null {
  for (const wall of WALLS) {
    const length =
      wall === 'top' || wall === 'bottom' ? room.width : room.height;
    const middle = length / 2;
    for (let offset = 0; offset <= middle; offset += step) {
      for (const along of offset === 0
        ? [middle]
        : [middle - offset, middle + offset]) {
        const point = pointOnWall(wall, along, room);
        const box = place(point);
        if (!obstacles.some((obstacle) => crowds(box, obstacle, gap))) {
          return point;
        }
      }
    }
  }
  return null;
}
