// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  ClassroomTable,
  SeatingArrangement,
  Student,
} from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';
import { evenTargetsFor } from '@/utils/distribution';
import { isTableActive } from '../math/scene';
import { determineFrontDirection } from './orientationUtils';
import type { RandomSource } from './rng';

/**
 * Tables whose centres lie closer than this to the front than the first table
 * of a row count as the same row. Tables placed by hand never line up to the
 * pixel; a double desk is 60 deep, so this stays well inside one row.
 */
const FRONT_ROW_TOLERANCE = 30;

type LockedPositions = Record<string, { table: number; seat: number }>;

/** Per table, how many present students are locked to one of its seats. */
const countLockedPerTable = (
  students: Student[],
  scene: ClassroomScene,
  lockedPositions: LockedPositions,
): number[] => {
  const counts = scene.tables.map(() => 0);
  const present = new Set(students.map((s) => s.id));
  for (const [studentId, pos] of Object.entries(lockedPositions)) {
    if (!present.has(studentId)) continue;
    const table = scene.tables[pos.table];
    if (!table || pos.seat < 0 || pos.seat >= table.seatCount) continue;
    counts[pos.table] = Math.min(table.seatCount, counts[pos.table]! + 1);
  }
  return counts;
};

/** A table in a row of {@link tableRowsFromFront}. */
export type TableInRow = {
  table: ClassroomTable;
  index: number;
  /** Distance of its centre from the front wall. */
  depth: number;
  /** Its centre along the front wall, as drawn (x, or y with the board at a side). */
  lateral: number;
};

/**
 * The tables cut into rows away from the board: a row starts at its
 * front-most table and takes every table up to `FRONT_ROW_TOLERANCE` behind
 * it. Within a row the tables keep the order of their depth, ties by index.
 * `include` picks the tables (by default those in the mix).
 */
export function tableRowsFromFront(
  scene: ClassroomScene,
  include: (table: ClassroomTable) => boolean = isTableActive,
): TableInRow[][] {
  const orientation = determineFrontDirection(scene);
  const alongX = orientation.dominantAxis === 'x';
  const centre = (table: ClassroomTable) => ({
    x: table.x + table.width / 2,
    y: table.y + table.height / 2,
  });
  const depthOf = (table: ClassroomTable) => {
    const { x, y } = centre(table);
    if (alongX) return orientation.frontIsHighX ? CLASSROOM_WIDTH - x : x;
    return orientation.frontIsHighY ? CLASSROOM_HEIGHT - y : y;
  };

  const byDepth = scene.tables
    .map((table, index) => {
      const { x, y } = centre(table);
      return { table, index, depth: depthOf(table), lateral: alongX ? y : x };
    })
    .filter(({ table }) => include(table))
    .sort((a, b) => a.depth - b.depth || a.index - b.index);

  const rows: TableInRow[][] = [];
  for (const entry of byDepth) {
    const row = rows[rows.length - 1];
    if (row && entry.depth - row[0]!.depth <= FRONT_ROW_TOLERANCE) {
      row.push(entry);
    } else {
      rows.push([entry]);
    }
  }
  return rows;
}

/**
 * The tables of the mix in the order they are filled from the front: row by
 * row away from the board, and within a row from the board's middle outwards,
 * so the students of a half-filled row sit where they see best. Ties fall to
 * the table index — the order is the same on every run, so a plan and its
 * refinement agree on which tables stay empty.
 */
export function frontToBackTableOrder(scene: ClassroomScene): number[] {
  const alongX = determineFrontDirection(scene).dominantAxis === 'x';
  const board = (scene.features ?? [])
    .filter((f) => f.type === 'board')
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  const middle = board
    ? alongX
      ? board.y + board.height / 2
      : board.x + board.width / 2
    : alongX
      ? CLASSROOM_HEIGHT / 2
      : CLASSROOM_WIDTH / 2;
  const offCentre = (entry: TableInRow) => Math.abs(entry.lateral - middle);

  return tableRowsFromFront(scene).flatMap((row) =>
    row
      .sort((a, b) => offCentre(a) - offCentre(b) || a.index - b.index)
      .map(({ index }) => index),
  );
}

/**
 * How many students each table takes in a mix. A seat at index `target` or
 * beyond stays empty; the construction and both refinements read it so, and
 * the refinements count the students of a held table too
 * (`tablesHeldByCount`).
 *
 * - A table taken out of the mix takes nobody, but a student locked to it
 *   by hand keeps that seat and does not need another.
 * - With `scene.fillFromFront` the tables fill up one by one from the board
 *   backwards (`frontToBackTableOrder`), so spare seats end up at the back.
 * - Otherwise the students spread evenly over the tables (`evenTargetsFor`).
 *
 * A room without either option takes exactly the path it took before them —
 * the same call, the same draw from `rng` — so its plans do not change.
 */
export function seatTargetsFor(
  students: Student[],
  scene: ClassroomScene,
  lockedPositions: LockedPositions,
  rng: RandomSource,
): number[] {
  const seatCounts = scene.tables.map((t) => t.seatCount);
  const anyInactive = scene.tables.some((t) => !isTableActive(t));
  if (!anyInactive && !scene.fillFromFront) {
    return evenTargetsFor(students.length, seatCounts, rng);
  }

  const locked = countLockedPerTable(students, scene, lockedPositions);
  const active = scene.tables.map(isTableActive);

  if (!scene.fillFromFront) {
    const lockedAside = locked.reduce(
      (sum, count, t) => (active[t] ? sum : sum + count),
      0,
    );
    const capacities = seatCounts.map((count, t) => (active[t] ? count : 0));
    const targets = evenTargetsFor(
      students.length - lockedAside,
      capacities,
      rng,
    );
    return targets.map((target, t) => (active[t] ? target : locked[t]!));
  }

  // Locked students keep their tables; the rest fill the mix from the front.
  const targets = [...locked];
  let remaining = Math.max(
    0,
    students.length - locked.reduce((sum, count) => sum + count, 0),
  );
  for (const t of frontToBackTableOrder(scene)) {
    if (remaining === 0) break;
    const take = Math.min(seatCounts[t]! - targets[t]!, remaining);
    targets[t]! += take;
    remaining -= take;
  }
  return targets;
}

/**
 * The tables a refinement has to hold to their target by counting their
 * students, not by the seat index alone — or `null` when the index will do.
 * A student locked to a back seat sits at or beyond the target index, and the
 * seats before that one stay open to the index check, so a swap could seat a
 * second student at a table out of the mix, or behind the rows a room fills
 * from the front (decision 0026).
 *
 * This is for a refinement run on its own, which draws targets of its own.
 * With `fillFromFront` every table is held: those targets do not depend on
 * the draw. Otherwise only the tables out of the mix are — holding the others
 * to a draw of its own would only narrow its search. A room without either
 * option keeps the index check alone. Within a mix the refinement takes the
 * construction's targets and holds every table (decision 0027).
 */
export function tablesHeldByCount(scene: ClassroomScene): boolean[] | null {
  if (scene.fillFromFront) return scene.tables.map(() => true);
  const held = scene.tables.map((table) => !isTableActive(table));
  return held.some(Boolean) ? held : null;
}

/**
 * Whether swapping seat `s1` of table `t1` with seat `s2` of table `t2` would
 * seat more students at a held table than its target. Only a student moving
 * onto an empty seat of another table changes the counts; a table already
 * over its target (a student put there by hand) may still lose students.
 */
export function swapOverfillsTable(
  arrangement: SeatingArrangement,
  targets: number[],
  held: boolean[],
  t1: number,
  s1: number,
  t2: number,
  s2: number,
): boolean {
  if (t1 === t2) return false;
  const first = arrangement[t1]?.[s1];
  const second = arrangement[t2]?.[s2];
  if (Boolean(first) === Boolean(second)) return false;
  const destination = first ? t2 : t1;
  if (!held[destination]) return false;
  const seated = arrangement[destination]?.filter(Boolean).length ?? 0;
  return seated >= (targets[destination] ?? 0);
}
