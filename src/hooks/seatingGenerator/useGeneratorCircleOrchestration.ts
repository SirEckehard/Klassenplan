// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { useCircleActions } from '../useCircleSeating';
import { createCircleStateAdapter } from '../circle/useCircleStateAdapter';
import type { SeatingArrangement } from '@/types';
import type { SeatingState } from '../useSeatingState';

/**
 * Parameters for the circle orchestration hook
 */
interface CircleOrchestrationParams {
  seatingState: SeatingState;
  currentSeating: SeatingArrangement;
}

/**
 * Return type for the circle orchestration hook
 */
export interface CircleOrchestrationReturn {
  // Circle actions
  generateCircleSeating: ReturnType<
    typeof useCircleActions
  >['generateCircleSeating'];
  regenerateCircle: ReturnType<typeof useCircleActions>['regenerateCircle'];
  updateStudentPosition: ReturnType<
    typeof useCircleActions
  >['updateStudentPosition'];
  swapStudentPositions: ReturnType<
    typeof useCircleActions
  >['swapStudentPositions'];
  batchSwapStudentPositions: ReturnType<
    typeof useCircleActions
  >['batchSwapStudentPositions'];
  clearCircleLayout: ReturnType<typeof useCircleActions>['clearCircleLayout'];
  syncCircleFromTable: ReturnType<
    typeof useCircleActions
  >['syncCircleFromTable'];
  cancelCircleGeneration: ReturnType<
    typeof useCircleActions
  >['cancelCircleGeneration'];
}

/**
 * Orchestrates circle layout actions.
 *
 * Wraps useCircleActions with createCircleStateAdapter for clean state management.
 *
 * @param params - State needed for circle orchestration
 * @returns Circle actions
 */
export function useGeneratorCircleOrchestration(
  params: CircleOrchestrationParams,
): CircleOrchestrationReturn {
  const { seatingState, currentSeating } = params;

  // Create adapter for circle state requirements
  const circleState = useMemo(
    () => createCircleStateAdapter(seatingState),
    [seatingState],
  );

  // Get circle actions
  const circleActions = useCircleActions(circleState, currentSeating);

  const {
    generateCircleSeating,
    regenerateCircle,
    updateStudentPosition,
    swapStudentPositions,
    batchSwapStudentPositions,
    clearCircleLayout,
    syncCircleFromTable,
    cancelCircleGeneration,
  } = circleActions;

  return {
    // Circle actions
    generateCircleSeating,
    regenerateCircle,
    updateStudentPosition,
    swapStudentPositions,
    batchSwapStudentPositions,
    clearCircleLayout,
    syncCircleFromTable,
    cancelCircleGeneration,
  };
}
