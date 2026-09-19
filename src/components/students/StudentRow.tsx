// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { SlidersHorizontalIcon, TrashIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { useInspector } from '@/contexts/InspectorContext';
import {
  cardSurfaceClass,
  dangerIconButtonClass,
  quietIconButtonClass,
} from '@/utils';
import StudentNameEditor from './StudentNameEditor';
import StudentPhotoButton from './StudentPhotoButton';
import StudentChips from './StudentChips';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

type Props = {
  student: Student;
  index: number;
  highlight: boolean;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
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
 * The row used to carry sixteen icon columns per student — for a class of
 * thirty, four hundred and eighty controls, in which an unset attribute looked
 * exactly like one deliberately turned off. Editing moved to the inspector;
 * what is left here is the answer to "who is in this class and what do I know
 * about them", which is what a list is for.
 */
function StudentRow({
  student,
  index,
  highlight,
  updateStudent,
  removeStudent,
  allStudents,
  selected,
  onToggleSelected,
}: Props) {
  const { t } = useTranslation('students');
  const { selection, toggleStudent, selectStudent } = useInspector();
  const isInspected =
    selection?.kind === 'student' && selection.id === student.id;

  // The name editor is the only piece of row state left now that the selectors
  // and their dropdowns live in the inspector.
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const displayName = student.name || t('studentList.newStudent');

  /**
   * A click anywhere in the row opens the inspector, unless it landed on a
   * control of its own. Keyboard users get the explicit button at the end —
   * the row is not a button itself, because it contains several.
   */
  const handleRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('button, input, a, label, [role="button"]')
    ) {
      return;
    }
    selectStudent(student.id);
  };

  const stateClass = isInspected
    ? 'border-blue-600 shadow-[inset_3px_0_0_var(--button-primary-bg)] dark:border-blue-500'
    : highlight
      ? 'border-green-500 bg-green-50/90 dark:border-green-400 dark:bg-green-900/30'
      : selected
        ? 'border-blue-400 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
        : '';

  return (
    <div
      id={`student-${student.id}`}
      className={`${cardSurfaceClass} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 ${stateClass}`}
      data-tour={TOUR_ANCHORS.studentRow}
      onClick={handleRowClick}
    >
      {onToggleSelected && (
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={() => onToggleSelected(student.id)}
          className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
          aria-label={t('listToolbar.selectStudent', { name: displayName })}
        />
      )}
      <span className="min-w-6 shrink-0 text-sm font-medium tabular-nums text-(--text-muted)">
        {index + 1}.
      </span>
      <StudentPhotoButton student={student} updateStudent={updateStudent} />
      <StudentNameEditor
        student={student}
        allStudents={allStudents}
        updateStudent={updateStudent}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        draftName={draftName}
        setDraftName={setDraftName}
        showEditButton={false}
      />

      <StudentChips
        student={student}
        allStudents={allStudents}
        className="min-w-0 flex-1 basis-full lg:basis-auto"
      />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => toggleStudent(student.id)}
          aria-pressed={isInspected}
          className={`${quietIconButtonClass} min-h-11 min-w-11`}
          title={t('studentList.inspect', { name: displayName })}
          aria-label={t('studentList.inspect', { name: displayName })}
        >
          <SlidersHorizontalIcon size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${dangerIconButtonClass} min-h-11 min-w-11`}
          onClick={() => removeStudent(student.id)}
          title={t('studentList.removeStudentTitle', { name: displayName })}
          aria-label={t('studentList.removeStudentTitle', {
            name: displayName,
          })}
        >
          <TrashIcon size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// Export with React.memo for performance optimization
export default React.memo(StudentRow);
