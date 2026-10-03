// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontalIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { INSPECTOR_DRAWER_ID, useInspector } from '@/contexts/InspectorContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import {
  isAnyDialogOpen,
  isTopDialogLayer,
  useDialogLayer,
} from '@/hooks/ui/useDialogLayer';
import StudentInspectorPanel from '@/components/students/StudentInspectorPanel';

/** The column from `lg` up; `hidden` below, where the drawer takes over. */
const columnClass =
  'hidden w-80 shrink-0 flex-col overflow-hidden border-l border-(--border-card) bg-(--surface-card) lg:flex';

/**
 * Below `lg` the inspector has no column of its own: it opens as a drawer
 * over the stage, between the header and the status bar, on the right where
 * the column stands from `lg` up — an iPad turned from landscape to portrait
 * finds it in the same place.
 */
const inspectorDrawerClass =
  'fixed top-14 right-0 bottom-(--shell-bottom-inset) z-40 flex w-full max-w-sm flex-col overflow-hidden border-l border-(--border-card) bg-(--surface-card) shadow-(--menu-shadow) focus:outline-none';

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
 *
 * From `lg` up the column folds away on every layer, from the switch at the
 * right end of the status bar — the mirror of the toolbar's at the left end
 * (`StatusBarFrame`). Opening a student unfolds it again.
 *
 * Below `lg` there is no column. A phone shows an opened student as a sheet
 * from the bottom; a tablet as a drawer on the right. What a layer portals in
 * — the room's properties, the plan's criteria, the circle's summary — opens
 * as the same drawer, from the same switch. Before, all of it was a column
 * that stayed hidden below `lg`, and an iPad in portrait could neither name a
 * student nor set a criterion.
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
    folded,
    drawerOpen,
    setDrawerOpen,
  } = useInspector();
  const layoutMode = useLayoutMode();
  const isPhone = layoutMode === 'phone';
  const isDesktop = layoutMode === 'desktop';
  // From `lg` up every layer's column can be folded away, so the stage takes
  // the width; the switch sits at the right end of the status bar.
  const columnFolded = isDesktop && folded;

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
  const sheetLayer = useDialogLayer(isPhone && isOpen);

  // The phone's sheet is a dialog, so the class list leaves Escape to it — and
  // it has to take the key itself, or nothing closes it without a finger.
  React.useEffect(() => {
    if (!isPhone || !isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isTopDialogLayer(sheetLayer)) return;
      event.stopPropagation();
      clear();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [clear, isOpen, isPhone, sheetLayer]);

  const hasPortal = step === 2 || step === 3 || portalMounted;
  const showsDrawer = !isDesktop && hasPortal && drawerOpen;

  // Another layer brings another panel; the drawer opens again when asked.
  // Before paint and before the layer's own effects, so a layer that opens
  // the drawer on arrival — the room does while it is empty — has the last
  // word.
  React.useLayoutEffect(() => {
    setDrawerOpen(false);
  }, [setDrawerOpen, step]);

  // The drawer is not modal: the stage beside it stays in reach. It takes the
  // focus when it opens, so the keyboard lands in it rather than after the
  // status bar, and hands it back when Escape closes it.
  const drawerRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!showsDrawer) return undefined;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    drawerRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isAnyDialogOpen()) return;
      // First in line, so the stage underneath does not also take Escape as
      // "clear the selection".
      event.stopPropagation();
      setDrawerOpen(false);
      opener?.focus();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [setDrawerOpen, showsDrawer]);

  if (suspended) return null;

  // The room and plan layers fill the panel themselves, and so does the class
  // layer's selection from `lg` up.
  if (hasPortal) {
    return (
      <aside
        id={INSPECTOR_DRAWER_ID}
        ref={drawerRef}
        tabIndex={showsDrawer ? -1 : undefined}
        aria-label={
          portalLabel ??
          (step === 2
            ? t('generator:sceneInspector.title')
            : t('generator:mix.title'))
        }
        // Folded, the column stays in the page as the portal's slot, only
        // out of sight.
        className={
          showsDrawer
            ? inspectorDrawerClass
            : columnFolded
              ? 'hidden'
              : columnClass
        }
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
      <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-t-xl border-t border-(--border-card) bg-(--surface-card) shadow-(--shadow-sheet)">
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

  // A tablet: the opened student in the drawer, the list beside it still in
  // reach — tapping another row opens that one instead.
  if (!isDesktop) {
    if (!isOpen) return null;
    return (
      <aside
        aria-label={t('students:inspector.title')}
        className={inspectorDrawerClass}
      >
        {body}
      </aside>
    );
  }

  if (columnFolded) return null;

  return (
    <aside
      id={INSPECTOR_DRAWER_ID}
      aria-label={t('students:inspector.title')}
      className={columnClass}
    >
      {body}
    </aside>
  );
}
