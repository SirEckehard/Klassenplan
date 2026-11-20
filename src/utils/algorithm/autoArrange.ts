// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  ClassroomTable,
  TableTemplateType,
} from '@/types';
import {
  getTablePresets,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  BOARD_WIDTH,
  GRID_SNAP_SIZE,
  normalizeRotation,
} from '@/utils';
import {
  determineFrontDirection,
  type FrontDirection,
} from './orientationUtils';

/**
 * The room as seen from its board (decision 0053): `depth` runs from the back
 * wall to the wall the board hangs on, `across` along that wall. Every
 * arrangement is laid out in this frame and turned into the room afterwards,
 * so a board on any wall gets the same arrangement facing it.
 */
export interface RoomFrame {
  direction: FrontDirection;
  depth: number;
  across: number;
}

/**
 * A table in the frame: its centre — `depth` towards the board, `across`
 * along it — and its turn in degrees. At 0° a desk's chairs are behind it, so
 * its student faces the board.
 */
export interface FrameTable {
  type: TableTemplateType;
  depth: number;
  across: number;
  rotation: number;
}

/** Room a seated student takes beyond the table's edge. */
export const CHAIR_ROOM = 35;

/** Room kept clear in front of the board for the teacher. */
const TEACHER_ROOM = 105;

/** The line the tables stay behind: the board's face less the teacher's room. */
export const frontLine = (frame: RoomFrame): number =>
  frame.depth - BOARD_WIDTH - TEACHER_ROOM;

const snapToGrid = (value: number): number =>
  Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Where a room's board hangs: read from its scene, or named as the wall
 * itself; the right wall when nothing says otherwise.
 */
export type BoardPlace = ClassroomScene | FrontDirection | undefined;

/** The frame of a room, by the wall its board hangs on. */
export function roomFrame(place?: BoardPlace): RoomFrame {
  const direction =
    typeof place === 'string'
      ? place
      : place
        ? determineFrontDirection(place).frontDirection
        : 'right';
  const sideways = direction === 'top' || direction === 'bottom';
  return {
    direction,
    depth: sideways ? CLASSROOM_HEIGHT : CLASSROOM_WIDTH,
    across: sideways ? CLASSROOM_WIDTH : CLASSROOM_HEIGHT,
  };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Turns frame tables into the room's tables, numbered from the board backwards
 * and along it, as the seat numbers read.
 */
export function toRoomTables(
  tables: readonly FrameTable[],
  frame: RoomFrame,
): ClassroomTable[] {
  const presets = getTablePresets();
  return [...tables]
    .sort((a, b) => b.depth - a.depth || a.across - b.across)
    .map((table, index) => {
      const { width, height, seatCount } = presets[table.type];
      let cx: number;
      let cy: number;
      let rotation: number;
      switch (frame.direction) {
        case 'left':
          cx = CLASSROOM_WIDTH - table.depth;
          cy = CLASSROOM_HEIGHT - table.across;
          rotation = table.rotation + 180;
          break;
        case 'top':
          cx = table.across;
          cy = CLASSROOM_HEIGHT - table.depth;
          rotation = table.rotation - 90;
          break;
        case 'bottom':
          cx = CLASSROOM_WIDTH - table.across;
          cy = table.depth;
          rotation = table.rotation + 90;
          break;
        default:
          cx = table.depth;
          cy = table.across;
          rotation = table.rotation;
      }
      return {
        x: round2(cx - width / 2),
        y: round2(cy - height / 2),
        width,
        height,
        rotation: round2(normalizeRotation(rotation)),
        seatCount,
        locked: false,
        zIndex: index,
        templateType: table.type,
      };
    });
}

// Desks in rows: the margins and gaps "Neu einrichten" has always used.
const ROW_MARGIN = 30;
const MIN_ROW_GAP = 15;
const MAX_ROW_GAP = 60;
const MAX_DESK_ROWS = 6;
/** From the back wall to the back row: its chairs and the photos on them. */
const BACK_ROOM = 40;

/**
 * Single and double desks in rows along the board, filled from the front; a
 * row that does not fill stands at the back, in the middle. With full rows
 * and the board on the right this is the arrangement "Neu einrichten" has
 * always built.
 */
function deskRows(
  type: 'single' | 'double',
  count: number,
  frame: RoomFrame,
): FrameTable[] {
  const { width, height } = getTablePresets()[type];
  const depthSpan = frame.depth - BOARD_WIDTH - 2 * ROW_MARGIN;
  const acrossSpan = frame.across - 2 * ROW_MARGIN;
  const rowsFit = Math.max(1, Math.floor((depthSpan + 40) / (width + 40)));
  const perFit = Math.max(
    1,
    Math.floor((acrossSpan + MIN_ROW_GAP) / (height + MIN_ROW_GAP)),
  );

  let rows: number;
  let perRow: number;
  if (type === 'single') {
    rows = Math.min(MAX_DESK_ROWS, rowsFit, count);
    perRow = Math.min(perFit, Math.ceil(count / rows));
  } else {
    perRow = Math.min(perFit, count);
  }
  rows = Math.ceil(count / perRow);
  perRow = Math.ceil(count / rows);

  // Behind the back row its chairs, and the photos beside them, need the
  // wall further off than the margin: where the room is shallow the rows
  // close up for it. (Deep enough, the gaps stop at their widest first.)
  const photoSpan = frame.depth - BOARD_WIDTH - ROW_MARGIN - BACK_ROOM;
  const gapDepth =
    rows > 1
      ? clamp(
          (Math.min(depthSpan, photoSpan) - rows * width) / (rows - 1),
          MIN_ROW_GAP,
          MAX_ROW_GAP,
        )
      : 35;
  const gapAcross =
    perRow > 1
      ? clamp(
          (acrossSpan - perRow * height) / (perRow - 1),
          MIN_ROW_GAP,
          MAX_ROW_GAP,
        )
      : 35;
  const blockDepth = rows * width + (rows - 1) * gapDepth;
  const back = Math.max(
    BACK_ROOM,
    snapToGrid(ROW_MARGIN + (depthSpan - blockDepth) / 2),
  );

  const tables: FrameTable[] = [];
  for (let row = 0; row < rows; row++) {
    const inRow = row < rows - 1 ? perRow : count - perRow * (rows - 1);
    const blockAcross = inRow * height + (inRow - 1) * gapAcross;
    const start = snapToGrid(ROW_MARGIN + (acrossSpan - blockAcross) / 2);
    const left = clamp(
      back + (rows - 1 - row) * (width + gapDepth),
      0,
      frame.depth - BOARD_WIDTH - width,
    );
    for (let index = 0; index < inRow; index++) {
      const top = snapToGrid(
        clamp(
          snapToGrid(start + index * (height + gapAcross)),
          ROW_MARGIN,
          frame.across - height - ROW_MARGIN,
        ),
      );
      tables.push({
        type,
        depth: left + width / 2,
        across: top + height / 2,
        rotation: 0,
      });
    }
  }
  return tables;
}

const MIN_ISLAND_GAP = 40;
const MAX_ISLAND_GAP = 110;

/**
 * Group tables in lanes from the back to the board, with even gaps over the
 * room and a strip kept free before the board; the number of lanes is the
 * one that leaves the most room round every table. A row that does not fill
 * stands at the back, in the middle. A grid, not staggered: the maintainer
 * chose the grid (decision 0053).
 */
function groupLanes(
  type: 'group4' | 'group6',
  count: number,
  frame: RoomFrame,
): FrameTable[] {
  const { width, height } = getTablePresets()[type];
  // Chairs along both long sides; a table of six also has two at its back.
  const footAcross = height + 2 * CHAIR_ROOM;
  const footDepth = width + (type === 'group6' ? CHAIR_ROOM : 0);
  const acrossFrom = 15;
  const spanAcross = frame.across - 2 * acrossFrom;
  const depthTo = frontLine(frame);
  const spanDepth = depthTo - 25;

  let best: { lanes: number; deep: number; gap: number; score: number } | null =
    null;
  for (const minGap of [MIN_ISLAND_GAP, MIN_ROW_GAP]) {
    for (let lanes = 1; lanes <= Math.min(4, count); lanes++) {
      const deep = Math.ceil(count / lanes);
      const freeAcross = spanAcross - lanes * footAcross;
      const freeDepth = spanDepth - deep * footDepth;
      if (freeAcross < 0 || freeDepth < (deep - 1) * minGap) continue;
      const gapAcross = freeAcross / (lanes + 1);
      const gapDepth = Math.min(freeDepth / (deep + 1), MAX_ISLAND_GAP);
      const score =
        Math.min(gapAcross, gapDepth) -
        Math.abs(gapAcross - gapDepth) / 2 -
        (lanes * deep - count) * 15;
      if (!best || score > best.score) {
        best = { lanes, deep, gap: Math.max(minGap, gapDepth), score };
      }
    }
    if (best) break;
  }
  // A room too small for even the narrowest gaps: one lane, as close as it goes.
  const { lanes, deep, gap } = best ?? {
    lanes: 1,
    deep: count,
    gap: MIN_ROW_GAP,
  };

  const pitch = footDepth + gap;
  const extent = deep * footDepth + (deep - 1) * gap;
  // Nearer the board than the back: the leftover room goes two to one.
  const front = depthTo - Math.max(0, spanDepth - extent) * 0.35;
  const tables: FrameTable[] = [];
  for (let row = 0; row < deep; row++) {
    const inRow = Math.min(lanes, count - row * lanes);
    const laneGap = Math.max(
      0,
      (spanAcross - inRow * footAcross) / (inRow + 1),
    );
    for (let lane = 0; lane < inRow; lane++) {
      const across =
        acrossFrom + laneGap * (lane + 1) + footAcross * lane + footAcross / 2;
      tables.push({
        type,
        depth: front - row * pitch - width / 2,
        across: snapToGrid(across - height / 2) + height / 2,
        rotation: 0,
      });
    }
  }
  return tables;
}

/**
 * As many tables of one kind as `count`, arranged towards the board: desks in
 * rows along it, group tables in even lanes. The board's wall comes from
 * `board`, a scene or the wall itself; without one it is the right wall.
 */
export default function arrangeTables(
  type: TableTemplateType,
  count: number,
  board?: BoardPlace,
): ClassroomTable[] {
  if (count <= 0) return [];
  const frame = roomFrame(board);
  const tables =
    type === 'single' || type === 'double'
      ? deskRows(type, count, frame)
      : groupLanes(type, count, frame);
  return toRoomTables(tables, frame);
}
