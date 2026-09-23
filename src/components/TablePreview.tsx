// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { getTablePresets } from '@/utils';
import type { TableTemplateType } from '@/types';
import {
  calculateSeatLayout,
  calculateSeatPosition,
  determineSeatEdge,
  type SeatEdge,
} from '@/utils/math/positionCalculations';

const TEMPLATE_TYPES: TableTemplateType[] = [
  'single',
  'double',
  'group4',
  'group6',
];

/** A template's preset, its seat layout and the edge each seat faces. */
function buildTemplateGeometry(type: TableTemplateType) {
  const preset = getTablePresets()[type];
  const table = {
    x: 0,
    y: 0,
    width: preset.width,
    height: preset.height,
    seatCount: preset.seatCount,
    templateType: type,
    rotation: 0,
  };
  const layout = calculateSeatLayout(table);
  const seats = layout.positions.map((_, seatIndex) => {
    const position = calculateSeatPosition({
      mode: 'scene',
      table,
      seatIndex,
      layout,
    });
    return {
      index: seatIndex,
      x: position.x,
      y: position.y,
      edge: determineSeatEdge(
        type,
        { col: position.col, row: position.row },
        layout,
        table.seatCount,
      ),
    };
  });
  return { preset, layout, seats };
}

/** Seat dot radius and its distance from the table, for an icon of `size` px. */
const getIconSeatMetrics = (size: number) => {
  const radius = size / 16;
  const gap = size / 32;
  // A row of dots reaches this far past the table edge it sits on.
  return { radius, gap, reach: 2 * radius + gap };
};

const countSides = (sides: Set<SeatEdge>, pair: [SeatEdge, SeatEdge]) =>
  pair.filter((side) => sides.has(side)).length;

const iconScaleCache = new Map<number, number>();

/**
 * One scale for all four templates at a given icon size: the largest at which
 * every one of them, seat dots and outline included, fits the box. Sharing it
 * keeps a single desk half a double on the toolbar, as it is in the room.
 */
function getIconScale(size: number): number {
  const cached = iconScaleCache.get(size);
  if (cached !== undefined) return cached;

  const { reach } = getIconSeatMetrics(size);
  const available = size - size / 20;
  const scale = Math.min(
    ...TEMPLATE_TYPES.map((type) => {
      const { preset, seats } = buildTemplateGeometry(type);
      const sides = new Set(seats.map((seat) => seat.edge));
      const extentX = reach * countSides(sides, ['left', 'right']);
      const extentY = reach * countSides(sides, ['top', 'bottom']);
      return Math.min(
        (available - extentX) / preset.width,
        (available - extentY) / preset.height,
      );
    }),
  );
  iconScaleCache.set(size, scale);
  return scale;
}

// Responsive SVG preview of a table configuration
function TablePreview({
  type,
  fixedSize = false,
  iconSize,
}: {
  type: TableTemplateType;
  fixedSize?: boolean;
  /**
   * Draws the table as a toolbar icon of this many pixels: in the current text
   * colour like the icons around it, on a scale shared by all four templates.
   */
  iconSize?: number;
}) {
  const {
    preset,
    layout: seatLayout,
    seats: seatData,
  } = React.useMemo(() => buildTemplateGeometry(type), [type]);

  const renderSeats = React.useCallback(
    (
      offsetX: number,
      offsetY: number,
      scale: number,
      radius: number,
      gap = 2,
      className = 'fill-(--text-muted)',
    ) => {
      const horizontalOffset =
        (seatLayout.seatWidth / 2) * scale + radius + gap;
      const verticalOffset = (seatLayout.seatHeight / 2) * scale + radius + gap;

      return seatData.map((seat) => {
        let cx = offsetX + seat.x * scale;
        let cy = offsetY + seat.y * scale;

        if (seat.edge === 'left') {
          cx -= horizontalOffset;
        } else if (seat.edge === 'right') {
          cx += horizontalOffset;
        } else if (seat.edge === 'top') {
          cy -= verticalOffset;
        } else if (seat.edge === 'bottom') {
          cy += verticalOffset;
        }

        return (
          <circle
            key={seat.index}
            cx={cx}
            cy={cy}
            r={radius}
            className={className}
          />
        );
      });
    },
    [seatData, seatLayout.seatHeight, seatLayout.seatWidth],
  );

  if (iconSize) {
    const scale = getIconScale(iconSize);
    const { radius, gap, reach } = getIconSeatMetrics(iconSize);
    const sides = new Set(seatData.map((seat) => seat.edge));
    const reachLeft = sides.has('left') ? reach : 0;
    const reachRight = sides.has('right') ? reach : 0;
    const reachTop = sides.has('top') ? reach : 0;
    const reachBottom = sides.has('bottom') ? reach : 0;
    const tableWidth = preset.width * scale;
    const tableHeight = preset.height * scale;
    // Centre the drawing, dots included, rather than the table alone.
    const offsetX =
      (iconSize - (tableWidth + reachLeft + reachRight)) / 2 + reachLeft;
    const offsetY =
      (iconSize - (tableHeight + reachTop + reachBottom)) / 2 + reachTop;

    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox={`0 0 ${iconSize} ${iconSize}`}
        className="block shrink-0"
        data-testid="table-preview"
      >
        <rect
          x={offsetX}
          y={offsetY}
          width={tableWidth}
          height={tableHeight}
          rx={iconSize / 16}
          fill="none"
          stroke="currentColor"
          strokeWidth={iconSize / 20}
        />
        {renderSeats(offsetX, offsetY, scale, radius, gap, 'fill-current')}
      </svg>
    );
  }

  // Fixed size mode: All previews have same container size
  if (fixedSize) {
    const containerSize = 80;
    const maxWidth = 180;
    const maxHeight = 120;

    const scale = Math.min(
      (containerSize - 30) / maxWidth,
      (containerSize - 30) / maxHeight,
    );
    const tableWidth = preset.width * scale;
    const tableHeight = preset.height * scale;
    const offsetX = (containerSize - tableWidth) / 2;
    const offsetY = (containerSize - tableHeight) / 2;
    const seats = renderSeats(offsetX, offsetY, scale, 4);

    return (
      <svg
        width={containerSize}
        height={containerSize}
        className="shrink-0 w-auto h-auto max-w-full"
        data-testid="table-preview"
      >
        <rect
          x={offsetX}
          y={offsetY}
          width={tableWidth}
          height={tableHeight}
          className="fill-(--surface-card) stroke-(--border-option-selected)"
          strokeWidth={2}
          rx={4}
        />
        {seats}
      </svg>
    );
  }

  const baseHeight = getTablePresets().double.height;
  const previewHeight = 80;
  const scale = previewHeight / baseHeight;
  const tableWidth = preset.width * scale;
  const tableHeight = preset.height * scale;
  const viewWidth = tableWidth + 30;
  const viewHeight = tableHeight + 30;
  const seats = renderSeats(15, 15, scale, 6);

  return (
    <svg
      width={viewWidth}
      height={viewHeight}
      className="shrink-0 w-auto h-auto max-w-full"
      data-testid="table-preview"
    >
      <rect
        x={15}
        y={15}
        width={tableWidth}
        height={tableHeight}
        className="fill-(--surface-card) stroke-(--border-option-selected)"
        strokeWidth={2}
      />
      {seats}
    </svg>
  );
}

// Memoize for better performance when rendering multiple table previews
export default React.memo(TablePreview);
