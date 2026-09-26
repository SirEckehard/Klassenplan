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
 * The two ways a plan leaves the workspace, side by side in the header, left
 * of Help.
 *
 * They leave the workspace, so they sit with the other things that are not a
 * layer's business, not in the status bar, which belongs to the layer: where
 * it stands, its history, the way back and its one primary action. Blue marks
 * that action, so the exits are two equal, quiet buttons — the header's first
 * version had "Präsentieren" in blue beside it.
 *
 * The words show from `xl` up; below they are icons with their names in the
 * tooltip. A phone has no room in the header at all and finds both at the
 * foot of its tool sheet (`ToolRail`).
 */
export default function PlanExits() {
  const { t } = useTranslation('generator');
  const { onExport, onPresent, canExit } = useGuardedPlanExits();

  const buttonClass = `${secondaryButtonClass} h-9 gap-2 px-2.5 text-sm xl:px-3 ${
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
        <span className="hidden xl:inline">{t('actions.export')}</span>
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
        <span className="hidden xl:inline">{t('present.button')}</span>
      </button>
    </div>
  );
}
