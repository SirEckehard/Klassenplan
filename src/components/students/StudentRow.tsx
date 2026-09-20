// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { useInspector } from '@/contexts/InspectorContext';
import StudentAvatar from './StudentAvatar';
import StudentChips from './StudentChips';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

type Props = {
  student: Student;
  index: number;
  highlight: boolean;
  allStudents: Student[];
  /**
   * Multi-select for bulk edits. Omitted while the class is too small for the
   * list toolbar to appear, in which case no checkbox is rendered at all.
   */
  selected?: boolean;
  onToggleSelected?: (studentId: string) => void;
};

/**
 * One student, at a glance: photo, name, and the attributes that are actually
 * set.
 *
 * The row used to carry sixteen icon columns per student, then two buttons at
 * its end — inspect and delete — beside an avatar and a name that were both
 * controls of their own. For a class of twenty-four that is a hundred small
 * targets in a list whose only job is to answer "who is in this class and what
 * do I know about them". The row is now one button: pressing it opens the
 * student in the inspector, which is where a name, a photo and an attribute
 * are changed, and where removing one lives. The checkbox stays beside it,
 * because a checkbox inside a button is not a checkbox.
 */
function StudentRow({
  student,
  index,
  highlight,
  allStudents,
  selected,
  onToggleSelected,
}: Props) {
  const { t } = useTranslation('students');
  const { selection, selectStudent } = useInspector();
  const isInspected =
    selection?.kind === 'student' && selection.id === student.id;

  const displayName = student.name || t('studentList.newStudent');
  const hasName = student.name.trim().length > 0;

  const stateClass = isInspected
    ? 'bg-(--surface-option-selected)'
    : highlight
      ? 'bg-(--surface-sunken)'
      : selected
        ? 'bg-(--surface-option-selected)'
        : '';

  return (
    <div
      id={`student-${student.id}`}
      data-tour={TOUR_ANCHORS.studentRow}
      className={`flex items-center gap-3 border-b border-(--border-card) px-3 last:border-b-0 ${stateClass}`}
    >
      {onToggleSelected && (
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={() => onToggleSelected(student.id)}
          className="h-4 w-4 shrink-0 cursor-pointer accent-(--accent-option)"
          aria-label={t('listToolbar.selectStudent', { name: displayName })}
        />
      )}
      <button
        type="button"
        onClick={() => selectStudent(student.id)}
        // The row is not a toggle: pressing the one already showing must not
        // shut the inspector, which is what `aria-pressed` would promise.
        aria-current={isInspected ? 'true' : undefined}
        aria-label={t('listStatus.openStudent', { name: displayName })}
        className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) lg:h-15 lg:flex-nowrap lg:py-0"
      >
        <span className="w-6 shrink-0 text-xs tabular-nums text-(--text-muted)">
          {index + 1}.
        </span>
        <StudentAvatar student={student} size={32} />
        <span
          className={`shrink-0 truncate text-[15px] lg:w-44 ${
            hasName ? 'text-(--text-page)' : 'text-(--text-muted) italic'
          }`}
        >
          {displayName}
        </span>
        <StudentChips
          student={student}
          allStudents={allStudents}
          className="min-w-0 flex-1 basis-full lg:basis-auto"
        />
      </button>
    </div>
  );
}

// Export with React.memo for performance optimization
export default React.memo(StudentRow);
