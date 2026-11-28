// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import { buildNameLabels, getDisplayNameForMode } from '@/utils';
import {
  poorTableKey,
  seatedUnits,
  type SeatAddress,
} from '@/utils/data/planUsage';

/** A table feedback can name: two or more who sat together. */
export interface PlanFeedbackTable {
  /** Its key in the feedback (`poorTableKey`) */
  key: string;
  /** Who sat there, sorted, as the feedback stores them */
  ids: string[];
  /** Their first names, told apart where two share one */
  names: string;
  /** The tables of a group, by index; none for a join */
  tables: number[];
  /** The two seats at a join of desks pushed together in a row */
  join: [SeatAddress, SeatAddress] | null;
}

/**
 * The tables of a plan that feedback can name (decision 0054), as the mixing
 * reads the room: a table on its own, tables pushed together round a corner
 * or face to face as one, and each join of desks pushed together in a row as
 * a table of two — every one with two or more who sat there.
 *
 * @param seating The plan's arrangement
 * @param scene The room it was made in
 * @param students The class, for first names that tell its students apart
 */
export function usePlanFeedbackTables(
  seating: SeatingArrangement,
  scene: ClassroomScene,
  students: readonly Student[],
): PlanFeedbackTable[] {
  return useMemo(() => {
    const labels = buildNameLabels(
      students.map((student) => student.name),
      'firstName',
    );
    return seatedUnits(seating, scene)
      .filter((unit) => unit.students.length >= 2)
      .map((unit) => {
        const ids = unit.students.map((student) => student.id).sort();
        return {
          key: poorTableKey(ids),
          ids,
          names: unit.students
            .map((student) =>
              getDisplayNameForMode(student.name, 'full', 'firstName', labels),
            )
            .join(' · '),
          tables: unit.tables,
          join: unit.join,
        };
      });
  }, [seating, scene, students]);
}
