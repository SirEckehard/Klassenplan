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
