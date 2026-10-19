// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { usePlanSaveState } from '@/hooks/plan/usePlanSaveState';
import { hasPlanForScene } from '@/utils';

/**
 * The two ways a finished plan leaves the workspace: the export page and the
 * smartboard.
 *
 * Both save first when the plan on screen differs from the saved one — nobody
 * wants to export something and find the file does not match what the class
 * will see. The check is `usePlanSaveState`'s, which the plan's inspector
 * reads too.
 *
 * `canExit` is false while there is no plan for these tables
 * (`hasPlanForScene`): exporting an empty room would produce an empty sheet
 * and presenting it an empty board, and a plan made for other tables would
 * put its seats beside the ones in the room.
 */
export function usePlanExits() {
  const { planName, classroomScene, currentSeating, seatingMode } =
    useSeatingPlanState();
  const { handleSaveSeatingPlan } = useSeatingPlanActions();
  const navigate = useLocalizedNavigate();
  const { hasUnsavedChanges } = usePlanSaveState();

  const saveIfNeeded = useCallback(() => {
    if (hasUnsavedChanges()) {
      handleSaveSeatingPlan(planName, classroomScene);
    }
  }, [classroomScene, handleSaveSeatingPlan, hasUnsavedChanges, planName]);

  // Both leave with the arrangement on the stage, so the sheet and the wall
  // open on the circle when the circle is what the teacher was looking at.
  const exportPlan = useCallback(() => {
    saveIfNeeded();
    navigate('/export', { state: { mode: seatingMode } });
  }, [navigate, saveIfNeeded, seatingMode]);

  const presentPlan = useCallback(() => {
    saveIfNeeded();
    navigate('/present', { state: { mode: seatingMode } });
  }, [navigate, saveIfNeeded, seatingMode]);

  return {
    exportPlan,
    presentPlan,
    canExit: hasPlanForScene(classroomScene, currentSeating),
  };
}
