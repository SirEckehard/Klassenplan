// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { type KeyboardEvent } from 'react';
import { useInspector } from '@/contexts/InspectorContext';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import { useStudentCard } from '@/hooks/student/useStudentCard';
import type { StudentCardSettings } from '@/hooks/student/useStudentCardSettings';
import StudentRow from '@/components/students/StudentRow';
import StudentListHeader from '@/components/students/StudentListHeader';
import StudentCardLayer from '@/components/students/StudentCardLayer';
import StudentListNarrowedCount from '@/components/studentInput/StudentListNarrowedCount';
import {
  brushMarker,
  hasBrushMarker,
  type BrushKey,
} from '@/components/students/markerBrush';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
  listContainerClass,
  quietFocusRing,
} from '@/utils';
import type { MixSettings, Student } from '@/types';

/** How long a partner brought into view stays lit. */
const SHOWN_PARTNER_MS = 1600;

type StudentListProps = {
  /** Students to render — already searched, filtered and sorted. */
  students: Student[];
  /**
   * The complete class. Partner dropdowns must offer every classmate, not just
   * the ones a search happens to be showing.
   */
  allStudents?: Student[];
  lastAddedId: string | null;
  /** Multi-select for bulk edits; omitted hides the row checkboxes. */
  isSelected?: (studentId: string) => boolean;
  onToggleSelected?: (studentId: string) => void;
  /** Select-all for the sticky header, above the row checkboxes it controls. */
  allVisibleSelected?: boolean;
  someVisibleSelected?: boolean;
  onToggleAllVisible?: () => void;
  /** Students are ticked: pressing a row ticks it too (see `StudentRow`). */
  selectionActive?: boolean;
  /**
   * What a search or a filter left of the class, and the way to let both go;
   * the head says it on a phone (`StudentListHeader`). Omitted while the list
   * shows everybody.
   */
  narrowing?: { totalCount: number; onClear: () => void };
  /** The mix's weights: a badge that counts for nothing is drawn dashed. */
  mixSettings?: MixSettings;
  /** Which cards open over a badge or a name; omitted, both do. */
  cards?: StudentCardSettings;
  /** The brush in the list's head; omitted, the head offers none. */
  brush?: {
    active: BrushKey | null;
    onChoose: (key: BrushKey) => void;
    onEnd: () => void;
    onStroke: (studentId: string, key: BrushKey) => void;
  };
};

/**
 * The class list: one card of rows, the header with select-all on top.
 *
 * Every row is rendered. A class holds at most 36 students (`MAX_STUDENTS`),
 * which a list draws without a virtualizer.
 */
const StudentList = ({
  students,
  allStudents,
  lastAddedId,
  isSelected,
  onToggleSelected,
  allVisibleSelected,
  someVisibleSelected,
  onToggleAllVisible,
  selectionActive = false,
  narrowing,
  mixSettings,
  cards,
  brush,
}: StudentListProps) => {
  const classRoster = allStudents ?? students;
  const { selectStudent } = useInspector();
  const isPhone = useIsPhone();
  // Where the list is narrow — a phone, a tablet upright — a row shows the
  // seats' icons and unfolds them in words in place (decision 0051).
  const isLgUp = useIsLgUp();
  const brushKey = brush?.active ?? null;

  // In state, not a ref: the list is drawn only once the class has a
  // student, and the cards have to find it then (`useStudentCard`).
  const [listElement, setListElement] = React.useState<HTMLDivElement | null>(
    null,
  );
  const { card } = useStudentCard(listElement, {
    enabled: brushKey === null,
    kinds: cards,
  });

  const [expandedIds, setExpandedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleExpanded = React.useCallback((studentId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }, []);

  // A partner named in an unfolded row comes into view and lights up a
  // moment, so the eye finds it.
  const [shownPartnerId, setShownPartnerId] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    if (!shownPartnerId) return undefined;
    const timer = window.setTimeout(
      () => setShownPartnerId(null),
      SHOWN_PARTNER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [shownPartnerId]);
  const showStudent = React.useCallback((studentId: string) => {
    document
      .getElementById(`student-${studentId}`)
      ?.scrollIntoView?.({ block: 'nearest' });
    setShownPartnerId(studentId);
  }, []);

  // A partner badge pointed at lights the rows of the classmates it names,
  // as a badge on a seat lights the seats.
  const litIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (shownPartnerId) ids.add(shownPartnerId);
    if (card?.kind !== 'badge') return ids;
    const owner = classRoster.find((student) => student.id === card.studentId);
    if (!owner) return ids;
    if (card.badgeKey === 'wishPartner') {
      getWishPartnerIds(owner).forEach((id) => ids.add(id));
    } else if (card.badgeKey === 'avoidPartner') {
      getAvoidPartnerIds(owner).forEach((id) => ids.add(id));
    }
    return ids;
  }, [card, classRoster, shownPartnerId]);

  const brushCount = brushKey
    ? students.filter((student) => hasBrushMarker(student, brushKey)).length
    : 0;
  const rowBrush = React.useMemo(
    () =>
      brushKey && brush
        ? {
            marker: brushMarker(brushKey),
            onStroke: (studentId: string) =>
              brush.onStroke(studentId, brushKey),
          }
        : undefined,
    [brush, brushKey],
  );

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

    const studentId = next.dataset.studentId;
    const opens =
      part === 'open' &&
      studentId &&
      !selectionActive &&
      !isPhone &&
      brushKey === null;
    // A row the arrows open carries the opened row's blue bar, which already
    // says where the focus is; the ring would say it twice. It comes back
    // when the focus arrives another way — by Tab, or by an arrow that only
    // moves it.
    if (opens) quietFocusRing(next);
    next.focus({ preventScroll: true });
    next.closest('[data-student-row]')?.scrollIntoView?.({ block: 'nearest' });
    if (opens) selectStudent(studentId, { keepFocus: true });
  };

  if (students.length === 0) {
    return null;
  }

  // From `lg` up the list scrolls inside its card; below it flows in the page.
  // There the stage is a column the card shrinks into (`StudentInput`), so
  // its height follows the stage by CSS and the stage itself never scrolls.
  // The card is a size container: whether a row's chips stand beside the
  // name or under it depends on how wide the list is, not the window — the
  // toolbar and the inspector take their share of a wide one.
  return (
    <div
      data-student-list
      className={`${listContainerClass} @container relative mb-4 overflow-hidden lg:mb-0 lg:flex lg:min-h-0 lg:flex-col`}
    >
      <div
        ref={setListElement}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-1 content-start lg:min-h-0 lg:overflow-y-auto"
      >
        <StudentListHeader
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          onToggleAllVisible={onToggleSelected ? onToggleAllVisible : undefined}
          brush={
            brush
              ? {
                  active: brushKey,
                  count: brushCount,
                  onChoose: brush.onChoose,
                  onEnd: brush.onEnd,
                }
              : undefined
          }
          narrowing={
            narrowing && isPhone ? (
              <StudentListNarrowedCount
                visibleCount={students.length}
                totalCount={narrowing.totalCount}
                onClear={narrowing.onClear}
              />
            ) : undefined
          }
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
            chipVariant={isLgUp ? 'words' : 'icons'}
            mixSettings={mixSettings}
            expanded={expandedIds.has(student.id)}
            onToggleExpanded={isLgUp ? undefined : toggleExpanded}
            onShowStudent={showStudent}
            partnerLit={litIds.has(student.id)}
            brush={rowBrush}
          />
        ))}
      </div>
      <StudentCardLayer
        card={card}
        allStudents={classRoster}
        mixSettings={mixSettings}
      />
    </div>
  );
};

export default StudentList;
