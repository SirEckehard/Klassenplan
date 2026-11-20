// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomTable, TableTemplateType } from '@/types';
import { getTablePresets, BOARD_WIDTH, GRID_SNAP_SIZE } from '@/utils';
import {
  frontLine,
  roomFrame,
  toRoomTables,
  type BoardPlace,
  type FrameTable,
  type RoomFrame,
} from './autoArrange';
import { roomProblems } from './roomRules';

/*
 * "Zufällige Anordnung" (decision 0053): a room put together from zones. The
 * depth before the board is cut into one to three bands, each filled with a
 * pattern of its own, and the side walls may take quiet desks facing them.
 * Every candidate is checked against the room's rules (`roomProblems`): a
 * room that breaks one is never shown. Among the candidates that keep them a
 * combination of patterns is chosen at random, and of that combination the
 * room that uses the space best, so every roll is new and none is a mess.
 */

/** The patterns a zone is filled with. */
export type RoomZone =
  | 'arc'
  | 'singleRows'
  | 'doubleRows'
  | 'islands4'
  | 'islands6'
  | 'conference'
  | 'herringbone'
  | 'wallDesks';

type Rng = () => number;

/** A band of the room in the board's frame: depth from `back` to `front`. */
interface Region {
  back: number;
  front: number;
  left: number;
  right: number;
}

/** Room a seated student and the photo on the seat take beyond the edge. */
const SEAT_ROOM = 38;
/** Room behind a row of desks for its chairs. */
const BEHIND_ROW = 40;

const snap = (value: number): number =>
  Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;
const between = (rng: Rng, min: number, max: number): number =>
  min + rng() * (max - min);
const pickFrom = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!;

/** The tables nearest `centre` across first, so a row cut short stays in the middle. */
const centreOut = (tables: FrameTable[], centre: number): FrameTable[] =>
  [...tables].sort(
    (a, b) =>
      Math.abs(a.across - centre) - Math.abs(b.across - centre) ||
      a.across - b.across,
  );

/** `count` positions across, `size` wide, `gap` apart, centred in the region. */
const evenly = (
  count: number,
  size: number,
  region: Region,
): { centres: number[]; gap: number } => {
  const gap = (region.right - region.left - count * size) / (count + 1);
  return {
    gap,
    centres: Array.from(
      { length: count },
      (_, index) => region.left + gap * (index + 1) + size * index + size / 2,
    ),
  };
};

/** Desks in rows facing the board, pushed together into benches or apart. */
function deskRows(
  type: 'single' | 'double',
  region: Region,
  rng: Rng,
): FrameTable[] {
  const { width, height } = getTablePresets()[type];
  const gap = pickFrom(rng, type === 'single' ? [0, 20, 40] : [0, 25, 45]);
  const aisle = rng() < 0.4 ? 60 : 0;
  const pitch = width + snap(between(rng, 45, 60));
  const span = region.right - region.left;
  let perRow = Math.floor((span - aisle + gap) / (height + gap));
  if (aisle && perRow % 2 === 1) perRow -= 1;
  if (perRow < 1) return [];
  const middle = (region.left + region.right) / 2;
  // Positions across: one block, or two with the aisle between them.
  const half = aisle ? perRow / 2 : perRow;
  const block = half * height + (half - 1) * gap;
  const starts = aisle
    ? [middle - aisle / 2 - block, middle + aisle / 2]
    : [middle - block / 2];
  const across = starts.flatMap((start) =>
    Array.from(
      { length: half },
      (_, index) => snap(start + index * (height + gap)) + height / 2,
    ),
  );
  const tables: FrameTable[] = [];
  for (let row = 0; ; row++) {
    const frontEdge = region.front - row * pitch;
    if (frontEdge - width - BEHIND_ROW < region.back) break;
    tables.push(
      ...centreOut(
        across.map((at) => ({
          type,
          depth: frontEdge - width / 2,
          across: at,
          rotation: 0,
        })),
        middle,
      ),
    );
  }
  return tables;
}

/** Single desks on arcs round the board, each turned to face it. */
function arc(region: Region, frame: RoomFrame, rng: Rng): FrameTable[] {
  const centreDepth = frame.depth - BOARD_WIDTH;
  const centreAcross = frame.across / 2;
  const halfSpan = Math.min(
    centreAcross - region.left,
    region.right - centreAcross,
  );
  const step = snap(between(rng, 105, 120));
  const tables: FrameTable[] = [];
  for (
    let radius = Math.max(220, centreDepth - region.front + 27.5);
    centreDepth - radius - 27.5 - BEHIND_ROW >= region.back;
    radius += step
  ) {
    const reach = Math.min(
      Math.asin(Math.min(1, (halfSpan - 45) / radius)),
      // The photo behind the desk keeps clear of the side too.
      Math.asin(Math.min(1, (halfSpan - 20) / (radius + 46))),
      Math.acos(Math.min(1, (centreDepth - region.front + 28) / radius)),
      (65 * Math.PI) / 180,
    );
    if (!(reach >= 0)) continue;
    const fit = Math.floor((2 * reach * radius) / 87) + 1;
    const angleStep = fit > 1 ? (2 * reach) / (fit - 1) : 0;
    const ring: FrameTable[] = [];
    for (let index = 0; index < fit; index++) {
      const angle = (index - (fit - 1) / 2) * angleStep;
      const depth = centreDepth - radius * Math.cos(angle);
      const across = centreAcross + radius * Math.sin(angle);
      if (depth - 27.5 - BEHIND_ROW < region.back) continue;
      ring.push({
        type: 'single',
        depth,
        across,
        rotation: Math.round(
          (Math.atan2(centreAcross - across, centreDepth - depth) * 180) /
            Math.PI,
        ),
      });
    }
    tables.push(...centreOut(ring, centreAcross));
  }
  return tables;
}

/** Group tables in lanes; `brick` rows between hold one fewer, in the gaps. */
function islands(
  type: 'group4' | 'group6',
  region: Region,
  rng: Rng,
): FrameTable[] {
  const { width, height } = getTablePresets()[type];
  const footAcross = height + 2 * SEAT_ROOM;
  const footDepth = width + (type === 'group6' ? SEAT_ROOM : 0);
  const maxLanes = Math.floor(
    (region.right - region.left + 10) / (footAcross + 10),
  );
  if (maxLanes < 1 || region.front - region.back < footDepth) return [];
  const lanes = rng() < 0.7 ? maxLanes : Math.max(1, maxLanes - 1);
  const brick = lanes >= 2 && rng() < 0.45;
  const full = evenly(lanes, footAcross, region).centres;
  const gaps = full.slice(1).map((at, index) => (at + full[index]!) / 2);
  const pitch = footDepth + snap(between(rng, 40, 90));
  const middle = (region.left + region.right) / 2;
  const tables: FrameTable[] = [];
  for (let row = 0; ; row++) {
    const frontEdge = region.front - row * pitch;
    if (frontEdge - footDepth < region.back) break;
    const at = brick && row % 2 === 1 ? gaps : full;
    tables.push(
      ...centreOut(
        at.map((centre) => ({
          type,
          depth: frontEdge - width / 2,
          across: snap(centre - height / 2) + height / 2,
          rotation: 0,
        })),
        middle,
      ),
    );
  }
  return tables;
}

/** Long tables of double desks pushed together face to face, along the depth. */
function conference(region: Region, rng: Rng): FrameTable[] {
  const footAcross = 110 + 2 * (SEAT_ROOM + 2);
  const maxTables = Math.floor(
    (region.right - region.left + 40) / (footAcross + 40),
  );
  const pairs = Math.floor((region.front - region.back - 10) / 130);
  if (maxTables < 1 || pairs < 1) return [];
  const count = rng() < 0.5 ? maxTables : Math.max(1, maxTables - 1);
  const centres = evenly(count, footAcross, region).centres.map(snap);
  const middleDepth = (region.back + region.front) / 2;
  const depths = Array.from(
    { length: pairs },
    (_, index) => middleDepth + (index - (pairs - 1) / 2) * 130,
  ).sort((a, b) => Math.abs(a - middleDepth) - Math.abs(b - middleDepth));
  return depths.flatMap((depth) =>
    centres.flatMap((centre) => [
      { type: 'double' as const, depth, across: centre - 27.5, rotation: 90 },
      { type: 'double' as const, depth, across: centre + 27.5, rotation: 270 },
    ]),
  );
}

/** Double desks turned 30° towards the board, in wings either side of an aisle. */
function herringbone(region: Region): FrameTable[] {
  const middle = (region.left + region.right) / 2;
  const halfSpan = (region.right - region.left) / 2;
  const offsets: number[] = [];
  for (let offset = 145; offset + 22 + 75 <= halfSpan; offset += 160) {
    offsets.push(offset);
  }
  const tables: FrameTable[] = [];
  for (let row = 0; ; row++) {
    const depth = region.front - 56 - row * 118;
    if (depth - 56 - 30 < region.back) break;
    const out = row % 2 ? 22 : 0;
    for (const offset of offsets) {
      for (const side of [-1, 1] as const) {
        tables.push({
          type: 'double',
          depth,
          across: middle + side * (offset + out),
          rotation: side * -30,
        });
      }
    }
  }
  return tables;
}

/** Single desks along the side walls, facing them: quiet places. */
function wallDesks(
  frame: RoomFrame,
  walls: readonly ('near' | 'far')[],
  rng: Rng,
): FrameTable[] {
  const from = 100;
  const to = frontLine(frame) - 30;
  const spacing = snap(between(rng, 95, 150));
  const count = Math.floor((to - from) / spacing) + 1;
  const middle = (from + to) / 2;
  const depths = Array.from(
    { length: count },
    (_, index) => middle + (index - (count - 1) / 2) * spacing,
  ).sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
  return depths.flatMap((depth) =>
    walls.map((wall) => ({
      type: 'single' as const,
      depth,
      across: wall === 'near' ? 45 : frame.across - 45,
      rotation: wall === 'near' ? 270 : 90,
    })),
  );
}

const BAND_ZONES = {
  front: ['arc', 'singleRows', 'doubleRows', 'herringbone', 'islands4'],
  middle: [
    'islands4',
    'islands6',
    'conference',
    'doubleRows',
    'herringbone',
    'singleRows',
  ],
  back: ['islands4', 'islands6', 'conference', 'doubleRows', 'singleRows'],
} as const satisfies Record<string, readonly RoomZone[]>;

function zoneTables(
  zone: RoomZone,
  region: Region,
  frame: RoomFrame,
  rng: Rng,
): FrameTable[] {
  switch (zone) {
    case 'arc':
      return arc(region, frame, rng);
    case 'singleRows':
      return deskRows('single', region, rng);
    case 'doubleRows':
      return deskRows('double', region, rng);
    case 'islands4':
      return islands('group4', region, rng);
    case 'islands6':
      return islands('group6', region, rng);
    case 'conference':
      return conference(region, rng);
    case 'herringbone':
      return herringbone(region);
    default:
      return [];
  }
}

const seatsOf = (tables: readonly { type: TableTemplateType }[]): number => {
  const presets = getTablePresets();
  return tables.reduce((sum, table) => sum + presets[table.type].seatCount, 0);
};

/** Takes tables in order until they seat `seats`. */
const takeSeats = (tables: FrameTable[], seats: number): FrameTable[] => {
  const presets = getTablePresets();
  const taken: FrameTable[] = [];
  let seated = 0;
  for (const table of tables) {
    if (seated >= seats) break;
    taken.push(table);
    seated += presets[table.type].seatCount;
  }
  return taken;
};

/** One room put together at random, or null where the pieces do not add up. */
function candidate(
  students: number,
  frame: RoomFrame,
  rng: Rng,
): { tables: FrameTable[]; zones: RoomZone[] } | null {
  const front = frontLine(frame);
  const back = 20;
  const span = front - back;
  const walls: ('near' | 'far')[] =
    students >= 12 && rng() < 0.4
      ? rng() < 0.75
        ? ['near', 'far']
        : [pickFrom(rng, ['near', 'far'] as const)]
      : [];
  const left = walls.includes('near') ? 125 : 15;
  const right = frame.across - (walls.includes('far') ? 125 : 15);

  const bandCount =
    students < 10
      ? 1
      : students < 18
        ? pickFrom(rng, [1, 2, 2])
        : pickFrom(rng, [2, 2, 3]);
  const cuts =
    bandCount === 3
      ? [between(rng, 0.28, 0.4), between(rng, 0.6, 0.72)]
      : bandCount === 2
        ? [between(rng, 0.38, 0.62)]
        : [];
  const edges = [back, ...cuts.map((cut) => back + span * cut), front];

  // The bands from the front, each with a pattern of its own.
  const bands: { zone: RoomZone; tables: FrameTable[] }[] = [];
  for (let index = bandCount - 1; index >= 0; index--) {
    const fromFront = bandCount - 1 - index;
    const place = fromFront === 0 ? 'front' : index === 0 ? 'back' : 'middle';
    const region: Region = {
      back: edges[index]! + (index > 0 ? 20 : 0),
      front: edges[index + 1]! - (index < bandCount - 1 ? 20 : 0),
      left,
      right,
    };
    // Never the pattern of the band in front again.
    const zone: RoomZone = pickFrom(
      rng,
      BAND_ZONES[place].filter(
        (option) => option !== bands[bands.length - 1]?.zone,
      ),
    );
    const tables = zoneTables(zone, region, frame, rng);
    if (tables.length === 0) return null;
    bands.push({ zone, tables });
  }

  const quiet = walls.length > 0 ? wallDesks(frame, walls, rng) : [];
  const quietSeats = Math.min(
    quiet.length,
    pickFrom(rng, [2, 4, 4, 6]),
    Math.floor(students / 3),
  );
  let toSeat = students - quietSeats;
  const capacities = bands.map((band) => seatsOf(band.tables));
  if (capacities.reduce((sum, seats) => sum + seats, 0) < toSeat) return null;

  const placed: FrameTable[] = takeSeats(quiet, quietSeats);
  const zones: RoomZone[] = [];
  bands.forEach((band, index) => {
    const later = capacities
      .slice(index + 1)
      .reduce((sum, seats) => sum + seats, 0);
    const share =
      index === bands.length - 1
        ? toSeat
        : Math.round(
            ((toSeat * capacities[index]!) / (capacities[index]! + later)) *
              between(rng, 0.8, 1.2),
          );
    const quota = Math.min(
      capacities[index]!,
      Math.max(1, share, toSeat - later),
    );
    const taken = takeSeats(band.tables, quota);
    if (taken.length === 0) return;
    placed.push(...taken);
    zones.push(band.zone);
    toSeat -= seatsOf(taken);
  });
  if (toSeat > 0) return null;
  if (seatsOf(placed) - students > 5) return null;
  if (new Set(placed.map((table) => table.type)).size > 3) return null;
  if (quietSeats > 0) zones.push('wallDesks');
  return { tables: placed, zones };
}

/** How well a room uses the space: spread out, in the middle, few seats spare. */
function scoreOf(
  tables: readonly FrameTable[],
  students: number,
  frame: RoomFrame,
): number {
  const depths = tables.map((table) => table.depth);
  const spread =
    (Math.max(...depths) - Math.min(...depths)) / (frontLine(frame) - 20);
  const middle =
    tables.reduce((sum, table) => sum + table.across, 0) / tables.length;
  const kinds = new Set(tables.map((table) => table.type)).size;
  return (
    3 * spread -
    (8 * Math.abs(middle - frame.across / 2)) / frame.across -
    1.5 * (seatsOf(tables) - students) -
    0.6 * (kinds - 1)
  );
}

/**
 * A room put together at random for `students`, towards the board, that keeps
 * every rule; null when none of the tries came out right — the caller then
 * falls back to an arrangement.
 */
export function composeRoom(
  students: number,
  board?: BoardPlace,
  { rng = Math.random, tries = 40 }: { rng?: Rng; tries?: number } = {},
): { tables: ClassroomTable[]; zones: RoomZone[] } | null {
  if (students <= 0) return null;
  const frame = roomFrame(board);
  const features =
    typeof board === 'object' && board ? (board.features ?? []) : [];
  const fine: { tables: ClassroomTable[]; zones: RoomZone[]; score: number }[] =
    [];
  for (let attempt = 0; attempt < tries; attempt++) {
    const room = candidate(students, frame, rng);
    if (!room) continue;
    const tables = toRoomTables(room.tables, frame);
    if (
      roomProblems(tables, { features, board: frame.direction, first: true })
        .length > 0
    ) {
      continue;
    }
    fine.push({
      tables,
      zones: room.zones,
      score: scoreOf(room.tables, students, frame),
    });
  }
  if (fine.length === 0) return null;
  // Every combination of patterns as likely as another, so the rolls vary;
  // within the one chosen, the room that uses the space best.
  const byZones = new Map<string, typeof fine>();
  for (const room of fine) {
    const key = room.zones.join('+');
    byZones.set(key, [...(byZones.get(key) ?? []), room]);
  }
  const chosen = pickFrom(rng, [...byZones.values()]);
  const { tables, zones } = chosen.reduce((best, room) =>
    room.score > best.score ? room : best,
  );
  return { tables, zones };
}
