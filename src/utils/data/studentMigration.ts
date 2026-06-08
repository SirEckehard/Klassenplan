// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';

/**
 * Migrates a student object from legacy single-partner fields to array-based fields.
 * This is used when loading students from storage that may have old data format.
 *
 * - wishPartnerId → wishPartnerIds[0]
 * - avoidPartnerId → avoidPartnerIds[0]
 *
 * If the new array fields already exist, they take precedence.
 *
 * @param student - Student object potentially with legacy fields
 * @returns Student with migrated partner fields
 */
export function migrateStudentPartnerFields(student: Student): Student {
  const migrated = { ...student };

  // Migrate wishPartnerId to wishPartnerIds if needed
  if (!migrated.wishPartnerIds || migrated.wishPartnerIds.length === 0) {
    if (migrated.wishPartnerId) {
      migrated.wishPartnerIds = [migrated.wishPartnerId];
    } else {
      migrated.wishPartnerIds = [];
    }
  }

  // Migrate avoidPartnerId to avoidPartnerIds if needed
  if (!migrated.avoidPartnerIds || migrated.avoidPartnerIds.length === 0) {
    if (migrated.avoidPartnerId) {
      migrated.avoidPartnerIds = [migrated.avoidPartnerId];
    } else {
      migrated.avoidPartnerIds = [];
    }
  }

  return migrated;
}

/**
 * Migrates an array of students from legacy single-partner fields.
 *
 * @param students - Array of students potentially with legacy fields
 * @returns Array of students with migrated partner fields
 */
export function migrateStudentsPartnerFields(students: Student[]): Student[] {
  return students.map(migrateStudentPartnerFields);
}

/**
 * Gets all wish partner IDs for a student, handling both legacy and new fields.
 * Prioritizes new array field, falls back to legacy single field.
 *
 * @param student - Student object
 * @returns Array of wish partner IDs (may be empty)
 */
export function getWishPartnerIds(student: Student): string[] {
  if (student.wishPartnerIds && student.wishPartnerIds.length > 0) {
    return student.wishPartnerIds;
  }
  if (student.wishPartnerId) {
    return [student.wishPartnerId];
  }
  return [];
}

/**
 * Gets all avoid partner IDs for a student, handling both legacy and new fields.
 * Prioritizes new array field, falls back to legacy single field.
 *
 * @param student - Student object
 * @returns Array of avoid partner IDs (may be empty)
 */
export function getAvoidPartnerIds(student: Student): string[] {
  if (student.avoidPartnerIds && student.avoidPartnerIds.length > 0) {
    return student.avoidPartnerIds;
  }
  if (student.avoidPartnerId) {
    return [student.avoidPartnerId];
  }
  return [];
}
