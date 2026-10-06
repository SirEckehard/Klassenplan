// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { showToast } from '@/utils';
import { confirmDialog } from '@/services/ui/dialogs';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import StudentInspector from './StudentInspector';
import { STUDENT_NAME_INPUT_ATTRIBUTE } from './StudentNameEditor';

/**
 * Whether the focused control already uses Alt/⌥+↑/↓ itself: a text field
 * moves its caret there, a select its choice. The name field is the one
 * exception — it saves a changed name first and lets the key through
 * (`StudentNameEditor`).
 */
function focusOwnsAltArrows(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (active.hasAttribute(STUDENT_NAME_INPUT_ATTRIBUTE)) return false;
  if (active instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(
      active.type,
    );
  }
  return (
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    active.isContentEditable
  );
}

type Props = {
  student: Student;
  /** The whole class: partners to pick from. */
  students: Student[];
  /**
   * The order the arrows step through and the position counts in — the list
   * as it is searched, filtered and sorted. Falls back to `students` when
   * omitted or when the student is not in it (a filter just let go of them).
   */
  order?: readonly Student[];
  /**
   * Opened by the keyboard from the list: an unnamed student's name field
   * opens without taking the focus, so the next arrow key still steps.
   */
  keepFocus?: boolean;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  /** Takes the student out of the class; the panel asks first. */
  removeStudent: (id: string) => void;
  /** Shows another student — the arrows, and Enter in the name field. */
  onOpen: (id: string) => void;
  /** Lets this student go, which is also what follows removing it. */
  onClose: () => void;
};

/**
 * One student in the inspector, with the way to the neighbours and out of
 * the class.
 *
 * Two hosts show it: the shell for the student a row click opened, and the
 * class layer for a single ticked student — a selection of one needs nothing
 * the bulk panel offers, and would lose the name, the photo and the partners
 * to it. What differs between the two is only what "open" and "close" mean,
 * so the hosts pass those in and everything else lives here once.
 */
export default function StudentInspectorPanel({
  student,
  students,
  updateStudent,
  removeStudent,
  onOpen,
  onClose,
  order,
  keepFocus = false,
}: Props) {
  const { t } = useTranslation('students');
  const steps =
    order?.some((entry) => entry.id === student.id) === true ? order : students;
  const index = steps.findIndex((entry) => entry.id === student.id);
  const previous = index > 0 ? steps[index - 1] : undefined;
  const next =
    index >= 0 && index < steps.length - 1 ? steps[index + 1] : undefined;

  // Alt/⌥+↑/↓ step from wherever the focus is in the panel, so a teacher who
  // has just set a switch goes on to the next student without reaching for
  // the arrows in the head. The focus stays put for the same reason it does
  // in the list: an unnamed student's name field must not swallow the next
  // step.
  const [steppedTo, setSteppedTo] = React.useState<string | null>(null);
  if (steppedTo !== null && steppedTo !== student.id && !keepFocus) {
    // Opened some other way since: the next unnamed student takes the focus
    // again, as one opened by a click does.
    setSteppedTo(null);
  }
  const stepTo = React.useCallback(
    (target: Student | undefined) => {
      if (!target) return;
      setSteppedTo(target.id);
      onOpen(target.id);
    },
    [onOpen],
  );
  useKeyboardShortcuts(
    {
      'alt+arrowup': () => stepTo(previous),
      'alt+arrowdown': () => stepTo(next),
    },
    {
      ignoreWhileTyping: false,
      condition: () => !isAnyDialogOpen() && !focusOwnsAltArrows(),
    },
  );

  // The list rows gave up their delete button, so this is the only way a
  // single student leaves the class; several at once go through the bulk
  // panel.
  const handleRemove = React.useCallback(async () => {
    const name = student.name.trim();
    const label = name
      ? t('common:quoted', { text: name })
      : t('studentInput.thisStudent');
    const confirmed = await confirmDialog(
      t('studentInput.removeStudentMessage', { studentName: label }),
      {
        title: t('studentInput.removeStudentTitle'),
        confirmLabel: t('classManagement.delete'),
      },
    );
    if (!confirmed) return;
    removeStudent(student.id);
    onClose();
    showToast(
      'success',
      t('studentInput.studentRemoved', {
        studentName: name || t('studentList.newStudent'),
      }),
    );
  }, [onClose, removeStudent, student, t]);

  return (
    <StudentInspector
      student={student}
      allStudents={students}
      updateStudent={updateStudent}
      onRemove={() => void handleRemove()}
      onClose={onClose}
      position={{ index: index + 1, total: steps.length }}
      autoFocusName={!keepFocus && steppedTo !== student.id}
      onPrevious={previous ? () => onOpen(previous.id) : undefined}
      onNext={next ? () => onOpen(next.id) : undefined}
    />
  );
}
