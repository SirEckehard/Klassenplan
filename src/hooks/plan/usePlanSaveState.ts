// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import equal from 'fast-deep-equal';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useOpenPlan } from '@/hooks/plan/useOpenPlan';

/**
 * The saved plan on screen and whether the plan on screen differs from it.
 *
 * The mode decides which fields matter, so table plans keep ignoring the
 * circle layout. The exits save first when it differs (`usePlanExits`), and
 * the plan's inspector states it under the plan's name.
 */
export function usePlanSaveState() {
  const { classroomScene, currentSeating, circleLayout, seatingMode } =
    useSeatingPlanState();
  const openPlan = useOpenPlan();

  const hasUnsavedChanges = useCallback(() => {
    if (!openPlan) return true; // Never saved.

    if (!equal(openPlan.seating, currentSeating)) return true;
    if (!equal(openPlan.scene, classroomScene)) return true;
    return (
      seatingMode === 'circle' && !equal(openPlan.circleLayout, circleLayout)
    );
  }, [circleLayout, classroomScene, currentSeating, openPlan, seatingMode]);

  return { openPlan, hasUnsavedChanges };
}
