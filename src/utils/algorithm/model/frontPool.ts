// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import { tableRowsFromFront } from '../seatTargets';
import type { SeatLayout } from './seatRelations';

/**
 * The seats of the front rows (decision 0031): row by row away from the board,
 * as "Von vorne besetzen" counts them (`tableRowsFromFront`, tables less than
 * `FRONT_ROW_TOLERANCE` apart are one row), every usable seat of a row's
 * tables in the mix, until `needed` students fit on the free ones. A table
 * set a few pixels further forward by hand is no row of its own.
 *
 * The mixing keeps a student who needs a front seat "Sehr wichtig" within it;
 * the fulfilment counts a student needing a front seat as served there.
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
