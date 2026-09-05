// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import i18n from '@/i18n';
import type {
  MixSettings,
  Student,
  ClassroomScene,
  SeatingArrangement,
} from '@/types';
import {
  showToast,
  TOAST_MESSAGES,
  neutralSettings,
  DEFAULT_TRIES_PER_PASS,
  DEFAULT_PASSES,
  logError,
} from '@/utils';
import type { AlgorithmRunOptions } from '@/hooks/useSeatingAlgorithm';
import type { WorkerProgressPayload } from '@/workers/algorithmWorker.types';

/**
 * What the mix is doing right now, for the button's progress readout.
 *
 * `progress` is a 0..1 fraction across the *whole* mix, not the current worker
 * call — see {@link CONSTRUCTION_SHARE}.
 */
export interface MixStatus {
  progress: number;
  stage?: string;
  message: string;
}

/**
 * Share of the progress bar given to the construction phase.
 *
 * A mix is two worker calls: `mix:generate` builds an arrangement in one greedy
 * pass (fast, and with no inner loop to sample), then `mix:refine` improves it
 * with Simulated Annealing over a few hundred cooling steps (slow, and able to
 * report a real fraction). Splitting the bar this way keeps it moving during
 * the part that actually takes time instead of jumping from 0 to 100.
 */
const CONSTRUCTION_SHARE = 0.25;

/**
 * How long the finished bar stays on screen.
 *
 * Both worker calls end by reporting 100%, but that state was never painted:
 * the final progress message and the result message arrive in the same frame,
 * so React committed the full bar and the cleared bar together and the bar
 * appeared to stall short of the end and vanish. Holding it also gives the
 * 200 ms width transition time to arrive where it was heading.
 */
const COMPLETION_HOLD_MS = 700;

interface SeatingMixHandlerConfig {
  settings: MixSettings;
  students: Student[];
  classroomScene: ClassroomScene;
  generateSeatingPlan: (
    settings: MixSettings,
    scene: ClassroomScene,
    forceNew?: boolean,
    run?: AlgorithmRunOptions,
  ) => Promise<SeatingArrangement>;
  refineSeatingLocal?: (
    settings: MixSettings,
    scene: ClassroomScene,
    options: { triesPerPass: number; passes: number },
    arrangement: SeatingArrangement,
    run?: AlgorithmRunOptions,
  ) => Promise<SeatingArrangement>;
  onMix?: () => void;
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Turn a worker progress payload into the status the button renders.
 *
 * The worker reports a stage key, never a phrase — it cannot know the UI
 * language. Unknown stages fall back to the generic "mixing" message.
 */
const toStatus = (
  payload: WorkerProgressPayload | undefined,
  offset: number,
  share: number,
): MixStatus => {
  const fraction =
    typeof payload?.progress === 'number'
      ? Math.min(Math.max(payload.progress, 0), 1)
      : 0;
  const stageMessage = payload?.stage
    ? i18n.t(`generator:mixStage.${payload.stage}`, { defaultValue: '' })
    : '';

  return {
    progress: Math.min(offset + fraction * share, 1),
    stage: payload?.stage,
    message: stageMessage || i18n.t('generator:mixButton.loadingTitle'),
  };
};

/**
 * Hook for handling seating plan mix operations with validation and refinement.
 *
 * Provides a unified handler for the "Mix" button that:
 * - Decides between intelligent mixing (with criteria) or neutral random placement
 * - Generates initial seating arrangement
 * - Optionally refines the arrangement using local optimization
 * - Reports progress and can be cancelled mid-run
 * - Triggers post-mix callbacks
 *
 * @param config - Configuration object with settings, students, and callbacks
 * @returns Object with hasCriteria flag, status, cancel and handleMix function
 */
export const useSeatingMixHandler = ({
  settings,
  classroomScene,
  generateSeatingPlan,
  refineSeatingLocal,
  onMix,
}: SeatingMixHandlerConfig) => {
  const [isMixing, setIsMixing] = React.useState(false);
  const [mixStatus, setMixStatus] = React.useState<MixStatus | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const completionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearCompletionHold = React.useCallback(() => {
    if (completionTimerRef.current !== null) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const hasCriteria = React.useMemo(
    () => Object.values(settings).some((v) => v > 0),
    [settings],
  );

  // Nothing should outlive the component: a run still in flight would keep
  // pushing status updates into an unmounted tree.
  React.useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
      if (completionTimerRef.current !== null) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    },
    [],
  );

  const cancelMix = React.useCallback(() => {
    if (!abortRef.current) {
      return;
    }
    abortRef.current.abort();
    abortRef.current = null;
    clearCompletionHold();
    setIsMixing(false);
    setMixStatus(null);
    showToast('info', TOAST_MESSAGES.MIX_CANCELLED);
  }, [clearCompletionHold]);

  const handleMix = React.useCallback(async () => {
    if (isMixing) {
      return;
    }

    // Use intelligent settings if criteria are set, otherwise use neutral random
    const active = hasCriteria ? settings : neutralSettings;
    const abortController = new AbortController();
    // A hold left over from the previous mix would clear this run's status.
    clearCompletionHold();
    abortRef.current = abortController;
    setIsMixing(true);
    setMixStatus(toStatus({ progress: 0, stage: 'initializing' }, 0, 0));

    try {
      const arrangement = await generateSeatingPlan(
        active,
        classroomScene,
        true,
        {
          signal: abortController.signal,
          onProgress: (payload) =>
            setMixStatus(toStatus(payload, 0, CONSTRUCTION_SHARE)),
        },
      );

      // Refine arrangement if criteria are active and refinement is available
      if (hasCriteria && refineSeatingLocal) {
        await refineSeatingLocal(
          active,
          classroomScene,
          { triesPerPass: DEFAULT_TRIES_PER_PASS, passes: DEFAULT_PASSES },
          arrangement,
          {
            signal: abortController.signal,
            onProgress: (payload) =>
              setMixStatus(
                toStatus(payload, CONSTRUCTION_SHARE, 1 - CONSTRUCTION_SHARE),
              ),
          },
        );
      }
    } catch (error) {
      // Cancelling during refinement leaves the freshly constructed (but
      // un-refined) arrangement on screen. That is the useful outcome: the user
      // asked to stop waiting, not to undo the mix.
      setMixStatus(null);
      if (isAbortError(error)) {
        return;
      }
      logError(
        'Failed to generate seating plan via mix handler',
        { error },
        'useSeatingMixHandler',
      );
      showToast('error', TOAST_MESSAGES.GENERATION_ERROR);
      return;
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
      setIsMixing(false);
    }

    // Show the bar completed rather than letting it disappear mid-fill, then
    // take it away on its own. `isMixing` is already false, so nothing waits
    // on this — the toolbar drops the cancel button once the bar is full.
    setMixStatus({
      progress: 1,
      stage: 'done',
      message: i18n.t('generator:mixStage.done'),
    });
    completionTimerRef.current = setTimeout(() => {
      completionTimerRef.current = null;
      setMixStatus(null);
    }, COMPLETION_HOLD_MS);

    // Trigger post-mix callback (e.g., for circle layout regeneration)
    try {
      onMix?.();
    } catch (callbackError) {
      logError(
        'Mix completion callback failed',
        { error: callbackError },
        'useSeatingMixHandler',
      );
    }
  }, [
    hasCriteria,
    settings,
    generateSeatingPlan,
    classroomScene,
    refineSeatingLocal,
    onMix,
    isMixing,
    clearCompletionHold,
  ]);

  return {
    hasCriteria,
    isMixing,
    mixStatus,
    cancelMix,
    handleMix,
  };
};
