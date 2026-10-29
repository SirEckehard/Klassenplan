// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';

/**
 * Extracts wish partner IDs from a student, handling both legacy and new formats.
 *
 * @param student - The student to extract wish partner IDs from
 * @returns Array of wish partner IDs (empty if none)
 *
 * @example
 * const wishIds = getWishPartnerIds(student);
 * // Returns: ['id1', 'id2'] or []
 */
export const getWishPartnerIds = (student: Student): string[] => {
  // `Array.isArray` rather than a truthy check: a record that came in through a
  // hand-edited backup can carry anything here, and every caller filters or
  // iterates the result.
  if (
    Array.isArray(student.wishPartnerIds) &&
    student.wishPartnerIds.length > 0
  ) {
    return student.wishPartnerIds;
  }
  if (student.wishPartnerId) {
    return [student.wishPartnerId];
  }
  return [];
};

/**
 * Extracts avoid partner IDs from a student, handling both legacy and new formats.
 *
 * @param student - The student to extract avoid partner IDs from
 * @returns Array of avoid partner IDs (empty if none)
 *
 * @example
 * const avoidIds = getAvoidPartnerIds(student);
 * // Returns: ['id1'] or []
 */
export const getAvoidPartnerIds = (student: Student): string[] => {
  if (
    Array.isArray(student.avoidPartnerIds) &&
    student.avoidPartnerIds.length > 0
  ) {
    return student.avoidPartnerIds;
  }
  if (student.avoidPartnerId) {
    return [student.avoidPartnerId];
  }
  return [];
};

/**
 * Checks if a student has any wish partners defined.
 *
 * @param student - The student to check
 * @returns True if the student has at least one wish partner
 */
export const hasWishPartners = (student: Student): boolean =>
  getWishPartnerIds(student).length > 0;

/**
 * Checks if a student has any avoid partners defined.
 *
 * @param student - The student to check
 * @returns True if the student has at least one avoid partner
 */
export const hasAvoidPartners = (student: Student): boolean =>
  getAvoidPartnerIds(student).length > 0;

/**
 * Checks if studentA wishes to sit with studentB.
 *
 * @param studentA - The student with the wish
 * @param studentB - The potential wish partner
 * @returns True if studentA has studentB in their wish list
 */
const wishesToSitWith = (studentA: Student, studentB: Student): boolean =>
  getWishPartnerIds(studentA).includes(studentB.id);

/**
 * Checks whether the two students form a wish pair — one wish in either
 * direction is enough, since the wish is honoured for the pair, not for the
 * student who happened to write it down.
 *
 * @param studentA - First student
 * @param studentB - Second student
 * @returns True if either student has the other in their wish list
 */
export const isWishPair = (studentA: Student, studentB: Student): boolean =>
  wishesToSitWith(studentA, studentB) || wishesToSitWith(studentB, studentA);

/**
 * Takes the given students out of everyone's wish and distance lists — the
 * list and the legacy single field alike. A student whose lists do not name
 * one of them keeps their object, and a class where nobody does comes back as
 * the same array.
 *
 * @param students - The class list
 * @param goneIds - The students who are no longer in the class
 * @returns The class list without links to them
 */
export const withoutPartners = (
  students: Student[],
  goneIds: ReadonlySet<string>,
): Student[] => {
  if (goneIds.size === 0) return students;
  let changed = false;
  const next = students.map((student) => {
    const wish = getWishPartnerIds(student);
    const avoid = getAvoidPartnerIds(student);
    const keptWish = wish.filter((id) => !goneIds.has(id));
    const keptAvoid = avoid.filter((id) => !goneIds.has(id));
    if (keptWish.length === wish.length && keptAvoid.length === avoid.length) {
      return student;
    }
    changed = true;
    return {
      ...student,
      ...(keptWish.length !== wish.length && {
        wishPartnerIds: keptWish,
        wishPartnerId: keptWish[0] ?? null,
      }),
      ...(keptAvoid.length !== avoid.length && {
        avoidPartnerIds: keptAvoid,
        avoidPartnerId: keptAvoid[0] ?? null,
      }),
    };
  });
  return changed ? next : students;
};

/**
 * Drops the wish and distance links to students no longer in the class —
 * left behind by a removal before removals took them along.
 *
 * @param students - The class list
 * @returns The class list with links only to its own students
 */
export const dropMissingPartners = (students: Student[]): Student[] => {
  const present = new Set(students.map((student) => student.id));
  const missing = new Set<string>();
  for (const student of students) {
    for (const id of [
      ...getWishPartnerIds(student),
      ...getAvoidPartnerIds(student),
    ]) {
      if (!present.has(id)) missing.add(id);
    }
  }
  return withoutPartners(students, missing);
};
