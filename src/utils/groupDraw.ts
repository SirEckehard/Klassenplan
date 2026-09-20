// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';
import { shuffleArray } from './algorithm/shuffle';
import { getAvoidPartnerIds } from './student/partnerUtils';

/**
 * Drawing groups out of a class — the thing a teacher does on the way into the
 * room, with a phone in one hand.
 *
 * This is not the seating algorithm and does not try to be: no weights, no
 * refinement, no scoring. One rule survives, because breaking it is what a
 * teacher would have to undo by hand: two students who asked not to sit
 * together do not land in the same group while any other group has room.
 */

export type GroupDrawOptions = {
  /** Students per group; the last groups take one fewer where it does not divide. */
  size: number;
  /** Injectable random source, so a test can assert an exact draw. */
  rng?: () => number;
  /** Keep students with a distance wish apart where the sizes allow it. */
  respectAvoidPartners?: boolean;
};

export type GroupDrawResult = {
  groups: Student[][];
  /**
   * Distance wishes the sizes could not honour — a class of six where four
   * want to avoid each other runs out of groups. Named, never swallowed.
   */
  conflicts: Array<{ student: Student; other: Student }>;
};

/** Group sizes for `total` students: as even as the size allows, largest first. */
export function planGroupSizes(total: number, size: number): number[] {
  if (total <= 0 || size <= 0) return [];
  const count = Math.max(1, Math.round(total / size));
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

export function buildGroups(
  students: Student[],
  { size, rng = Math.random, respectAvoidPartners = true }: GroupDrawOptions,
): GroupDrawResult {
  const pool = students.filter((student) => student.name.trim().length > 0);
  if (pool.length === 0) {
    return { groups: [], conflicts: [] };
  }

  const sizes = planGroupSizes(pool.length, size);
  const groups: Student[][] = sizes.map(() => []);

  const avoids = (student: Student, other: Student) =>
    respectAvoidPartners &&
    (getAvoidPartnerIds(student).includes(other.id) ||
      getAvoidPartnerIds(other).includes(student.id));

  const fits = (student: Student, group: Student[]) =>
    group.every((member) => !avoids(student, member));

  // Filling the emptiest group first rather than the first one leaves late
  // arrivals somewhere to go: a group that is already full cannot take the
  // student whose partner sits in the only group with room left.
  for (const student of shuffleArray(pool, rng)) {
    const withRoom = groups
      .map((group, index) => ({ group, index }))
      .filter(({ index }) => groups[index].length < sizes[index])
      .sort((a, b) => a.group.length - b.group.length);

    const target = withRoom.find(({ group }) => fits(student, group));
    (target ?? withRoom[0])?.group.push(student);
  }

  // What greedy placement could not avoid, a swap often can: trade the student
  // for someone in another group where neither side ends up beside a partner
  // they asked to be away from.
  if (respectAvoidPartners) {
    for (const [index, group] of groups.entries()) {
      for (const student of [...group]) {
        if (
          fits(
            student,
            group.filter((member) => member !== student),
          )
        ) {
          continue;
        }
        const swap = groups.flatMap((other, otherIndex) =>
          otherIndex === index
            ? []
            : other.map((candidate) => ({ other, otherIndex, candidate })),
        );
        const trade = swap.find(({ other, candidate }) => {
          const otherRest = other.filter((member) => member !== candidate);
          const ownRest = group.filter((member) => member !== student);
          return fits(student, otherRest) && fits(candidate, ownRest);
        });
        if (!trade) continue;
        group[group.indexOf(student)] = trade.candidate;
        trade.other[trade.other.indexOf(trade.candidate)] = student;
      }
    }
  }

  // Whatever is still standing next to a partner it asked to avoid is named,
  // not swallowed: the teacher can then split that group by hand.
  const conflicts: GroupDrawResult['conflicts'] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const student of group) {
      for (const other of group) {
        if (student === other || !avoids(student, other)) continue;
        const key = [student.id, other.id].sort().join('::');
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({ student, other });
      }
    }
  }

  return { groups: groups.filter((group) => group.length > 0), conflicts };
}
