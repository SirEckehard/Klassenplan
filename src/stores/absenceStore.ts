// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Who is missing today (decision 0045): marked with a tap in the projection,
 * read by the random draw and the groups. Kept in memory for the day alone —
 * never stored, never in a backup; a reload or the next day starts with
 * everybody there.
 */
import React from 'react';
import { toIsoDate } from '@/utils';

type AbsenceState = {
  day: string;
  byClass: Readonly<Record<string, readonly string[]>>;
};

const NOBODY: readonly string[] = [];

let state: AbsenceState = { day: toIsoDate(), byClass: {} };
const listeners = new Set<() => void>();

/** Today's state; a new day forgets yesterday's. */
const today = (): AbsenceState => {
  const day = toIsoDate();
  if (state.day !== day) state = { day, byClass: {} };
  return state;
};

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The ids of the class's students marked as missing today. */
export const absentIdsOf = (classId: string | null): readonly string[] =>
  (classId && today().byClass[classId]) || NOBODY;

/** Marks a student as missing today, or as there again. */
export function toggleAbsent(classId: string, studentId: string): void {
  const current = absentIdsOf(classId);
  const next = current.includes(studentId)
    ? current.filter((id) => id !== studentId)
    : [...current, studentId];
  state = { ...today(), byClass: { ...today().byClass, [classId]: next } };
  emit();
}

/** "Alle da": nobody of the class is missing any more. */
export function clearAbsent(classId: string): void {
  if (absentIdsOf(classId).length === 0) return;
  const byClass = { ...today().byClass };
  delete byClass[classId];
  state = { ...today(), byClass };
  emit();
}

/** Who of the class is missing today, as a set that changes with a mark. */
export function useAbsentIds(classId: string | null): ReadonlySet<string> {
  const ids = React.useSyncExternalStore(
    subscribe,
    () => absentIdsOf(classId),
    () => NOBODY,
  );
  return React.useMemo(() => new Set(ids), [ids]);
}

/** Forgets every mark; for tests, which share the module. */
export function resetAbsences(): void {
  state = { day: toIsoDate(), byClass: {} };
  emit();
}
