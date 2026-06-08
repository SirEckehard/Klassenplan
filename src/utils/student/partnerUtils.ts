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
  if (student.wishPartnerIds && student.wishPartnerIds.length > 0) {
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
  if (student.avoidPartnerIds && student.avoidPartnerIds.length > 0) {
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
export const wishesToSitWith = (
  studentA: Student,
  studentB: Student,
): boolean => getWishPartnerIds(studentA).includes(studentB.id);

/**
 * Checks if studentA wants to avoid studentB.
 *
 * @param studentA - The student with the avoidance preference
 * @param studentB - The student to potentially avoid
 * @returns True if studentA has studentB in their avoid list
 */
export const wantsToAvoid = (studentA: Student, studentB: Student): boolean =>
  getAvoidPartnerIds(studentA).includes(studentB.id);

/**
 * Checks if both students mutually wish to sit together.
 *
 * @param studentA - First student
 * @param studentB - Second student
 * @returns True if both students have each other in their wish lists
 */
export const isMutualWish = (studentA: Student, studentB: Student): boolean =>
  wishesToSitWith(studentA, studentB) && wishesToSitWith(studentB, studentA);

/**
 * Checks for a conflict where studentA wishes studentB but studentB avoids studentA.
 *
 * @param studentA - The student with the wish
 * @param studentB - The student who may avoid
 * @returns True if there's a wish-avoid conflict
 */
export const hasWishAvoidConflict = (
  studentA: Student,
  studentB: Student,
): boolean =>
  wishesToSitWith(studentA, studentB) && wantsToAvoid(studentB, studentA);
