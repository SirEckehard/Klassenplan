// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useState } from 'react';
import type { SeatingArrangement } from '@/types';
import type { CircleLayout } from '@/types/Circle';

interface CircleAfterMixConfig {
  currentSeating: SeatingArrangement;
  circleLayout: CircleLayout | null;
  regenerateCircle: () => Promise<CircleLayout | null>;
}

/**
 * Draws the circle anew once the table plan was mixed, while the class has
 * one: the circle follows the table neighbours, and a mix gave everybody new
 * ones. `handleMix` is what the mix calls when it is done.
 */
export function useCircleAfterMix({
  currentSeating,
  circleLayout,
  regenerateCircle,
}: CircleAfterMixConfig): {
  shouldRegenerateCircle: boolean;
  setShouldRegenerateCircle: (should: boolean) => void;
  handleMix: () => void;
} {
  const [shouldRegenerateCircle, setShouldRegenerateCircle] = useState(false);

  useEffect(() => {
    if (!shouldRegenerateCircle || !circleLayout || currentSeating.length === 0)
      return undefined;
    // A moment for the mix's own state updates to land first.
    const timeoutId = setTimeout(() => {
      void regenerateCircle();
      setShouldRegenerateCircle(false);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [
    shouldRegenerateCircle,
    circleLayout,
    currentSeating.length,
    regenerateCircle,
  ]);

  const handleMix = useCallback(() => {
    if (circleLayout) setShouldRegenerateCircle(true);
  }, [circleLayout]);

  return { shouldRegenerateCircle, setShouldRegenerateCircle, handleMix };
}
