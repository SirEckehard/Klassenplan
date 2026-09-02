// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * @internal
 * Adapter hook exposing the student Zustand store as a React-friendly interface.
 */
import { useMemo } from 'react';
import type { Student } from '@/types';
import type { StudentStoreSlice } from '@/stores/featureStores';
import { studentStore, useStudentStore } from '@/stores/studentsStore';

export interface StudentsState extends StudentStoreSlice {
  /**
   * Read the committed class list without waiting for a re-render.
   *
   * The undo history mutates and then checks whether anything changed inside
   * one event handler; the rendered array still shows the state from before
   * the write at that point.
   */
  getStudents: () => Student[];
}

const getStudents = (): Student[] => studentStore.getState().students;

export function useStudentsState(): StudentsState {
  const slice = useStudentStore((state) => state);
  return useMemo(() => ({ ...slice, getStudents }), [slice]);
}
