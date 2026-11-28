// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How the plan on the stage went, given on the plan layer (decision 0054,
 * addendum of 2026-11-27). Three places say it, and this is the one state
 * they share:
 *
 * - "Mischen" asks once before it mixes a plan in use over, from the day
 *   after that plan was first in use: the teacher knows by then how it went,
 *   the plan is still on the stage, and the answer counts in the mix that
 *   follows. "Überspringen & mischen" mixes as before.
 * - "Nicht gut" turns the stage into a choice of tables: the teacher taps
 *   where it did not work, on the plan where those tables stand, and
 *   "Fertig" — or "Mischen", when the question led there — ends it.
 * - The inspector's row ("Wie lief der Plan?") gives and changes
 *   it while the plan is in use.
 *
 * What is given here shows at once and is written to the store, which hands
 * it back through the class's records; a mix asked for meanwhile waits for
 * that, since the mixing reads those records.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PlanFeedback,
  PlanFeedbackRating,
  PlanUsage,
  SeatingArrangement,
} from '@/types';
import { hasPlanForScene, logError, logWarn } from '@/utils';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useInspector } from '@/contexts/InspectorContext';
import { usePlanSaveState } from '@/hooks/plan/usePlanSaveState';
import { useSetPlanFeedback } from '@/hooks/plan/useSetPlanFeedback';
import type { MixOutcome } from '@/hooks/useSeatingMixHandler';
import {
  findPlanUsage,
  isCountedUsage,
  isRecordOf,
  planPairsOf,
  poorTableKey,
  storedPlanDateToTimestamp,
  withPoorTable,
} from '@/utils/data/planUsage';
import {
  inUseBeforeToday,
  noteAskedPlanFeedback,
  planToAskBeforeMix,
  readAskedPlanFeedback,
} from '@/utils/data/planFeedbackPrompt';

const LOG_SOURCE = 'usePlanFeedbackFlow';

/**
 * How long a mix waits for the store to hand feedback back before it mixes
 * without: a write that failed is logged where it failed.
 */
const STORE_WAIT_MS = 2000;

/** What ends choosing the tables on the stage. */
export type PlanFeedbackPickingEnd = 'done' | 'mix';

/** The question "Mischen" asks before it mixes a plan in use over. */
export interface PlanFeedbackQuestion {
  record: PlanUsage;
  /** The name the plan was saved under, where it was. */
  planName: string | null;
}

export type PlanFeedbackAnswer = PlanFeedbackRating | 'skip' | 'dismiss';

export interface PlanFeedbackFlow {
  /**
   * Whether the plan on the stage can say how it went: it was in use before
   * today — a plan saved a minute ago has not been in a classroom yet — or it
   * already did.
   */
  available: boolean;
  /** How it went, as last said here, before the store has it back. */
  feedback: PlanFeedback | undefined;
  /** Says how it went, or takes that back with `null`. */
  give: (feedback: PlanFeedback | null) => void;
  /** Adds a table where it did not work, or takes it out. */
  toggleTable: (ids: readonly string[]) => void;
  /** While the stage asks for the tables: what ends it. */
  picking: PlanFeedbackPickingEnd | null;
  startPicking: (end: PlanFeedbackPickingEnd) => void;
  /** Ends choosing the tables, and mixes when `mix` says so. */
  finishPicking: (mix: boolean) => void;
  /** The question standing at "Mischen", if any. */
  question: PlanFeedbackQuestion | null;
  answer: (answer: PlanFeedbackAnswer) => void;
  /** What "Mischen" does: asks first where a plan in use is due, or mixes. */
  requestMix: () => void;
}

export function usePlanFeedbackFlow({
  handleMix,
  mixingLocked,
}: {
  handleMix: () => Promise<MixOutcome>;
  mixingLocked: boolean;
}): PlanFeedbackFlow {
  const {
    activeClass,
    classroomScene,
    currentSeating,
    mixSettings,
    planUsage,
    seatingHistory,
  } = useSeatingPlanState();
  const { openPlan, hasUnsavedChanges } = usePlanSaveState();
  const setFeedback = useSetPlanFeedback(activeClass.id);
  const { setDrawerOpen } = useInspector();

  const hasPlan = hasPlanForScene(classroomScene, currentSeating);
  const record = useMemo(
    () =>
      hasPlan
        ? findPlanUsage(planUsage, currentSeating, classroomScene)
        : undefined,
    [classroomScene, currentSeating, hasPlan, planUsage],
  );
  // A record a feedback creates is dated the day the plan was saved.
  const madeAt = openPlan
    ? (storedPlanDateToTimestamp(openPlan.date) ?? undefined)
    : undefined;
  const savedAsShown = openPlan !== undefined && !hasUnsavedChanges();

  // What was said here and the store has not handed back yet, for the plan
  // it was said about.
  const [given, setGiven] = useState<{
    feedback: PlanFeedback | null;
    seating: SeatingArrangement;
  } | null>(null);
  const stored = record?.feedback;
  const [picking, setPicking] = useState<PlanFeedbackPickingEnd | null>(null);
  const [question, setQuestion] = useState<PlanFeedbackQuestion | null>(null);
  // Asked about in this window, on top of what the device keeps.
  const [answered, setAnswered] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Adjusted while rendering, as React has it for state that follows other
  // state: what was said is let go once the store handed it back or the
  // stage shows another plan, and another plan — an undo, a plan opened —
  // ends the question and the choice of tables.
  const [shown, setShown] = useState(currentSeating);
  if (shown !== currentSeating) {
    setShown(currentSeating);
    setPicking(null);
    setQuestion(null);
  }
  if (
    given &&
    (given.seating !== currentSeating ||
      (stored?.at ?? null) === (given.feedback?.at ?? null))
  ) {
    setGiven(null);
  }
  const pending =
    given?.seating === currentSeating &&
    (stored?.at ?? null) !== (given.feedback?.at ?? null)
      ? given
      : null;
  const feedback = pending ? (pending.feedback ?? undefined) : stored;

  const since =
    record && isCountedUsage(record)
      ? record.firstSeenAt
      : savedAsShown
        ? madeAt
        : undefined;
  const available =
    hasPlan && (feedback !== undefined || inUseBeforeToday(since));

  // A mix asked for waits until what was said is in the records it reads.
  const [mixPending, setMixPending] = useState(false);
  const handleMixRef = useRef(handleMix);
  useEffect(() => {
    handleMixRef.current = handleMix;
  });
  useEffect(() => {
    if (!mixPending) return undefined;
    if (pending) {
      const timer = window.setTimeout(() => {
        logWarn('Mixing without the feedback just given', {}, LOG_SOURCE);
        setGiven(null);
      }, STORE_WAIT_MS);
      return () => window.clearTimeout(timer);
    }
    // After this commit's effects: the mixing reads the records through a
    // ref its provider sets in an effect of its own.
    const timer = window.setTimeout(() => {
      setMixPending(false);
      handleMixRef.current().catch((error: unknown) => {
        logError('Mix after feedback failed', { error }, LOG_SOURCE);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mixPending, pending]);

  const give = useCallback(
    (next: PlanFeedback | null) => {
      setGiven({ feedback: next, seating: currentSeating });
      setFeedback(
        currentSeating,
        classroomScene,
        next,
        madeAt ?? new Date().toISOString(),
      );
      if (next?.rating !== 'poor') setPicking(null);
    },
    [classroomScene, currentSeating, madeAt, setFeedback],
  );

  const toggleTable = useCallback(
    (ids: readonly string[]) => {
      const key = poorTableKey(ids);
      const on = !(feedback?.poorTables ?? []).some(
        (table) => poorTableKey(table) === key,
      );
      give(withPoorTable(feedback, ids, on, new Date().toISOString()));
    },
    [feedback, give],
  );

  const startPicking = useCallback(
    (end: PlanFeedbackPickingEnd) => {
      setPicking(end);
      // Below `lg` the inspector is a drawer over the stage.
      setDrawerOpen(false);
    },
    [setDrawerOpen],
  );

  const finishPicking = useCallback((mix: boolean) => {
    setPicking(null);
    if (mix) setMixPending(true);
  }, []);

  const planNameOf = useCallback(
    (asked: PlanUsage) => {
      const saved = seatingHistory.find((plan) => {
        if (plan.autoSaved) return false;
        const pairs = planPairsOf(plan.seating, plan.scene);
        return pairs !== null && isRecordOf(asked, pairs);
      });
      return saved?.name ?? null;
    },
    [seatingHistory],
  );

  const requestMix = useCallback(() => {
    if (mixingLocked) return;
    // While the tables are chosen, "Mischen" ends that and mixes.
    if (picking) {
      finishPicking(true);
      return;
    }
    // Pressed again, it puts the question away.
    if (question) {
      setQuestion(null);
      return;
    }
    const due =
      (mixSettings.considerPlanFeedback ?? 0) > 0 && !pending
        ? planToAskBeforeMix(
            record,
            new Set([...readAskedPlanFeedback(), ...answered]),
          )
        : null;
    if (due) {
      setQuestion({ record: due, planName: planNameOf(due) });
      return;
    }
    setMixPending(true);
  }, [
    answered,
    finishPicking,
    mixSettings.considerPlanFeedback,
    mixingLocked,
    pending,
    picking,
    planNameOf,
    question,
    record,
  ]);

  const answer = useCallback(
    (reply: PlanFeedbackAnswer) => {
      const asked = question;
      if (!asked) return;
      setQuestion(null);
      if (reply === 'dismiss') return;
      noteAskedPlanFeedback(asked.record.id);
      setAnswered((current) => new Set([...current, asked.record.id]));
      if (reply === 'skip') {
        setMixPending(true);
        return;
      }
      give({ rating: reply, at: new Date().toISOString() });
      if (reply === 'good') setMixPending(true);
      else startPicking('mix');
    },
    [give, question, startPicking],
  );

  return {
    available,
    feedback,
    give,
    toggleTable,
    picking,
    startPicking,
    finishPicking,
    question,
    answer,
    requestMix,
  };
}
