// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { KeyboardEvent, MutableRefObject } from 'react';
import { useInspector } from '@/contexts/InspectorContext';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import StudentRow from '@/components/students/StudentRow';
import StudentListHeader from '@/components/students/StudentListHeader';
import { listContainerClass } from '@/utils';
import type { Student } from '@/types';

type StudentListProps = {
  /** Students to render — already searched, filtered and sorted. */
  students: Student[];
  /**
   * The complete class. Partner dropdowns must offer every classmate, not just
   * the ones a search happens to be showing.
   */
  allStudents?: Student[];
  lastAddedId: string | null;
  listContainerRef: MutableRefObject<HTMLDivElement | null>;
  maxHeight: number | null;
  /** Multi-select for bulk edits; omitted hides the row checkboxes. */
  isSelected?: (studentId: string) => boolean;
  onToggleSelected?: (studentId: string) => void;
  /** Select-all for the sticky header, above the row checkboxes it controls. */
  allVisibleSelected?: boolean;
  someVisibleSelected?: boolean;
  onToggleAllVisible?: () => void;
  /** Students are ticked: pressing a row ticks it too (see `StudentRow`). */
  selectionActive?: boolean;
};

/**
 * The class list: one card of rows, the header with select-all on top.
 *
 * Every row is rendered. A class holds at most 36 students (`MAX_STUDENTS`),
 * which a list draws without help; the virtualizer that used to sit here only
 * switched on from 40 and so never ran.
 */
const StudentList = ({
  students,
  allStudents,
  lastAddedId,
  listContainerRef,
  maxHeight,
  isSelected,
  onToggleSelected,
  allVisibleSelected,
  someVisibleSelected,
  onToggleAllVisible,
  selectionActive = false,
}: StudentListProps) => {
  const classRoster = allStudents ?? students;
  const { selectStudent } = useInspector();
  const isPhone = useIsPhone();

  // ↑/↓ step from row to row, Pos1/Ende to the ends — from a row to the next
  // row, from a checkbox to the next checkbox, so ticking several stays
  // Space and an arrow. The student follows the focus into the inspector, as
  // a selection does in "Bibliothek"; the focus stays in the list, so the
  // next arrow steps again. Not while students are ticked (the inspector
  // shows the selection then) and not on a phone, whose student is a sheet
  // that takes the focus. Alt/⌥ with an arrow is the inspector's step
  // (`StudentInspectorPanel`), which from a row means the same.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    const isArrow = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    if (!isArrow && (event.altKey || !['Home', 'End'].includes(event.key))) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const part = target.dataset.rowPart;
    if (!part) return;

    const parts = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        `[data-row-part="${part}"]`,
      ),
    );
    const index = parts.indexOf(target);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? parts.length - 1
          : index + (event.key === 'ArrowDown' ? 1 : -1);
    event.preventDefault();
    event.stopPropagation();
    const next = parts[nextIndex];
    if (!next || next === target) return;

    next.focus({ preventScroll: true });
    next.closest('[data-student-row]')?.scrollIntoView?.({ block: 'nearest' });
    const studentId = next.dataset.studentId;
    if (part === 'open' && studentId && !selectionActive && !isPhone) {
      selectStudent(studentId, { keepFocus: true });
    }
  };

  if (students.length === 0) {
    return null;
  }

  // From `lg` up the list scrolls inside its card; below it flows in the page.
  // The card is a size container: whether a row's chips stand beside the
  // name or under it depends on how wide the list is, not the window — the
  // toolbar and the inspector take their share of a wide one.
  return (
    <div
      className={`${listContainerClass} @container relative mb-4 overflow-hidden`}
    >
      <div
        ref={listContainerRef}
        onKeyDown={handleKeyDown}
        className="grid content-start lg:overflow-y-auto"
        style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        <StudentListHeader
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          onToggleAllVisible={onToggleSelected ? onToggleAllVisible : undefined}
        />
        {students.map((student, index) => (
          <StudentRow
            key={student.id}
            student={student}
            index={index}
            highlight={student.id === lastAddedId}
            allStudents={classRoster}
            selected={isSelected?.(student.id)}
            onToggleSelected={onToggleSelected}
            selectionActive={selectionActive}
          />
        ))}
      </div>
    </div>
  );
};

export default StudentList;
