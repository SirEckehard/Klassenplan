// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontalIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useInspector } from '@/contexts/InspectorContext';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { showToast } from '@/utils';
import StudentInspector from '@/components/students/StudentInspector';
import { confirmDialog } from '@/services/ui/dialogs';

/**
 * The properties of whatever is selected, in one place on the right.
 *
 * Two layers fill it, in the two ways that make sense for them. The class
 * layer's selection is a student id, which this component can resolve from the
 * seating-plan context on its own. The room layer's selection lives inside the
 * canvas state together with its mutators, so that layer renders its own panel
 * through `InspectorPortal` into the slot below. The plan layer has no
 * inspector yet and gets its full width back instead of an empty column.
 */
export default function Inspector() {
  const { t } = useTranslation(['students', 'generator']);
  const { step, students } = useSeatingPlanState();
  const { updateStudent, removeStudent } = useSeatingPlanActions();
  const { selection, selectStudent, clear, suspended, setSlotNode } =
    useInspector();
  const isPhone = useIsPhone();

  const index = React.useMemo(
    () =>
      selection?.kind === 'student'
        ? students.findIndex((student) => student.id === selection.id)
        : -1,
    [selection, students],
  );
  const student = index >= 0 ? students[index] : null;

  // A student removed while the inspector is open leaves a dangling selection.
  React.useEffect(() => {
    if (selection?.kind === 'student' && index < 0) {
      clear();
    }
  }, [clear, index, selection]);

  // The list rows gave up their delete button, so this is the only way a
  // single student leaves the class; the bulk bar still covers several at once.
  const handleRemove = React.useCallback(async () => {
    if (!student) return;
    const name = student.name.trim();
    const label = name
      ? `"${name}"`
      : t('students:studentInput.thisStudent', 'diesen Schüler');
    const confirmed = await confirmDialog(
      t('students:studentInput.removeStudentMessage', {
        studentName: label,
      }),
      {
        title: t('students:studentInput.removeStudentTitle'),
        confirmLabel: t('students:classManagement.delete'),
      },
    );
    if (!confirmed) return;
    removeStudent(student.id);
    clear();
    showToast(
      'success',
      t('students:studentInput.studentRemoved', {
        studentName: name || t('students:studentList.newStudent'),
      }),
    );
  }, [clear, removeStudent, student, t]);

  const isOpen = Boolean(student);
  const sheetRef = useDialogA11y<HTMLDivElement>({ open: isPhone && isOpen });
  useDialogLayer(isPhone && isOpen);

  if (suspended) return null;

  // The room and plan layers fill the panel themselves. Both are pointer jobs
  // on a canvas the phone barely fits already, so the slot is desktop-only.
  if (step === 2 || step === 3) {
    return (
      <aside
        aria-label={
          step === 2
            ? t('generator:sceneInspector.title')
            : t('generator:mix.title')
        }
        className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-(--border-card) bg-(--surface-card) lg:flex"
      >
        {/* Both layers bring their own header strip and body through the
            portal, so the slot is only the column they fill. */}
        <div ref={setSlotNode} className="flex min-h-0 flex-1 flex-col" />
      </aside>
    );
  }

  const body = student ? (
    <StudentInspector
      student={student}
      allStudents={students}
      updateStudent={updateStudent}
      onRemove={() => void handleRemove()}
      onClose={clear}
      position={{ index: index + 1, total: students.length }}
      onPrevious={
        index > 0 ? () => selectStudent(students[index - 1].id) : undefined
      }
      onNext={
        index < students.length - 1
          ? () => selectStudent(students[index + 1].id)
          : undefined
      }
    />
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <SlidersHorizontalIcon
        size={28}
        className="text-(--text-muted)"
        aria-hidden="true"
      />
      <p className="text-sm font-semibold">
        {t('students:inspector.empty.title')}
      </p>
      <p className="max-w-56 text-xs leading-relaxed text-(--text-muted)">
        {t('students:inspector.empty.body')}
      </p>
    </div>
  );

  if (isPhone) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-t-xl border-t border-(--border-card) bg-(--surface-card) shadow-[0_-8px_24px_-12px_rgba(23,24,26,0.3)]">
        <div
          ref={sheetRef}
          role="dialog"
          aria-label={t('students:inspector.title')}
          className="flex min-h-0 flex-1 flex-col"
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label={t('students:inspector.title')}
      className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-(--border-card) bg-(--surface-card) lg:flex"
    >
      {body}
    </aside>
  );
}
