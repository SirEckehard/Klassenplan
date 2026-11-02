// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import { ADJACENT_GAP, JOIN_GAP, ROW_GAP } from '@/utils';
import {
  calculateSeatLayout,
  calculateSeatPosition,
  determineSeatEdge,
  hasTemplateSeatLayout,
  type SeatLayoutDetails,
} from '@/utils/math/positionCalculations';
import { getRotatedAabbHalfExtents } from '@/utils/math/rotation';
import { seatPairsFor } from '@/utils/math/seatGeometry';
import { isTableActive } from '@/utils/math/scene';
import { determineFrontDirection } from '../orientationUtils';

/**
 * How two seats relate (decision 0031). At one table `partner` is the seat
 * pair by index, `corner` the seat round the corner, `opposite` the seat
 * across the table, `table` every seat further away; `beside`, `ahead` and
 * `behind` are seats of another table directly next to this one, read
 * relative to the board: `ahead` is the seat between this one and the board,
 * `behind` the one further from it.
 */
export type SeatRelationKind =
  'partner' | 'corner' | 'opposite' | 'table' | 'beside' | 'ahead' | 'behind';

/** Every kind, in the order the typed lookups of the model index them. */
export const SEAT_RELATION_KINDS: readonly SeatRelationKind[] = [
  'partner',
  'corner',
  'opposite',
  'table',
  'beside',
  'ahead',
  'behind',
];

export interface SeatRelation {
  /** Flat index of the related seat */
  seat: number;
  /** Index into {@link SEAT_RELATION_KINDS} */
  kind: number;
}

/**
 * The seats of a scene in one flat list, with how each relates to the others
 * and how far forward it sits. Built once per scene; the mixing and the
 * fulfilment read the same instance.
 */
export interface SeatLayout {
  /** Number of seats over all tables */
  size: number;
  /** Flat index of seat 0 of every table, and `size` at the end */
  offsets: number[];
  tableOf: Int32Array;
  seatOf: Int32Array;
  /** The related seats of every seat; a relation is listed at both ends */
  relations: SeatRelation[][];
  /** Kind index between two seats (`a * size + b`), -1 where unrelated */
  kindBetween: Int8Array;
  /**
   * 0 at the back to 1 at the front, along the axis the board faces, over the
   * seats of the tables in the mix — a row nobody is seated in must not count
   * as the back. 0.5 for every seat of a room that is one row deep.
   */
  depth: Float64Array;
  /** `"table-seat"`, the key the feature distances and the highlights use */
  keys: string[];
  /**
   * The seats of every table group: a table on its own, or tables pushed
   * together round a corner or face to face. What a table's make-up decides —
   * gender, roles, tutoring — reads the group.
   */
  groups: number[][];
  /** The group of every seat */
  groupOf: Int32Array;
}

export const kindIndex = (kind: SeatRelationKind): number =>
  SEAT_RELATION_KINDS.indexOf(kind);

const PARTNER = kindIndex('partner');
const CORNER = kindIndex('corner');
const OPPOSITE = kindIndex('opposite');
const TABLE = kindIndex('table');
const BESIDE = kindIndex('beside');
const AHEAD = kindIndex('ahead');
const BEHIND = kindIndex('behind');

/**
 * How two seats of one table relate by where they sit at it: the seat pair by
 * index, then from the template's grid and the edge each seat faces — across
 * the table where the two face each other in one column or row, round the
 * corner where their cells touch at different edges, otherwise further apart.
 * Read in the table's own frame, so a turn changes nothing; a seat count the
 * template does not know keeps the pair and the rest of the table.
 */
const tableSeatKind = (
  table: ClassroomScene['tables'][number],
  layout: SeatLayoutDetails,
  isPartner: boolean,
  a: number,
  b: number,
): number => {
  if (isPartner) return PARTNER;
  if (!hasTemplateSeatLayout(table)) return TABLE;
  const positionA = layout.positions[a]!;
  const positionB = layout.positions[b]!;
  const edgeA = determineSeatEdge(
    table.templateType,
    positionA,
    layout,
    table.seatCount,
  );
  const edgeB = determineSeatEdge(
    table.templateType,
    positionB,
    layout,
    table.seatCount,
  );
  const edges = new Set([edgeA, edgeB]);
  const acrossRows = edges.has('top') && edges.has('bottom');
  const acrossColumns = edges.has('left') && edges.has('right');
  if (
    (acrossRows && positionA.col === positionB.col) ||
    (acrossColumns && positionA.row === positionB.row)
  ) {
    return OPPOSITE;
  }
  const step =
    Math.abs(positionA.col - positionB.col) +
    Math.abs(positionA.row - positionB.row);
  return edgeA !== edgeB && step === 1 ? CORNER : TABLE;
};

type SeatFootprint = {
  table: number;
  seat: number;
  x: number;
  y: number;
  /** Half extents of the turned seat cell along x and y */
  hx: number;
  hy: number;
  /** Unit vector from the seat towards its chair, in the room */
  chairX: number;
  chairY: number;
};

/** Least overlap along a shared edge for two seat cells to count as joined. */
const JOIN_OVERLAP = 5;

/** Unit vector from a seat towards its chair, by the edge it faces. */
const EDGE_VECTORS = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
} as const;

const collectFootprints = (scene: ClassroomScene): SeatFootprint[] => {
  const footprints: SeatFootprint[] = [];
  scene.tables.forEach((table, tableIndex) => {
    const layout = calculateSeatLayout(table);
    // The axis-aligned box around the turned seat cell, so a turned table
    // still meets its neighbours where it is drawn.
    const { halfWidth: hx, halfHeight: hy } = getRotatedAabbHalfExtents(
      layout.seatWidth,
      layout.seatHeight,
      table.rotation ?? 0,
    );
    const radians = ((table.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    for (let seatIndex = 0; seatIndex < table.seatCount; seatIndex++) {
      const { x, y, col, row } = calculateSeatPosition({
        mode: 'scene',
        table,
        seatIndex,
        layout,
      });
      const [ex, ey] =
        EDGE_VECTORS[
          determineSeatEdge(
            table.templateType,
            { col, row },
            layout,
            table.seatCount,
          )
        ];
      footprints.push({
        table: tableIndex,
        seat: seatIndex,
        x,
        y,
        hx,
        hy,
        chairX: ex * cos - ey * sin,
        chairY: ex * sin + ey * cos,
      });
    }
  });
  return footprints;
};

/**
 * How two seats of different tables relate where the tables are pushed
 * together: their cells meet edge to edge, no more than `JOIN_GAP` apart and
 * overlapping along the edge — touching at a corner is no join. `corner` for
 * chairs at right angles, `opposite` for chairs facing each other across the
 * join, `partner` for chairs side by side facing the same way — the seats at
 * the short sides of two desks in a row are as close as a seat partner. -1
 * otherwise.
 */
const joinedKind = (a: SeatFootprint, b: SeatFootprint): number => {
  const gapX = Math.abs(b.x - a.x) - a.hx - b.hx;
  const gapY = Math.abs(b.y - a.y) - a.hy - b.hy;
  if (Math.max(gapX, gapY) > JOIN_GAP || Math.min(gapX, gapY) > -JOIN_OVERLAP) {
    return -1;
  }
  const chairs = a.chairX * b.chairX + a.chairY * b.chairY;
  if (Math.abs(chairs) < 0.3) return CORNER;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // How far b lies the way a's chair points: -1 straight ahead of a, 0 beside.
  const along = (a.chairX * dx + a.chairY * dy) / (Math.hypot(dx, dy) || 1);
  if (chairs < -0.7) return along < -0.7 ? OPPOSITE : -1;
  if (chairs > 0.7) return Math.abs(along) < 0.3 ? PARTNER : -1;
  return -1;
};

const buildSeatLayout = (scene: ClassroomScene): SeatLayout => {
  const footprints = collectFootprints(scene);
  const size = footprints.length;
  const offsets: number[] = [];
  let offset = 0;
  for (const table of scene.tables) {
    offsets.push(offset);
    offset += table.seatCount;
  }
  offsets.push(offset);

  const tableOf = new Int32Array(size);
  const seatOf = new Int32Array(size);
  const keys: string[] = [];
  footprints.forEach((footprint, index) => {
    tableOf[index] = footprint.table;
    seatOf[index] = footprint.seat;
    keys.push(`${footprint.table}-${footprint.seat}`);
  });

  // The board frame: depth runs towards the board, lateral along it.
  const orientation = determineFrontDirection(scene);
  const alongX = orientation.dominantAxis === 'x';
  const towardBoard = alongX
    ? orientation.frontIsHighX
      ? 1
      : -1
    : orientation.frontIsHighY
      ? 1
      : -1;
  const frame = footprints.map((footprint) => ({
    depth: (alongX ? footprint.x : footprint.y) * towardBoard,
    lateral: alongX ? footprint.y : footprint.x,
    halfDepth: alongX ? footprint.hx : footprint.hy,
    halfLateral: alongX ? footprint.hy : footprint.hx,
  }));

  const relations: SeatRelation[][] = footprints.map(() => []);
  const kindBetween = new Int8Array(size * size).fill(-1);
  const relate = (a: number, b: number, kindAtA: number, kindAtB: number) => {
    relations[a]!.push({ seat: b, kind: kindAtA });
    relations[b]!.push({ seat: a, kind: kindAtB });
    kindBetween[a * size + b] = kindAtA;
    kindBetween[b * size + a] = kindAtB;
  };

  // Seat pairs follow the index, as everywhere else: (0,1), (2,3), (4,5);
  // the other seats of a table by where they sit at it.
  scene.tables.forEach((table, tableIndex) => {
    const first = offsets[tableIndex]!;
    const layout = calculateSeatLayout(table);
    const partners = new Set(
      seatPairsFor(table.seatCount).map(([a, b]) => `${a}-${b}`),
    );
    for (let a = 0; a < table.seatCount; a++) {
      for (let b = a + 1; b < table.seatCount; b++) {
        const kind = tableSeatKind(
          table,
          layout,
          partners.has(`${a}-${b}`),
          a,
          b,
        );
        relate(first + a, first + b, kind, kind);
      }
    }
  });

  // At another table only the nearest seat in each direction counts — to the
  // left and right along the board, in front and behind — so a seat beyond a
  // seat is no neighbour, however closely the desks stand.
  const LEFT = 0;
  const RIGHT = 1;
  const FRONT = 2;
  const BACK = 3;
  type Candidate = { seat: number; distance: number };
  const nearest: Candidate[][][] = footprints.map(() => [[], [], [], []]);
  const offer = (seat: number, direction: number, candidate: Candidate) => {
    nearest[seat]![direction]!.push(candidate);
  };
  for (let a = 0; a < size; a++) {
    for (let b = a + 1; b < size; b++) {
      if (tableOf[a] === tableOf[b]) continue;
      const fa = frame[a]!;
      const fb = frame[b]!;
      const depthDistance = Math.abs(fb.depth - fa.depth);
      const lateralDistance = Math.abs(fb.lateral - fa.lateral);
      const sameRow =
        depthDistance <= Math.max(fa.halfDepth, fb.halfDepth) + 1e-9;
      if (sameRow) {
        const gap = lateralDistance - fa.halfLateral - fb.halfLateral;
        if (gap > ADJACENT_GAP) continue;
        const bIsRight = fb.lateral > fa.lateral;
        offer(a, bIsRight ? RIGHT : LEFT, {
          seat: b,
          distance: lateralDistance,
        });
        offer(b, bIsRight ? LEFT : RIGHT, {
          seat: a,
          distance: lateralDistance,
        });
        continue;
      }
      // Diagonal seats are no neighbours: the seat behind sits within half a
      // seat of this one along the board.
      const aligned =
        lateralDistance <= Math.max(fa.halfLateral, fb.halfLateral) + 1e-9;
      if (!aligned) continue;
      const gap = depthDistance - fa.halfDepth - fb.halfDepth;
      if (gap > ROW_GAP) continue;
      const bIsAhead = fb.depth > fa.depth;
      offer(a, bIsAhead ? FRONT : BACK, { seat: b, distance: depthDistance });
      offer(b, bIsAhead ? BACK : FRONT, { seat: a, distance: depthDistance });
    }
  }
  // Tables pushed together (`joinedKind`): round a corner or face to face
  // they are one group, as a group table is. Desks pushed together in a row,
  // facing the same way, stay desks of their own, but the seats at the join
  // are neighbours as close as seat partners.
  const chosen = new Set<string>();
  const parent = scene.tables.map((_, index) => index);
  const root = (table: number): number => {
    let current = table;
    while (parent[current] !== current) current = parent[current]!;
    parent[table] = current;
    return current;
  };
  for (let a = 0; a < size; a++) {
    for (let b = a + 1; b < size; b++) {
      if (tableOf[a] === tableOf[b]) continue;
      const kind = joinedKind(footprints[a]!, footprints[b]!);
      if (kind < 0) continue;
      chosen.add(`${a}-${b}`);
      relate(a, b, kind, kind);
      if (kind !== PARTNER) parent[root(tableOf[a]!)] = root(tableOf[b]!);
    }
  }
  nearest.forEach((directions, a) => {
    directions.forEach((candidates, direction) => {
      if (candidates.length === 0) return;
      const closest = Math.min(...candidates.map(({ distance }) => distance));
      for (const { seat: b, distance } of candidates) {
        if (distance > closest + 1) continue;
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (chosen.has(key)) continue;
        chosen.add(key);
        if (direction === LEFT || direction === RIGHT) {
          relate(a, b, BESIDE, BESIDE);
        } else if (direction === FRONT) {
          relate(a, b, AHEAD, BEHIND);
        } else {
          relate(a, b, BEHIND, AHEAD);
        }
      }
    });
  });

  // Depth over the seats of the tables in the mix, or over all seats when no
  // table is in it; the axis and its sense as `determineFrontDirection` says.
  const inMix = footprints.filter((footprint) => {
    const table = scene.tables[footprint.table];
    return table ? isTableActive(table) : false;
  });
  const extent = (inMix.length > 0 ? inMix : footprints).map((footprint) =>
    alongX ? footprint.x : footprint.y,
  );
  const min = Math.min(...extent);
  const max = Math.max(...extent);
  const frontIsHigh = alongX
    ? orientation.frontIsHighX
    : orientation.frontIsHighY;
  const depth = new Float64Array(size);
  footprints.forEach((footprint, index) => {
    if (!(max > min)) {
      depth[index] = 0.5;
      return;
    }
    const raw = ((alongX ? footprint.x : footprint.y) - min) / (max - min);
    depth[index] = frontIsHigh ? raw : 1 - raw;
  });

  const groupIndex = new Map<number, number>();
  const groups: number[][] = [];
  const groupOf = new Int32Array(size);
  for (let seat = 0; seat < size; seat++) {
    const key = root(tableOf[seat]!);
    let group = groupIndex.get(key);
    if (group === undefined) {
      group = groups.length;
      groupIndex.set(key, group);
      groups.push([]);
    }
    groups[group]!.push(seat);
    groupOf[seat] = group;
  }

  return {
    size,
    offsets,
    tableOf,
    seatOf,
    relations,
    kindBetween,
    depth,
    keys,
    groups,
    groupOf,
  };
};

const layoutCache = new WeakMap<ClassroomScene, SeatLayout>();

/**
 * The seat layout of a scene, cached per scene object as the seat positions
 * are (`getSeatPositions`).
 */
export const getSeatLayout = (scene: ClassroomScene): SeatLayout => {
  const cached = layoutCache.get(scene);
  if (cached) return cached;
  const layout = buildSeatLayout(scene);
  layoutCache.set(scene, layout);
  return layout;
};
