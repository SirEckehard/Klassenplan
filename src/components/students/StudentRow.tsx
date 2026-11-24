// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDownIcon } from '@phosphor-icons/react';
import type { MixSettings, Student } from '@/types';
import { dataFamilyClass } from '@/utils';
import { useInspector } from '@/contexts/InspectorContext';
import StudentAvatar from './StudentAvatar';
import StudentChips from './StudentChips';
import StudentMarkerDetails from './StudentMarkerDetails';
import { hasBrushMarker, type BrushMarker } from './markerBrush';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { getAllStudentBadges } from '@/utils/ui/studentAppearance';

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
  /** Words where the list is wide, the seats' icons where it is narrow. */
  chipVariant?: 'words' | 'icons';
  /** The mix's weights, so a badge that counts for nothing shows it. */
  mixSettings?: MixSettings;
  /**
   * Below `lg`: an arrow at the row's end unfolds the markers in words, in
   * place, where an opened student would be a sheet over the list.
   */
  expanded?: boolean;
  onToggleExpanded?: (studentId: string) => void;
  /** A partner named in the unfolded markers, brought into view. */
  onShowStudent?: (studentId: string) => void;
  /** A partner badge pointed at, or a partner shown, lights this row. */
  partnerLit?: boolean;
  /** The brush: pressing the row sets or takes off this marker. */
  brush?: { marker: BrushMarker; onStroke: (studentId: string) => void };
};

/**
 * One student, at a glance: photo, name, and the attributes that are actually
 * set.
 *
 * The list's only job is to answer "who is in this class and what do I know
 * about them", so the row is one button rather than a hundred small targets
 * for a class of twenty-four: pressing it opens the student in the inspector, which is where a name, a photo and an attribute
 * are changed, and where removing one lives. The checkbox stays beside it,
 * because a checkbox inside a button is not a checkbox. While a selection is
 * being built the row ticks instead, like a mail client's selection mode,
 * and while the brush is out it sets or takes off the brush's marker.
 */
function StudentRow({
  student,
  index,
  highlight,
  allStudents,
  selected,
  onToggleSelected,
  selectionActive = false,
  chipVariant = 'words',
  mixSettings,
  expanded = false,
  onToggleExpanded,
  onShowStudent,
  partnerLit = false,
  brush,
}: Props) {
  const { t } = useTranslation('students');
  const { selection, toggleStudent, selectStudent } = useInspector();
  const ticks = !brush && selectionActive && onToggleSelected !== undefined;
  const isInspected =
    !ticks &&
    !brush &&
    selection?.kind === 'student' &&
    selection.id === student.id;
  const hasBadges = React.useMemo(
    () => getAllStudentBadges(student, allStudents).length > 0,
    [allStudents, student],
  );
  const canExpand = Boolean(onToggleExpanded) && hasBadges && !brush;
  const isExpanded = canExpand && expanded;
  const detailsId = `student-markers-${student.id}`;

  // A student opened from elsewhere — the inspector's arrows, Alt/⌥+↑/↓ —
  // comes into view in the list, so the list still shows where one is.
  const rowRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isInspected) rowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isInspected]);

  const displayName = student.name || t('studentList.newStudent');
  const hasName = student.name.trim().length > 0;
  const brushed = brush ? hasBrushMarker(student, brush.marker.key) : false;
  const brushLabel = brush ? t(brush.marker.labelKey) : '';

  // Opened and ticked are two states, so they look different. The selection
  // fill belongs to the ticked rows alone, beside the checkbox that says so;
  // the row the inspector shows sits on paper and carries a blue bar at its
  // edge. Sharing the fill made an opened row with an empty checkbox read as
  // a tick that had failed to land. A partner lit up takes the colour of the
  // family partners belong to, since it describes a relation, not a choice.
  const stateClass = selected
    ? 'bg-(--surface-option-selected)'
    : partnerLit
      ? 'bg-(--data-social-surface)'
      : isInspected || highlight
        ? 'bg-(--surface-sunken)'
        : '';

  const handlePress = () => {
    if (brush) brush.onStroke(student.id);
    else if (ticks) onToggleSelected(student.id);
    else toggleStudent(student.id);
  };

  return (
    // The scroll margins keep a row that scrolls into view clear of the
    // list's sticky head, and below `lg`, where the page scrolls, of the
    // shell's header and status bar. A finger held on a row opens a card
    // (`useStudentCard`), so the browser's own menu and selection stay out.
    <div
      ref={rowRef}
      id={`student-${student.id}`}
      data-student-row
      data-tour={TOUR_ANCHORS.studentRow}
      className={`relative flex scroll-mt-24 scroll-mb-16 flex-wrap items-center gap-x-3 border-b border-(--border-card) px-3 last:border-b-0 pointer-coarse:touch-callout-none pointer-coarse:select-none lg:scroll-mt-8 lg:scroll-mb-0 ${stateClass}`}
    >
      {(isInspected || partnerLit) && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${
            partnerLit ? 'bg-(--data-social)' : 'bg-(--border-option-selected)'
          }`}
        />
      )}
      {onToggleSelected && !brush && (
        // The checkbox sits in a cell as tall as the row, so a fingertip that
        // lands a little beside it ticks instead of opening the student; on a
        // touch screen the cell starts at the row's edge and is 44px wide.
        // Where the chips go under the name (below `@2xl`) the box stands on
        // the name's line, not in the middle of the two.
        <label className="flex shrink-0 cursor-pointer items-start self-stretch pt-4 pointer-coarse:-ml-3 pointer-coarse:w-11 pointer-coarse:justify-center pointer-coarse:pt-3.5 @2xl:items-center @2xl:pt-0 @2xl:pointer-coarse:pt-0">
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
        // Pressing the student already open puts it away: on an iPad the
        // drawer or the column it unfolded closes again, and nobody is left
        // opened. Its name says so, since it no longer opens.
        onClick={handlePress}
        aria-current={isInspected ? 'true' : undefined}
        aria-pressed={brush ? brushed : ticks ? Boolean(selected) : undefined}
        aria-label={
          brush
            ? t('brush.stroke', { name: displayName, marker: brushLabel })
            : ticks
              ? t('listToolbar.selectStudent', { name: displayName })
              : isInspected
                ? t('listStatus.closeStudent', { name: displayName })
                : t('listStatus.openStudent', { name: displayName })
        }
        // The chips stand beside the name where the list is wide enough
        // (`@2xl`, the list card being the container) and under it where it
        // is not. At least 60px, not exactly: a row of fixed height spilled
        // chips that wrapped over the rows below. A row the list's arrows
        // opened drops its ring (`data-quiet-focus`, set by `StudentList`):
        // the blue bar marks it already.
        className={`flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left ${brush ? 'pr-10' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) data-quiet-focus:focus-visible:ring-0 @2xl:min-h-15 @2xl:flex-nowrap`}
      >
        <span className="w-6 shrink-0 text-xs tabular-nums text-(--text-muted)">
          {index + 1}.
        </span>
        <span data-card-profile={student.id} className="shrink-0">
          <StudentAvatar student={student} size={32} />
        </span>
        <span
          data-card-profile={student.id}
          // Shrinks below `@2xl`, where the row wraps, so a name wider than
          // the list is cut there rather than run out of the row.
          className={`min-w-0 truncate text-name @2xl:w-44 @2xl:shrink-0 ${
            hasName ? 'text-(--text-page)' : 'text-(--text-muted) italic'
          }`}
        >
          {displayName}
        </span>
        <StudentChips
          student={student}
          allStudents={allStudents}
          variant={chipVariant}
          mixSettings={mixSettings}
          // Under the name, not under the number, where they go below it.
          className="min-w-0 flex-1 basis-full pl-20 @2xl:basis-auto @2xl:pl-0"
        />
        {brush && (
          // Whether the row carries the brush's marker, at its end: filled
          // in the family's colour, or an empty ring. Inside the button, so
          // a press on it is a stroke too.
          <span
            aria-hidden="true"
            className={`${dataFamilyClass[brush.marker.family]} absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border ${
              brushed
                ? 'border-(--data-chip-accent) bg-(--data-chip-surface) text-(--data-chip-text)'
                : 'border-(--border-card) text-transparent'
            }`}
          >
            <brush.marker.icon size={15} />
          </span>
        )}
      </button>
      {canExpand && (
        <button
          type="button"
          onClick={() => onToggleExpanded?.(student.id)}
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? detailsId : undefined}
          aria-label={t(isExpanded ? 'expand.collapse' : 'expand.expand', {
            name: displayName,
          })}
          className="-mr-2 flex size-9 shrink-0 cursor-pointer items-center justify-center self-start rounded-lg text-(--text-muted) hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) pointer-coarse:mt-1 pointer-coarse:size-11 pointer-coarse:-mr-3 mt-2"
        >
          <CaretDownIcon
            size={18}
            aria-hidden="true"
            className={isExpanded ? 'rotate-180' : ''}
          />
        </button>
      )}
      {isExpanded && (
        <StudentMarkerDetails
          id={detailsId}
          student={student}
          allStudents={allStudents}
          mixSettings={mixSettings}
          onShowStudent={onShowStudent}
          onEdit={() => selectStudent(student.id)}
          className="mb-3 basis-full"
        />
      )}
    </div>
  );
}

// Export with React.memo for performance optimization
export default React.memo(StudentRow);
