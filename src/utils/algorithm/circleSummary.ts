// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
} from '@/utils/student/partnerUtils';

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

/** A stretch of neighbours sharing one gender. */
export interface CircleGenderRun {
  length: number;
  firstId: string;
  lastId: string;
}

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
  /**
   * Students who wished for somebody in the circle, and those among them with
   * none of their wish partners beside them. Null when nobody wished.
   */
  wishes: { total: number; waiting: string[] } | null;
  /** Neighbours of whom one asked for distance. Null when nobody asked. */
  distance: { pairs: CirclePair[] } | null;
  /** Restless neighbours. Null with fewer than two restless students. */
  restless: { pairs: CirclePair[] } | null;
  /**
   * The longest same-gender stretch, reported only where it is longer than the
   * class makes necessary. Null with fewer than two genders to mix.
   */
  gender: { run: CircleGenderRun | null } | null;
}

/**
 * How much longer than unavoidable a same-gender stretch may be and still
 * count as mixed — the one-student imbalance the table plan allows at a table.
 */
const GENDER_RUN_TOLERANCE = 1;

const pairOf = (first: Student, second: Student): CirclePair => [
  first.id,
  second.id,
];

function findGenderRun(
  seats: ReadonlyArray<Student | null>,
): CircleSummary['gender'] {
  const counts = new Map<string, number>();
  for (const student of seats) {
    if (student?.gender) {
      counts.set(student.gender, (counts.get(student.gender) ?? 0) + 1);
    }
  }
  if (counts.size < 2) return null;

  const count = seats.length;
  const largest = Math.max(...counts.values());
  // Everybody outside the largest group — the other genders and those nobody
  // gave one — can stand between its members, so it splits into at most that
  // many stretches.
  const unavoidable = Math.ceil(largest / (count - largest));

  const genders = seats.map((student) => student?.gender ?? null);
  // Start where a stretch begins, so the end of the array cuts none in two.
  // With two genders present there is always such a place.
  const start = genders.findIndex(
    (gender, index) => gender !== genders[(index - 1 + count) % count],
  );

  let longest: { length: number; first: number; last: number } | null = null;
  let length = 0;
  let first = start;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    const gender = genders[index];
    if (
      gender !== null &&
      step > 0 &&
      gender === genders[(index - 1 + count) % count]
    ) {
      length += 1;
    } else {
      length = gender === null ? 0 : 1;
      first = index;
    }
    if (gender !== null && (!longest || length > longest.length)) {
      longest = { length, first, last: index };
    }
  }

  if (!longest || longest.length <= unavoidable + GENDER_RUN_TOLERANCE) {
    return { run: null };
  }
  return {
    run: {
      length: longest.length,
      firstId: seats[longest.first]!.id,
      lastId: seats[longest.last]!.id,
    },
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

  // Every pair of neighbours once: a ring of two has a single pair, not the
  // same pair seen from both sides.
  const neighbors: Array<[Student, Student]> = [];
  const pairCount = count < 2 ? 0 : count === 2 ? 1 : count;
  for (let index = 0; index < pairCount; index++) {
    const current = seats[index];
    const next = seats[(index + 1) % count];
    if (current && next) neighbors.push([current, next]);
  }

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

  let wishTotal = 0;
  const waiting: string[] = [];
  seats.forEach((student, index) => {
    if (!student) return;
    const wished = getWishPartnerIds(student).filter(
      (id) => id !== student.id && indexById.has(id),
    );
    if (wished.length === 0) return;
    wishTotal += 1;
    if (!wished.some((id) => sideBySide(index, indexById.get(id)!))) {
      waiting.push(student.id);
    }
  });

  const asksDistance = seats.some(
    (student) =>
      student !== null &&
      getAvoidPartnerIds(student).some(
        (id) => id !== student.id && indexById.has(id),
      ),
  );
  const restlessCount = seats.filter((student) => student?.restless).length;

  return {
    tableNeighbors: {
      total: kept.length + separated.length,
      kept: bySeat(kept),
      separated: bySeat(separated),
    },
    wishes: wishTotal > 0 ? { total: wishTotal, waiting } : null,
    distance: asksDistance
      ? {
          pairs: neighbors
            .filter(
              ([a, b]) =>
                getAvoidPartnerIds(a).includes(b.id) ||
                getAvoidPartnerIds(b).includes(a.id),
            )
            .map(([a, b]) => pairOf(a, b)),
        }
      : null,
    restless:
      restlessCount >= 2
        ? {
            pairs: neighbors
              .filter(([a, b]) => a.restless && b.restless)
              .map(([a, b]) => pairOf(a, b)),
          }
        : null,
    gender: findGenderRun(seats),
  };
}
