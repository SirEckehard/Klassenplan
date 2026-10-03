// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ChalkboardTeacherIcon, ExportIcon } from '@phosphor-icons/react';
import { usePlanExits } from '@/hooks/plan/usePlanExits';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { secondaryButtonClass, showToast, TOAST_MESSAGES } from '@/utils';
import { statusBarWordClass } from '@/components/shell/StatusBarFrame';

/**
 * The two exits as a control calls them: both stay clickable without a plan,
 * because a disabled button would leave a teacher guessing — the toast says
 * what is missing.
 */
export function useGuardedPlanExits() {
  const { exportPlan, presentPlan, canExit } = usePlanExits();

  const guardExit = (run: () => void) => () => {
    if (!canExit) {
      showToast('info', TOAST_MESSAGES.PLAN_NONE_YET);
      return;
    }
    run();
  };

  return {
    onExport: guardExit(exportPlan),
    onPresent: guardExit(presentPlan),
    canExit,
  };
}

/**
 * The two ways a plan leaves the workspace, at the right end of the plan
 * layer's status bar, beside "Zurück".
 *
 * Every other layer has its way on there — "Weiter" to the next layer. The
 * plan layer is the last, so its way on leads out of the workspace: to the
 * export page or to the board, presenting at the outer end. Blue marks the
 * layer's own action, "Mischen" in the middle of the bar, so the exits are
 * quiet buttons.
 *
 * Their words show on a desktop and a whiteboard (`statusBarWordClass`); a
 * phone and a tablet show the icons, with the names in the tooltip and the
 * accessible name. A phone's bar has room for one of them: exporting, which a
 * teacher reaches for far more often, stays; presenting moves to the foot of
 * its tool sheet (`ToolRail`'s `planPresent`).
 */
export default function PlanExits() {
  const { t } = useTranslation('generator');
  const { onExport, onPresent, canExit } = useGuardedPlanExits();

  const buttonClass = `${secondaryButtonClass} h-9 shrink-0 gap-2 px-2.5 text-sm whitespace-nowrap lg:pointer-fine:px-3 xl:px-3 ${
    canExit ? '' : 'opacity-60'
  }`;

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      data-tour={TOUR_ANCHORS.planExits}
    >
      {/* The accessible names are spelled out once for every width. */}
      <button
        type="button"
        onClick={onExport}
        title={t('actions.exportShortcut')}
        aria-label={t('actions.export')}
        aria-disabled={canExit ? undefined : true}
        className={buttonClass}
      >
        <ExportIcon className="h-4 w-4" aria-hidden="true" />
        <span className={statusBarWordClass}>{t('actions.export')}</span>
      </button>
      <button
        type="button"
        onClick={onPresent}
        title={t('present.buttonTitle')}
        aria-label={t('present.button')}
        aria-disabled={canExit ? undefined : true}
        className={`${buttonClass} hidden md:inline-flex`}
      >
        <ChalkboardTeacherIcon className="h-4 w-4" aria-hidden="true" />
        <span className={statusBarWordClass}>{t('present.button')}</span>
      </button>
    </div>
  );
}
