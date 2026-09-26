// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { CircleLayout } from '@/types/Circle';

/**
 * What a seating circle came to, read off the order it is drawn in.
 *
 * The layout carries per-student neighbour lists and a preservation rate, but
 * both are written once, when the circle is built: a drag swaps two entries
 * and leaves them describing an order that no longer exists. Everything here
 * is derived from the current order instead, so the inspector and the arcs
 * between table neighbours agree with the stage after every move.
 *
 * Seats are the slots of the drawing: slot `i` sits between `i - 1` and
 * `i + 1`, and the last slot closes the ring next to the first.
 */

/** Two students side by side or meant to be, ids in seating order. */
export type CirclePair = readonly [string, string];

export interface CircleSummary {
  /**
   * The pairs that shared a table in the plan the circle was built from —
   * direct seat partners, not everybody at a group table.
   */
  tableNeighbors: {
    total: number;
    /** Still side by side; these are the pairs the arcs connect. */
    kept: CirclePair[];
    /** Split up by the circle. */
    separated: CirclePair[];
  };
}

export function summarizeCircle(layout: CircleLayout): CircleSummary {
  const seats = layout.students.map((position) => position?.student ?? null);
  const count = seats.length;

  const indexById = new Map<string, number>();
  seats.forEach((student, index) => {
    if (student) indexById.set(student.id, index);
  });

  const sideBySide = (a: number, b: number) => {
    const gap = Math.abs(a - b);
    return gap === 1 || (count > 2 && gap === count - 1);
  };

  const kept: Array<{ at: number; pair: CirclePair }> = [];
  const separated: Array<{ at: number; pair: CirclePair }> = [];
  const counted = new Set<string>();
  for (const pair of layout.neighborhoodPairs ?? []) {
    const a = indexById.get(pair.student1Id);
    const b = indexById.get(pair.student2Id);
    if (a === undefined || b === undefined || a === b) continue;
    const at = Math.min(a, b);
    const ordered: CirclePair =
      a < b
        ? [pair.student1Id, pair.student2Id]
        : [pair.student2Id, pair.student1Id];
    const key = ordered.join('::');
    if (counted.has(key)) continue;
    counted.add(key);
    (sideBySide(a, b) ? kept : separated).push({ at, pair: ordered });
  }
  const bySeat = (entries: Array<{ at: number; pair: CirclePair }>) =>
    entries.sort((x, y) => x.at - y.at).map((entry) => entry.pair);

  return {
    tableNeighbors: {
      total: kept.length + separated.length,
      kept: bySeat(kept),
      separated: bySeat(separated),
    },
  };
}
