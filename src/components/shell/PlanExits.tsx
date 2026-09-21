// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ChalkboardTeacherIcon, ExportIcon } from '@phosphor-icons/react';
import { usePlanExits } from '@/hooks/plan/usePlanExits';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { secondaryButtonClass, showToast, TOAST_MESSAGES } from '@/utils';

/**
 * The two ways a plan leaves the workspace, side by side in the middle of the
 * status bar.
 *
 * They used to sit in the header, "Präsentieren" as a blue button. Blue marks
 * the one primary action of a screen, and that is the layer's own — "Weiter",
 * "Neu mischen" — at the right end of this bar. So the exits are two equal,
 * quiet buttons between the status line and that action.
 *
 * Both stay clickable without a plan: a disabled button would leave a teacher
 * guessing, the toast says what is missing.
 */
export default function PlanExits() {
  const { t } = useTranslation('generator');
  const { exportPlan, presentPlan, canExit } = usePlanExits();

  const guardExit = (run: () => void) => () => {
    if (!canExit) {
      showToast('info', TOAST_MESSAGES.PLAN_NONE_YET);
      return;
    }
    run();
  };

  const buttonClass = `${secondaryButtonClass} h-9 gap-2 px-2.5 text-sm sm:px-3 ${
    canExit ? '' : 'opacity-60'
  }`;

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      data-tour={TOUR_ANCHORS.planExits}
    >
      {/* The visible words give way to the icons on a phone; the accessible
          names are spelled out once for every width. */}
      <button
        type="button"
        onClick={guardExit(exportPlan)}
        title={t('actions.exportShortcut')}
        aria-label={t('actions.export')}
        aria-disabled={canExit ? undefined : true}
        className={buttonClass}
      >
        <ExportIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('actions.export')}</span>
      </button>
      <button
        type="button"
        onClick={guardExit(presentPlan)}
        title={t('present.buttonTitle')}
        aria-label={t('present.button')}
        aria-disabled={canExit ? undefined : true}
        className={buttonClass}
      >
        <ChalkboardTeacherIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('present.button')}</span>
      </button>
    </div>
  );
}
