// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import equal from 'fast-deep-equal';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useOpenPlan } from '@/hooks/plan/useOpenPlan';
import { hasSeatedStudent } from '@/utils';

/**
 * The two ways a finished plan leaves the workspace: the export page and the
 * smartboard.
 *
 * Both save first when the plan on screen differs from the saved one — nobody
 * wants to export something and find the file does not match what the class
 * will see. The check used to exist twice, once in the table editor and once
 * in the circle view, each comparing a slightly different set of fields; here
 * the mode decides which fields matter, so table plans keep ignoring the
 * circle layout exactly as before.
 *
 * `canExit` is false while there is no plan at all (`hasSeatedStudent`):
 * exporting an empty room would produce an empty sheet and presenting it an
 * empty board.
 */
export function usePlanExits() {
  const {
    planName,
    classroomScene,
    currentSeating,
    circleLayout,
    seatingMode,
  } = useSeatingPlanState();
  const { handleSaveSeatingPlan } = useSeatingPlanActions();
  const navigate = useLocalizedNavigate();
  const savedPlan = useOpenPlan();

  const hasUnsavedChanges = useCallback(() => {
    if (!savedPlan) return true; // Never saved.

    if (!equal(savedPlan.seating, currentSeating)) return true;
    if (!equal(savedPlan.scene, classroomScene)) return true;
    return (
      seatingMode === 'circle' && !equal(savedPlan.circleLayout, circleLayout)
    );
  }, [circleLayout, classroomScene, currentSeating, savedPlan, seatingMode]);

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
    canExit: hasSeatedStudent(currentSeating),
  };
}
