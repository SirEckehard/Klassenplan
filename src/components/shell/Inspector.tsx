// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, SlidersHorizontalIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useInspector } from '@/contexts/InspectorContext';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { quietIconButtonClass } from '@/utils';
import StudentInspector from '@/components/students/StudentInspector';

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
  const { updateStudent } = useSeatingPlanActions();
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
        className="hidden w-80 shrink-0 overflow-y-auto border-l border-(--border-card) bg-(--surface-card) p-4 lg:block"
      >
        {/* The plan layer's panel brings its own heading; the room layer's
            says what the numbers below belong to. */}
        {step === 2 && (
          <h2 className="mb-3 text-sm font-semibold">
            {t('generator:sceneInspector.title')}
          </h2>
        )}
        <div ref={setSlotNode} />
      </aside>
    );
  }

  const body = student ? (
    <StudentInspector
      student={student}
      allStudents={students}
      updateStudent={updateStudent}
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
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
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
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-(--border-card) bg-(--surface-card) p-4 shadow-[0_-8px_24px_-12px_rgba(23,24,26,0.3)]">
        <div
          ref={sheetRef}
          role="dialog"
          aria-label={t('students:inspector.title')}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t('students:inspector.title')}
            </h2>
            <button
              type="button"
              onClick={clear}
              className={`${quietIconButtonClass} h-9 w-9`}
              aria-label={t('students:inspector.close')}
            >
              <XIcon size={18} aria-hidden="true" />
            </button>
          </div>
          {body}
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label={t('students:inspector.title')}
      className="hidden w-80 shrink-0 overflow-y-auto border-l border-(--border-card) bg-(--surface-card) p-4 lg:block"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {t('students:inspector.title')}
        </h2>
        {student && (
          <button
            type="button"
            onClick={clear}
            className={`${quietIconButtonClass} h-8 w-8`}
            aria-label={t('students:inspector.close')}
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {body}
    </aside>
  );
}
