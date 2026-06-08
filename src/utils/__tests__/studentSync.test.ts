import { describe, expect, it } from 'vitest';
import {
  createStudentSignature,
  createStudentSyncMap,
  syncStudentReference,
} from '@/utils';
import type { Student } from '@/types';

const createStudent = (overrides?: Partial<Student>): Student => ({
  id: 'student-1',
  name: 'Anna',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
  performanceStrong: false,
  performanceWeak: false,
  ...overrides,
});

describe('studentSync utilities', () => {
  it('normalizes legacy partner fields when creating signatures', () => {
    const wishArray = createStudent({
      id: 'student-legacy',
      wishPartnerIds: ['a'],
    });
    const wishLegacy = createStudent({
      id: 'student-legacy',
      wishPartnerId: 'a',
      wishPartnerIds: undefined,
    });
    const avoidArray = createStudent({
      id: 'student-legacy',
      avoidPartnerIds: ['c'],
    });
    const avoidLegacy = createStudent({
      id: 'student-legacy',
      avoidPartnerId: 'c',
    });

    expect(createStudentSignature(wishArray)).toBe(
      createStudentSignature(wishLegacy),
    );
    expect(createStudentSignature(avoidArray)).toBe(
      createStudentSignature(avoidLegacy),
    );
  });

  it('updates student references only when data changed', () => {
    const updatedStudent = createStudent({
      id: 'student-sync',
      shy: true,
      performanceStrong: true,
    });
    const syncMap = createStudentSyncMap([updatedStudent]);

    const matchingSnapshot = createStudent({
      id: 'student-sync',
      shy: true,
      performanceStrong: true,
    });
    const staleSnapshot = createStudent({
      id: 'student-sync',
      shy: false,
    });

    const unchanged = syncStudentReference(matchingSnapshot, syncMap);
    expect(unchanged.hasChanged).toBe(false);
    expect(unchanged.nextStudent).toBe(matchingSnapshot);

    const synced = syncStudentReference(staleSnapshot, syncMap);
    expect(synced.hasChanged).toBe(true);
    expect(synced.nextStudent).toBe(updatedStudent);
  });

  it('respects missing-student handling options', () => {
    const syncMap = createStudentSyncMap([]);
    const removedStudent = createStudent({ id: 'removed' });

    const defaultRemoval = syncStudentReference(removedStudent, syncMap);
    expect(defaultRemoval.hasChanged).toBe(true);
    expect(defaultRemoval.nextStudent).toBeNull();

    const preserved = syncStudentReference(removedStudent, syncMap, {
      removeOnMissing: false,
    });
    expect(preserved.hasChanged).toBe(false);
    expect(preserved.nextStudent).toBe(removedStudent);
  });
});
