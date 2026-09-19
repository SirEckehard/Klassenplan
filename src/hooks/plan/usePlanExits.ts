// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import equal from 'fast-deep-equal';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';

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
 * `canExit` is false while there is no plan at all: exporting an empty room
 * would produce an empty sheet and presenting it an empty board.
 */
export function usePlanExits() {
  const {
    planName,
    classroomScene,
    currentSeating,
    seatingHistory,
    circleLayout,
    seatingMode,
  } = useSeatingPlanState();
  const { handleSaveSeatingPlan } = useSeatingPlanActions();
  const navigate = useLocalizedNavigate();

  const hasUnsavedChanges = useCallback(() => {
    const trimmedName = planName.trim();
    if (!trimmedName) return true; // A plan without a name was never saved.

    const savedPlan = seatingHistory.find((plan) => plan.name === trimmedName);
    if (!savedPlan) return true;

    if (!equal(savedPlan.seating, currentSeating)) return true;
    if (!equal(savedPlan.scene, classroomScene)) return true;
    return (
      seatingMode === 'circle' && !equal(savedPlan.circleLayout, circleLayout)
    );
  }, [
    circleLayout,
    classroomScene,
    currentSeating,
    planName,
    seatingHistory,
    seatingMode,
  ]);

  const saveIfNeeded = useCallback(() => {
    if (hasUnsavedChanges()) {
      handleSaveSeatingPlan(planName, classroomScene);
    }
  }, [classroomScene, handleSaveSeatingPlan, hasUnsavedChanges, planName]);

  const exportPlan = useCallback(() => {
    saveIfNeeded();
    navigate('/export');
  }, [navigate, saveIfNeeded]);

  const presentPlan = useCallback(() => {
    saveIfNeeded();
    navigate('/present', { state: { mode: seatingMode } });
  }, [navigate, saveIfNeeded, seatingMode]);

  return {
    exportPlan,
    presentPlan,
    canExit: currentSeating.length > 0,
  };
}
