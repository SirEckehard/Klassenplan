import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_TRIES_PER_PASS, DEFAULT_PASSES, logError } from '@/utils';
import type { ClassroomScene, MixSettings, SeatingArrangement } from '@/types';
import type { CircleLayout, CircleGenerationOptions } from '@/types/Circle';
import {
  useAutoMixTriggerController,
  type AutoMixTriggerHandler,
  type AutoMixTriggerOverrides,
} from '../algorithm/useAutoMixTriggers';

export interface AutoMixConfig {
  step: number;
  currentSeating: SeatingArrangement;
  classroomScene: ClassroomScene;
  mixSettings: MixSettings;
  intelligentMix: boolean;
  circleLayout: CircleLayout | null;
  refineSeatingLocal: (
    settings: MixSettings,
    scene: ClassroomScene,
    options: { triesPerPass: number; passes: number },
  ) => Promise<SeatingArrangement>;
  regenerateCircle: (
    options?: Partial<CircleGenerationOptions>,
  ) => Promise<CircleLayout | null>;
}

export interface AutoMixState {
  pendingRefine: boolean;
  shouldRegenerateCircle: boolean;
}

export interface AutoMixActions {
  requestAutoRefine: () => void;
  setShouldRegenerateCircle: (should: boolean) => void;
  handleMix: () => void;
  triggerAutoMixEvent: AutoMixTriggerHandler;
}

/**
 * Hook for managing automatic mix triggers and refinement
 */
export function useAutoMixTrigger(
  config: AutoMixConfig,
  options: {
    enabled?: boolean;
    loggerContext?: string;
    triggerOverrides?: AutoMixTriggerOverrides;
  } = {},
): AutoMixState & AutoMixActions {
  const {
    step,
    currentSeating,
    classroomScene,
    mixSettings,
    intelligentMix,
    circleLayout,
    refineSeatingLocal,
    regenerateCircle,
  } = config;
  const { enabled = true, loggerContext, triggerOverrides } = options;

  const [pendingRefine, setPendingRefine] = useState(false);
  const [shouldRegenerateCircle, setShouldRegenerateCircle] = useState(false);
  const requestAutoRefine = useCallback(() => {
    setPendingRefine(true);
  }, []);

  const triggerAutoMixEvent = useAutoMixTriggerController({
    requestRefine: requestAutoRefine,
    mixSettings,
    step,
    intelligentMix,
    enabled,
    loggerContext: loggerContext ?? 'useAutoMixTrigger',
    triggers: triggerOverrides,
  });

  // Auto-refine when conditions are met
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      pendingRefine &&
      step === 3 &&
      intelligentMix &&
      currentSeating &&
      currentSeating.length > 0
    ) {
      void (async () => {
        try {
          await refineSeatingLocal(mixSettings, classroomScene, {
            triesPerPass: DEFAULT_TRIES_PER_PASS,
            passes: DEFAULT_PASSES,
          });
        } catch (error) {
          logError(
            'Automatic seating refinement failed',
            { error },
            'useAutoMixTrigger',
          );
        } finally {
          setPendingRefine(false);
        }
      })();
    }
  }, [
    enabled,
    pendingRefine,
    step,
    intelligentMix,
    currentSeating,
    refineSeatingLocal,
    mixSettings,
    classroomScene,
  ]);

  // Auto-regenerate circle when seating changes after mix
  useEffect(() => {
    if (
      enabled &&
      shouldRegenerateCircle &&
      circleLayout &&
      currentSeating.length > 0
    ) {
      // Small delay to ensure all state updates are complete
      const timeoutId = setTimeout(() => {
        void regenerateCircle({ mode: 'preserve-neighbors' });
        setShouldRegenerateCircle(false);
      }, 100);

      // Cleanup: Clear timeout if component unmounts or dependencies change
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [
    enabled,
    shouldRegenerateCircle,
    circleLayout,
    currentSeating.length,
    regenerateCircle,
  ]);

  const handleMix = useCallback(() => {
    // Auto-regenerate circle layout when table is mixed (if circle exists)
    if (enabled && circleLayout) {
      setShouldRegenerateCircle(true);
    }
  }, [circleLayout, enabled]);

  return {
    pendingRefine,
    shouldRegenerateCircle,
    requestAutoRefine,
    setShouldRegenerateCircle,
    handleMix,
    triggerAutoMixEvent,
  };
}
