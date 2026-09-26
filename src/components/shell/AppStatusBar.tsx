// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useStatusBarSlot } from '@/contexts/StatusBarSlotContext';
import StudentHistoryToolbar from '@/components/studentInput/StudentHistoryToolbar';
import SeatingHistoryToolbar from '@/components/SeatingPlanGenerator/canvas/SeatingHistoryToolbar';
import StatusBarFrame, {
  statusBarBackButtonClass,
  statusBarHistoryButtonClass,
  statusBarHistoryGroupClass,
} from '@/components/shell/StatusBarFrame';
import { countSeats, primaryButtonClass } from '@/utils';
import { validateStudentsComplete } from '@/utils/validation';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/**
 * The one place the app states where it stands, and the one place the layer's
 * primary action lives — with undo/redo in the middle, under the stage, and
 * the way back to the previous layer beside the way on.
 *
 * Before this bar the same information sat in a floating badge at the canvas
 * corner (step 2) and nowhere at all (steps 1 and 3), while "carry on" buttons
 * hid at the bottom of three different view footers. Both now have exactly one
 * home, in the same spot on every layer. Exporting and presenting are not
 * among them: they leave the workspace, so they sit in the header.
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
  const { setHistoryNode, setEndNode } = useStatusBarSlot();
  const hintId = React.useId();

  const studentsCount = students.length;
  const seatCount = countSeats(classroomScene);
  const tableCount = classroomScene.tables.length;
  const missingNameCount = React.useMemo(
    () => validateStudentsComplete(students).emptyNameCount,
    [students],
  );
  const { occupiedSeats, unseatedCount } = React.useMemo(() => {
    const seatedIds = new Set<string>();
    for (const table of currentSeating) {
      for (const seat of table) {
        if (seat) seatedIds.add(seat.id);
      }
    }
    return {
      occupiedSeats: seatedIds.size,
      unseatedCount: students.filter((student) => !seatedIds.has(student.id))
        .length,
    };
  }, [currentSeating, students]);

  /**
   * The status line, as segments joined by a middot, and the verdict on it.
   * The verdict is a green check or a red cross with its words for the screen
   * reader and the tooltip, never a segment of its own: "alle Namen gesetzt"
   * beside "24 Schüler" only repeated what the check already says. A layer
   * with nothing on it yet has nothing to judge and shows no icon.
   */
  const { segments, verdict } = React.useMemo((): {
    segments: string[];
    verdict: { fits: boolean; label: string } | null;
  } => {
    if (step === 1) {
      if (studentsCount === 0) {
        return {
          segments: [t('generator:shell.status.noStudents')],
          verdict: null,
        };
      }
      return {
        segments: [
          t('generator:shell.status.students', { count: studentsCount }),
        ],
        verdict: {
          fits: missingNameCount === 0,
          label:
            missingNameCount > 0
              ? t('generator:shell.status.missingNames', {
                  count: missingNameCount,
                })
              : t('generator:shell.status.namesComplete'),
        },
      };
    }

    if (step === 2) {
      if (tableCount === 0) {
        return {
          segments: [t('generator:shell.status.noTables')],
          verdict: null,
        };
      }
      const missingSeats = studentsCount - seatCount;
      return {
        segments: [
          t('generator:shell.status.seatsFor', {
            seats: seatCount,
            students: studentsCount,
          }),
        ],
        verdict: {
          fits: missingSeats <= 0,
          label:
            missingSeats > 0
              ? t('generator:shell.status.seatsMissing', {
                  count: missingSeats,
                })
              : missingSeats === 0
                ? t('generator:shell.status.seatsExact')
                : t('generator:shell.status.seatsSpare', {
                    count: -missingSeats,
                  }),
        },
      };
    }

    if (occupiedSeats === 0) {
      return { segments: [t('generator:shell.status.noPlan')], verdict: null };
    }
    return {
      segments: [
        t('generator:shell.status.occupied', {
          filled: occupiedSeats,
          seats: seatCount,
        }),
      ],
      verdict: {
        fits: unseatedCount === 0,
        label:
          unseatedCount > 0
            ? t('generator:shell.status.unseated', { count: unseatedCount })
            : t('generator:shell.status.allSeated'),
      },
    };
  }, [
    missingNameCount,
    occupiedSeats,
    seatCount,
    step,
    studentsCount,
    t,
    tableCount,
    unseatedCount,
  ]);
  const VerdictIcon = verdict?.fits ? CheckCircleIcon : XCircleIcon;

  /** The way back to the previous layer; the class list is the first. */
  const back = React.useMemo(() => {
    if (step === 2) {
      return {
        label: t('generator:wizard.backToStudents'),
        title: t('generator:wizard.backToStudentsShortcut'),
        target: 1,
      };
    }
    if (step === 3) {
      return {
        label: t('generator:wizard.backToRoom'),
        title: t('generator:wizard.backToRoomShortcut'),
        target: 2,
      };
    }
    return null;
  }, [step, t]);

  /**
   * The layer's primary action. The plan layer's is "Neu mischen", which
   * belongs to the view that owns the mix handler and fills the end slot.
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
    <StatusBarFrame
      start={
        <p
          data-tour={step === 2 ? TOUR_ANCHORS.layoutStatus : undefined}
          className="flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-(--text-muted) sm:text-sm"
        >
          <span className="min-w-0 truncate">{segments.join(' · ')}</span>
          {verdict && (
            <span className="inline-flex shrink-0" title={verdict.label}>
              <VerdictIcon
                size={16}
                weight="fill"
                aria-hidden="true"
                className={
                  verdict.fits ? 'text-(--status-ok)' : 'text-(--status-alert)'
                }
              />
              <span className="sr-only">{verdict.label}</span>
            </span>
          )}
        </p>
      }
      middle={
        // Undo/redo sit in the middle, under the stage, on every layer. Two
        // of the three histories are in the context; the room layer's lives
        // with the canvas state and fills the slot through `StatusBarPortal`.
        <div className="flex shrink-0 items-center">
          {step === 1 && (
            <StudentHistoryToolbar
              buttonClass={statusBarHistoryButtonClass}
              groupClass={statusBarHistoryGroupClass}
            />
          )}
          {step === 3 && (
            <SeatingHistoryToolbar
              buttonClass={statusBarHistoryButtonClass}
              groupClass={statusBarHistoryGroupClass}
            />
          )}
          {step === 2 && (
            <span ref={setHistoryNode} className="flex items-center" />
          )}
        </div>
      }
      end={
        <>
          {back && (
            <button
              type="button"
              onClick={() => void handleStepChange(back.target)}
              // Only the word "Zurück" is visible, and on a phone only the
              // arrow; the accessible name says where it leads.
              aria-label={back.label}
              title={back.title}
              className={statusBarBackButtonClass}
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {t('generator:wizard.back')}
              </span>
            </button>
          )}

          {/* The plan layer's primary action is "mix again", which belongs to
              the view that owns the mix handler; it fills this slot. */}
          <span
            ref={setEndNode}
            className="flex shrink-0 items-center empty:hidden"
          />

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
        </>
      }
    />
  );
}
