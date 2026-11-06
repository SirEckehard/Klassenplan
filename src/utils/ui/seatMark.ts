// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How a seat of the table plan and a place of the circle are marked: one
 * shape for every mark — where a dragged student would land, where one
 * cannot, where one just did, the seats a badge points at and a criterion's
 * verdict.
 *
 * A mark is a tint over the whole place and a ring inside it, kept clear of
 * the place's edge by a gap and concentric with it: on a seat, a corner that
 * is the table's takes the table's radius less the inset, so the table clips
 * nothing and its outline never runs into the ring. From the outside in, a
 * place is its edge (a held seat's blue hairline), its mark, then the
 * keyboard focus — the three never cross.
 */
import type { StatisticStatus } from '@/types';
import { TABLE_CORNER_RADIUS } from '@/utils';
import type { SeatHighlightTone } from './statisticsHighlight';

export type SeatMarkKind =
  | StatisticStatus
  | Exclude<SeatHighlightTone, 'spotlight'>
  | 'target'
  | 'blocked';

/**
 * A criterion's verdict speaks in the status colours the fulfilment uses; a
 * badge pointing at a seat is no verdict and takes the selection colour, as
 * does the seat a dragged student can land on — the colour of "you can act
 * here". Rose where the seat is held, green where a student just landed.
 * Tokens, so both themes come from `index.css`; marks are drawn on screen
 * only, never exported.
 */
export const SEAT_MARK_COLORS: Record<
  SeatMarkKind,
  { ring: string; tint: string }
> = {
  ok: { ring: 'var(--status-ok)', tint: 'var(--status-ok-surface)' },
  warn: { ring: 'var(--status-warn)', tint: 'var(--status-warn-surface)' },
  alert: { ring: 'var(--status-alert)', tint: 'var(--status-alert-surface)' },
  focus: {
    ring: 'var(--border-option-selected)',
    tint: 'var(--surface-option-selected)',
  },
  confirm: { ring: 'var(--status-ok)', tint: 'var(--status-ok-surface)' },
  target: {
    ring: 'var(--border-option-selected)',
    tint: 'var(--surface-option-selected)',
  },
  blocked: { ring: 'var(--status-alert)', tint: 'var(--status-alert-surface)' },
};

/** Between the inner side of the place's edge and the ring, in scene units. */
const SEAT_MARK_GAP = 2;
/** The ring's width, in scene units — the same for every mark. */
export const SEAT_MARK_WIDTH = 2.5;

/**
 * No inset corner gets tighter than this. A seat's own corners — where it
 * meets its neighbours — are square, so the seats tile their table without a
 * gap; a ring or a hairline inside one still rounds its corner this much.
 */
const MIN_CORNER_RADIUS = 2;
/** A held seat's hairline lies this far inside the table's outline. */
const EDGE_LINE_CLEARANCE = 0.5;

/** Which corners of a seat are corners of its table: top left, top right, bottom right, bottom left. */
export type SeatCorners = readonly [boolean, boolean, boolean, boolean];

/** The seat's corners its table shares, from its cell in the table's grid. */
export function seatTableCorners(
  col: number,
  row: number,
  cols: number,
  rows: number,
): SeatCorners {
  const left = col === 0;
  const right = col === cols - 1;
  const top = row === 0;
  const bottom = row === rows - 1;
  return [top && left, top && right, bottom && right, bottom && left];
}

/** Where the ring's centre line lies inside a place whose edge is `edgeWidth` wide. */
export function seatMarkInset(edgeWidth: number): number {
  return edgeWidth / 2 + SEAT_MARK_GAP + SEAT_MARK_WIDTH / 2;
}

/** Where the keyboard focus ring lies: on the mark's line, or inside the mark. */
export function seatFocusInset(edgeWidth: number, marked: boolean): number {
  const markInset = seatMarkInset(edgeWidth);
  return marked ? markInset + SEAT_MARK_WIDTH / 2 + SEAT_MARK_GAP : markInset;
}

/** Where a held seat's hairline lies, just inside the table's outline. */
export function seatEdgeLineInset(edgeWidth: number): number {
  return edgeWidth / 2 + EDGE_LINE_CLEARANCE;
}

/** The ring's radius on a place of the circle. */
export function tokenMarkRadius(radius: number, edgeWidth: number): number {
  return radius - seatMarkInset(edgeWidth);
}

/** Which sides of a seat are sides of its table: top, right, bottom, left. */
export type SeatEdges = readonly [boolean, boolean, boolean, boolean];

/** The seat's sides its table shares, from its cell in the table's grid. */
export function seatTableEdges(
  col: number,
  row: number,
  cols: number,
  rows: number,
): SeatEdges {
  return [row === 0, col === cols - 1, row === rows - 1, col === 0];
}

/**
 * The radii of a rectangle `inset` inside a seat: concentric with the table's
 * corner where the corner is the table's, square on the seat's own corners
 * and, once inset, never tighter than the minimum.
 */
function insetCornerRadii(
  w: number,
  h: number,
  inset: number,
  corners: SeatCorners,
): [number, number, number, number] {
  const [tl, tr, br, bl] = corners.map((isTableCorner) =>
    Math.min(
      Math.max(
        isTableCorner ? TABLE_CORNER_RADIUS - inset : 0,
        inset > 0 ? MIN_CORNER_RADIUS : 0,
      ),
      w / 2,
      h / 2,
    ),
  );
  return [tl, tr, br, bl];
}

const arcTo = (r: number, x: number, y: number) =>
  r > 0 ? `A${r} ${r} 0 0 1 ${x} ${y}` : '';

/**
 * A rectangle `inset` inside a seat, rounded concentrically with the table's
 * corners and slightly on the seat's own. With no inset it is the seat's own
 * outline, as its table clips it: the table's radius in the table's corners,
 * square where it meets its neighbours.
 */
export function insetSeatPath(
  width: number,
  height: number,
  inset: number,
  corners: SeatCorners,
): string {
  const w = Math.max(width - inset * 2, 0);
  const h = Math.max(height - inset * 2, 0);
  const [tl, tr, br, bl] = insetCornerRadii(w, h, inset, corners);
  const x0 = inset;
  const y0 = inset;
  const x1 = inset + w;
  const y1 = inset + h;
  return [
    `M${x0 + tl} ${y0}`,
    `H${x1 - tr}`,
    arcTo(tr, x1, y0 + tr),
    `V${y1 - br}`,
    arcTo(br, x1 - br, y1),
    `H${x0 + bl}`,
    arcTo(bl, x0, y1 - bl),
    `V${y0 + tl}`,
    arcTo(tl, x0 + tl, y0),
    'Z',
  ].join('');
}

/**
 * The lines between a table's seats, each drawn once: every side of a seat's
 * cell that lies inside the table, a run along one grid line as one line.
 * One path, so a translucent stroke never darkens where two runs cross. A
 * cell without a seat is table surface, divided from the seat beside it but
 * not from another empty cell.
 */
export function seatDividerPath(
  cells: readonly { col: number; row: number }[],
  cols: number,
  rows: number,
  seatWidth: number,
  seatHeight: number,
): string {
  // vertical[x][row]: the line left of column x runs along `row`;
  // horizontal[y][col]: the line above row y runs along `col`.
  const vertical = Array.from({ length: cols + 1 }, () =>
    new Array<boolean>(rows).fill(false),
  );
  const horizontal = Array.from({ length: rows + 1 }, () =>
    new Array<boolean>(cols).fill(false),
  );
  for (const { col, row } of cells) {
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    vertical[col][row] = true;
    vertical[col + 1][row] = true;
    horizontal[row][col] = true;
    horizontal[row + 1][col] = true;
  }
  const path: string[] = [];
  // Joins the runs of one inner grid line into as few lines as there are gaps.
  const runs = (
    along: boolean[],
    line: (from: number, to: number) => string,
  ) => {
    let start = -1;
    for (let i = 0; i <= along.length; i++) {
      const on = i < along.length && along[i];
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        path.push(line(start, i));
        start = -1;
      }
    }
  };
  for (let x = 1; x < cols; x++) {
    runs(
      vertical[x],
      (from, to) => `M${x * seatWidth} ${from * seatHeight}V${to * seatHeight}`,
    );
  }
  for (let y = 1; y < rows; y++) {
    runs(
      horizontal[y],
      (from, to) => `M${from * seatWidth} ${y * seatHeight}H${to * seatWidth}`,
    );
  }
  return path.join('');
}

/**
 * The part of a seat's outline that is its table's outline: the table's
 * sides and the table's corners between them. Empty for a seat with no side
 * outside.
 */
export function seatTableEdgePath(
  width: number,
  height: number,
  edges: SeatEdges,
): string {
  const [top, right, bottom, left] = edges;
  const corners: SeatCorners = [
    top && left,
    top && right,
    bottom && right,
    bottom && left,
  ];
  const [tl, tr, br, bl] = insetCornerRadii(width, height, 0, corners);
  // The outline clockwise from the top left, each piece with where it starts.
  const pieces: { on: boolean; from: [number, number]; to: string }[] = [
    { on: top, from: [tl, 0], to: `H${width - tr}` },
    { on: corners[1], from: [width - tr, 0], to: arcTo(tr, width, tr) },
    { on: right, from: [width, tr], to: `V${height - br}` },
    {
      on: corners[2],
      from: [width, height - br],
      to: arcTo(br, width - br, height),
    },
    { on: bottom, from: [width - br, height], to: `H${bl}` },
    { on: corners[3], from: [bl, height], to: arcTo(bl, 0, height - bl) },
    { on: left, from: [0, height - bl], to: `V${tl}` },
    { on: corners[0], from: [0, tl], to: arcTo(tl, tl, 0) },
  ];
  if (pieces.every((piece) => piece.on)) {
    return insetSeatPath(width, height, 0, corners);
  }
  // Start after a gap, so a run across the top left corner stays one line.
  const first = pieces.findIndex(
    (piece, i) =>
      piece.on && !pieces[(i + pieces.length - 1) % pieces.length].on,
  );
  if (first < 0) return '';
  const path: string[] = [];
  for (let step = 0; step < pieces.length; step++) {
    const i = (first + step) % pieces.length;
    const piece = pieces[i];
    if (!piece.on) continue;
    if (!pieces[(i + pieces.length - 1) % pieces.length].on) {
      path.push(`M${piece.from[0]} ${piece.from[1]}`);
    }
    path.push(piece.to);
  }
  return path.join('');
}
