// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  MixSettings,
  Student,
  ClassroomScene,
  SeatingArrangement,
} from '@/types';
import { showToast, TOAST_MESSAGES, neutralSettings, logError } from '@/utils';
import type { AlgorithmRunOptions } from '@/hooks/useSeatingAlgorithm';

interface SeatingMixHandlerConfig {
  settings: MixSettings;
  students: Student[];
  classroomScene: ClassroomScene;
  generateSeatingPlan: (
    settings: MixSettings,
    scene: ClassroomScene,
    run?: AlgorithmRunOptions,
  ) => Promise<SeatingArrangement>;
  onMix?: () => void;
}

/**
 * How a mix ended: `mixed` with the arrangement on screen, `aborted` when an
 * unmount stopped it — nothing was mixed and nothing went wrong — `failed`
 * after the error toast, `busy` when a mix was already running.
 */
export type MixOutcome = 'mixed' | 'aborted' | 'failed' | 'busy';

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Hook for handling seating plan mix operations with validation.
 *
 * Provides a unified handler for the "Mix" button that:
 * - Decides between intelligent mixing (with criteria) or neutral random placement
 * - Runs the mix, which refines the arrangement in the same session while a
 *   criterion is on (decision 0027)
 * - Triggers post-mix callbacks
 *
 * The run is short enough that the spinner in the mix button is the whole
 * progress story; the abort signal exists only so an unmount can stop it.
 *
 * @param config - Configuration object with settings, students, and callbacks
 * @returns Object with hasCriteria flag and handleMix function
 */
export const useSeatingMixHandler = ({
  settings,
  classroomScene,
  generateSeatingPlan,
  onMix,
}: SeatingMixHandlerConfig) => {
  const [isMixing, setIsMixing] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const hasCriteria = React.useMemo(
    () => Object.values(settings).some((v) => v > 0),
    [settings],
  );

  // Nothing should outlive the component: a run still in flight would keep
  // pushing state updates into an unmounted tree.
  React.useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [],
  );

  const handleMix = React.useCallback(async (): Promise<MixOutcome> => {
    if (isMixing) {
      return 'busy';
    }

    // Use intelligent settings if criteria are set, otherwise use neutral random
    const active = hasCriteria ? settings : neutralSettings;
    const abortController = new AbortController();
    abortRef.current = abortController;
    setIsMixing(true);

    try {
      // One session: the construction, refined while a criterion is on.
      await generateSeatingPlan(active, classroomScene, {
        signal: abortController.signal,
      });
    } catch (error) {
      // An unmount aborts the run; the arrangement built so far simply stays
      // where it is, there is nothing left to report to.
      if (isAbortError(error)) {
        return 'aborted';
      }
      logError(
        'Failed to generate seating plan via mix handler',
        { error },
        'useSeatingMixHandler',
      );
      showToast('error', TOAST_MESSAGES.GENERATION_ERROR);
      return 'failed';
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
      setIsMixing(false);
    }

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
    return 'mixed';
  }, [
    hasCriteria,
    settings,
    generateSeatingPlan,
    classroomScene,
    onMix,
    isMixing,
  ]);

  return {
    hasCriteria,
    isMixing,
    handleMix,
  };
};
