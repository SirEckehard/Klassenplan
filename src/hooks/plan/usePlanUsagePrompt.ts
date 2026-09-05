// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Records a strong usage signal and offers to take it back.
 *
 * The signals are read from what the teacher does anyway, which is what makes
 * them cheap — but it also means Klassenplan can be wrong. So the record is
 * written first and the toast is the correction, not the confirmation: doing
 * nothing keeps the plan counted.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanUsageSource, SeatingArrangement } from '@/types';
import { logError, showToast } from '@/utils';
import {
  recordPlanUsage,
  setPlanUsageConfirmed,
} from '@/repositories/planUsageStore';

const LOG_SOURCE = 'usePlanUsagePrompt';

/** Long enough to read the toast and reach for the action before it goes. */
const PROMPT_DURATION_MS = 8000;

export type RecordUsageWithPrompt = (
  seating: SeatingArrangement | null | undefined,
  source: PlanUsageSource,
) => void;

/**
 * @param classId Active class; without one nothing is recorded
 * @returns Fire-and-forget recorder that prompts on the first strong signal
 */
export function usePlanUsagePrompt(
  classId: string | null,
): RecordUsageWithPrompt {
  const { t } = useTranslation();

  return useCallback(
    (seating, source) => {
      recordPlanUsage(classId, seating, source)
        .then((outcome) => {
          // Ask once per arrangement, and only when nothing stronger than a
          // hand edit has been seen for it before.
          if (!outcome?.firstStrongSignal) return;
          if (outcome.confirmed !== undefined) return;

          showToast('info', 'toast:planUsage.recorded', {
            duration: PROMPT_DURATION_MS,
            action: {
              label: t('toast:planUsage.recordedAction'),
              onClick: () => {
                setPlanUsageConfirmed(classId, outcome.id, false)
                  .then(() => {
                    showToast('success', 'toast:planUsage.dismissed');
                  })
                  .catch((error) => {
                    logError(
                      'Failed to withdraw plan usage record',
                      { error },
                      LOG_SOURCE,
                    );
                  });
              },
            },
          });
        })
        .catch((error) => {
          logError(
            'Failed to record plan usage signal',
            { error, source },
            LOG_SOURCE,
          );
        });
    },
    [classId, t],
  );
}
