// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { SeatingArrangement, Student } from '@/types';

export interface PickedStudent {
  student: Student;
  /** -1 when the draw came from the class list rather than from a plan. */
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
  /**
   * Draw someone else and put the current pick back into the round — the
   * answer to "der ist heute nicht da", which must not cost them their turn.
   */
  skip: () => void;
  /** Clear the current pick and start over. */
  reset: () => void;
  /** Who has had a turn this round, the most recent first. */
  recent: Student[];
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
  /**
   * Drawn from when no plan is seated yet — the class list is enough to call
   * on somebody, and on a phone there may be no plan at all.
   */
  fallbackStudents: Student[] = [],
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
    if (entries.length > 0) {
      return entries;
    }
    return fallbackStudents
      .filter((student) => student.name.trim().length > 0)
      .map((student) => ({ student, tableIndex: -1, seatIndex: -1 }));
  }, [seating, fallbackStudents]);

  /**
   * One state, because the three parts of a round have to agree: who was
   * drawn, in what order, and who is up now. `Math.random()` runs inside the
   * updater, so a double-invoked updater (StrictMode) still leaves all three
   * describing the same draw.
   */
  const [round, setRound] = React.useState<{
    picked: PickedStudent | null;
    drawn: ReadonlySet<string>;
    history: Student[];
  }>(() => ({ picked: null, drawn: new Set(), history: [] }));

  // A changed plan invalidates the round — ids may not exist any more.
  const seatingKey = seatedStudents.map((entry) => entry.student.id).join('|');
  const lastKeyRef = React.useRef(seatingKey);
  React.useEffect(() => {
    if (lastKeyRef.current !== seatingKey) {
      lastKeyRef.current = seatingKey;
      setRound({ picked: null, drawn: new Set(), history: [] });
    }
  }, [seatingKey]);

  /** `skippedId` goes back into the pool instead of counting as a turn. */
  const draw = React.useCallback(
    (skippedId?: string) => {
      if (seatedStudents.length === 0) {
        return;
      }

      setRound((previous) => {
        const drawn = new Set(previous.drawn);
        if (skippedId) {
          drawn.delete(skippedId);
        }
        const pool = seatedStudents.filter(
          (entry) =>
            !drawn.has(entry.student.id) && entry.student.id !== skippedId,
        );
        // Round complete → start the next one with the full class.
        const exhausted = pool.length === 0;
        const candidates = exhausted
          ? seatedStudents.filter((entry) => entry.student.id !== skippedId)
          : pool;
        if (candidates.length === 0) {
          return previous;
        }

        const choice =
          candidates[Math.floor(Math.random() * candidates.length)];
        const nextDrawn = exhausted ? new Set<string>() : drawn;
        nextDrawn.add(choice.student.id);
        const rest = exhausted
          ? []
          : previous.history.filter(
              (student) =>
                student.id !== choice.student.id && student.id !== skippedId,
            );

        return {
          picked: choice,
          drawn: nextDrawn,
          history: [choice.student, ...rest],
        };
      });
    },
    [seatedStudents],
  );

  const pick = React.useCallback(() => draw(), [draw]);

  const skip = React.useCallback(() => {
    draw(round.picked?.student.id);
  }, [draw, round.picked]);

  const reset = React.useCallback(() => {
    setRound({ picked: null, drawn: new Set(), history: [] });
  }, []);

  return {
    picked: round.picked,
    remaining: Math.max(seatedStudents.length - round.drawn.size, 0),
    total: seatedStudents.length,
    pick,
    skip,
    reset,
    // The current pick leads the list the view shows.
    recent: round.history,
  };
}
