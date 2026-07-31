// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';

/** Sort orders offered above the list. `manual` keeps the insertion order. */
export type StudentSortMode = 'manual' | 'name-asc' | 'name-desc';

/**
 * Attribute filters. Each maps to one predicate; `all` disables filtering.
 * Kept to a single-select so the toolbar stays one row on a laptop screen.
 */
export type StudentFilterMode =
  | 'all'
  | 'restless'
  | 'shy'
  | 'concentrationIssues'
  | 'needsFrontSeat'
  | 'performanceStrong'
  | 'performanceWeak'
  | 'missingName'
  | 'withoutPhoto';

export const STUDENT_FILTER_MODES: StudentFilterMode[] = [
  'all',
  'restless',
  'shy',
  'concentrationIssues',
  'needsFrontSeat',
  'performanceStrong',
  'performanceWeak',
  'missingName',
  'withoutPhoto',
];

const FILTER_PREDICATES: Record<
  Exclude<StudentFilterMode, 'all'>,
  (student: Student) => boolean
> = {
  restless: (student) => Boolean(student.restless),
  shy: (student) => Boolean(student.shy),
  concentrationIssues: (student) => Boolean(student.concentrationIssues),
  needsFrontSeat: (student) => Boolean(student.needsFrontSeat),
  performanceStrong: (student) => Boolean(student.performanceStrong),
  performanceWeak: (student) => Boolean(student.performanceWeak),
  missingName: (student) => student.name.trim().length === 0,
  withoutPhoto: (student) => !student.hasPhoto,
};

/**
 * Fold accents and case so "Jose" finds "José" — teachers type without
 * diacritics far more often than they type them.
 */
const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export interface StudentListView {
  query: string;
  setQuery: (value: string) => void;
  sortMode: StudentSortMode;
  setSortMode: (mode: StudentSortMode) => void;
  filterMode: StudentFilterMode;
  setFilterMode: (mode: StudentFilterMode) => void;
  /** Students after search, filter and sort — what the list renders. */
  visibleStudents: Student[];
  /** True while search or filter hides part of the class. */
  isNarrowed: boolean;
  clear: () => void;
}

/**
 * Search, filter and sort state for the class list.
 *
 * Derives the visible list instead of reordering the stored class: sorting is
 * a way of looking at the list, not an edit, and the seating algorithm depends
 * on the stored order staying put.
 */
export function useStudentListView(students: Student[]): StudentListView {
  const [query, setQuery] = React.useState('');
  const [sortMode, setSortMode] = React.useState<StudentSortMode>('manual');
  const [filterMode, setFilterMode] = React.useState<StudentFilterMode>('all');

  const visibleStudents = React.useMemo(() => {
    const needle = normalize(query.trim());
    let result = students;

    if (needle) {
      result = result.filter((student) =>
        normalize(student.name).includes(needle),
      );
    }

    if (filterMode !== 'all') {
      result = result.filter(FILTER_PREDICATES[filterMode]);
    }

    if (sortMode !== 'manual') {
      const direction = sortMode === 'name-asc' ? 1 : -1;
      result = [...result].sort(
        (a, b) =>
          direction *
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
    }

    return result;
  }, [students, query, filterMode, sortMode]);

  const clear = React.useCallback(() => {
    setQuery('');
    setFilterMode('all');
  }, []);

  return {
    query,
    setQuery,
    sortMode,
    setSortMode,
    filterMode,
    setFilterMode,
    visibleStudents,
    isNarrowed: visibleStudents.length !== students.length,
    clear,
  };
}
