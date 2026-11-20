// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';
import { getAvoidPartnerIds, getWishPartnerIds } from './partnerUtils';

/** One student's relations, every id a classmate still in the class. */
export type StudentRelations = {
  /** The wishes in the order they were given: the first counts most. */
  wishes: string[];
  avoids: string[];
  /** Who named this student as a wish, in the class's order. */
  namedBy: string[];
  /** Wishes returned by the classmate. */
  mutual: ReadonlySet<string>;
  /** Part of a wish the other side keeps apart from, either way round. */
  inContradiction: boolean;
};

export type ClassRelations = {
  byId: ReadonlyMap<string, StudentRelations>;
  /** A wish the classmate wished to sit apart from: who wished, and whom. */
  contradictions: Array<{ from: Student; to: Student }>;
  /** Named as a wish by nobody, while somebody in the class named somebody. */
  namedByNobody: Student[];
  /** Has not named anybody as a wish. */
  withoutWish: Student[];
  /** Pairs who named each other, each pair once. */
  mutualPairs: Array<[Student, Student]>;
  /** Whether the class has a single wish or distance wish at all. */
  hasAny: boolean;
};

/**
 * Who wants to sit with whom across a class, read from the wishes and the
 * distance wishes (decision 0052): per student the wishes in order, who
 * named them and whom they keep apart from, and for the class what deserves
 * a look before mixing — a wish the other side refuses, a student nobody
 * named yet, a student who named nobody. Ids of students who left the class
 * are left out.
 */
export function describeClassRelations(students: Student[]): ClassRelations {
  const known = new Set(students.map((student) => student.id));
  const wishesOf = new Map(
    students.map((student) => [
      student.id,
      getWishPartnerIds(student).filter(
        (id) => known.has(id) && id !== student.id,
      ),
    ]),
  );
  const avoidsOf = new Map(
    students.map((student) => [
      student.id,
      getAvoidPartnerIds(student).filter(
        (id) => known.has(id) && id !== student.id,
      ),
    ]),
  );
  const byIdStudent = new Map(students.map((student) => [student.id, student]));
  const wishes = (id: string) => wishesOf.get(id) ?? [];
  const avoids = (id: string) => avoidsOf.get(id) ?? [];

  const contradictions: ClassRelations['contradictions'] = [];
  const inContradiction = new Set<string>();
  const mutualPairs: ClassRelations['mutualPairs'] = [];
  const byId = new Map<string, StudentRelations>();

  for (const student of students) {
    const own = wishes(student.id);
    const mutual = new Set(
      own.filter((other) => wishes(other).includes(student.id)),
    );
    for (const other of own) {
      const partner = byIdStudent.get(other);
      if (!partner) continue;
      if (avoids(other).includes(student.id)) {
        contradictions.push({ from: student, to: partner });
        inContradiction.add(student.id);
        inContradiction.add(other);
      }
      // Each mutual pair once, from the side that comes first in the class.
      if (
        mutual.has(other) &&
        students.indexOf(student) < students.indexOf(partner)
      ) {
        mutualPairs.push([student, partner]);
      }
    }
    byId.set(student.id, {
      wishes: own,
      avoids: avoids(student.id),
      namedBy: students
        .filter((other) => wishes(other.id).includes(student.id))
        .map((other) => other.id),
      mutual,
      inContradiction: false,
    });
  }
  for (const id of inContradiction) {
    const relations = byId.get(id);
    if (relations) relations.inContradiction = true;
  }

  const anyWish = students.some((student) => wishes(student.id).length > 0);
  const hasAny =
    anyWish || students.some((student) => avoids(student.id).length > 0);

  return {
    byId,
    contradictions,
    namedByNobody: anyWish
      ? students.filter((student) => byId.get(student.id)?.namedBy.length === 0)
      : [],
    withoutWish: students.filter((student) => wishes(student.id).length === 0),
    mutualPairs,
    hasAny,
  };
}
