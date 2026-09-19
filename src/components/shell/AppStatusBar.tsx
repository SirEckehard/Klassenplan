// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { countSeats, primaryButtonClass } from '@/utils';
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
export default function AppStatusBar() {
  const { t } = useTranslation(['generator', 'students']);
  const { step, students, classroomScene, currentSeating } =
    useSeatingPlanState();
  const { handleStepChange } = useSeatingPlanActions();
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
      className="sticky bottom-0 z-30 border-t border-[var(--border-card)] bg-[var(--surface-card)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
        <p
          data-tour={step === 2 ? TOUR_ANCHORS.layoutStatus : undefined}
          className="min-w-0 truncate text-xs tabular-nums text-[var(--text-muted)] sm:text-sm"
        >
          {segments.join(' · ')}
        </p>

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
