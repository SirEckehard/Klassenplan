// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import type React from 'react';
import {
  announcePlanSaved,
  createTimestampPlanName,
  DEFAULT_CLASSROOM_SCENE,
  showToast,
  syncSeatingWithStudents,
  TOAST_MESSAGES,
} from '@/utils';
import { hasShapeMismatch } from '@/utils/math/scene';
import { roomStateToOpen, workingStateFromPlan } from '@/utils/data/classRooms';
import type { CircleLayout } from '@/types/Circle';
import type {
  ClassroomScene,
  MixResult,
  RoomRecord,
  RoomWorkingState,
  SavedPlan,
  SaveSeatingPlanOptions,
  SeatingArrangement,
  MixSettings,
  Student,
} from '@/types';
import type { StateUpdater } from '@/stores/featureStores';
import type { SyncSnapshotOptions } from './useUnsavedSeatingTracker';

type UsePlanPersistenceHandlersParams = {
  /** At least one student seated (`hasSeatedStudent`); nothing to save otherwise. */
  hasPlan: boolean;
  circleLayout: CircleLayout | null;
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
    options?: SaveSeatingPlanOptions,
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
  /** The scene on screen, which a mix of the open room has to fit. */
  classroomScene: ClassroomScene;
  students: Student[];
  /** The rooms of the class and the open one (decision 0024). */
  rooms: RoomRecord[];
  activeRoomId: string | null;
  seatingHistory: SavedPlan[];
  /** Opens another room, with `incoming` on screen in place of its own state. */
  switchRoom: (roomId: string, incoming?: RoomWorkingState) => boolean;
};

export function usePlanPersistenceHandlers({
  hasPlan,
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
  classroomScene,
  students,
  rooms,
  activeRoomId,
  seatingHistory,
  switchRoom,
}: UsePlanPersistenceHandlersParams) {
  // Reports whether the plan was saved, so a form that asked for the name
  // can stay open when it was not.
  const handleSaveSeatingPlan = useCallback(
    (
      name: string,
      scene: ClassroomScene,
      options?: Pick<SaveSeatingPlanOptions, 'rename'>,
    ): boolean => {
      if (!hasPlan) {
        showToast('error', TOAST_MESSAGES.PLAN_NONE_TO_SAVE);
        return false;
      }

      const trimmed = (name ?? '').trim();
      const finalName = trimmed === '' ? createTimestampPlanName() : trimmed;

      if (trimmed === '') {
        setPlanName(finalName);
      }

      setPlanNameError(false);
      const ok = saveSeatingPlan(finalName, scene, circleLayout, options);
      if (ok) {
        announcePlanSaved(finalName);
        markClassroomSynced(scene);
        syncSeatingSnapshot();
      } else {
        showToast('error', TOAST_MESSAGES.PLAN_SAVE_FAILED);
      }
      return ok;
    },
    [
      circleLayout,
      hasPlan,
      saveSeatingPlan,
      setPlanName,
      setPlanNameError,
      markClassroomSynced,
      syncSeatingSnapshot,
    ],
  );

  const handleHistoryLoad = useCallback(
    (plan: SavedPlan) => {
      // A plan of another room opens that room, with the plan on screen; the
      // room left parks what it had.
      if (
        plan.roomId &&
        plan.roomId !== activeRoomId &&
        switchRoom(plan.roomId, workingStateFromPlan(plan))
      ) {
        if (step !== 3) {
          setStep(3);
        }
        return;
      }
      recordSeatingSnapshot();
      loadSeatingPlan(plan, { replaceStudents: false });
      updateClassroomScene(plan.scene);
      // A plan without a circle takes the one on screen away too: that one
      // belongs to another plan, and the exits would save it into this one.
      // In the circle view a new one is drawn from the plan
      // (`useEnsureCircleLayout`).
      setCircleLayout(plan.circleLayout ?? null);
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
      activeRoomId,
      switchRoom,
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

  /**
   * Puts a mix back on screen, in the room it was made in. A mix keeps no
   * tables of its own, so one that no longer fits that room's tables is
   * refused (`false`) rather than mixed over by the plan view.
   */
  const handleMixLoad = useCallback(
    (result: MixResult): boolean => {
      const targetRoom =
        result.roomId && result.roomId !== activeRoomId
          ? rooms.find((room) => room.id === result.roomId)
          : undefined;
      const targetScene = targetRoom
        ? (roomStateToOpen(targetRoom, seatingHistory).scene ??
          DEFAULT_CLASSROOM_SCENE)
        : classroomScene;
      if (hasShapeMismatch(targetScene, result.seating)) {
        return false;
      }
      if (targetRoom) {
        switchRoom(targetRoom.id);
      } else {
        recordSeatingSnapshot();
      }
      setCurrentSeating(syncSeatingWithStudents(result.seating, students));
      setMixSettings(result.mixSettings);
      if (step !== 3) {
        setStep(3);
      }
      return true;
    },
    [
      activeRoomId,
      rooms,
      seatingHistory,
      classroomScene,
      students,
      switchRoom,
      setCurrentSeating,
      setMixSettings,
      setStep,
      step,
      recordSeatingSnapshot,
    ],
  );

  return { handleSaveSeatingPlan, handleHistoryLoad, handleMixLoad } as const;
}
