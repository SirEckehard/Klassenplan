import type { Student } from '@/types';
import { stableStringify } from './jsonUtils';

const normalizePartnerIds = (
  ids?: string[] | null,
  legacyId?: string | null,
): string[] => {
  if (ids && ids.length > 0) {
    return ids;
  }
  if (legacyId) {
    return [legacyId];
  }
  return [];
};

const buildSignaturePayload = (student: Student): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  Object.entries(student).forEach(([key, value]) => {
    payload[key] = value ?? null;
  });

  const normalizedWishPartners = normalizePartnerIds(
    student.wishPartnerIds,
    student.wishPartnerId ?? null,
  );
  const normalizedAvoidPartners = normalizePartnerIds(
    student.avoidPartnerIds,
    student.avoidPartnerId ?? null,
  );

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
