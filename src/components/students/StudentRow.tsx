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
  /**
   * Students are ticked. The inspector then shows the whole selection, so
   * pressing a row adds it to that selection or takes it out, instead of
   * opening one student nobody would see.
   */
  selectionActive?: boolean;
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
 * because a checkbox inside a button is not a checkbox. While a selection is
 * being built the row ticks instead, like a mail client's selection mode.
 */
function StudentRow({
  student,
  index,
  highlight,
  allStudents,
  selected,
  onToggleSelected,
  selectionActive = false,
}: Props) {
  const { t } = useTranslation('students');
  const { selection, selectStudent } = useInspector();
  const ticks = selectionActive && onToggleSelected !== undefined;
  const isInspected =
    !ticks && selection?.kind === 'student' && selection.id === student.id;

  // A student opened from elsewhere — the inspector's arrows, Alt/⌥+↑/↓ —
  // comes into view in the list, so the list still shows where one is.
  const rowRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isInspected) rowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isInspected]);

  const displayName = student.name || t('studentList.newStudent');
  const hasName = student.name.trim().length > 0;

  // Opened and ticked are two states, so they look different. The selection
  // fill belongs to the ticked rows alone, beside the checkbox that says so;
  // the row the inspector shows sits on paper and carries a blue bar at its
  // edge. Sharing the fill made an opened row with an empty checkbox read as
  // a tick that had failed to land.
  const stateClass = selected
    ? 'bg-(--surface-option-selected)'
    : isInspected || highlight
      ? 'bg-(--surface-sunken)'
      : '';

  return (
    // The scroll margins keep a row that scrolls into view clear of the
    // list's sticky head, and below `lg`, where the page scrolls, of the
    // shell's header and status bar.
    <div
      ref={rowRef}
      id={`student-${student.id}`}
      data-student-row
      data-tour={TOUR_ANCHORS.studentRow}
      className={`relative flex scroll-mt-24 scroll-mb-16 items-center gap-3 border-b border-(--border-card) px-3 last:border-b-0 lg:scroll-mt-8 lg:scroll-mb-0 ${stateClass}`}
    >
      {isInspected && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-(--border-option-selected)"
        />
      )}
      {onToggleSelected && (
        // The checkbox sits in a cell as tall as the row, so a fingertip that
        // lands a little beside it ticks instead of opening the student; on a
        // touch screen the cell starts at the row's edge and is 44px wide.
        <label className="flex shrink-0 cursor-pointer items-center self-stretch pointer-coarse:-ml-3 pointer-coarse:w-11 pointer-coarse:justify-center">
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={() => onToggleSelected(student.id)}
            data-row-part="tick"
            className="h-4 w-4 shrink-0 cursor-pointer accent-(--accent-option) pointer-coarse:h-5 pointer-coarse:w-5"
            aria-label={t('listToolbar.selectStudent', { name: displayName })}
          />
        </label>
      )}
      <button
        type="button"
        data-row-part="open"
        data-student-id={student.id}
        onClick={() =>
          ticks ? onToggleSelected(student.id) : selectStudent(student.id)
        }
        // Opening is not a toggle: pressing the one already showing must not
        // shut the inspector, which is what `aria-pressed` would promise.
        // Ticking is, and says so.
        aria-current={isInspected ? 'true' : undefined}
        aria-pressed={ticks ? Boolean(selected) : undefined}
        aria-label={
          ticks
            ? t('listToolbar.selectStudent', { name: displayName })
            : t('listStatus.openStudent', { name: displayName })
        }
        // The chips stand beside the name where the list is wide enough
        // (`@2xl`, the list card being the container) and under it where it
        // is not. At least 60px, not exactly: a row of fixed height spilled
        // chips that wrapped over the rows below.
        className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) @2xl:min-h-15 @2xl:flex-nowrap"
      >
        <span className="w-6 shrink-0 text-xs tabular-nums text-(--text-muted)">
          {index + 1}.
        </span>
        <StudentAvatar student={student} size={32} />
        <span
          className={`shrink-0 truncate text-[15px] @2xl:w-44 ${
            hasName ? 'text-(--text-page)' : 'text-(--text-muted) italic'
          }`}
        >
          {displayName}
        </span>
        <StudentChips
          student={student}
          allStudents={allStudents}
          className="min-w-0 flex-1 basis-full @2xl:basis-auto"
        />
      </button>
    </div>
  );
}

// Export with React.memo for performance optimization
export default React.memo(StudentRow);
