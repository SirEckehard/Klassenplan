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
import StudentInspectorPanel from '@/components/students/StudentInspectorPanel';

/**
 * The properties of whatever is selected, in one place on the right.
 *
 * Two layers fill it, in the two ways that make sense for them. The class
 * layer's selection is a student id, which this component can resolve from the
 * seating-plan context on its own. The room layer's selection lives inside the
 * canvas state together with its mutators, so that layer renders its own panel
 * through `InspectorPortal` into the slot below, and so does the plan layer
 * with its criteria. The class layer does the same while students are ticked,
 * because the ticks live with the list: one ticked student in the panel an
 * opened one gets, several in the bulk panel. The slot takes the opened
 * student's place until the selection is let go.
 */
export default function Inspector() {
  const { t } = useTranslation(['students', 'generator']);
  const { step, students } = useSeatingPlanState();
  const { updateStudent, removeStudent } = useSeatingPlanActions();
  const {
    selection,
    selectStudent,
    clear,
    suspended,
    setSlotNode,
    portalMounted,
    portalLabel,
  } = useInspector();
  const isPhone = useIsPhone();

  const student = React.useMemo(
    () =>
      selection?.kind === 'student'
        ? (students.find((entry) => entry.id === selection.id) ?? null)
        : null,
    [selection, students],
  );

  // A student removed while the inspector is open leaves a dangling selection.
  React.useEffect(() => {
    if (selection?.kind === 'student' && !student) {
      clear();
    }
  }, [clear, selection, student]);

  const isOpen = Boolean(student);
  const sheetRef = useDialogA11y<HTMLDivElement>({ open: isPhone && isOpen });
  useDialogLayer(isPhone && isOpen);

  if (suspended) return null;

  // The room and plan layers fill the panel themselves. Both are pointer jobs
  // on a canvas the phone barely fits already, so the slot is desktop-only —
  // and the class layer's ticks only portal in from `lg` up.
  if (step === 2 || step === 3 || portalMounted) {
    return (
      <aside
        aria-label={
          portalLabel ??
          (step === 2
            ? t('generator:sceneInspector.title')
            : t('generator:mix.title'))
        }
        className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-(--border-card) bg-(--surface-card) lg:flex"
      >
        {/* The layers bring their own header strip and body through the
            portal, so the slot is only the column they fill. */}
        <div ref={setSlotNode} className="flex min-h-0 flex-1 flex-col" />
      </aside>
    );
  }

  const body = student ? (
    <StudentInspectorPanel
      student={student}
      students={students}
      updateStudent={updateStudent}
      removeStudent={removeStudent}
      onOpen={selectStudent}
      onClose={clear}
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
