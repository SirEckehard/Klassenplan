// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  MixSettings,
  Student,
  ClassroomScene,
  SeatingArrangement,
} from '@/types';
import { showToast, TOAST_MESSAGES, logError } from '@/utils';
import type { AlgorithmRunOptions } from '@/hooks/useSeatingAlgorithm';
import { countActiveSeats } from '@/utils/math/scene';

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
 * - Refuses, as the layer switch does, while the room has fewer seats in the
 *   mix than the class has students: the plan layer is reached by other ways
 *   too ("Bibliothek", "Plan öffnen …", the history), and a mix would leave
 *   the students without a seat out unannounced
 * - Mixes with the settings as they are: with no criterion on, the session
 *   deals the students onto the seats at random (decision 0031)
 * - Runs the mix, which refines the arrangement in the same session while a
 *   criterion is on (decision 0027)
 * - Triggers post-mix callbacks
 *
 * The run is short enough that the spinner in the mix button is the whole
 * progress story; the abort signal exists only so an unmount can stop it.
 *
 * @param config - Configuration object with settings, students, and callbacks
 * @returns Whether a mix is running, and the function that mixes
 */
export const useSeatingMixHandler = ({
  settings,
  students,
  classroomScene,
  generateSeatingPlan,
  onMix,
}: SeatingMixHandlerConfig) => {
  const [isMixing, setIsMixing] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

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

    if (countActiveSeats(classroomScene) < students.length) {
      showToast('error', TOAST_MESSAGES.SEATS_INSUFFICIENT);
      return 'failed';
    }

    const abortController = new AbortController();
    abortRef.current = abortController;
    setIsMixing(true);

    try {
      // One session: the construction, refined while a criterion is on.
      await generateSeatingPlan(settings, classroomScene, {
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
    settings,
    students,
    generateSeatingPlan,
    classroomScene,
    onMix,
    isMixing,
  ]);

  return {
    isMixing,
    handleMix,
  };
};
