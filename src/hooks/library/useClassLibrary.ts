// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';
import type {
  ClassRecord,
  ClassroomScene,
  ClassSummary,
  MixResult,
  SavedPlan,
  Student,
} from '@/types';
import {
  DEFAULT_CLASSROOM_SCENE,
  generateId,
  logError,
  MAX_NAME_LENGTH,
  toIsoDate,
  uniqueName,
} from '@/utils';
import {
  checkPlanName,
  roomStateToOpen,
  type ClassEdit,
  type ClassEditProblem,
} from '@/utils/data/classRooms';

/** A room as "Bibliothek" shows it. */
export interface LibraryRoom {
  id: string;
  name: string;
  /** The tables the room opens with — on screen, for the open room. */
  scene: ClassroomScene;
  isOpen: boolean;
}

/** A class with everything "Bibliothek" shows of it. */
export interface LibraryClass {
  id: string;
  name: string;
  label?: string;
  notes?: string;
  createdAt?: string;
  lastUsedAt?: string;
  /** The class open in the workspace, read from the live state. */
  isOpen: boolean;
  students: Student[];
  rooms: LibraryRoom[];
  activeRoomId: string | null;
  activePlanId: string | null;
  /** In the order they were stored. */
  plans: SavedPlan[];
  mixes: MixResult[];
}

/** A change "Bibliothek" asks for; ids and dates are made here. */
export type LibraryEdit =
  | { kind: 'renamePlan'; planId: string; name: string }
  | { kind: 'deletePlan'; planId: string }
  | { kind: 'duplicatePlan'; planId: string }
  | { kind: 'movePlan'; planId: string; roomId: string }
  | { kind: 'movePlanToNewRoom'; planId: string; name: string }
  | { kind: 'deleteMix'; mixId: number }
  | { kind: 'createRoom'; name: string }
  | { kind: 'renameRoom'; roomId: string; name: string }
  | { kind: 'deleteRoom'; roomId: string };

export type LibraryEditOutcome =
  | { ok: true; /** The room a `createRoom` made. */ roomId?: string }
  | { ok: false; reason: ClassEditProblem };

const done: LibraryEditOutcome = { ok: true };
const refused = (reason: ClassEditProblem): LibraryEditOutcome => ({
  ok: false,
  reason,
});

/** The rooms of a class with the tables each opens with. */
function libraryRooms(
  rooms: NonNullable<ClassRecord['rooms']>,
  activeRoomId: string | null,
  plans: SavedPlan[],
  openScene: ClassroomScene | null,
): LibraryRoom[] {
  return rooms.map((room) => {
    const isOpen = room.id === activeRoomId;
    return {
      id: room.id,
      name: room.name,
      scene: isOpen
        ? (openScene ?? DEFAULT_CLASSROOM_SCENE)
        : (roomStateToOpen(room, plans).scene ?? DEFAULT_CLASSROOM_SCENE),
      isOpen,
    };
  });
}

/**
 * Everything "Bibliothek" shows, and the changes it makes (decision
 * 0024): every class by its summary, and the class `selectedClassId` names
 * with its rooms, plans and mixes.
 *
 * The open class comes from the live state, never from storage, which lags
 * behind it while edits wait in the persist queue; its changes go through the
 * live actions. Any other class is read from the repository — again when
 * the classes change or a change of its own was made — and changed there
 * (`editInactiveClass`), which refuses the open class as a second guard.
 */
export function useClassLibrary(selectedClassId: string | null) {
  const state = useSeatingPlanState();
  const actions = useSeatingPlanActions();
  const repository = useSeatingRepository();
  const openClassId = state.activeClass.id;
  const [stored, setStored] = useState<{
    id: string;
    record: ClassRecord | null;
  } | null>(null);
  const [revision, setRevision] = useState(0);

  const isOtherClass =
    selectedClassId !== null && selectedClassId !== openClassId;

  // A summary of the open class even before the collection lists it, as the
  // header's class menu has it.
  const classes = useMemo<ClassSummary[]>(() => {
    const summaries = state.classSummaries;
    if (
      !openClassId ||
      summaries.some((summary) => summary.id === openClassId)
    ) {
      return summaries;
    }
    return [
      ...summaries,
      {
        id: openClassId,
        name: state.activeClass.name,
        label: state.activeClass.label,
        notes: state.activeClass.notes,
        createdAt: '',
        updatedAt: '',
        lastUsedAt: state.activeClass.lastUsedAt,
        studentCount: state.students.length,
      },
    ];
  }, [state.classSummaries, state.activeClass, state.students, openClassId]);

  useEffect(() => {
    if (!isOtherClass || !selectedClassId) return undefined;
    let current = true;
    repository
      .loadClassRecord(selectedClassId)
      .then((result) => {
        if (!current) return;
        if (!result.success) {
          logError(
            'Failed to load a class for the library',
            { error: result.error, classId: selectedClassId },
            'useClassLibrary',
          );
        }
        setStored({
          id: selectedClassId,
          record: result.success ? result.data : null,
        });
      })
      .catch((error: unknown) => {
        logError(
          'Failed to load a class for the library',
          { error, classId: selectedClassId },
          'useClassLibrary',
        );
      });
    return () => {
      current = false;
    };
    // The summaries change whenever a class is made, renamed, removed or
    // opened; the record is read anew then.
  }, [
    isOtherClass,
    selectedClassId,
    repository,
    state.classSummaries,
    revision,
  ]);

  const selected = useMemo<LibraryClass | null>(() => {
    if (!selectedClassId) return null;
    if (selectedClassId === openClassId) {
      return {
        id: openClassId,
        name: state.activeClass.name,
        label: state.activeClass.label,
        notes: state.activeClass.notes,
        createdAt: state.classSummaries.find(
          (summary) => summary.id === openClassId,
        )?.createdAt,
        lastUsedAt: state.activeClass.lastUsedAt,
        isOpen: true,
        students: state.students,
        rooms: libraryRooms(
          state.rooms,
          state.activeRoomId,
          state.seatingHistory,
          state.classroomScene,
        ),
        activeRoomId: state.activeRoomId,
        activePlanId: state.activePlanId,
        plans: state.seatingHistory,
        mixes: state.mixHistory,
      };
    }
    const record = stored?.id === selectedClassId ? stored.record : undefined;
    if (!record) return null;
    const activeRoomId = record.activeRoomId ?? null;
    return {
      id: record.id,
      name: record.name,
      label: record.label,
      notes: record.notes,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      isOpen: false,
      students: record.students,
      rooms: libraryRooms(
        record.rooms ?? [],
        activeRoomId,
        record.seatingHistory,
        record.classroomScene,
      ),
      activeRoomId,
      activePlanId: record.activePlanId ?? null,
      plans: record.seatingHistory,
      mixes: record.mixHistory,
    };
  }, [selectedClassId, openClassId, state, stored]);

  const loading = isOtherClass && stored?.id !== selectedClassId;

  const editOpenClass = useCallback(
    (edit: LibraryEdit): LibraryEditOutcome => {
      switch (edit.kind) {
        case 'renamePlan': {
          const problem = checkPlanName(
            state.seatingHistory,
            edit.name,
            edit.planId,
          );
          if (problem) return refused(problem);
          return actions.renameSeatingPlan(edit.planId, edit.name)
            ? done
            : refused('not-found');
        }
        case 'deletePlan':
          actions.deleteSeatingPlan(edit.planId);
          return done;
        case 'duplicatePlan':
          return actions.duplicateSeatingPlan(edit.planId)
            ? done
            : refused('not-found');
        case 'movePlan': {
          const problem = actions.movePlanToRoom(edit.planId, {
            roomId: edit.roomId,
          });
          return problem ? refused(problem) : done;
        }
        case 'movePlanToNewRoom': {
          const problem = actions.movePlanToRoom(edit.planId, {
            newRoomName: edit.name,
          });
          return problem ? refused(problem) : done;
        }
        case 'deleteMix':
          actions.deleteMixResult(edit.mixId);
          return done;
        case 'createRoom': {
          const result = actions.addRoom(edit.name);
          return typeof result === 'string'
            ? refused(result)
            : { ok: true, roomId: result.id };
        }
        case 'renameRoom': {
          const problem = actions.renameRoom(edit.roomId, edit.name);
          return problem ? refused(problem) : done;
        }
        case 'deleteRoom': {
          const problem = actions.deleteRoom(edit.roomId);
          return problem ? refused(problem) : done;
        }
      }
    },
    [actions, state.seatingHistory],
  );

  const editStoredClass = useCallback(
    async (classId: string, edit: LibraryEdit): Promise<LibraryEditOutcome> => {
      const plans =
        stored?.id === classId ? (stored.record?.seatingHistory ?? []) : [];
      let change: ClassEdit;
      if (edit.kind === 'duplicatePlan') {
        const plan = plans.find((entry) => entry.id === edit.planId);
        if (!plan) return refused('not-found');
        change = {
          kind: 'duplicatePlan',
          planId: edit.planId,
          newId: generateId(),
          name: uniqueName(
            plan.name,
            plans.map((entry) => entry.name),
            MAX_NAME_LENGTH,
          ),
          date: toIsoDate(),
        };
      } else if (edit.kind === 'movePlanToNewRoom') {
        change = {
          kind: 'movePlanToNewRoom',
          planId: edit.planId,
          room: {
            id: generateId(),
            name: edit.name,
            createdAt: new Date().toISOString(),
          },
        };
      } else if (edit.kind === 'createRoom') {
        change = {
          kind: 'createRoom',
          room: {
            id: generateId(),
            name: edit.name,
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        change = edit;
      }

      const result = await repository.editInactiveClass(classId, change);
      const madeRoomId =
        change.kind === 'createRoom' ? change.room.id : undefined;
      if (!result.success) {
        logError(
          'Failed to change a class from the library',
          { error: result.error, classId, kind: edit.kind },
          'useClassLibrary',
        );
        return refused('not-found');
      }
      if (!result.data.ok) return result.data;
      setRevision((count) => count + 1);
      return madeRoomId ? { ok: true, roomId: madeRoomId } : done;
    },
    [repository, stored],
  );

  /**
   * Changes a plan, mix or room of a class: the open one through its live
   * actions, any other on its stored record.
   */
  const edit = useCallback(
    async (classId: string, change: LibraryEdit) =>
      classId === openClassId
        ? editOpenClass(change)
        : editStoredClass(classId, change),
    [openClassId, editOpenClass, editStoredClass],
  );

  return { classes, openClassId, selected, loading, edit };
}
