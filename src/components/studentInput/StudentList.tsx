// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/* eslint-disable react-hooks/incompatible-library -- TanStack Virtual is intentionally used for list virtualization */
import { useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { VirtualItem } from '@tanstack/react-virtual';
import StudentRow from '@/components/students/StudentRow';
import StudentListHeader from '@/components/students/StudentListHeader';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import type { Student } from '@/types';

const GRID_GAP_PX = 2;
const VIRTUALIZATION_THRESHOLD = 40; // Enable virtualization only for large lists (max 36 students currently)

type StudentListProps = {
  /** Students to render — already searched, filtered and sorted. */
  students: Student[];
  /**
   * The complete class. Partner dropdowns must offer every classmate, not just
   * the ones a search happens to be showing.
   */
  allStudents?: Student[];
  lastAddedId: string | null;
  expandedCardId: string | null;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  requestStudentRemoval: (studentId: string) => void;
  listContainerRef: MutableRefObject<HTMLDivElement | null>;
  maxHeight: number | null;
  onScrollCollapse?: () => void;
  /** Multi-select for bulk edits; omitted hides the row checkboxes. */
  isSelected?: (studentId: string) => boolean;
  onToggleSelected?: (studentId: string) => void;
};

const StudentList = ({
  students,
  allStudents,
  lastAddedId,
  expandedCardId,
  updateStudent,
  requestStudentRemoval,
  listContainerRef,
  maxHeight,
  onScrollCollapse,
  isSelected,
  onToggleSelected,
}: StudentListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const classRoster = allStudents ?? students;
  const isLgUp = useIsLgUp();
  // Virtualize only large lists, and only at `lg+` where rows are single-line
  // and roughly uniform in height. Below `lg` the list flows in the page scroll
  // as labelled-chip rows of variable height (no inner scroll, no virtualizer).
  const shouldVirtualize =
    students.length >= VIRTUALIZATION_THRESHOLD && isLgUp;

  // Rough seed only; the virtualizer measures real element heights below.
  const estimateSize = useCallback(() => (isLgUp ? 64 : 140), [isLgUp]);

  // The inner scroll height comes from the adaptive-viewport hook, which only
  // returns a value at `lg+` (null below `lg`, where the page scrolls instead).
  const listHeight = maxHeight ?? 600;

  // Initialize virtualizer with dynamic height measurement
  const virtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    measureElement: (element: Element) => {
      // Measure actual element height for accurate positioning
      return element.getBoundingClientRect().height;
    },
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Store virtualizer in ref to avoid dependency issues
  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;

  // Force virtualizer to re-measure when height-affecting dependencies change
  // This ensures immediate updates when switching view modes or resizing browser
  useEffect(() => {
    if (shouldVirtualize && virtualizerRef.current) {
      virtualizerRef.current.measure();
    }
  }, [isLgUp, expandedCardId, shouldVirtualize]);

  // Early return after all hooks
  if (students.length === 0) {
    return null;
  }

  // Non-virtualized rendering: small lists and all viewports below `lg`.
  if (!shouldVirtualize) {
    return (
      <div className="relative">
        <div
          ref={listContainerRef}
          className="mb-4 grid content-start gap-0.5 lg:overflow-y-auto"
          style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
          onScroll={onScrollCollapse}
        >
          <StudentListHeader showSelection={Boolean(onToggleSelected)} />
          {students.map((student, index) => (
            <StudentRow
              key={student.id}
              student={student}
              index={index}
              highlight={student.id === lastAddedId}
              updateStudent={updateStudent}
              removeStudent={requestStudentRemoval}
              allStudents={classRoster}
              scrollContainerRef={listContainerRef}
              selected={isSelected?.(student.id)}
              onToggleSelected={onToggleSelected}
            />
          ))}
        </div>
      </div>
    );
  }

  // Virtualized rendering: large lists at `lg+` (inner scroll container).
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative">
      <div
        ref={parentRef}
        className="overflow-y-auto mb-4"
        style={{
          height: `${listHeight}px`,
        }}
        onScroll={onScrollCollapse}
      >
        <StudentListHeader showSelection={Boolean(onToggleSelected)} />
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem: VirtualItem) => {
            const student = students[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size - GRID_GAP_PX}px`,
                  transform: `translateY(${virtualItem.start + virtualItem.index * GRID_GAP_PX}px)`,
                }}
              >
                <StudentRow
                  student={student}
                  index={virtualItem.index}
                  highlight={student.id === lastAddedId}
                  updateStudent={updateStudent}
                  removeStudent={requestStudentRemoval}
                  allStudents={classRoster}
                  scrollContainerRef={listContainerRef}
                  selected={isSelected?.(student.id)}
                  onToggleSelected={onToggleSelected}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentList;
