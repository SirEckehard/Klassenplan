// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ChalkboardTeacherIcon, ExportIcon } from '@phosphor-icons/react';
import { usePlanExits } from '@/hooks/plan/usePlanExits';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { secondaryButtonClass, showToast, TOAST_MESSAGES } from '@/utils';

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
 * The two ways a plan leaves the workspace, side by side at the right end of
 * the plan layer's status bar, beside "Zurück".
 *
 * Every other layer has its way on there — "Weiter" to the next layer. The
 * plan layer is the last, so its way on leads out of the workspace: to the
 * export page or to the board. They used to sit in the header, beside Help,
 * as things that are no layer's business; but a plan is what they carry out,
 * and the header is calmer for it. Blue marks the layer's own action,
 * "Mischen" in the middle of the bar, so the exits are two equal, quiet
 * buttons.
 *
 * The words show from `xl` up; below they are icons with their names in the
 * tooltip. A touch screen shows no tooltip, so there the words come from `lg`
 * up, an iPad in landscape included. A phone's status bar has no room left
 * for them, so it finds both at the foot of its tool sheet (`ToolRail`).
 */
export default function PlanExits() {
  const { t } = useTranslation('generator');
  const { onExport, onPresent, canExit } = useGuardedPlanExits();

  const buttonClass = `${secondaryButtonClass} h-9 gap-2 px-2.5 text-sm whitespace-nowrap lg:pointer-coarse:px-3 xl:px-3 ${
    canExit ? '' : 'opacity-60'
  }`;

  return (
    <div
      className="hidden shrink-0 items-center gap-2 md:flex"
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
        <span className="hidden lg:pointer-coarse:inline xl:inline">
          {t('actions.export')}
        </span>
      </button>
      <button
        type="button"
        onClick={onPresent}
        title={t('present.buttonTitle')}
        aria-label={t('present.button')}
        aria-disabled={canExit ? undefined : true}
        className={buttonClass}
      >
        <ChalkboardTeacherIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:pointer-coarse:inline xl:inline">
          {t('present.button')}
        </span>
      </button>
    </div>
  );
}
