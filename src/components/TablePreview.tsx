import React from 'react';
import { getTablePresets } from '@/utils';
import type { TableTemplateType } from '@/types';
import {
  calculateSeatLayout,
  calculateSeatPosition,
  determineSeatEdge,
} from '@/utils/math/positionCalculations';

// Responsive SVG preview of a table configuration
function TablePreview({
  type,
  fixedSize = false,
}: {
  type: TableTemplateType;
  fixedSize?: boolean;
}) {
  const presets = getTablePresets();
  const preset = presets[type];

  const virtualTable = React.useMemo(
    () => ({
      x: 0,
      y: 0,
      width: preset.width,
      height: preset.height,
      seatCount: preset.seatCount,
      templateType: type,
      rotation: 0,
    }),
    [preset.height, preset.seatCount, preset.width, type],
  );

  const seatLayout = React.useMemo(
    () =>
      calculateSeatLayout({
        width: virtualTable.width,
        height: virtualTable.height,
        seatCount: virtualTable.seatCount,
        templateType: virtualTable.templateType,
      }),
    [
      virtualTable.height,
      virtualTable.seatCount,
      virtualTable.templateType,
      virtualTable.width,
    ],
  );

  const seatData = React.useMemo(
    () =>
      seatLayout.positions.map((_, seatIndex) => {
        const seatPosition = calculateSeatPosition({
          mode: 'scene',
          table: virtualTable,
          seatIndex,
          layout: seatLayout,
        });

        return {
          index: seatIndex,
          x: seatPosition.x,
          y: seatPosition.y,
          edge: determineSeatEdge(
            type,
            { col: seatPosition.col, row: seatPosition.row },
            seatLayout,
            virtualTable.seatCount,
          ),
        };
      }),
    [seatLayout, type, virtualTable],
  );

  const renderSeats = React.useCallback(
    (offsetX: number, offsetY: number, scale: number, radius: number) => {
      const horizontalOffset = (seatLayout.seatWidth / 2) * scale + radius + 2;
      const verticalOffset = (seatLayout.seatHeight / 2) * scale + radius + 2;

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
            className="fill-gray-600 dark:fill-gray-300"
          />
        );
      });
    },
    [seatData, seatLayout.seatHeight, seatLayout.seatWidth],
  );

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
          className="fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-blue-700"
          strokeWidth={2}
          rx={4}
        />
        {seats}
      </svg>
    );
  }

  const baseHeight = presets.double.height;
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
        className="fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-blue-700"
        strokeWidth={2}
      />
      {seats}
    </svg>
  );
}

// Memoize for better performance when rendering multiple table previews
export default React.memo(TablePreview);
