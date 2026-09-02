// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import deepEqual from 'fast-deep-equal';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { Student } from '@/types';
import type { NameColumnMode } from '@/utils/data/csvUtils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { generateId, MAX_STUDENTS, numberValidation } from '@/utils';
import type {
  StateUpdater,
  StudentStore,
  StudentStoreSlice,
  StudentStoreState,
} from './featureStores';
import { createFeatureStoreLogger } from './featureStores';
import { evaluateStateUpdater } from './storeUtils';
import { importStudentsFromCsv } from '@/services/csvImportService';
import { schedulePhotoDeletion } from '@/hooks/student/studentPhotoTrash';

/**
 * Apply a patch to a single student, keeping the two performance flags
 * mutually exclusive the way the row toggles present them.
 */
const applyStudentPatch = (student: Student, patch: Partial<Student>) => {
  const updated = { ...student, ...patch };
  if (patch.performanceStrong === true) {
    return {
      ...updated,
      performanceStrong: true,
      performanceWeak: false,
    } as Student;
  }
  if (patch.performanceWeak === true) {
    return {
      ...updated,
      performanceStrong: false,
      performanceWeak: true,
    } as Student;
  }
  if (patch.performanceStrong === false || patch.performanceWeak === false) {
    return {
      ...updated,
      performanceStrong: false,
      performanceWeak: false,
    } as Student;
  }

  return updated as Student;
};

export const createStudentsStore = (
  initialState?: Partial<StudentStoreState>,
): StudentStore => {
  const logger = createFeatureStoreLogger('studentsStore');
  const baseState: StudentStoreState = {
    students: initialState?.students ?? [],
    hasPendingStudentUpdates: initialState?.hasPendingStudentUpdates ?? false,
  };

  return createStore<StudentStoreSlice>()((set, get) => {
    const setStudentsInternal = (updater: StateUpdater<Student[]>) => {
      const current = get().students;
      const nextStudents = evaluateStateUpdater(current, updater);
      if (
        Object.is(nextStudents, current) ||
        deepEqual(nextStudents, current)
      ) {
        return;
      }
      set((state) => ({
        ...state,
        students: nextStudents,
        hasPendingStudentUpdates: true,
      }));
    };

    const acknowledge = () => {
      if (get().hasPendingStudentUpdates) {
        set({ hasPendingStudentUpdates: false });
        logger.debug('Pending student updates acknowledged');
      }
    };

    return {
      ...baseState,
      setStudents: (next) => {
        setStudentsInternal(next);
        logger.debug('Students updated via setStudents');
      },
      addStudent: (
        name,
        gender,
        restless = false,
        shy = false,
        concentrationIssues = false,
        needsFrontSeat = false,
      ) => {
        const student: Student = {
          id: generateId(),
          name: name.trim(),
          gender: gender ?? undefined,
          restless,
          shy,
          concentrationIssues,
          needsFrontSeat,
          wishPartnerId: null,
          avoidPartnerId: null,
          prefersWindow: false,
          prefersDoor: false,
        };
        setStudentsInternal((prev) => [...prev, student]);
        logger.debug('Student added', { studentId: student.id });
        return student;
      },
      addBulkPlaceholderStudents: (count: number) => {
        if (count <= 0) {
          return [];
        }

        const currentCount = get().students.length;
        const requestedCount = currentCount + count;
        const availableSlots = Math.max(0, MAX_STUDENTS - currentCount);
        const placeholderCount = Math.min(count, availableSlots);

        const countValidation = numberValidation.validateStudentCount(
          requestedCount,
          MAX_STUDENTS,
        );
        if (!countValidation.isValid) {
          showToast('error', TOAST_MESSAGES.STUDENT_MAX_REACHED);
        }

        if (placeholderCount === 0) {
          return [];
        }

        const placeholders: Student[] = Array.from(
          { length: placeholderCount },
          () => ({
            id: generateId(),
            name: '',
            gender: undefined,
            restless: false,
            shy: false,
            concentrationIssues: false,
            needsFrontSeat: false,
            wishPartnerId: null,
            avoidPartnerId: null,
            performanceStrong: false,
            performanceWeak: false,
            prefersWindow: false,
            prefersDoor: false,
          }),
        );

        setStudentsInternal((prev) => [...prev, ...placeholders]);
        logger.debug('Placeholder students added', {
          count: placeholders.length,
        });
        return placeholders;
      },
      removeStudent: (id: string) => {
        const target = get().students.find((student) => student.id === id);
        setStudentsInternal((prev) =>
          prev.filter((student) => student.id !== id),
        );
        // The removal is undoable, so the blob only goes once no undo step can
        // bring the student back (see studentPhotoTrash).
        if (target?.hasPhoto) {
          schedulePhotoDeletion(id);
        }
        logger.debug('Student removed', { studentId: id });
      },
      removeStudents: (ids: string[]) => {
        if (ids.length === 0) {
          return;
        }

        const doomed = new Set(ids);
        const withPhotos = get().students.filter(
          (student) => doomed.has(student.id) && student.hasPhoto,
        );
        setStudentsInternal((prev) =>
          prev.filter((student) => !doomed.has(student.id)),
        );
        for (const student of withPhotos) {
          schedulePhotoDeletion(student.id);
        }
        logger.debug('Students removed', { count: ids.length });
      },
      clearStudents: () => {
        const withPhotos = get().students.filter((student) => student.hasPhoto);
        setStudentsInternal(() => []);
        for (const student of withPhotos) {
          schedulePhotoDeletion(student.id);
        }
        logger.debug('All students cleared');
      },
      updateStudent: (id: string, patch: Partial<Student>) => {
        setStudentsInternal((prev) =>
          prev.map((student) =>
            student.id === id ? applyStudentPatch(student, patch) : student,
          ),
        );
        logger.debug('Student updated', { studentId: id });
      },
      updateStudents: (ids: string[], patch: Partial<Student>) => {
        if (ids.length === 0) {
          return;
        }

        const targets = new Set(ids);
        setStudentsInternal((prev) =>
          prev.map((student) =>
            targets.has(student.id)
              ? applyStudentPatch(student, patch)
              : student,
          ),
        );
        logger.debug('Students updated', { count: ids.length });
      },
      importCsv: async (file: File, mode?: NameColumnMode) => {
        const currentCount = get().students.length;
        const acceptedRows = await importStudentsFromCsv({
          file,
          mode,
          currentStudentCount: currentCount,
        });

        if (acceptedRows.length > 0) {
          setStudentsInternal((prev) => [...prev, ...acceptedRows]);
          logger.debug('Students imported via CSV', {
            count: acceptedRows.length,
          });
        }

        return acceptedRows;
      },
      acknowledgeStudentUpdates: acknowledge,
    };
  });
};

export const studentStore = createStudentsStore();

export function useStudentStore<T>(selector: (store: StudentStoreSlice) => T) {
  return useStore(studentStore, selector);
}

export function resetStudentStore(state?: Partial<StudentStoreState>) {
  studentStore.setState({
    ...studentStore.getState(),
    students: state?.students ?? [],
    hasPendingStudentUpdates: state?.hasPendingStudentUpdates ?? false,
  });
}
