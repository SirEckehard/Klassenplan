import type { ClassroomTable, TableTemplateType } from '@/types';
import {
  getTablePresets,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  BOARD_WIDTH,
  GRID_SNAP_SIZE,
  logWarn,
} from '@/utils';

// Spacing constraints for dynamic layouts
const MIN_SPACING = 15; // Minimum spacing to prevent overlap/touching
const MAX_SPACING = 60; // Maximum spacing to avoid tables being too far apart
const PREFERRED_SPACING = 35; // Preferred spacing when space allows
const CANVAS_MARGIN = 30; // Minimum distance from canvas edges

/**
 * Snap value to grid for consistent positioning
 */
const snapToGrid = (value: number): number =>
  Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE;

/**
 * Calculate dynamic spacing based on available space and table count
 */
const calculateDynamicSpacing = (
  tableType: TableTemplateType,
  count: number,
  availableWidth: number,
  availableHeight: number,
): { xSpacing: number; ySpacing: number } => {
  const preset = getTablePresets()[tableType];

  // Calculate layout dimensions based on table type
  let cols: number, rows: number;

  switch (tableType) {
    case 'double':
      cols = Math.ceil(count / 3); // 3 tables per column
      rows = Math.min(3, count);
      break;
    case 'single':
      cols = Math.min(6, count); // max 6 per row
      rows = Math.ceil(count / 6);
      break;
    case 'group6':
      cols = Math.min(3, count); // max 3 per row
      rows = Math.ceil(count / 3);
      break;
    default: // group4
      cols = Math.min(4, count); // max 4 per row
      rows = Math.ceil(count / 4);
      break;
  }

  // Calculate required space for tables themselves
  const totalTableWidth = cols * preset.width;
  const totalTableHeight = rows * preset.height;

  // Calculate available space for spacing
  const availableSpacingWidth = availableWidth - totalTableWidth;
  const availableSpacingHeight = availableHeight - totalTableHeight;

  // Calculate dynamic spacing
  const xSpacing =
    cols > 1
      ? Math.max(
          MIN_SPACING,
          Math.min(MAX_SPACING, availableSpacingWidth / (cols - 1)),
        )
      : PREFERRED_SPACING;

  // Special row spacing for group tables to better utilize vertical space
  const getMinRowSpacing = (tableType: TableTemplateType): number => {
    switch (tableType) {
      case 'group4':
      case 'group6':
        return 80; // Larger minimum spacing between group table rows
      default:
        return MIN_SPACING;
    }
  };

  const minRowSpacing = getMinRowSpacing(tableType);
  const ySpacing =
    rows > 1
      ? Math.max(
          minRowSpacing,
          Math.min(MAX_SPACING, availableSpacingHeight / (rows - 1)),
        )
      : PREFERRED_SPACING;

  return {
    xSpacing: preset.width + xSpacing,
    ySpacing: preset.height + ySpacing,
  };
};

/**
 * Calculate centered start position for table arrangement
 */
const calculateCenteredStartPosition = (
  tableType: TableTemplateType,
  count: number,
  xSpacing: number,
  ySpacing: number,
): { startX: number; startY: number } => {
  const preset = getTablePresets()[tableType];

  // Calculate total arrangement dimensions
  let arrangeWidth: number, arrangeHeight: number;

  switch (tableType) {
    case 'double': {
      const cols = Math.ceil(count / 3);
      const rows = Math.min(3, count);
      arrangeWidth =
        cols > 1 ? (cols - 1) * xSpacing + preset.width : preset.width;
      arrangeHeight =
        rows > 1 ? (rows - 1) * ySpacing + preset.height : preset.height;
      break;
    }
    case 'single': {
      const cols = Math.min(6, count);
      const rows = Math.ceil(count / 6);
      arrangeWidth =
        cols > 1 ? (cols - 1) * xSpacing + preset.width : preset.width;
      arrangeHeight =
        rows > 1 ? (rows - 1) * ySpacing + preset.height : preset.height;
      break;
    }
    case 'group6': {
      // Match generation loop: perRow=3, totalCols = Math.min(3, count)
      const cols = Math.min(3, count);
      arrangeWidth =
        cols > 1 ? (cols - 1) * xSpacing + preset.width : preset.width;
      arrangeHeight = count > 3 ? ySpacing + preset.height : preset.height; // 2 rows max
      break;
    }
    default: {
      // group4
      // Match generation loop: perRow=4, totalCols = Math.min(4, count)
      const cols = Math.min(4, count);
      arrangeWidth =
        cols > 1 ? (cols - 1) * xSpacing + preset.width : preset.width;
      arrangeHeight = count > 4 ? ySpacing + preset.height : preset.height;
      break;
    }
  }

  // Calculate available canvas area (excluding board and margins)
  const availableWidth = CLASSROOM_WIDTH - BOARD_WIDTH - 2 * CANVAS_MARGIN;
  const availableHeight = CLASSROOM_HEIGHT - 2 * CANVAS_MARGIN;

  // Center horizontally and vertically within the available area
  const startX = snapToGrid(
    CANVAS_MARGIN + (availableWidth - arrangeWidth) / 2,
  );
  const startY = snapToGrid(
    CANVAS_MARGIN + (availableHeight - arrangeHeight) / 2,
  );

  return { startX, startY };
};

/**
 * Automatically position classroom tables based on template type and count.
 * @param type Selected table template type
 * @param count Number of tables that should be placed
 * @returns Array of tables with calculated coordinates
 */
export default function arrangeTables(
  type: TableTemplateType,
  count: number,
): ClassroomTable[] {
  const preset = getTablePresets()[type];
  const tables: ClassroomTable[] = [];

  if (count <= 0) return tables;

  // Calculate available space for table arrangement (excluding board and margins)
  const availableWidth = CLASSROOM_WIDTH - BOARD_WIDTH - 2 * CANVAS_MARGIN;
  const availableHeight = CLASSROOM_HEIGHT - 2 * CANVAS_MARGIN;

  // Calculate dynamic spacing based on table type, count, and available space
  const { xSpacing, ySpacing } = calculateDynamicSpacing(
    type,
    count,
    availableWidth,
    availableHeight,
  );

  // Calculate centered start position for the arrangement
  const { startX, startY } = calculateCenteredStartPosition(
    type,
    count,
    xSpacing,
    ySpacing,
  );

  // Generate tables with centered positioning based on table type
  if (type === 'double') {
    // Double tables: vertical columns of 3 tables each (right to left arrangement)
    const tablesPerColumn = 3;
    const totalCols = Math.ceil(count / tablesPerColumn);

    for (let i = 0; i < count; i++) {
      const col = Math.floor(i / tablesPerColumn);
      const row = i % tablesPerColumn;

      // Right-to-left: start from rightmost column and work left
      // Note: x not snapped to preserve front-edge alignment
      const x = startX + (totalCols - 1 - col) * xSpacing;
      const y = snapToGrid(startY + row * ySpacing);

      tables.push({
        x,
        y,
        width: preset.width,
        height: preset.height,
        rotation: 0,
        seatCount: preset.seatCount,
        locked: false,
        zIndex: i,
        templateType: type,
      });
    }
  } else if (type === 'single') {
    // Single tables: horizontal rows of up to 6 tables (right to left arrangement)
    const perRow = 6;
    const totalCols = Math.min(perRow, count); // Total columns needed

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;

      // Right-to-left: start from rightmost position and work left
      // Note: x not snapped to preserve front-edge alignment
      const x = startX + (totalCols - 1 - col) * xSpacing;
      const y = snapToGrid(startY + row * ySpacing);

      tables.push({
        x,
        y,
        width: preset.width,
        height: preset.height,
        rotation: 0,
        seatCount: preset.seatCount,
        locked: false,
        zIndex: i,
        templateType: type,
      });
    }
  } else if (type === 'group6') {
    // Group6 tables: 3 per row, up to 2 rows (right to left arrangement)
    const perRow = 3;
    const totalCols = Math.min(perRow, count); // Total columns needed

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;

      // Right-to-left: start from rightmost position and work left
      // Note: x not snapped to preserve front-edge alignment
      const x = startX + (totalCols - 1 - col) * xSpacing;
      const y = snapToGrid(startY + row * ySpacing);

      tables.push({
        x,
        y,
        width: preset.width,
        height: preset.height,
        rotation: 0,
        seatCount: preset.seatCount,
        locked: false,
        zIndex: i,
        templateType: type,
      });
    }
  } else {
    // Group4 tables: 4 per row, up to 2 rows (right to left arrangement)
    const perRow = 4;
    const totalCols = Math.min(perRow, count); // Total columns needed

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;

      // Right-to-left: start from rightmost position and work left
      // Note: x not snapped to preserve front-edge alignment
      const x = startX + (totalCols - 1 - col) * xSpacing;
      const y = snapToGrid(startY + row * ySpacing);

      tables.push({
        x,
        y,
        width: preset.width,
        height: preset.height,
        rotation: 0,
        seatCount: preset.seatCount,
        locked: false,
        zIndex: i,
        templateType: type,
      });
    }
  }

  // Validate that all tables are within canvas bounds and don't overlap
  validateAndAdjustTablePositions(tables);

  // Sort tables so numbering goes from front (board side) to back
  tables.sort((a, b) => b.x - a.x || a.y - b.y);
  tables.forEach((t, i) => {
    t.zIndex = i;
  });

  return tables;
}

/**
 * Validate and adjust table positions to ensure they stay within bounds
 * and don't overlap with each other
 */
const validateAndAdjustTablePositions = (tables: ClassroomTable[]): void => {
  tables.forEach((table) => {
    // Ensure table stays within canvas bounds
    // Right boundary: table's right edge can extend up to the board
    table.x = Math.max(
      0,
      Math.min(table.x, CLASSROOM_WIDTH - BOARD_WIDTH - table.width),
    );
    table.y = Math.max(
      CANVAS_MARGIN,
      Math.min(table.y, CLASSROOM_HEIGHT - table.height - CANVAS_MARGIN),
    );

    // Only snap y to grid (x is calculated for front-edge alignment)
    table.y = snapToGrid(table.y);
  });

  // Check for overlaps and log warning if found
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const table1 = tables[i];
      const table2 = tables[j];

      if (table1 && table2) {
        const overlap = !(
          table1.x + table1.width <= table2.x ||
          table2.x + table2.width <= table1.x ||
          table1.y + table1.height <= table2.y ||
          table2.y + table2.height <= table1.y
        );

        if (overlap) {
          logWarn(
            `Table overlap detected between tables ${i} and ${j}. Consider reducing table count or adjusting spacing.`,
            { table1, table2 },
            'autoArrange',
          );
        }
      }
    }
  }
};
