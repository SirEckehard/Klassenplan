// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import { importanceOfWeight } from '@/utils/mixImportance';
import { tableRowsFromFront } from '../seatTargets';
import type { SeatLayout } from './seatRelations';

/**
 * The seats of the front rows (decision 0031): row by row away from the board,
 * as "Von vorne besetzen" counts them (`tableRowsFromFront`, tables less than
 * `FRONT_ROW_TOLERANCE` apart are one row), every usable seat of a row's
 * tables in the mix, until `needed` students fit on the free ones. A table
 * set a few pixels further forward by hand is no row of its own.
 *
 * The mixing keeps a student who needs a front seat "Sehr wichtig" within it.
 *
 * @param usable - Whether a seat belongs to the pool at all
 * @param free - Whether a usable seat can still take a student; usable by default
 * @returns One flag per flat seat
 */
export function frontSeatPool(
  scene: ClassroomScene,
  layout: SeatLayout,
  needed: number,
  usable: (seat: number) => boolean,
  free: (seat: number) => boolean = usable,
): Uint8Array {
  const pool = new Uint8Array(layout.size);
  if (needed <= 0) return pool;
  let room = 0;
  for (const row of tableRowsFromFront(scene)) {
    for (const { index } of row) {
      for (
        let seat = layout.offsets[index]!;
        seat < layout.offsets[index + 1]!;
        seat++
      ) {
        if (!usable(seat)) continue;
        pool[seat] = 1;
        if (free(seat)) room++;
      }
    }
    if (room >= needed) break;
  }
  return pool;
}

/** Rows behind the front rows that still count as front seats below "Sehr wichtig". */
const FRONT_TOLERANCE_ROWS = 1;

/**
 * Whether the row behind the front rows still counts as a front seat: below
 * "Sehr wichtig" (decision 0031, addendum of 2026-10-19). At "Sehr wichtig"
 * the front rows alone are front seats.
 */
export const toleratesRowBehind = (weight: number): boolean =>
  importanceOfWeight(weight) !== 'essential';

export interface FrontRows {
  /**
   * How many rows every flat seat lies behind the front rows, 0 within them;
   * a seat of a table out of the mix lies behind every row
   */
  behind: Int16Array;
  /** How many rows behind the front rows still count as front seats */
  tolerance: number;
}

/**
 * Where every seat lies relative to the front rows — the rows of
 * {@link frontSeatPool} that hold `needed` students on usable seats — for the
 * seat term and the fulfilment of "Vordere Plätze". The tolerance row is
 * granted only while a row of the mix stays behind it, so a room two rows
 * deep keeps its back row a back row.
 */
export function frontRowsOf(
  scene: ClassroomScene,
  layout: SeatLayout,
  needed: number,
  usable: (seat: number) => boolean,
  tolerant: boolean,
): FrontRows {
  const behind = new Int16Array(layout.size);
  if (needed <= 0) return { behind, tolerance: 0 };
  const rows = tableRowsFromFront(scene);
  const seatsOf = (
    row: (typeof rows)[number],
    visit: (seat: number) => void,
  ) => {
    for (const { index } of row) {
      for (
        let seat = layout.offsets[index]!;
        seat < layout.offsets[index + 1]!;
        seat++
      ) {
        visit(seat);
      }
    }
  };

  let last = rows.length - 1;
  let room = 0;
  for (let r = 0; r < rows.length; r++) {
    seatsOf(rows[r]!, (seat) => {
      if (usable(seat)) room++;
    });
    if (room >= needed) {
      last = r;
      break;
    }
  }

  behind.fill(Math.max(rows.length - last, 1));
  rows.forEach((row, r) => {
    seatsOf(row, (seat) => {
      behind[seat] = Math.max(r - last, 0);
    });
  });
  const tolerance =
    tolerant && last + FRONT_TOLERANCE_ROWS < rows.length - 1
      ? FRONT_TOLERANCE_ROWS
      : 0;
  return { behind, tolerance };
}
