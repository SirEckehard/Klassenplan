// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomTable,
  RoomArrangementId,
  RoomSetupChoice,
  TableTemplateType,
} from '@/types';
import {
  getTablePresets,
  BOARD_WIDTH,
  GRID_SNAP_SIZE,
  MAX_STUDENTS,
} from '@/utils';
import arrangeTables, {
  CHAIR_ROOM,
  frontLine,
  roomFrame,
  toRoomTables,
  type BoardPlace,
  type FrameTable,
  type RoomFrame,
} from './autoArrange';
import { composeRoom, type RoomZone } from './roomComposer';

/*
 * Sitting orders "Neu einrichten" builds from the four kinds of table
 * (decision 0053). Each is laid out in the board's frame (`roomFrame`): the
 * board at the far end of `depth`, `across` along it. Desks pushed together
 * touch, so the mix reads them as it reads tables pushed together by hand —
 * face to face one group, side by side neighbours as close as seat partners.
 */

/** The arrangements in the order the menu lists them. */
export const ROOM_ARRANGEMENTS: readonly RoomArrangementId[] = [
  'horseshoe',
  'herringbone',
  'arena',
  'islands',
  'conference',
  'marketplace',
  'walls',
];

const DESK = 130; // a double desk's length
const DESK_DEPTH = 55; // and its depth
const CORNER_GAP = 15; // an open corner: wider than a join, a step to walk round

const snapToGrid = (value: number): number =>
  Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;

const double = (
  depth: number,
  across: number,
  rotation: number,
): FrameTable => ({ type: 'double', depth, across, rotation });

/** The (base, legs) of a horseshoe with the fewest empty seats for `need`. */
function pickHorseshoe(
  need: number,
  baseMax: number,
  legsMax: number,
  allowEmpty: boolean,
): { base: number; legs: number } | null {
  let best: { base: number; legs: number; score: number } | null = null;
  const first = allowEmpty ? 0 : 1;
  for (let base = first; base <= baseMax; base++) {
    for (let legs = first; legs <= legsMax; legs++) {
      const seats = 2 * base + 4 * legs;
      if (seats === 0 || seats < need) continue;
      // Fewest empty seats; then the wider base, where more face the board.
      const score = (seats - need) * 10 - base;
      if (!best || score < best.score) best = { base, legs, score };
    }
  }
  return best;
}

/**
 * Double desks round three walls, open towards the board; the students sit on
 * the outside and look into the middle. A class the room cannot seat so gets
 * a second, smaller U inside it.
 */
function horseshoe(students: number, frame: RoomFrame): FrameTable[] {
  const { across } = frame;
  const front = frontLine(frame);
  const back = 20 + CHAIR_ROOM; // the base's back edge
  const outerBaseMax = Math.max(0, Math.floor((across - 210) / DESK));
  const outerLegsMax = Math.max(
    0,
    Math.floor((front - back - DESK_DEPTH - CORNER_GAP) / DESK),
  );
  const outerSeats = 2 * outerBaseMax + 4 * outerLegsMax;
  const outer =
    students <= outerSeats
      ? pickHorseshoe(students, outerBaseMax, outerLegsMax, false)
      : { base: outerBaseMax, legs: outerLegsMax };
  if (!outer) return [];
  const extent = DESK_DEPTH + CORNER_GAP + outer.legs * DESK;
  const baseLeft = back + Math.max(0, (front - back - extent) / 2);

  const tables: FrameTable[] = [];
  const u = (
    left: number,
    legAt: number,
    shape: { base: number; legs: number },
  ) => {
    for (let index = 0; index < shape.base; index++) {
      tables.push(
        double(
          left + DESK_DEPTH / 2,
          across / 2 - ((shape.base - 1) * DESK) / 2 + index * DESK,
          0,
        ),
      );
    }
    const start = left + DESK_DEPTH + CORNER_GAP;
    for (let index = 0; index < shape.legs; index++) {
      const depth = start + DESK / 2 + index * DESK;
      // Turned so the chairs stand towards the wall behind each leg.
      tables.push(double(depth, legAt, 90));
      tables.push(double(depth, across - legAt, 270));
    }
  };
  u(baseLeft, 40 + DESK_DEPTH / 2, outer);

  if (students > outerSeats) {
    const innerLeft = baseLeft + DESK_DEPTH + 45;
    const inner = pickHorseshoe(
      students - outerSeats,
      Math.max(0, Math.floor((across - 410) / DESK)),
      Math.max(
        0,
        Math.floor((front - innerLeft - DESK_DEPTH - CORNER_GAP) / DESK),
      ),
      true,
    );
    if (inner) u(innerLeft, 140 + DESK_DEPTH / 2, inner);
  }
  return tables;
}

/**
 * Herringbone: double desks turned 30° towards the board in wings either side
 * of an aisle. Every other row stands a little further out, so the row behind
 * looks past the one in front.
 */
function herringbone(students: number, frame: RoomFrame): FrameTable[] {
  const { across } = frame;
  const halfDepth = 56; // half the depth a desk turned 30° takes
  const pitch = 118;
  const firstRow = frontLine(frame) - halfDepth;
  const rows = Math.max(0, Math.floor((firstRow - 106) / pitch) + 1);
  const columns = Math.max(1, Math.floor((across / 2 - 70) / 160));
  const doubles = Math.ceil(students / 2);
  const tables: FrameTable[] = [];
  for (let row = 0; row < rows; row++) {
    const out = row % 2 ? 22 : 0;
    for (let column = 0; column < columns; column++) {
      const off = 145 + column * 160 + out;
      for (const side of [-1, 1] as const) {
        if (tables.length >= doubles) return tables;
        tables.push(
          double(firstRow - row * pitch, across / 2 + side * off, side * -30),
        );
      }
    }
  }
  return tables;
}

/** Single desks on arcs round the board, each turned to face it. */
function arena(students: number, frame: RoomFrame): FrameTable[] {
  const { depth, across } = frame;
  const centreDepth = depth - BOARD_WIDTH;
  const centreAcross = across / 2;
  const pitch = 87; // along an arc: a desk's width and a little room
  const nearest = centreDepth - frontLine(frame) + 28;
  const tables: FrameTable[] = [];
  let left = students;
  for (let radius = 220; radius <= depth - 120 && left > 0; radius += 110) {
    const reach = Math.min(
      Math.asin(Math.min(1, (across / 2 - 45) / radius)),
      // The photo behind the desk keeps clear of the side wall too.
      Math.asin(Math.min(1, (across / 2 - 20) / (radius + 46))),
      Math.acos(Math.min(1, nearest / radius)),
      (65 * Math.PI) / 180,
    );
    const fit = Math.floor((2 * reach * radius) / pitch) + 1;
    const step = fit > 1 ? (2 * reach) / (fit - 1) : 0;
    const count = Math.min(fit, left);
    for (let index = 0; index < count; index++) {
      const angle = (index - (count - 1) / 2) * step;
      const tableDepth = centreDepth - radius * Math.cos(angle);
      const tableAcross = centreAcross + radius * Math.sin(angle);
      tables.push({
        type: 'single',
        depth: tableDepth,
        across: tableAcross,
        rotation: Math.round(
          (Math.atan2(centreAcross - tableAcross, centreDepth - tableDepth) *
            180) /
            Math.PI,
        ),
      });
    }
    left -= count;
  }
  return tables;
}

/** A group table's depth, and how far its lanes stand from the middle. */
const GROUP_DEPTH = 110;
const ISLAND_LANE = 105;

/**
 * The rows of a die's five, from the front: two tables either side of the
 * middle, then one in the middle, and so on — begun with whichever ends on a
 * full row.
 */
function diceRows(groups: number): number[] {
  // Null where the last row would be cut short.
  const rows = (first: number): number[] | null => {
    const out: number[] = [];
    let left = groups;
    let next = first;
    while (left > 0) {
      if (next > left) return null;
      out.push(next);
      left -= next;
      next = 3 - next;
    }
    return out;
  };
  return rows(2) ?? rows(1) ?? [groups];
}

/**
 * Groups of four as a die's five — two, one in the middle, two — and single
 * desks along both side walls facing the wall, in the gaps between the rows
 * of two: for quiet work, or for whoever needs a moment's calm.
 */
function islands(students: number, frame: RoomFrame): FrameTable[] {
  const { across } = frame;
  const front = frontLine(frame);
  const singles = Math.min(students, [4, 5, 6, 3][students % 4]!);
  const groups = Math.ceil((students - singles) / 4);
  const tables: FrameTable[] = [];

  const from = 60;
  const span = front - from;
  // As many rows as the room is deep for; a class it cannot seat so is too
  // large for the arrangement here.
  const rows = diceRows(groups).slice(
    0,
    Math.max(1, Math.floor((span - GROUP_DEPTH) / 150) + 1),
  );
  const pitch =
    rows.length > 1
      ? Math.max(150, Math.min(185, (span - GROUP_DEPTH) / (rows.length - 1)))
      : 0;
  const frontRow = from + span / 2 + ((rows.length - 1) * pitch) / 2;
  const pairDepths: number[] = [];
  rows.forEach((count, row) => {
    const depth = frontRow - row * pitch;
    const lanes =
      count === 2
        ? [across / 2 - ISLAND_LANE, across / 2 + ISLAND_LANE]
        : [across / 2];
    if (count === 2) pairDepths.push(depth);
    for (const at of lanes) {
      tables.push({
        type: 'group4',
        depth,
        across: snapToGrid(at - 65) + 65,
        rotation: 0,
      });
    }
  });

  // Where a wall desk may stand: clear of the photos at the rows of two.
  const clear = 70;
  const lowest = 80;
  const highest = front - 30;
  const bounds = [
    lowest - clear,
    ...pairDepths.sort((a, b) => a - b),
    highest + clear,
  ];
  const gaps = bounds
    .slice(1)
    .map((upper, index) => ({
      from: bounds[index]! + clear,
      to: upper - clear,
      between: index > 0 && index < bounds.length - 2,
    }))
    .filter((gap) => gap.to >= gap.from);
  // The gaps between rows first, the longest first; the ends only if needed.
  gaps.sort(
    (a, b) =>
      Number(b.between) - Number(a.between) || b.to - b.from - (a.to - a.from),
  );
  const capacity = (gap: { from: number; to: number }) =>
    Math.floor((gap.to - gap.from) / 80) + 1;

  [Math.ceil(singles / 2), Math.floor(singles / 2)].forEach((count, wall) => {
    const between = gaps.filter((gap) => gap.between);
    const pool =
      between.reduce((sum, gap) => sum + capacity(gap), 0) >= count
        ? between
        : gaps;
    // In turn, to the gap holding the fewest so far.
    const share = pool.map(() => 0);
    for (let placed = 0; placed < count; placed++) {
      let pick = -1;
      pool.forEach((gap, index) => {
        if (share[index]! >= capacity(gap)) return;
        if (pick === -1 || share[index]! < share[pick]!) pick = index;
      });
      if (pick === -1) break;
      share[pick]!++;
    }
    pool.forEach((gap, index) => {
      const inGap = share[index]!;
      const spacing =
        inGap > 1 ? Math.min(170, (gap.to - gap.from) / (inGap - 1)) : 0;
      for (let k = 0; k < inGap; k++) {
        tables.push({
          type: 'single',
          depth: (gap.from + gap.to) / 2 + (k - (inGap - 1) / 2) * spacing,
          across: wall === 0 ? 45 : across - 45,
          rotation: wall === 0 ? 270 : 90,
        });
      }
    });
  });
  return tables;
}

/** Long tables of double desks pushed together, everybody facing someone. */
function conference(students: number, frame: RoomFrame): FrameTable[] {
  const { across } = frame;
  const front = frontLine(frame);
  const maxPairs = Math.max(1, Math.floor((front - 40) / DESK));
  const maxTables = Math.max(1, Math.floor((across - 20) / 230));
  const doubles = Math.ceil(students / 2);
  const pairs = Math.ceil(doubles / 2);
  const count = Math.min(maxTables, Math.ceil(pairs / maxPairs));
  const tables: FrameTable[] = [];
  let left = doubles;
  for (let table = 0; table < count; table++) {
    const length = Math.min(
      maxPairs,
      Math.floor(pairs / count) + (table < pairs % count ? 1 : 0),
    );
    const centre = (across * (table + 0.5)) / count;
    const start = 40 + (front - 40 - length * DESK) / 2;
    for (let index = 0; index < length && left > 0; index++) {
      const depth = start + DESK / 2 + index * DESK;
      tables.push(double(depth, centre - DESK_DEPTH / 2, 90));
      left--;
      if (left > 0) {
        tables.push(double(depth, centre + DESK_DEPTH / 2, 270));
        left--;
      }
    }
  }
  return tables;
}

/**
 * Groups of four in a row along each side wall, chairs towards the middle and
 * the wall; the tables between the ends stand a little nearer the wall, so
 * the middle stays free for stations, a circle or moving about.
 */
function marketplace(students: number, frame: RoomFrame): FrameTable[] {
  const { across } = frame;
  const from = 60;
  const span = frontLine(frame) - from;
  const centre = from + span / 2;
  const perWall = Math.max(1, Math.floor((span - GROUP_DEPTH) / 150) + 1);
  const groups = Math.ceil(students / 4);
  const near = Math.min(perWall, Math.ceil(groups / 2));
  const far = Math.min(perWall, groups - near);
  const pitch = near > 1 ? Math.min(220, (span - GROUP_DEPTH) / (near - 1)) : 0;
  const tables: FrameTable[] = [];
  const wallRow = (count: number, lane: number, towardWall: number) => {
    for (let index = 0; index < count; index++) {
      const inner = index > 0 && index < count - 1;
      const at = lane + (inner ? towardWall * 25 : 0);
      tables.push({
        type: 'group4',
        // A shorter row stands in the gaps of the longer one.
        depth: centre + (index - (count - 1) / 2) * pitch,
        across: snapToGrid(at - 65) + 65,
        rotation: 0,
      });
    }
  };
  wallRow(near, 130, -1);
  wallRow(far, across - 130, 1);
  return tables;
}

/**
 * Double desks along the side walls and the back wall, turned to face the
 * wall, so the middle stays free; the students turn round to the board. A
 * class the walls cannot seat fills an island of desks face to face in the
 * middle.
 */
function walls(students: number, frame: RoomFrame): FrameTable[] {
  const { across } = frame;
  const front = frontLine(frame);
  const doubles = Math.ceil(students / 2);
  const sideFrom = 90;
  const perSide = Math.max(0, Math.floor((front - sideFrom) / DESK));
  const backCount = Math.max(0, Math.floor((across - 220) / DESK));
  const islandMax = Math.max(0, Math.floor((front - 170) / DESK));

  const slots: FrameTable[] = [];
  for (let index = 0; index < perSide; index++) {
    const depth = sideFrom + DESK / 2 + index * DESK;
    slots.push(double(depth, 15 + DESK_DEPTH / 2, 270));
    slots.push(double(depth, across - 15 - DESK_DEPTH / 2, 90));
  }
  const backStart = across / 2 - ((backCount - 1) * DESK) / 2;
  Array.from({ length: backCount }, (_, index) => backStart + index * DESK)
    .sort((a, b) => Math.abs(a - across / 2) - Math.abs(b - across / 2))
    .forEach((at) => slots.push(double(25 + DESK_DEPTH / 2, at, 180)));

  const onWalls = slots.slice(0, doubles);
  const rest = doubles - onWalls.length;
  if (rest <= 0) return onWalls;
  const pairs = Math.min(islandMax, Math.ceil(rest / 2));
  const start = 170 + (front - 170 - pairs * DESK) / 2;
  let left = rest;
  for (let index = 0; index < pairs && left > 0; index++) {
    const depth = start + DESK / 2 + index * DESK;
    onWalls.push(double(depth, across / 2 - DESK_DEPTH / 2, 90));
    left--;
    if (left > 0) {
      onWalls.push(double(depth, across / 2 + DESK_DEPTH / 2, 270));
      left--;
    }
  }
  return onWalls;
}

const BUILDERS: Record<
  RoomArrangementId,
  (students: number, frame: RoomFrame) => FrameTable[]
> = {
  horseshoe,
  herringbone,
  arena,
  islands,
  conference,
  marketplace,
  walls,
};

const seatsOf = (tables: readonly { type: TableTemplateType }[]): number => {
  const presets = getTablePresets();
  return tables.reduce((sum, table) => sum + presets[table.type].seatCount, 0);
};

/** An arrangement for `students`, towards the board. */
export function arrangeArrangement(
  id: RoomArrangementId,
  students: number,
  board?: BoardPlace,
): ClassroomTable[] {
  if (students <= 0) return [];
  const frame = roomFrame(board);
  return toRoomTables(BUILDERS[id](students, frame), frame);
}

/**
 * Up to how many students an arrangement seats in this room — at most
 * `MAX_STUDENTS`, the most a class may have.
 */
export function arrangementCapacity(
  id: RoomArrangementId,
  board?: BoardPlace,
): number {
  const frame = roomFrame(board);
  for (let students = MAX_STUDENTS; students > 0; students--) {
    if (seatsOf(BUILDERS[id](students, frame)) >= students) return students;
  }
  return 0;
}

const isArrangement = (choice: RoomSetupChoice): choice is RoomArrangementId =>
  (ROOM_ARRANGEMENTS as readonly string[]).includes(choice);

/**
 * The tables "Neu einrichten" places for a choice: as many tables of one kind
 * as the class needs, an arrangement, or for `random` a room put together
 * from zones (`composeRoom`). Where no such room comes out right, `random`
 * takes an arrangement that seats the class, never `previous` again when
 * another one does.
 */
export function arrangeRoom(
  choice: RoomSetupChoice,
  students: number,
  board?: BoardPlace,
  {
    previous,
    rng = Math.random,
  }: { previous?: RoomArrangementId; rng?: () => number } = {},
): {
  tables: ClassroomTable[];
  arrangement?: RoomArrangementId;
  zones?: RoomZone[];
} {
  if (choice === 'random') {
    const composed = composeRoom(students, board, { rng });
    if (composed) return composed;
    const fitting = ROOM_ARRANGEMENTS.filter(
      (id) => arrangementCapacity(id, board) >= students,
    );
    const pool =
      fitting.length > 1 ? fitting.filter((id) => id !== previous) : fitting;
    const pick = pool[Math.floor(rng() * pool.length)] ?? 'arena';
    return {
      tables: arrangeArrangement(pick, students, board),
      arrangement: pick,
    };
  }
  if (isArrangement(choice)) {
    return {
      tables: arrangeArrangement(choice, students, board),
      arrangement: choice,
    };
  }
  const needed = Math.ceil(students / getTablePresets()[choice].seatCount);
  return { tables: arrangeTables(choice, needed, board) };
}
