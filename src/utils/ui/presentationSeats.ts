// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The seats of the projection as shapes: which one lies under a point, and
 * where the ones of students missing today are (decision 0045). In the
 * classroom's own coordinates, before the projection turns it.
 */
import type { ClassroomScene, SeatingArrangement } from '@/types';
import {
  calculateSeatLayout,
  calculateSeatPosition,
} from '@/utils/math/positionCalculations';
import { insetSeatPath, seatTableCorners } from '@/utils/ui/seatMark';

export interface SeatShape {
  tableIndex: number;
  seatIndex: number;
  studentId: string;
  /** The seat's centre */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The table's turn, in degrees */
  rotation: number;
  /**
   * The seat's outline as its table cuts it (`insetSeatPath`), in the seat's
   * own coordinates, and the transform that puts it where the seat is drawn:
   * a veil over the seat takes its shape, the table's round corners included.
   */
  outline: string;
  outlineTransform: string;
}

/** Every occupied seat of the plan as a shape. */
export function occupiedSeatShapes(
  scene: ClassroomScene,
  seating: SeatingArrangement,
): SeatShape[] {
  const shapes: SeatShape[] = [];
  scene.tables.forEach((table, tableIndex) => {
    const seats = seating[tableIndex];
    if (!seats?.some(Boolean)) return;
    const layout = calculateSeatLayout(table);
    const { cols, rows, seatWidth, seatHeight } = layout;
    // The table's own frame, as `SceneTable` places it.
    const tableTransform =
      `translate(${table.x + table.width / 2} ${table.y + table.height / 2}) ` +
      `rotate(${table.rotation ?? 0}) ` +
      `translate(${-table.width / 2} ${-table.height / 2})`;
    seats.forEach((student, seatIndex) => {
      if (!student || seatIndex >= table.seatCount) return;
      // A seat the layout has no place for takes the next cell in reading
      // order, as on the table itself.
      const { col, row } = layout.positions[seatIndex] ?? {
        col: seatIndex % cols,
        row: Math.floor(seatIndex / cols),
      };
      const centre = calculateSeatPosition({
        mode: 'scene',
        table,
        seatIndex,
        layout,
      });
      shapes.push({
        tableIndex,
        seatIndex,
        studentId: student.id,
        x: centre.x,
        y: centre.y,
        width: layout.seatWidth,
        height: layout.seatHeight,
        rotation: table.rotation ?? 0,
        outline: insetSeatPath(
          seatWidth,
          seatHeight,
          0,
          seatTableCorners(col, row, cols, rows),
        ),
        outlineTransform: `${tableTransform} translate(${col * seatWidth} ${row * seatHeight})`,
      });
    });
  });
  return shapes;
}

/** The occupied seat under a point of the classroom, or null. */
export function seatAtPoint(
  shapes: readonly SeatShape[],
  point: { x: number; y: number },
): SeatShape | null {
  for (const shape of shapes) {
    const angle = (-shape.rotation * Math.PI) / 180;
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;
    const along = dx * Math.cos(angle) - dy * Math.sin(angle);
    const across = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (
      Math.abs(along) <= shape.width / 2 &&
      Math.abs(across) <= shape.height / 2
    ) {
      return shape;
    }
  }
  return null;
}
