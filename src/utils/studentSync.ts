// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { SeatingArrangement, Student } from '@/types';
import { stableStringify } from './jsonUtils';
import { getWishPartnerIds, getAvoidPartnerIds } from './student/partnerUtils';

const buildSignaturePayload = (student: Student): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  Object.entries(student).forEach(([key, value]) => {
    payload[key] = value ?? null;
  });

  const normalizedWishPartners = getWishPartnerIds(student);
  const normalizedAvoidPartners = getAvoidPartnerIds(student);

  if (normalizedWishPartners.length > 0) {
    payload.wishPartnerIds = normalizedWishPartners;
  } else {
    delete payload.wishPartnerIds;
  }

  if (normalizedAvoidPartners.length > 0) {
    payload.avoidPartnerIds = normalizedAvoidPartners;
  } else {
    delete payload.avoidPartnerIds;
  }

  delete payload.wishPartnerId;
  delete payload.avoidPartnerId;

  return payload;
};

export const createStudentSignature = (student: Student | null): string => {
  if (!student) {
    return '';
  }
  return stableStringify(buildSignaturePayload(student));
};

export type StudentSyncEntry = {
  student: Student;
  signature: string;
};

export type StudentSyncMap = Map<string, StudentSyncEntry>;

export const createStudentSyncMap = (students: Student[]): StudentSyncMap => {
  return new Map(
    students.map((student) => [
      student.id,
      {
        student,
        signature: createStudentSignature(student),
      },
    ]),
  );
};

export type StudentSyncOptions = {
  removeOnMissing?: boolean;
};

export type StudentSyncResult = {
  nextStudent: Student | null;
  hasChanged: boolean;
};

export const syncStudentReference = (
  currentStudent: Student | null,
  syncMap: StudentSyncMap,
  options: StudentSyncOptions = {},
): StudentSyncResult => {
  if (!currentStudent) {
    return { nextStudent: null, hasChanged: false };
  }

  const { removeOnMissing = true } = options;
  const entry = syncMap.get(currentStudent.id);

  if (!entry) {
    if (!removeOnMissing) {
      return { nextStudent: currentStudent, hasChanged: false };
    }
    return { nextStudent: null, hasChanged: true };
  }

  const currentSignature = createStudentSignature(currentStudent);

  if (currentSignature === entry.signature) {
    return { nextStudent: currentStudent, hasChanged: false };
  }

  return {
    nextStudent: entry.student,
    hasChanged: true,
  };
};

/**
 * The seating with every seat brought up to date with `students`: a student
 * whose details changed sits there as they are now, one who left the class
 * leaves the seat empty. Tables and the arrangement itself come back as they
 * were wherever nothing changed, so a caller can tell by reference.
 */
export const syncSeatingWithStudents = (
  seating: SeatingArrangement,
  students: Student[],
): SeatingArrangement => {
  if (seating.length === 0) {
    return seating;
  }

  const syncMap = createStudentSyncMap(students);
  let hasChanges = false;

  const next = seating.map((table) => {
    if (!table || table.length === 0) {
      return table;
    }

    let tableChanged = false;
    const updatedSeats = table.map((seat) => {
      if (!seat) {
        return seat;
      }

      const { nextStudent, hasChanged } = syncStudentReference(seat, syncMap);

      if (!hasChanged) {
        return seat;
      }

      hasChanges = true;
      tableChanged = true;
      return nextStudent;
    });

    return tableChanged ? updatedSeats : table;
  });

  return hasChanges ? next : seating;
};
