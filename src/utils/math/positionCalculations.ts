// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomTable, TableTemplateType } from '@/types';

export type SeatLayoutPosition = { col: number; row: number };

export type SeatLayoutDetails = {
  positions: SeatLayoutPosition[];
  seatWidth: number;
  seatHeight: number;
  cols: number;
  rows: number;
};

type SceneSeatPositionParams = {
  mode: 'scene';
  table: Pick<
    ClassroomTable,
    'x' | 'y' | 'width' | 'height' | 'seatCount' | 'templateType' | 'rotation'
  >;
  seatIndex: number;
  layout?: SeatLayoutDetails;
};

type CircleSeatPositionParams = {
  mode: 'circle';
  center: { x: number; y: number };
  radius: { horizontal: number; vertical: number };
  angle: number;
};

type SeatPositionParams = SceneSeatPositionParams | CircleSeatPositionParams;

type SceneSeatPositionResult = {
  x: number;
  y: number;
  col: number;
  row: number;
};

type CircleSeatPositionResult = {
  x: number;
  y: number;
};

const TEMPLATE_SEAT_LAYOUTS: Record<TableTemplateType, SeatLayoutPosition[]> = {
  single: [{ col: 0, row: 0 }],
  double: [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
  ],
  group4: [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ],
  group6: [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
    { col: 2, row: 1 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
  ],
};

const createFallbackLayout = (seatCount: number): SeatLayoutPosition[] => {
  const fallbackLayout: SeatLayoutPosition[] = [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(seatCount)));
  for (let seatIndex = 0; seatIndex < seatCount; seatIndex += 1) {
    fallbackLayout.push({
      col: seatIndex % cols,
      row: Math.floor(seatIndex / cols),
    });
  }
  return fallbackLayout;
};

const getTemplateLayout = (
  templateType: TableTemplateType | undefined,
  seatCount: number,
): SeatLayoutPosition[] => {
  const type = templateType ?? 'double';
  const templateLayout = TEMPLATE_SEAT_LAYOUTS[type];

  if (templateLayout && templateLayout.length === seatCount) {
    return templateLayout;
  }

  return createFallbackLayout(seatCount);
};

const deriveGridMetrics = (positions: SeatLayoutPosition[]) => {
  let maxCol = 0;
  let maxRow = 0;

  positions.forEach(({ col, row }) => {
    if (col > maxCol) maxCol = col;
    if (row > maxRow) maxRow = row;
  });

  return {
    cols: maxCol + 1,
    rows: maxRow + 1,
  };
};

export type SeatEdge = 'left' | 'right' | 'top' | 'bottom';

/**
 * Determine which table edge a seat faces. Used to place chair dots and seat
 * markers on the correct side for every table template (single/double sit on
 * the left, group6's left column sits left, otherwise top/bottom by row).
 */
export const determineSeatEdge = (
  type: TableTemplateType | undefined,
  seatPosition: SeatLayoutPosition,
  layout: Pick<SeatLayoutDetails, 'cols' | 'rows'>,
  seatCount: number,
): SeatEdge => {
  if (seatCount <= 1) {
    return 'left';
  }

  if (type === 'double') {
    return 'left';
  }

  if (type === 'group6' && seatPosition.col === 0) {
    return 'left';
  }

  if (layout.rows > 1) {
    if (seatPosition.row === 0) {
      return 'top';
    }
    if (seatPosition.row === layout.rows - 1) {
      return 'bottom';
    }
  }

  if (seatPosition.col === 0) {
    return 'left';
  }

  if (layout.cols > 1 && seatPosition.col === layout.cols - 1) {
    return 'right';
  }

  return 'top';
};

export const calculateSeatLayout = (
  table: Pick<
    ClassroomTable,
    'width' | 'height' | 'seatCount' | 'templateType'
  >,
): SeatLayoutDetails => {
  const positions = getTemplateLayout(table.templateType, table.seatCount);
  const { cols, rows } = deriveGridMetrics(positions);

  const safeCols = cols || 1;
  const safeRows = rows || 1;

  return {
    positions,
    cols: safeCols,
    rows: safeRows,
    seatWidth: table.width / safeCols,
    seatHeight: table.height / safeRows,
  };
};

export function calculateSeatPosition(
  params: SceneSeatPositionParams,
): SceneSeatPositionResult;
export function calculateSeatPosition(
  params: CircleSeatPositionParams,
): CircleSeatPositionResult;
export function calculateSeatPosition(
  params: SeatPositionParams,
): SceneSeatPositionResult | CircleSeatPositionResult {
  if (params.mode === 'scene') {
    const layout = params.layout ?? calculateSeatLayout(params.table);
    const seat =
      layout.positions[params.seatIndex] ??
      ({
        col: params.seatIndex % layout.cols,
        row: Math.floor(params.seatIndex / layout.cols),
      } as SeatLayoutPosition);

    // Calculate local seat position (before rotation)
    const localX =
      params.table.x + seat.col * layout.seatWidth + layout.seatWidth / 2;
    const localY =
      params.table.y + seat.row * layout.seatHeight + layout.seatHeight / 2;

    // Apply rotation around table center if rotation is non-zero
    const rotation = params.table.rotation ?? 0;
    if (rotation === 0) {
      return { x: localX, y: localY, col: seat.col, row: seat.row };
    }

    // Calculate table center point
    const centerX = params.table.x + params.table.width / 2;
    const centerY = params.table.y + params.table.height / 2;

    // Convert to radians and apply 2D rotation
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // Translate to origin, rotate, translate back
    const dx = localX - centerX;
    const dy = localY - centerY;
    const x = centerX + dx * cos - dy * sin;
    const y = centerY + dx * sin + dy * cos;

    return { x, y, col: seat.col, row: seat.row };
  }

  const radians = (params.angle * Math.PI) / 180;
  const x = params.center.x + params.radius.horizontal * Math.cos(radians);
  const y = params.center.y + params.radius.vertical * Math.sin(radians);

  return { x, y };
}
