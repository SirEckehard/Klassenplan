import { useCallback, useEffect } from 'react';
import type { SeatingMode } from '@/components/SeatingPlanGenerator/SeatingModeToggle';
import {
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';

interface UseEnsureCircleLayoutOptions {
  enabled?: boolean;
}

export function useEnsureCircleLayout(
  seatingMode: SeatingMode,
  { enabled = true }: UseEnsureCircleLayoutOptions = {},
) {
  const { circleLayout, circleGenerationInProgress } = useSeatingPlanState();
  const { generateCircleSeating } = useSeatingPlanActions();

  const ensureCircleLayout = useCallback(
    (modeOverride?: SeatingMode) => {
      const effectiveMode = modeOverride ?? seatingMode;

      if (
        !enabled ||
        effectiveMode !== 'circle' ||
        circleLayout ||
        circleGenerationInProgress
      ) {
        return false;
      }

      void generateCircleSeating({ mode: 'preserve-neighbors' });
      return true;
    },
    [
      enabled,
      seatingMode,
      circleLayout,
      circleGenerationInProgress,
      generateCircleSeating,
    ],
  );

  useEffect(() => {
    ensureCircleLayout();
  }, [ensureCircleLayout]);

  return ensureCircleLayout;
}
