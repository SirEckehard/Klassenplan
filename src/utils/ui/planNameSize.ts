// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The name size the seats of a table plan share (`planNameFontSize`).
 *
 * Worked out once per plan by the view that draws all of its tables — the
 * editor, the projection and the export — and handed to every seat, which
 * then sets its name at that size or, if its own name cannot reach it,
 * smaller. Each seat is measured the way `TableSeat` lays it out: the same
 * upright frame, the same badge pill, the same lock.
 */
import type { ClassroomTable, Student } from '@/types';
import { calculateSeatLayout } from '@/utils/math/positionCalculations';
import {
  getSeatBadges,
  layoutSeatBadgePill,
  type SeatBadgeView,
} from './seatBadges';
import {
  fitNameOnSeat,
  planNameFontSize,
  seatNameMaxFontSize,
  type NameWeight,
} from './seatLabelLayout';

export type PlanNameSizeInput = {
  tables: readonly ClassroomTable[];
  /** Who sits where, per table and seat. */
  seating: ReadonlyArray<ReadonlyArray<Student | null> | undefined>;
  /** The label a student's seat shows (display mode and disambiguation applied). */
  labelFor: (student: Student) => string;
  allStudents: Student[];
  showSpecialNeeds?: boolean;
  badgeView?: SeatBadgeView;
  /** Names stay upright while their table turns (`lockSeatLabelOrientation`). */
  keepLabelsUpright?: boolean;
  /** Extra turn of every name, e.g. against the export's turned room (`seatLabelRotation`). */
  labelRotation?: number;
  /** Whether the seats carry the editor's lock toggle. */
  lock?: boolean;
  weight?: NameWeight;
  /** Break every name that can break (full names), as the seats do. */
  split?: boolean;
};

/** The size a table plan's names share; undefined for a plan without names. */
export function computePlanNameFontSize({
  tables,
  seating,
  labelFor,
  allStudents,
  showSpecialNeeds = true,
  badgeView,
  keepLabelsUpright = true,
  labelRotation = 0,
  lock = false,
  weight = 400,
  split = false,
}: PlanNameSizeInput): number | undefined {
  const sizes: number[] = [];
  tables.forEach((table, tableIndex) => {
    const students = seating[tableIndex] ?? [];
    if (!students.some(Boolean)) return;
    const { seatWidth, seatHeight } = calculateSeatLayout(table);
    // The same turn `SceneTable` gives its seat labels.
    const rotation = keepLabelsUpright
      ? labelRotation - (table.rotation ?? 0)
      : 0;
    const shape = { seatWidth, seatHeight, rotation, lock };
    const maxFont = seatNameMaxFontSize(seatWidth, seatHeight);
    students.forEach((student) => {
      if (!student) return;
      const pill = layoutSeatBadgePill(
        getSeatBadges(
          student,
          allStudents,
          showSpecialNeeds,
          badgeView?.filter,
        ),
        shape,
        badgeView,
      );
      sizes.push(
        fitNameOnSeat(labelFor(student), shape, pill?.rect ?? null, {
          weight,
          maxFont,
          split,
        }).fontSize,
      );
    });
  });
  return planNameFontSize(sizes);
}
