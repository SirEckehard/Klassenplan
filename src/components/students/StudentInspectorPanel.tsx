// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { showToast } from '@/utils';
import { confirmDialog } from '@/services/ui/dialogs';
import StudentInspector from './StudentInspector';

type Props = {
  student: Student;
  /** The whole class: partners to pick from, the position, the neighbours. */
  students: Student[];
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
}: Props) {
  const { t } = useTranslation('students');
  const index = students.findIndex((entry) => entry.id === student.id);
  const previous = index > 0 ? students[index - 1] : undefined;
  const next =
    index >= 0 && index < students.length - 1 ? students[index + 1] : undefined;

  // The list rows gave up their delete button, so this is the only way a
  // single student leaves the class; several at once go through the bulk
  // panel.
  const handleRemove = React.useCallback(async () => {
    const name = student.name.trim();
    const label = name ? `"${name}"` : t('studentInput.thisStudent');
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
      position={{ index: index + 1, total: students.length }}
      onPrevious={previous ? () => onOpen(previous.id) : undefined}
      onNext={next ? () => onOpen(next.id) : undefined}
    />
  );
}
