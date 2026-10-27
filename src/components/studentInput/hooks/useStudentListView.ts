// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import usePersistentState from '@/hooks/usePersistentState';
import { compareByLastName, foldForSearch, LOCAL_STORAGE_KEYS } from '@/utils';

/**
 * Sort orders offered above the list. `manual` keeps the insertion order,
 * `name-*` reads the whole name (so the first name leads), `lastName-*` the
 * last name (`compareByLastName`).
 */
export type StudentSortMode =
  'manual' | 'name-asc' | 'name-desc' | 'lastName-asc' | 'lastName-desc';

export const STUDENT_SORT_MODES: StudentSortMode[] = [
  'manual',
  'name-asc',
  'name-desc',
  'lastName-asc',
  'lastName-desc',
];

/** The i18n key that names each sort, in the row's field and the phone's menu. */
export const STUDENT_SORT_LABEL_KEYS: Record<StudentSortMode, string> = {
  manual: 'listToolbar.sort.manual',
  'name-asc': 'listToolbar.sort.nameAsc',
  'name-desc': 'listToolbar.sort.nameDesc',
  'lastName-asc': 'listToolbar.sort.lastNameAsc',
  'lastName-desc': 'listToolbar.sort.lastNameDesc',
};

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

/** A run of characters that is not part of a word — space, hyphen, bracket. */
const WORD_SEPARATOR = /[^\p{L}\p{N}]+/u;

/** Lower case, accents gone, spaces collapsed: what search compares. */
function foldName(value: string): string {
  return foldForSearch(value).replace(/\s+/g, ' ').trim();
}

/** Whether `needle` occurs in `haystack` where a word begins. */
function startsAtWord(haystack: string, needle: string): boolean {
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (index === 0 || WORD_SEPARATOR.test(haystack[index - 1])) return true;
    index = haystack.indexOf(needle, index + 1);
  }
  return false;
}

/**
 * The student a search clearly means, or null while it could mean several.
 *
 * Clear is: the only one found; else the only one whose whole name is the
 * search; else the only one with a word that is the search ("Max" among
 * "Max Müller" and "Maximilian Schulz"); else, from two letters on, the only
 * one with a word that starts with it ("an" for "Anna" beside "Jan" and
 * "Hannah"). `candidates` are the students the search and the filter left.
 */
function findSearchMatch(candidates: Student[], query: string): Student | null {
  const needle = foldName(query);
  if (!needle || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const only = (test: (name: string) => boolean): Student | null => {
    const hits = candidates.filter((student) => test(foldName(student.name)));
    return hits.length === 1 ? hits[0] : null;
  };
  return (
    only((name) => name === needle) ??
    only((name) => name.split(WORD_SEPARATOR).includes(needle)) ??
    (needle.length >= 2 ? only((name) => startsAtWord(name, needle)) : null)
  );
}

/** The students a search and a filter leave, in the class order. */
function narrowStudents(
  students: Student[],
  query: string,
  filterMode: StudentFilterMode,
): Student[] {
  const needle = foldName(query);
  let result = students;

  if (needle) {
    result = result.filter((student) =>
      foldName(student.name).includes(needle),
    );
  }

  if (filterMode !== 'all') {
    result = result.filter(FILTER_PREDICATES[filterMode]);
  }

  return result;
}

export interface StudentListViewOptions {
  /**
   * Called as the teacher types when the search clearly means one student
   * (`findSearchMatch`) — only then, so a student renamed in the inspector
   * while a search stands never moves the inspector on.
   */
  onSearchMatch?: (student: Student) => void;
}

export interface StudentListView {
  query: string;
  setQuery: (value: string) => void;
  /** The student the search clearly means, if it means one. */
  searchMatch: Student | null;
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
 *
 * The sort order is persisted, so stepping to step 2 and back keeps it. Search
 * and filter stay component state on purpose: they hide students, and a hidden
 * class on return would read as data loss.
 */
export function useStudentListView(
  students: Student[],
  { onSearchMatch }: StudentListViewOptions = {},
): StudentListView {
  const [query, setQueryState] = React.useState('');
  const [storedSortMode, setSortMode] = usePersistentState<StudentSortMode>(
    LOCAL_STORAGE_KEYS.studentSortMode,
    'manual',
  );
  // A hand-edited or outdated entry must not leave the select without a match.
  const sortMode = STUDENT_SORT_MODES.includes(storedSortMode)
    ? storedSortMode
    : 'manual';
  const [filterMode, setFilterMode] = React.useState<StudentFilterMode>('all');

  const narrowedStudents = React.useMemo(
    () => narrowStudents(students, query, filterMode),
    [students, query, filterMode],
  );

  const searchMatch = React.useMemo(
    () => findSearchMatch(narrowedStudents, query),
    [narrowedStudents, query],
  );

  const setQuery = React.useCallback(
    (value: string) => {
      setQueryState(value);
      if (!onSearchMatch) return;
      const match = findSearchMatch(
        narrowStudents(students, value, filterMode),
        value,
      );
      if (match) onSearchMatch(match);
    },
    [filterMode, onSearchMatch, students],
  );

  const visibleStudents = React.useMemo(() => {
    let result = narrowedStudents;

    if (sortMode !== 'manual') {
      const direction = sortMode.endsWith('-asc') ? 1 : -1;
      const compare = sortMode.startsWith('lastName')
        ? (a: Student, b: Student) => compareByLastName(a.name, b.name)
        : (a: Student, b: Student) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      result = [...result].sort((a, b) => direction * compare(a, b));
    }

    return result;
  }, [narrowedStudents, sortMode]);

  const clear = React.useCallback(() => {
    setQueryState('');
    setFilterMode('all');
  }, []);

  return {
    query,
    setQuery,
    searchMatch,
    sortMode,
    setSortMode,
    filterMode,
    setFilterMode,
    visibleStudents,
    isNarrowed: visibleStudents.length !== students.length,
    clear,
  };
}
