// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import type React from 'react';
import {
  announcePlanSaved,
  createTimestampPlanName,
  showToast,
  TOAST_MESSAGES,
} from '@/utils';
import type { CircleLayout } from '@/types/Circle';
import type {
  ClassroomScene,
  MixResult,
  SavedPlan,
  SeatingArrangement,
  MixSettings,
} from '@/types';
import type { StateUpdater } from '@/stores/featureStores';
import type { SyncSnapshotOptions } from './useUnsavedSeatingTracker';

type UsePlanPersistenceHandlersParams = {
  currentSeatingLength: number;
  circleLayout: CircleLayout | null;
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
  ) => boolean;
  loadSeatingPlan: (
    plan: SavedPlan,
    options?: { replaceStudents?: boolean },
  ) => void;
  setPlanName: React.Dispatch<React.SetStateAction<string>>;
  setPlanNameError: (error: boolean) => void;
  updateClassroomScene: (value: React.SetStateAction<ClassroomScene>) => void;
  setCircleLayout: (value: StateUpdater<CircleLayout | null>) => void;
  setStep: (step: number) => void;
  step: number;
  setCurrentSeating: React.Dispatch<React.SetStateAction<SeatingArrangement>>;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  markClassroomSynced: (scene: ClassroomScene) => void;
  syncSeatingSnapshot: (options?: SyncSnapshotOptions) => void;
  /** Record the pre-load state so loading a plan or mix stays undoable. */
  recordSeatingSnapshot: () => void;
};

export function usePlanPersistenceHandlers({
  currentSeatingLength,
  circleLayout,
  saveSeatingPlan,
  loadSeatingPlan,
  setPlanName,
  setPlanNameError,
  updateClassroomScene,
  setCircleLayout,
  setStep,
  step,
  setCurrentSeating,
  setMixSettings,
  markClassroomSynced,
  syncSeatingSnapshot,
  recordSeatingSnapshot,
}: UsePlanPersistenceHandlersParams) {
  const handleSaveSeatingPlan = useCallback(
    (name: string, scene: ClassroomScene) => {
      if (currentSeatingLength === 0) {
        showToast('error', TOAST_MESSAGES.PLAN_NONE_TO_SAVE);
        return;
      }

      const trimmed = (name ?? '').trim();
      const finalName = trimmed === '' ? createTimestampPlanName() : trimmed;

      if (trimmed === '') {
        setPlanName(finalName);
      }

      setPlanNameError(false);
      const ok = saveSeatingPlan(finalName, scene, circleLayout);
      if (ok) {
        announcePlanSaved(finalName);
        markClassroomSynced(scene);
        syncSeatingSnapshot();
      } else {
        showToast('error', TOAST_MESSAGES.PLAN_SAVE_FAILED);
      }
    },
    [
      circleLayout,
      currentSeatingLength,
      saveSeatingPlan,
      setPlanName,
      setPlanNameError,
      markClassroomSynced,
      syncSeatingSnapshot,
    ],
  );

  const handleHistoryLoad = useCallback(
    (plan: SavedPlan) => {
      recordSeatingSnapshot();
      loadSeatingPlan(plan, { replaceStudents: false });
      updateClassroomScene(plan.scene);
      if (plan.circleLayout) {
        setCircleLayout(plan.circleLayout);
      }
      if (step !== 3) {
        setStep(3);
      }
      markClassroomSynced(plan.scene);
      syncSeatingSnapshot({
        seating: plan.seating,
        circleLayout: plan.circleLayout ?? null,
        planName: plan.name,
        lockedPositions: plan.locks ?? {},
      });
    },
    [
      loadSeatingPlan,
      setCircleLayout,
      setStep,
      step,
      updateClassroomScene,
      markClassroomSynced,
      syncSeatingSnapshot,
      recordSeatingSnapshot,
    ],
  );

  const handleMixLoad = useCallback(
    (result: MixResult) => {
      recordSeatingSnapshot();
      setCurrentSeating(result.seating);
      setMixSettings(result.mixSettings);
      if (step !== 3) {
        setStep(3);
      }
    },
    [setCurrentSeating, setMixSettings, setStep, step, recordSeatingSnapshot],
  );

  return { handleSaveSeatingPlan, handleHistoryLoad, handleMixLoad } as const;
}
