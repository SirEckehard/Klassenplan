// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What the mixing cannot meet, said before anyone wonders why (decision
 * 0031). A plan that leaves a wish open or two students needing a front seat
 * in the second row is not a bad mix when the class and the room allow no
 * better: these are the cases the teacher can do something about — move a
 * desk, change a wish — and none that only the mixing could.
 */
import type { ClassroomScene, MixSettings, Student } from '@/types';
import { isTableActive } from '@/utils/math/scene';
import { importanceOfWeight } from '@/utils/mixImportance';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
} from '@/utils/student/partnerUtils';
import { tableRowsFromFront } from '../seatTargets';
import { resolveCriterionWeights } from './criteria';
import { getSeatLayout } from './seatRelations';

export type MixHint =
  | {
      /** More students need a front seat "Sehr wichtig" than the front row has */
      kind: 'frontRow';
      students: number;
      seats: number;
    }
  | {
      /** Students who all keep a distance from each other, more than tables */
      kind: 'avoidGroup';
      studentIds: string[];
      tables: number;
    }
  | {
      /** A wish the wished classmate answers with a distance wish */
      kind: 'wishMeetsAvoid';
      wisherId: string;
      avoiderId: string;
    }
  | {
      /** Wished by more classmates than can sit around anybody in this room */
      kind: 'wishedOften';
      studentId: string;
      wishers: number;
      room: number;
    };

/**
 * The largest group in which everybody avoids everybody else, by a simple
 * Bron–Kerbosch search: a class has at most 36 students and few distance
 * wishes, so the search stays small.
 */
const largestAvoidGroup = (neighbours: Map<string, Set<string>>): string[] => {
  let best: string[] = [];
  const search = (
    group: string[],
    candidates: string[],
    excluded: string[],
  ) => {
    if (candidates.length === 0 && excluded.length === 0) {
      if (group.length > best.length) best = group;
      return;
    }
    if (group.length + candidates.length <= best.length) return;
    const pivot = [...candidates, ...excluded][0]!;
    const pivotNeighbours = neighbours.get(pivot) ?? new Set<string>();
    for (const candidate of candidates.filter((c) => !pivotNeighbours.has(c))) {
      const around = neighbours.get(candidate) ?? new Set<string>();
      search(
        [...group, candidate],
        candidates.filter((c) => around.has(c)),
        excluded.filter((c) => around.has(c)),
      );
      candidates = candidates.filter((c) => c !== candidate);
      excluded = [...excluded, candidate];
    }
  };
  search([], [...neighbours.keys()], []);
  return best;
};

/** The hints for a class in a room, by the weights the mix would use. */
export function findMixHints(
  students: Student[],
  scene: ClassroomScene,
  settings: Partial<MixSettings>,
): MixHint[] {
  const hints: MixHint[] = [];
  const weights = resolveCriterionWeights(settings);
  const present = new Set(students.map((student) => student.id));

  if (importanceOfWeight(weights.front) === 'essential') {
    const needing = students.filter((student) => student.needsFrontSeat).length;
    const firstRow = tableRowsFromFront(scene)[0] ?? [];
    const seats = firstRow.reduce((sum, { table }) => sum + table.seatCount, 0);
    if (seats > 0 && needing > seats) {
      hints.push({ kind: 'frontRow', students: needing, seats });
    }
  }

  if (weights.avoid > 0) {
    const neighbours = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!neighbours.has(a)) neighbours.set(a, new Set());
      neighbours.get(a)!.add(b);
    };
    for (const student of students) {
      for (const id of getAvoidPartnerIds(student)) {
        if (id === student.id || !present.has(id)) continue;
        link(student.id, id);
        link(id, student.id);
      }
    }
    const tables = scene.tables.filter(isTableActive).length;
    const group = largestAvoidGroup(neighbours);
    if (group.length >= 3 && group.length > tables) {
      hints.push({ kind: 'avoidGroup', studentIds: group, tables });
    }
  }

  if (weights.wish > 0 && weights.avoid > 0) {
    const byId = new Map(students.map((student) => [student.id, student]));
    for (const student of students) {
      for (const id of getWishPartnerIds(student)) {
        const wished = byId.get(id);
        if (wished && getAvoidPartnerIds(wished).includes(student.id)) {
          hints.push({
            kind: 'wishMeetsAvoid',
            wisherId: student.id,
            avoiderId: id,
          });
        }
      }
    }
  }

  if (weights.wish > 0) {
    // The most classmates anybody can have close in this room: the seat with
    // the most relations among the tables in the mix.
    const layout = getSeatLayout(scene);
    const inMix = (seat: number) => {
      const table = scene.tables[layout.tableOf[seat]!];
      return table ? isTableActive(table) : false;
    };
    let room = 0;
    for (let seat = 0; seat < layout.size; seat++) {
      if (!inMix(seat)) continue;
      room = Math.max(
        room,
        layout.relations[seat]!.filter((relation) => inMix(relation.seat))
          .length,
      );
    }
    const wishers = new Map<string, number>();
    for (const student of students) {
      for (const id of new Set(getWishPartnerIds(student))) {
        if (id === student.id || !present.has(id)) continue;
        wishers.set(id, (wishers.get(id) ?? 0) + 1);
      }
    }
    for (const [studentId, count] of wishers) {
      if (count > room) {
        hints.push({ kind: 'wishedOften', studentId, wishers: count, room });
      }
    }
  }

  return hints;
}
