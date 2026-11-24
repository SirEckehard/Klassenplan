// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Asks once how the last plan in use went (decision 0054, addendum of
 * 2026-11-24): on the plan layer, once that plan was followed by another
 * after a week at least, and while "Erfahrung" counts. Its answer is the
 * feedback the plan's inspector gives; "Später" leaves the plan for good,
 * where "Bibliothek" can still take it.
 */
import { useCallback, useMemo, useState } from 'react';
import type { PlanFeedbackRating, PlanUsage } from '@/types';
import { logError } from '@/utils';
import {
  useSeatingAlgorithmContext,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { setPlanUsageFeedback } from '@/repositories/planUsageStore';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '@/utils/data/planUsage';
import {
  noteAskedPlanFeedback,
  planToAskAbout,
  readAskedPlanFeedback,
} from '@/utils/data/planFeedbackPrompt';

const LOG_SOURCE = 'usePlanFeedbackPrompt';

export interface PlanFeedbackPrompt {
  /** The plan to ask about, or null while nothing is to ask. */
  record: PlanUsage | null;
  /** The name it was saved under, where it was. */
  planName: string | null;
  rate: (rating: PlanFeedbackRating) => void;
  later: () => void;
}

const fingerprintOf = (
  seating: Parameters<typeof collectSeatingPairKeys>[0],
): string | null => {
  const pairs = collectSeatingPairKeys(seating);
  return pairs.length > 0 ? computePlanFingerprint(pairs) : null;
};

export function usePlanFeedbackPrompt(): PlanFeedbackPrompt {
  const { step } = useSeatingAlgorithmContext();
  const {
    activeClass,
    currentSeating,
    mixSettings,
    planUsage,
    seatingHistory,
  } = useSeatingPlanState();
  // Asked about in this window, on top of what the device keeps.
  const [answered, setAnswered] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const shownFingerprint = useMemo(
    () => fingerprintOf(currentSeating),
    [currentSeating],
  );
  const record = useMemo(() => {
    if (step !== 3 || !activeClass.id) return null;
    if ((mixSettings.considerPlanFeedback ?? 0) <= 0) return null;
    const asked = new Set([...readAskedPlanFeedback(), ...answered]);
    return planToAskAbout(planUsage, shownFingerprint, asked);
  }, [
    activeClass.id,
    answered,
    mixSettings.considerPlanFeedback,
    planUsage,
    shownFingerprint,
    step,
  ]);

  const planName = useMemo(() => {
    if (!record) return null;
    const saved = seatingHistory.find(
      (plan) =>
        !plan.autoSaved && fingerprintOf(plan.seating) === record.fingerprint,
    );
    return saved?.name ?? null;
  }, [record, seatingHistory]);

  const settle = useCallback((recordId: string) => {
    noteAskedPlanFeedback(recordId);
    setAnswered((current) => new Set([...current, recordId]));
  }, []);

  const rate = useCallback(
    (rating: PlanFeedbackRating) => {
      if (!record || !activeClass.id) return;
      settle(record.id);
      setPlanUsageFeedback(activeClass.id, record, {
        rating,
        at: new Date().toISOString(),
      }).catch((error: unknown) => {
        logError('Failed to keep how a plan went', { error }, LOG_SOURCE);
      });
    },
    [activeClass.id, record, settle],
  );

  const later = useCallback(() => {
    if (record) settle(record.id);
  }, [record, settle]);

  return { record, planName, rate, later };
}
