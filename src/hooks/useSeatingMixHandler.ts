// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
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
interface SeatingMixHandlerConfig {
  settings: MixSettings;
  students: Student[];
  classroomScene: ClassroomScene;
  generateSeatingPlan: (
    settings: MixSettings,
    scene: ClassroomScene,
  ) => Promise<SeatingArrangement>;
  refineSeatingLocal?: (
    settings: MixSettings,
    scene: ClassroomScene,
    options: { triesPerPass: number; passes: number },
    arrangement: SeatingArrangement,
  ) => Promise<SeatingArrangement>;
  onMix?: () => void;
}

/**
 * Hook for handling seating plan mix operations with validation and refinement.
 *
 * Provides a unified handler for the "Mix" button that:
 * - Decides between intelligent mixing (with criteria) or neutral random placement
 * - Generates initial seating arrangement
 * - Optionally refines the arrangement using local optimization
 * - Triggers post-mix callbacks
 *
 * @param config - Configuration object with settings, students, and callbacks
 * @returns Object with hasCriteria flag and handleMix function
 */
export const useSeatingMixHandler = ({
  settings,
  classroomScene,
  generateSeatingPlan,
  refineSeatingLocal,
  onMix,
}: SeatingMixHandlerConfig) => {
  const [isMixing, setIsMixing] = React.useState(false);
  const hasCriteria = React.useMemo(
    () => Object.values(settings).some((v) => v > 0),
    [settings],
  );

  const handleMix = React.useCallback(async () => {
    if (isMixing) {
      return;
    }

    // Use intelligent settings if criteria are set, otherwise use neutral random
    const active = hasCriteria ? settings : neutralSettings;
    setIsMixing(true);
    try {
      const arrangement = await generateSeatingPlan(active, classroomScene);

      // Refine arrangement if criteria are active and refinement is available
      if (hasCriteria && refineSeatingLocal) {
        await refineSeatingLocal(
          active,
          classroomScene,
          { triesPerPass: DEFAULT_TRIES_PER_PASS, passes: DEFAULT_PASSES },
          arrangement,
        );
      }
    } catch (error) {
      logError(
        'Failed to generate seating plan via mix handler',
        { error },
        'useSeatingMixHandler',
      );
      showToast('error', TOAST_MESSAGES.GENERATION_ERROR);
      return;
    } finally {
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
  }, [
    hasCriteria,
    settings,
    generateSeatingPlan,
    classroomScene,
    refineSeatingLocal,
    onMix,
    isMixing,
  ]);

  return {
    hasCriteria,
    isMixing,
    handleMix,
  };
};
