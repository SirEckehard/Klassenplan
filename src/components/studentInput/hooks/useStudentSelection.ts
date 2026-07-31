// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';

export interface StudentSelection {
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Select every currently visible student, or clear if all are selected. */
  toggleAllVisible: () => void;
  allVisibleSelected: boolean;
  clear: () => void;
}

/**
 * Multi-selection for bulk edits on the class list.
 *
 * Scoped to the *visible* students: selecting "all" while a filter is active
 * means "all shown", which is what makes the filter useful for bulk work
 * ("show everyone without a language level → select all → set it").
 * Ids that scroll out of the filter stay selected, but are pruned as soon as
 * they leave the class entirely, so a bulk edit can never hit a deleted
 * student.
 */
export function useStudentSelection(
  students: Student[],
  visibleStudents: Student[],
): StudentSelection {
  const [rawSelectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Ids of students that no longer exist (deleted, class switched) are dropped
  // on read rather than in an effect — no extra render, and a bulk edit can
  // never reach a student who is already gone.
  const selectedIds = React.useMemo(() => {
    const existing = new Set(students.map((student) => student.id));
    const pruned = [...rawSelectedIds].filter((id) => existing.has(id));
    return pruned.length === rawSelectedIds.size
      ? rawSelectedIds
      : new Set(pruned);
  }, [students, rawSelectedIds]);

  const toggle = React.useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) => selectedIds.has(student.id));

  const toggleAllVisible = React.useCallback(() => {
    setSelectedIds((previous) => {
      const everySelected =
        visibleStudents.length > 0 &&
        visibleStudents.every((student) => previous.has(student.id));
      const next = new Set(previous);
      for (const student of visibleStudents) {
        if (everySelected) {
          next.delete(student.id);
        } else {
          next.add(student.id);
        }
      }
      return next;
    });
  }, [visibleStudents]);

  const clear = React.useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected: (id: string) => selectedIds.has(id),
    toggle,
    toggleAllVisible,
    allVisibleSelected,
    clear,
  };
}
