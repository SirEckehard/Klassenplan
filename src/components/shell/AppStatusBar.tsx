// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, SidebarSimpleIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useStatusBarSlot } from '@/contexts/StatusBarSlotContext';
import { useShellToolRail } from '@/contexts/ToolRailContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import StudentHistoryToolbar from '@/components/studentInput/StudentHistoryToolbar';
import SeatingHistoryToolbar from '@/components/SeatingPlanGenerator/canvas/SeatingHistoryToolbar';
import { countSeats, primaryButtonClass, quietIconButtonClass } from '@/utils';
import { validateStudentsComplete } from '@/utils/validation';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/**
 * The one place the app states where it stands, and the one place the layer's
 * primary action lives.
 *
 * Before this bar the same information sat in a floating badge at the canvas
 * corner (step 2) and nowhere at all (steps 1 and 3), while "carry on" buttons
 * hid at the bottom of three different view footers. Both now have exactly one
 * home, in the same spot on every layer.
 *
 * The blocked states stay `aria-disabled` rather than `disabled`: the button
 * keeps focus and pointer events, so the hint shows on hover and focus and a
 * click still surfaces the toast that explains the shortfall.
 */
/** Undo/redo in the status bar: quiet, and small enough for a 44px line. */
const historyButtonClass = `${quietIconButtonClass} h-9 w-9`;

export default function AppStatusBar() {
  const { t } = useTranslation(['generator', 'students']);
  const { step, students, classroomScene, currentSeating } =
    useSeatingPlanState();
  const { handleStepChange } = useSeatingPlanActions();
  const { setStartNode, setEndNode } = useStatusBarSlot();
  // The toolbar's width belongs to the workspace, not to a layer, so its
  // switch sits here rather than in a header above the tools. A phone has no
  // toolbar column at all — there it is a sheet with its own trigger.
  const toolRail = useShellToolRail();
  const isPhone = useLayoutMode() === 'phone';
  const showToolRailSwitch = toolRail !== null && !isPhone;
  const hintId = React.useId();

  const studentsCount = students.length;
  const seatCount = countSeats(classroomScene);
  const tableCount = classroomScene.tables.length;
  const missingNameCount = React.useMemo(
    () => validateStudentsComplete(students).emptyNameCount,
    [students],
  );
  const occupiedSeats = React.useMemo(
    () =>
      currentSeating.reduce(
        (sum, table) => sum + table.filter(Boolean).length,
        0,
      ),
    [currentSeating],
  );

  /** The status line, as segments joined by a middot. */
  const segments = React.useMemo(() => {
    if (step === 1) {
      if (studentsCount === 0) return [t('generator:shell.status.noStudents')];
      return [
        t('generator:shell.status.students', { count: studentsCount }),
        missingNameCount > 0
          ? t('generator:shell.status.missingNames', {
              count: missingNameCount,
            })
          : t('generator:shell.status.namesComplete'),
      ];
    }

    if (step === 2) {
      if (tableCount === 0) return [t('generator:shell.status.noTables')];
      const missingSeats = studentsCount - seatCount;
      const verdict =
        missingSeats > 0
          ? t('generator:shell.status.seatsMissing', { count: missingSeats })
          : missingSeats === 0
            ? t('generator:shell.status.seatsExact')
            : t('generator:shell.status.seatsSpare', { count: -missingSeats });
      return [
        t('generator:shell.status.tables', { count: tableCount }),
        t('generator:shell.status.seatsFor', {
          seats: seatCount,
          students: studentsCount,
        }),
        verdict,
      ];
    }

    if (occupiedSeats === 0) return [t('generator:shell.status.noPlan')];
    return [
      t('generator:shell.status.occupied', {
        filled: occupiedSeats,
        seats: seatCount,
      }),
    ];
  }, [
    missingNameCount,
    occupiedSeats,
    seatCount,
    step,
    studentsCount,
    t,
    tableCount,
  ]);

  /**
   * The layer's primary action. The plan layer has none yet — mixing keeps its
   * own button until the criteria and recipes land.
   */
  const action = React.useMemo(() => {
    if (step === 1 && studentsCount > 0) {
      return {
        anchor: TOUR_ANCHORS.proceedToLayout,
        label: t('students:studentInput.proceedButton'),
        title: t('students:studentInput.proceedShortcut'),
        target: 2,
        hint:
          missingNameCount > 0
            ? t('students:validation.missingNames', { count: missingNameCount })
            : '',
      };
    }
    if (step === 2) {
      const missingSeats = studentsCount - seatCount;
      const hint =
        missingSeats <= 0
          ? ''
          : seatCount === 0
            ? t('generator:wizard.noTablesYet', { students: studentsCount })
            : t('generator:wizard.seatsMissing', {
                count: missingSeats,
                students: studentsCount,
              });
      return {
        anchor: TOUR_ANCHORS.proceedToPlan,
        label: t('generator:wizard.forwardToPlan'),
        title: t('generator:wizard.forwardToPlanShortcut'),
        target: 3,
        hint,
      };
    }
    return null;
  }, [missingNameCount, seatCount, step, studentsCount, t]);

  return (
    // A landmark region rather than a live region on purpose: the line changes
    // with every keystroke in the class list, and announcing each one would
    // bury anything that actually matters.
    <div
      role="region"
      aria-label={t('generator:shell.statusBarLabel')}
      className="sticky bottom-0 z-30 shrink-0 border-t border-(--border-card) bg-(--surface-card)"
    >
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          {showToolRailSwitch && toolRail && (
            <>
              <button
                type="button"
                onClick={toolRail.toggle}
                data-tour={TOUR_ANCHORS.sidebarToggle}
                onMouseUp={(event) => event.currentTarget.blur()}
                className={historyButtonClass}
                title={
                  toolRail.isExpanded
                    ? t('generator:sidebar.collapseShortcut')
                    : t('generator:sidebar.expandShortcut')
                }
                aria-label={
                  toolRail.isExpanded
                    ? t('generator:sidebar.collapseLabel')
                    : t('generator:sidebar.expandLabel')
                }
                aria-expanded={toolRail.isExpanded}
              >
                <SidebarSimpleIcon size={16} aria-hidden="true" />
              </button>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-(--border-card)"
              />
            </>
          )}
          {/* Undo/redo lead the line on every layer. Two of the three
              histories are in the context; the room layer's lives with the
              canvas state and fills the slot through `StatusBarPortal`. */}
          {step === 1 && (
            <StudentHistoryToolbar buttonClass={historyButtonClass} />
          )}
          {step === 3 && (
            <SeatingHistoryToolbar buttonClass={historyButtonClass} />
          )}
          {step === 2 && (
            <span ref={setStartNode} className="flex items-center" />
          )}
          <p
            data-tour={step === 2 ? TOUR_ANCHORS.layoutStatus : undefined}
            className="min-w-0 truncate text-xs tabular-nums text-(--text-muted) sm:text-sm"
          >
            {segments.join(' · ')}
          </p>
        </div>

        {/* The plan layer's primary action is "mix again", which belongs to
            the view that owns the mix handler; it fills this slot. */}
        <span ref={setEndNode} className="flex shrink-0 items-center" />

        {action && (
          <div className="group relative shrink-0">
            <button
              type="button"
              data-tour={action.anchor}
              onClick={() => void handleStepChange(action.target)}
              // The visible label shortens on a phone; the accessible name
              // must not, so it is spelled out here once and for all widths.
              aria-label={action.label}
              aria-disabled={action.hint ? true : undefined}
              aria-describedby={action.hint ? hintId : undefined}
              title={action.title}
              className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap ${
                action.hint ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{t('generator:shell.next')}</span>
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            {action.hint && <HintTooltip id={hintId} hint={action.hint} />}
          </div>
        )}
      </div>
    </div>
  );
}
