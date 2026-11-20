// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature, ClassroomTable } from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';
import {
  calculateSeatLayout,
  determineSeatEdge,
} from '@/utils/math/positionCalculations';
import { getPhotoCollisions } from '@/utils/math/photoOverlap';
import type { FrontDirection } from './orientationUtils';

/*
 * The rules a room set up by "Neu einrichten" keeps (decision 0053): what the
 * random setup checks every room it puts together against, and what the
 * tests hold every arrangement to.
 */

type Point = readonly [number, number];

export type RoomProblemKind =
  /** Two tables stand in each other. */
  | 'overlap'
  /** A table reaches through a wall. */
  | 'outside'
  /** A chair stands in another table. */
  | 'chair'
  /** A photo would cover another or cross a wall (the room's own warning). */
  | 'photo'
  /**
   * Two tables neither touch nor leave room between them: closer than 15 px,
   * the mix would take them for pushed together, and nobody passes.
   */
  | 'gap'
  /** A student sits with their back to the board. */
  | 'back'
  /** A table stands in the way of the door. */
  | 'door';

export interface RoomProblem {
  kind: RoomProblemKind;
  table: number;
  other?: number;
}

/** The narrowest gap that is not a join: as `ADJACENT_GAP` reads a row. */
const MIN_GAP = 15;
/** Room kept free inside the door. */
const DOOR_ROOM = 60;

const turn = ([x, y]: Point, degrees: number): Point => {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos - y * sin, x * sin + y * cos];
};

/** A table's outline as it stands, turned about its centre. */
function tableCorners(table: ClassroomTable): Point[] {
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  const w = table.width / 2;
  const h = table.height / 2;
  return (
    [
      [-w, -h],
      [w, -h],
      [w, h],
      [-w, h],
    ] as const
  ).map((corner) => {
    const [dx, dy] = turn(corner, table.rotation);
    return [cx + dx, cy + dy] as const;
  });
}

/** Each seat's chair, a little outside its edge, and the way its student faces. */
function seatsOf(table: ClassroomTable): { chair: Point; facing: Point }[] {
  const layout = calculateSeatLayout(table);
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  return layout.positions.map((position) => {
    const edge = determineSeatEdge(
      table.templateType,
      position,
      layout,
      table.seatCount,
    );
    let x = position.col * layout.seatWidth + layout.seatWidth / 2;
    let y = position.row * layout.seatHeight + layout.seatHeight / 2;
    let facing: Point = [1, 0];
    if (edge === 'left') {
      x = -6;
    } else if (edge === 'right') {
      x = table.width + 6;
      facing = [-1, 0];
    } else if (edge === 'top') {
      y = -6;
      facing = [0, 1];
    } else {
      y = table.height + 6;
      facing = [0, -1];
    }
    const [dx, dy] = turn(
      [x - table.width / 2, y - table.height / 2],
      table.rotation,
    );
    return { chair: [cx + dx, cy + dy], facing: turn(facing, table.rotation) };
  });
}

const axesOf = (shape: readonly Point[]): Point[] =>
  shape.map(([x1, y1], index) => {
    const [x2, y2] = shape[(index + 1) % shape.length]!;
    const length = Math.hypot(x2 - x1, y2 - y1) || 1;
    return [-(y2 - y1) / length, (x2 - x1) / length] as const;
  });

/** How far two convex shapes overlap along their narrowest axis; 0 if apart. */
function overlapDepth(a: readonly Point[], b: readonly Point[]): number {
  let least = Infinity;
  for (const [ax, ay] of [...axesOf(a), ...axesOf(b)]) {
    const pa = a.map(([x, y]) => x * ax + y * ay);
    const pb = b.map(([x, y]) => x * ax + y * ay);
    const depth =
      Math.min(Math.max(...pa), Math.max(...pb)) -
      Math.max(Math.min(...pa), Math.min(...pb));
    if (depth <= 0) return 0;
    least = Math.min(least, depth);
  }
  return least;
}

const pointToSegment = (
  [px, py]: Point,
  [ax, ay]: Point,
  [bx, by]: Point,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t =
    length > 0
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length))
      : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** The gap between two convex shapes that do not overlap. */
function gapBetween(a: readonly Point[], b: readonly Point[]): number {
  let least = Infinity;
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const point of from) {
      to.forEach((corner, index) => {
        least = Math.min(
          least,
          pointToSegment(point, corner, to[(index + 1) % to.length]!),
        );
      });
    }
  }
  return least;
}

const BOARD_WAY: Record<FrontDirection, Point> = {
  right: [1, 0],
  left: [-1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

/**
 * Everything a room breaks of the rules: overlaps, walls, chairs, photos, the
 * narrow gaps nobody passes, the door's way and — with `board`, where it
 * hangs — a student with their back to it.
 */
export function roomProblems(
  tables: readonly ClassroomTable[],
  {
    features = [],
    board,
    first = false,
  }: {
    features?: readonly ClassroomFeature[];
    board?: FrontDirection;
    /** Stops at the first kind of problem found: enough to turn a room down. */
    first?: boolean;
  } = {},
): RoomProblem[] {
  const problems: RoomProblem[] = [];
  const shapes = tables.map(tableCorners);
  const doors = features
    .filter((feature) => feature.type === 'door' && feature.visible !== false)
    .map((door): Point[] => {
      const x0 = door.x - DOOR_ROOM;
      const y0 = door.y - DOOR_ROOM;
      const x1 = door.x + door.width + DOOR_ROOM;
      const y1 = door.y + door.height + DOOR_ROOM;
      return [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ];
    });

  shapes.forEach((shape, index) => {
    if (
      shape.some(
        ([x, y]) =>
          x < -0.5 ||
          y < -0.5 ||
          x > CLASSROOM_WIDTH + 0.5 ||
          y > CLASSROOM_HEIGHT + 0.5,
      )
    ) {
      problems.push({ kind: 'outside', table: index });
    }
    if (doors.some((door) => overlapDepth(shape, door) > 0.5)) {
      problems.push({ kind: 'door', table: index });
    }
    for (let other = index + 1; other < shapes.length; other++) {
      const depth = overlapDepth(shape, shapes[other]!);
      if (depth > 0.5) {
        problems.push({ kind: 'overlap', table: index, other });
      } else if (depth === 0) {
        const gap = gapBetween(shape, shapes[other]!);
        if (gap > 0.5 && gap < MIN_GAP - 0.5) {
          problems.push({ kind: 'gap', table: index, other });
        }
      }
    }
  });

  if (first && problems.length > 0) return problems;

  const way = board ? BOARD_WAY[board] : null;
  tables.forEach((table, index) => {
    seatsOf(table).forEach(({ chair: [x, y], facing }) => {
      const point: Point[] = [
        [x - 0.5, y - 0.5],
        [x + 0.5, y - 0.5],
        [x + 0.5, y + 0.5],
        [x - 0.5, y + 0.5],
      ];
      shapes.forEach((shape, other) => {
        if (other !== index && overlapDepth(shape, point) > 0.5) {
          problems.push({ kind: 'chair', table: index, other });
        }
      });
      if (way && facing[0] * way[0] + facing[1] * way[1] < -0.02) {
        problems.push({ kind: 'back', table: index });
      }
    });
  });

  if (first && problems.length > 0) return problems;

  getPhotoCollisions(tables).forEach((circle) =>
    problems.push({ kind: 'photo', table: circle.tableIndex }),
  );
  return problems;
}
