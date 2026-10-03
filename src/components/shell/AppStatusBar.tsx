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
  statusBarWordClass,
} from '@/components/shell/StatusBarFrame';
import PlanExits from '@/components/shell/PlanExits';
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
 * home, in the same spot on every layer.
 *
 * The plan layer is the last one, so its way on leads out of the workspace:
 * exporting and presenting take the place the other layers give "Weiter"
 * (`PlanExits`). Its own action, "Mischen", acts on the stage and undo takes
 * it back, so it sits in the middle beside undo/redo.
 *
 * The blocked states stay `aria-disabled` rather than `disabled`: the button
 * keeps focus and pointer events, so the hint shows on hover and focus and a
 * click still surfaces the toast that explains the shortfall.
 */
export default function AppStatusBar() {
  const { t } = useTranslation(['generator', 'students']);
  const { step, students, classroomScene } = useSeatingPlanState();
  const { handleStepChange } = useSeatingPlanActions();
  const { setHistoryNode, setActionNode } = useStatusBarSlot();
  const hintId = React.useId();

  const studentsCount = students.length;
  const seatCount = countSeats(classroomScene);
  const tableCount = classroomScene.tables.length;
  const missingNameCount = React.useMemo(
    () => validateStudentsComplete(students).emptyNameCount,
    [students],
  );
  /**
   * The status line, as segments joined by a middot, and the verdict on it.
   * The verdict is a green check or a red cross with its words for the screen
   * reader and the tooltip, never a segment of its own: "alle Namen gesetzt"
   * beside "24 Schüler" only repeated what the check already says. A layer
   * with nothing on it yet has nothing to judge and shows no icon.
   *
   * `short` is what the line says below `xl`, where the bar shares a tablet's
   * width with "Zurück" and the way on: "24 Plätze für 24 Schüler" came out
   * cut off. The full line stays in the tooltip, and the verdict says the
   * rest.
   */
  const { segments, short, verdict } = React.useMemo((): {
    segments: string[];
    short?: string;
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
        short: t('generator:shell.status.seatsForShort', { count: seatCount }),
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

    // The plan layer states nothing: the plan on the stage says whether it
    // is there, and its criteria have their figures in the inspector. "24 von
    // 24 Plätzen besetzt" only repeated what the plan shows.
    return { segments: [], verdict: null };
  }, [missingNameCount, seatCount, step, studentsCount, t, tableCount]);
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
   * The way on to the next layer. The plan layer has none; its primary
   * action, "Mischen", belongs to the view that owns the mix handler and
   * fills the action slot in the middle.
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
        segments.length > 0 && (
          <p
            data-tour={step === 2 ? TOUR_ANCHORS.layoutStatus : undefined}
            className="flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-(--text-muted) sm:text-sm"
          >
            {short ? (
              <span className="min-w-0 truncate" title={segments.join(' · ')}>
                <span className="xl:hidden">{short}</span>
                <span className="hidden xl:inline">{segments.join(' · ')}</span>
              </span>
            ) : (
              <span className="min-w-0 truncate">{segments.join(' · ')}</span>
            )}
            {verdict && (
              <span className="inline-flex shrink-0" title={verdict.label}>
                <VerdictIcon
                  size={16}
                  weight="fill"
                  aria-hidden="true"
                  className={
                    verdict.fits
                      ? 'text-(--status-ok)'
                      : 'text-(--status-alert)'
                  }
                />
                <span className="sr-only">{verdict.label}</span>
              </span>
            )}
          </p>
        )
      }
      middle={
        // Undo/redo sit in the middle, under the stage, on every layer. Two
        // of the three histories are in the context; the room layer's lives
        // with the canvas state and fills the slot through `StatusBarPortal`.
        // Beside them what they take back: the plan layer's "Mischen" and
        // the circle's fitting, which their views fill in the same way.
        <div className="flex shrink-0 items-center gap-2">
          <span
            ref={setActionNode}
            className="flex shrink-0 items-center empty:hidden"
          />
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
              // Only the word "Zurück" is visible, and on a phone or a
              // tablet only the arrow; the accessible name says where it leads.
              aria-label={back.label}
              title={back.title}
              className={statusBarBackButtonClass}
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              <span className={statusBarWordClass}>
                {t('generator:wizard.back')}
              </span>
            </button>
          )}

          {/* The last layer's way on leads out of the workspace. */}
          {step === 3 && <PlanExits />}

          {action && (
            <div className="group relative shrink-0">
              <button
                type="button"
                data-tour={action.anchor}
                onClick={() => void handleStepChange(action.target)}
                // The visible word is "Weiter" on every layer, and on a phone
                // or a tablet only the arrow; the accessible name says where
                // it leads, so it is spelled out here once for all widths.
                aria-label={action.label}
                aria-disabled={action.hint ? true : undefined}
                aria-describedby={action.hint ? hintId : undefined}
                title={action.title}
                className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap ${
                  action.hint ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                <span className={statusBarWordClass}>
                  {t('generator:shell.next')}
                </span>
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
