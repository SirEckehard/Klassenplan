// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { MutableRefObject } from 'react';
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
