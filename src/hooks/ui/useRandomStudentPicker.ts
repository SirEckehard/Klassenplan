// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { SeatingArrangement, Student } from '@/types';

export interface PickedStudent {
  student: Student;
  tableIndex: number;
  seatIndex: number;
}

export interface RandomStudentPicker {
  /** The student drawn last, or null before the first draw. */
  picked: PickedStudent | null;
  /** How many students are still waiting to be drawn this round. */
  remaining: number;
  /** Total number of seated students. */
  total: number;
  /** Draw the next student. Starts a new round once everyone has had a turn. */
  pick: () => void;
  /** Clear the current pick and start over. */
  reset: () => void;
}

type SeatEntry = PickedStudent;

/**
 * "Who's next?" — draws a random seated student.
 *
 * Draws *without replacement*: everyone gets a turn before anyone repeats,
 * which is the point of using it for calling on students rather than rolling a
 * die each time. When the round is exhausted the next draw starts a fresh one.
 */
export function useRandomStudentPicker(
  seating: SeatingArrangement,
): RandomStudentPicker {
  const seatedStudents = React.useMemo<SeatEntry[]>(() => {
    const entries: SeatEntry[] = [];
    seating.forEach((table, tableIndex) => {
      table?.forEach((student, seatIndex) => {
        if (student) {
          entries.push({ student, tableIndex, seatIndex });
        }
      });
    });
    return entries;
  }, [seating]);

  const [picked, setPicked] = React.useState<PickedStudent | null>(null);
  const [drawnIds, setDrawnIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // A changed plan invalidates the round — ids may not exist any more.
  const seatingKey = seatedStudents.map((entry) => entry.student.id).join('|');
  const lastKeyRef = React.useRef(seatingKey);
  React.useEffect(() => {
    if (lastKeyRef.current !== seatingKey) {
      lastKeyRef.current = seatingKey;
      setPicked(null);
      setDrawnIds(new Set());
    }
  }, [seatingKey]);

  const pick = React.useCallback(() => {
    if (seatedStudents.length === 0) {
      return;
    }

    setDrawnIds((previous) => {
      const pool = seatedStudents.filter(
        (entry) => !previous.has(entry.student.id),
      );
      // Round complete → start the next one with the full class.
      const candidates = pool.length > 0 ? pool : seatedStudents;
      const nextDrawn = pool.length > 0 ? new Set(previous) : new Set<string>();

      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      nextDrawn.add(choice.student.id);
      setPicked(choice);
      return nextDrawn;
    });
  }, [seatedStudents]);

  const reset = React.useCallback(() => {
    setPicked(null);
    setDrawnIds(new Set());
  }, []);

  return {
    picked,
    remaining: Math.max(seatedStudents.length - drawnIds.size, 0),
    total: seatedStudents.length,
    pick,
    reset,
  };
}
