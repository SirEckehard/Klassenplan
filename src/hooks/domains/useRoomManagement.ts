// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * @internal
 * Internal hook used by useSeatingGenerator. Do not import directly.
 * Use SeatingPlanGeneratorProvider context hooks instead.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type {
  ClassroomTemplate,
  RoomRecord,
  RoomWorkingState,
  SavedPlan,
} from '@/types';
import {
  DEFAULT_CLASSROOM_SCENE,
  generateId,
  MAX_NAME_LENGTH,
  MAX_ROOMS_PER_CLASS,
  showToast,
  syncSeatingWithStudents,
  uniqueName,
} from '@/utils';
import {
  checkRoomName,
  EMPTY_ROOM_STATE,
  fittingLocks,
  switchRoomState,
  workingStateFromPlan,
  type RoomNameProblem,
} from '@/utils/data/classRooms';
import type { SeatingState } from '../useSeatingState';
import type { SyncSnapshotOptions } from '../seatingGenerator/useUnsavedSeatingTracker';

/** Why a room cannot go: it is open, or the class has no other. */
export type RoomRemovalProblem = 'room-open' | 'last-room';

/** Where a plan moves: to a room of the class, or to a new one it opens. */
export type PlanMoveTarget = { roomId: string } | { newRoomName: string };

interface UseRoomManagementParams {
  seatingState: SeatingState;
  /** The seating undo history belongs to the room that was open. */
  resetSeatingHistory: () => void;
  /** Tells the unsaved-changes tracker what the room opened with. */
  syncSeatingSnapshot: (options?: SyncSnapshotOptions) => void;
  /** The room on screen is as it was stored, not edited. */
  markClassroomSceneSynced: () => void;
  /** A circle refresh asked for in the room left must not run in this one. */
  setShouldRegenerateCircle: (value: boolean) => void;
}

/**
 * The rooms of the open class (decision 0024): opening one, making a new
 * one — empty, or from a template — renaming, removing, and moving a plan
 * between them.
 *
 * Opening a room works like opening a class: the room left parks its working
 * state — tables, seating, locks, circle, open plan — and the room opened
 * comes back as it was left, so nothing is lost and nothing is saved behind
 * the teacher's back. It happens in one synchronous render, as a class reload
 * does: tables and seating arriving in different renders would look like a
 * room that no longer fits its seating, and the plan view would mix anew. The
 * undo histories start afresh (the views remount keyed by the room), since
 * their snapshots belong to the room that was open.
 */
export function useRoomManagement({
  seatingState,
  resetSeatingHistory,
  syncSeatingSnapshot,
  markClassroomSceneSynced,
  setShouldRegenerateCircle,
}: UseRoomManagementParams) {
  const { t } = useTranslation();
  const {
    studentState: { students },
    historyState: { seatingHistory, setSeatingHistory, setMixHistory },
    planState: {
      currentSeating,
      setCurrentSeating,
      activePlanId,
      setActivePlanId,
      setPlanName,
    },
    algorithmState: { lockedPositions, setLockedPositions },
    sceneState: {
      classroomScene,
      setClassroomScene,
      circleLayout,
      setCircleLayout,
    },
    roomState: { rooms, setRooms, activeRoomId, setActiveRoomId },
  } = seatingState;

  // The open room's state, as it would park.
  const working = useMemo<RoomWorkingState>(
    () => ({
      scene: classroomScene,
      seating: currentSeating,
      lockedPositions,
      circleLayout,
      activePlanId,
    }),
    [
      classroomScene,
      currentSeating,
      lockedPositions,
      circleLayout,
      activePlanId,
    ],
  );

  // What is open now, for the actions a toast offers later on.
  const latestRef = useRef({ rooms, activeRoomId, seatingHistory, working });
  useLayoutEffect(() => {
    latestRef.current = { rooms, activeRoomId, seatingHistory, working };
  });

  /**
   * Puts a room's working state on screen as the open room — with the saved
   * plans as `nextPlans` has them, where the change of room changes them too.
   */
  const applyOpenRoom = useCallback(
    (
      nextRooms: RoomRecord[],
      nextActiveRoomId: string,
      state: RoomWorkingState,
      nextPlans?: SavedPlan[],
    ) => {
      const plans = nextPlans ?? seatingHistory;
      const seating = syncSeatingWithStudents(state.seating, students);
      const locks = fittingLocks(
        state.lockedPositions,
        seating,
        new Set(students.map((student) => student.id)),
      );
      const planName = state.activePlanId
        ? (plans.find((plan) => plan.id === state.activePlanId)?.name ?? '')
        : '';

      flushSync(() => {
        if (nextPlans) setSeatingHistory(nextPlans);
        setRooms(nextRooms);
        setActiveRoomId(nextActiveRoomId);
        setClassroomScene(state.scene ?? DEFAULT_CLASSROOM_SCENE);
        setCurrentSeating(seating);
        setLockedPositions(locks);
        setCircleLayout(state.circleLayout);
        setActivePlanId(state.activePlanId);
        setPlanName(planName);
      });
      resetSeatingHistory();
      syncSeatingSnapshot({
        seating,
        circleLayout: state.circleLayout,
        planName,
        lockedPositions: locks,
      });
      markClassroomSceneSynced();
      setShouldRegenerateCircle(false);
    },
    [
      students,
      seatingHistory,
      setSeatingHistory,
      setRooms,
      setActiveRoomId,
      setClassroomScene,
      setCurrentSeating,
      setLockedPositions,
      setCircleLayout,
      setActivePlanId,
      setPlanName,
      resetSeatingHistory,
      syncSeatingSnapshot,
      markClassroomSceneSynced,
      setShouldRegenerateCircle,
    ],
  );

  /**
   * Opens a room of the class as it was left — or with `incoming` on screen
   * instead, when a plan of that room is being opened. `false` when the room
   * is unknown or open already.
   */
  const switchRoom = useCallback(
    (roomId: string, incoming?: RoomWorkingState): boolean => {
      const next = switchRoomState(
        { rooms, activeRoomId, working, plans: seatingHistory },
        roomId,
        incoming,
      );
      if (!next) return false;
      applyOpenRoom(next.rooms, next.activeRoomId, next.working);
      return true;
    },
    [rooms, activeRoomId, working, seatingHistory, applyOpenRoom],
  );

  const openRoom = useCallback(
    (roomId: string): boolean => switchRoom(roomId),
    [switchRoom],
  );

  /**
   * Makes a room and opens it: empty, or with `state` on screen. The name is
   * made free where it is taken ("Labor (2)"). `null` when the class has as
   * many rooms as it may.
   */
  const createRoom = useCallback(
    (options?: {
      name?: string;
      state?: RoomWorkingState;
    }): RoomRecord | null => {
      if (rooms.length >= MAX_ROOMS_PER_CLASS) {
        showToast(
          'warning',
          t('toast:rooms.limit', { max: MAX_ROOMS_PER_CLASS }),
        );
        return null;
      }
      const room: RoomRecord = {
        id: generateId(),
        name: uniqueName(
          options?.name?.trim() || t('generator:rooms.newName'),
          rooms.map((entry) => entry.name),
          MAX_NAME_LENGTH,
        ),
        createdAt: new Date().toISOString(),
      };
      const next = switchRoomState(
        {
          rooms: [...rooms, room],
          activeRoomId,
          working,
          plans: seatingHistory,
        },
        room.id,
        options?.state ?? EMPTY_ROOM_STATE,
      );
      if (!next) return null;
      applyOpenRoom(next.rooms, next.activeRoomId, next.working);
      return room;
    },
    [rooms, activeRoomId, working, seatingHistory, applyOpenRoom, t],
  );

  /**
   * Goes back to the room open before a template was loaded, and lets the
   * new room go if nothing was saved or mixed in it since.
   */
  const undoNewRoom = useCallback(
    (roomId: string, previousRoomId: string) => {
      const latest = latestRef.current;
      if (latest.activeRoomId === roomId) {
        const next = switchRoomState(
          {
            rooms: latest.rooms,
            activeRoomId: latest.activeRoomId,
            working: latest.working,
            plans: latest.seatingHistory,
          },
          previousRoomId,
        );
        if (!next) return;
        const untouched = !latest.seatingHistory.some(
          (plan) => plan.roomId === roomId,
        );
        applyOpenRoom(
          untouched
            ? next.rooms.filter((room) => room.id !== roomId)
            : next.rooms,
          next.activeRoomId,
          next.working,
        );
        if (untouched) {
          setMixHistory((prev) =>
            prev.filter((entry) => entry.roomId !== roomId),
          );
        }
      }
    },
    [applyOpenRoom, setMixHistory],
  );
  const undoNewRoomRef = useRef(undoNewRoom);
  useLayoutEffect(() => {
    undoNewRoomRef.current = undoNewRoom;
  }, [undoNewRoom]);

  /**
   * A template loaded into the class is a room of its own, named after it
   * (decision 0024): the room that was open keeps its plan, parked. The
   * message after it offers the way back — Ctrl/⌘+Z used to bring the old
   * tables back, and the old room is where they are now.
   */
  const createRoomFromTemplate = useCallback(
    (template: ClassroomTemplate): string | null => {
      const previousRoomId = activeRoomId;
      const room = createRoom({
        name: template.name,
        state: { ...EMPTY_ROOM_STATE, scene: template.scene },
      });
      if (!room) return null;
      showToast(
        'info',
        t('toast:rooms.createdFromTemplate', { name: room.name }),
        {
          duration: 8000,
          action: previousRoomId
            ? {
                label: t('toast:rooms.undoCreate'),
                onClick: () => undoNewRoomRef.current(room.id, previousRoomId),
              }
            : undefined,
        },
      );
      return room.id;
    },
    [activeRoomId, createRoom, t],
  );

  /**
   * Adds a room to the class without opening it, as a file manager makes a
   * folder; it opens empty later. What speaks against the name, or the room.
   */
  const addRoom = useCallback(
    (name: string): RoomRecord | RoomNameProblem | 'room-limit' => {
      if (rooms.length >= MAX_ROOMS_PER_CLASS) return 'room-limit';
      const problem = checkRoomName(rooms, name);
      if (problem) return problem;
      const room: RoomRecord = {
        id: generateId(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
      };
      setRooms((prev) => [...prev, room]);
      return room;
    },
    [rooms, setRooms],
  );

  /** Renames a room; what speaks against the name, or `null` when done. */
  const renameRoom = useCallback(
    (roomId: string, name: string): RoomNameProblem | null => {
      const problem = checkRoomName(rooms, name, roomId);
      if (problem) return problem;
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, name: name.trim() } : room,
        ),
      );
      return null;
    },
    [rooms, setRooms],
  );

  /**
   * Removes a room with the plans and mixes made in it; the neighbourhoods
   * belong to the class and stay. Neither the open room nor the last one can
   * go.
   */
  const deleteRoom = useCallback(
    (roomId: string): RoomRemovalProblem | null => {
      if (roomId === activeRoomId) return 'room-open';
      if (rooms.length <= 1) return 'last-room';
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      setSeatingHistory((prev) =>
        prev.filter((plan) => plan.roomId !== roomId),
      );
      setMixHistory((prev) => prev.filter((mix) => mix.roomId !== roomId));
      return null;
    },
    [activeRoomId, rooms, setRooms, setSeatingHistory, setMixHistory],
  );

  /**
   * Moves a saved plan to another room of the class, or into a new one. A
   * plan that is not open only changes its room; a new room then opens with
   * it. The open plan takes the screen along: its room opens, nothing on
   * screen changes, and the room it left parks its last remaining plan — or
   * its tables without a plan.
   */
  const movePlanToRoom = useCallback(
    (
      planId: string,
      target: PlanMoveTarget,
    ): RoomNameProblem | 'not-found' | 'room-limit' | null => {
      const plan = seatingHistory.find((entry) => entry.id === planId);
      if (!plan) return 'not-found';

      let targetRoom: RoomRecord | undefined;
      let nextRooms = rooms;
      if ('newRoomName' in target) {
        if (rooms.length >= MAX_ROOMS_PER_CLASS) return 'room-limit';
        const problem = checkRoomName(rooms, target.newRoomName);
        if (problem) return problem;
        targetRoom = {
          id: generateId(),
          name: target.newRoomName.trim(),
          createdAt: new Date().toISOString(),
        };
        nextRooms = [...rooms, targetRoom];
      } else {
        targetRoom = rooms.find((room) => room.id === target.roomId);
        if (!targetRoom) return 'not-found';
      }
      if (targetRoom.id === plan.roomId) return null;

      const moved = { ...plan, roomId: targetRoom.id };
      delete moved.autoSaved;
      const nextPlans = seatingHistory.map((entry) =>
        entry.id === planId ? moved : entry,
      );

      if (plan.id !== activePlanId || plan.roomId !== activeRoomId) {
        const isNewRoom = 'newRoomName' in target;
        setSeatingHistory(nextPlans);
        setRooms(
          nextRooms.map((room) => {
            if (isNewRoom && room.id === targetRoom.id) {
              return { ...room, parked: workingStateFromPlan(moved) };
            }
            // A room left with this plan open keeps its state, without it.
            if (room.parked?.activePlanId === planId) {
              return {
                ...room,
                parked: { ...room.parked, activePlanId: null },
              };
            }
            return room;
          }),
        );
        return null;
      }

      // The open plan: its working state goes with it, and the room it left
      // parks its last remaining plan, or its tables without one.
      const remaining = nextPlans.filter(
        (entry) => entry.roomId === activeRoomId,
      );
      const last = remaining[remaining.length - 1];
      const parkedLeft: RoomWorkingState = last
        ? workingStateFromPlan(last)
        : { ...EMPTY_ROOM_STATE, scene: classroomScene };
      const roomsAfter = nextRooms.map((room) => {
        if (room.id === activeRoomId) return { ...room, parked: parkedLeft };
        if (room.id === targetRoom.id) {
          const open = { ...room };
          delete open.parked;
          return open;
        }
        return room;
      });
      applyOpenRoom(roomsAfter, targetRoom.id, working, nextPlans);
      return null;
    },
    [
      rooms,
      activeRoomId,
      seatingHistory,
      classroomScene,
      activePlanId,
      working,
      applyOpenRoom,
      setRooms,
      setSeatingHistory,
    ],
  );

  return {
    switchRoom,
    openRoom,
    createRoom,
    addRoom,
    createRoomFromTemplate,
    renameRoom,
    deleteRoom,
    movePlanToRoom,
  };
}
