// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The rooms of a class (decision 0024). A class keeps the rooms its plans and
 * mixes were made in; the open room's state lives in the class's working
 * fields, every other room parks its own. Data written before rooms existed —
 * by an older build, in a backup — is brought into that shape as it is read.
 */
import {
  checkName,
  generateId,
  MAX_NAME_LENGTH,
  MAX_ROOMS_PER_CLASS,
} from '@/utils';
import type { NameProblem } from '@/utils';
import type {
  ClassCollectionState,
  ClassRecord,
  LockedPositions,
  RoomRecord,
  RoomWorkingState,
  SavedPlan,
  SeatingArrangement,
} from '@/types';
import i18n from '@/i18n';

/**
 * The room a class gets when it has none, named in the language the app runs
 * in: the room every plan made so far belongs to.
 */
function createDefaultRoom(): RoomRecord {
  return {
    id: generateId(),
    name: i18n.t('generator:rooms.defaultName'),
    createdAt: new Date().toISOString(),
  };
}

const isRoomRecord = (value: unknown): value is RoomRecord =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RoomRecord).id === 'string' &&
  (value as RoomRecord).id !== '' &&
  typeof (value as RoomRecord).name === 'string';

/** `list.map(fn)`, or `list` itself when `fn` changed no entry. */
function mapIfChanged<T>(list: T[], fn: (entry: T) => T): T[] {
  let changed = false;
  const next = list.map((entry) => {
    const mapped = fn(entry);
    if (mapped !== entry) changed = true;
    return mapped;
  });
  return changed ? next : list;
}

/**
 * Brings a class into the shape its rooms need, the way `ensureActiveClass`
 * does for the collection. Pure, and `record` itself comes back when nothing
 * was amiss, so a caller can tell whether there is anything to write.
 *
 * 1. A class without a room gets one (`createRoom`), and it opens.
 * 2. The open room is the open plan's, where that plan names a room of the
 *    class — the working state is that plan's; else the one recorded; else
 *    the first.
 * 3. The open room parks nothing: its state is in the working fields.
 * 4. A plan or mix without a room of this class goes into the open room — the
 *    room every plan was made in before there were rooms.
 * 5. A parked open plan lies in its own room, or the room has none open.
 * 6. Each room id counts once, the first entry wins; names that repeat are
 *    left as they are rather than renamed behind the teacher's back.
 */
export function ensureClassRooms(
  record: ClassRecord,
  createRoom: () => RoomRecord = createDefaultRoom,
): ClassRecord {
  const stored = Array.isArray(record.rooms) ? record.rooms : [];
  const seenIds = new Set<string>();
  const kept = stored.filter((room) => {
    if (!isRoomRecord(room) || seenIds.has(room.id)) return false;
    seenIds.add(room.id);
    return true;
  });
  const listed =
    kept.length === 0
      ? [createRoom()]
      : kept.length === stored.length
        ? stored
        : kept;
  const roomIds = new Set(listed.map((room) => room.id));
  const isRoomOfClass = (roomId: string | null | undefined): roomId is string =>
    typeof roomId === 'string' && roomIds.has(roomId);

  const plans = Array.isArray(record.seatingHistory)
    ? record.seatingHistory
    : [];
  const openPlan = record.activePlanId
    ? plans.find((plan) => plan.id === record.activePlanId)
    : undefined;
  const activeRoomId = isRoomOfClass(openPlan?.roomId)
    ? openPlan.roomId
    : isRoomOfClass(record.activeRoomId)
      ? record.activeRoomId
      : listed[0].id;

  const placeInRoom = <T extends { roomId?: string }>(entry: T): T =>
    isRoomOfClass(entry.roomId) ? entry : { ...entry, roomId: activeRoomId };
  const seatingHistory = mapIfChanged(plans, placeInRoom);
  const mixHistory = mapIfChanged(
    Array.isArray(record.mixHistory) ? record.mixHistory : [],
    placeInRoom,
  );

  const rooms = mapIfChanged(listed, (room) => {
    if (room.id === activeRoomId) {
      if (room.parked === undefined) return room;
      const open = { ...room };
      delete open.parked;
      return open;
    }
    const parkedPlanId = room.parked?.activePlanId;
    const parkedPlanHere =
      !parkedPlanId ||
      seatingHistory.some(
        (plan) => plan.id === parkedPlanId && plan.roomId === room.id,
      );
    return parkedPlanHere || !room.parked
      ? room
      : { ...room, parked: { ...room.parked, activePlanId: null } };
  });

  if (
    rooms === record.rooms &&
    activeRoomId === record.activeRoomId &&
    seatingHistory === record.seatingHistory &&
    mixHistory === record.mixHistory
  ) {
    return record;
  }
  return { ...record, rooms, activeRoomId, seatingHistory, mixHistory };
}

/**
 * `ensureClassRooms` for every class of a collection; the collection itself
 * comes back when no class needed anything.
 */
export function ensureCollectionRooms(
  collection: ClassCollectionState,
): ClassCollectionState {
  const classes = mapIfChanged(collection.classes, (record) =>
    ensureClassRooms(record),
  );
  return classes === collection.classes
    ? collection
    : { ...collection, classes };
}

/** A room nobody has set up yet: the default room, no seating, no plan. */
export const EMPTY_ROOM_STATE: RoomWorkingState = {
  scene: null,
  seating: [],
  lockedPositions: {},
  circleLayout: null,
  activePlanId: null,
};

/** What opening a saved plan puts on screen, the plan itself open. */
export function workingStateFromPlan(plan: SavedPlan): RoomWorkingState {
  return {
    scene: plan.scene,
    seating: plan.seating,
    lockedPositions: plan.locks ?? {},
    circleLayout: plan.circleLayout ?? null,
    activePlanId: plan.id,
  };
}

/**
 * How a room opens: as it was left, or — for a room that parked nothing,
 * which only a repair leaves behind — with the last plan saved in it, or
 * empty.
 */
export function roomStateToOpen(
  room: RoomRecord,
  plans: SavedPlan[],
): RoomWorkingState {
  if (room.parked) return room.parked;
  const own = plans.filter((plan) => plan.roomId === room.id);
  const last = own[own.length - 1];
  return last ? workingStateFromPlan(last) : EMPTY_ROOM_STATE;
}

/**
 * Opening another room of a class, as data: the open room parks the working
 * state, and the room opened gives up its parked state — or takes `incoming`
 * instead, when a plan of it is being opened. `null` when the room is not
 * one of the class or is open already.
 */
export function switchRoomState(
  {
    rooms,
    activeRoomId,
    working,
    plans,
  }: {
    rooms: RoomRecord[];
    activeRoomId: string | null;
    working: RoomWorkingState;
    plans: SavedPlan[];
  },
  targetRoomId: string,
  incoming?: RoomWorkingState,
): {
  rooms: RoomRecord[];
  activeRoomId: string;
  working: RoomWorkingState;
} | null {
  const target = rooms.find((room) => room.id === targetRoomId);
  if (!target || targetRoomId === activeRoomId) return null;
  const next = incoming ?? roomStateToOpen(target, plans);
  return {
    rooms: rooms.map((room) => {
      if (room.id === activeRoomId) return { ...room, parked: working };
      if (room.id === targetRoomId) {
        const open = { ...room };
        delete open.parked;
        return open;
      }
      return room;
    }),
    activeRoomId: targetRoomId,
    working: next,
  };
}

/** Why a name cannot be a room's: nothing typed, too long, or taken. */
export type RoomNameProblem = NameProblem;

/**
 * Whether `name` may be the name of a room of the class — of `roomId` when it
 * renames one, which may keep its own name. Names are unique within a class,
 * case ignored, and as long as a name may be (`checkName`).
 */
export function checkRoomName(
  rooms: RoomRecord[],
  name: string,
  roomId?: string,
): RoomNameProblem | null {
  return checkName(
    name,
    rooms.filter((room) => room.id !== roomId).map((room) => room.name),
    MAX_NAME_LENGTH,
  );
}

/**
 * The locks that still fit: a student of the class on a table and seat the
 * seating has. Opening a plan or a room keeps those and lets the rest go.
 */
export function fittingLocks(
  locks: LockedPositions,
  seating: SeatingArrangement,
  studentIds: ReadonlySet<string>,
): LockedPositions {
  const fitting: LockedPositions = {};
  for (const [studentId, position] of Object.entries(locks)) {
    if (!studentIds.has(studentId)) continue;
    if (position.table < 0 || position.table >= seating.length) continue;
    const seats = seating[position.table]?.length ?? 0;
    if (position.seat < 0 || position.seat >= seats) continue;
    fitting[studentId] = { table: position.table, seat: position.seat };
  }
  return fitting;
}

/**
 * A change to a class's plans, mixes and rooms, made on its record — how
 * "Pläne & Verlauf" changes a class that is not open (decision 0024). The open
 * class takes the same changes through its live actions, by the same rules.
 */
export type ClassEdit =
  | { kind: 'renamePlan'; planId: string; name: string }
  | { kind: 'deletePlan'; planId: string }
  | {
      kind: 'duplicatePlan';
      planId: string;
      newId: string;
      name: string;
      date: string;
    }
  | { kind: 'movePlan'; planId: string; roomId: string }
  | { kind: 'movePlanToNewRoom'; planId: string; room: RoomRecord }
  | { kind: 'deleteMix'; mixId: number }
  | { kind: 'createRoom'; room: RoomRecord }
  | { kind: 'renameRoom'; roomId: string; name: string }
  | { kind: 'deleteRoom'; roomId: string };

/** Why a change cannot be made. */
export type ClassEditProblem =
  NameProblem | 'not-found' | 'room-open' | 'last-room' | 'room-limit';

/**
 * Whether `name` may be a plan's: given, not too long, and no other plan of
 * the class carries it — exactly, as saving holds it (`resolvePlanSlot`).
 */
export function checkPlanName(
  plans: SavedPlan[],
  name: string,
  planId?: string,
): NameProblem | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'empty';
  if (trimmed.length > MAX_NAME_LENGTH) return 'too-long';
  return plans.some((plan) => plan.id !== planId && plan.name === trimmed)
    ? 'taken'
    : null;
}

/** The rooms with no parked state left pointing at `planId`. */
function withoutParkedPlan(rooms: RoomRecord[], planId: string): RoomRecord[] {
  return mapIfChanged(rooms, (room) =>
    room.parked?.activePlanId === planId
      ? { ...room, parked: { ...room.parked, activePlanId: null } }
      : room,
  );
}

/**
 * Moves a plan to `target`, a room of the class. A plan that is not open only
 * changes its room — a room just made opens with it later; the open plan
 * takes the working state along, its new room becomes the open one, and the
 * room it left parks its last remaining plan, or its tables without one.
 */
function movePlan(
  record: ClassRecord,
  plan: SavedPlan,
  target: RoomRecord,
  isNewRoom: boolean,
): ClassRecord {
  const rooms = record.rooms ?? [];
  const moved: SavedPlan = { ...plan, roomId: target.id };
  delete moved.autoSaved;
  const plans = record.seatingHistory.map((entry) =>
    entry.id === plan.id ? moved : entry,
  );
  const listed = isNewRoom ? [...rooms, target] : rooms;

  if (plan.id !== record.activePlanId) {
    // The room the plan left no longer has it open; a room just made opens
    // with it.
    return {
      ...record,
      seatingHistory: plans,
      rooms: withoutParkedPlan(listed, plan.id).map((room) =>
        isNewRoom && room.id === target.id
          ? { ...room, parked: workingStateFromPlan(moved) }
          : room,
      ),
    };
  }

  const remaining = plans.filter(
    (entry) => entry.roomId === record.activeRoomId,
  );
  const last = remaining[remaining.length - 1];
  const parkedLeft: RoomWorkingState = last
    ? workingStateFromPlan(last)
    : { ...EMPTY_ROOM_STATE, scene: record.classroomScene };
  return {
    ...record,
    seatingHistory: plans,
    activeRoomId: target.id,
    rooms: listed.map((room) => {
      if (room.id === record.activeRoomId) {
        return { ...room, parked: parkedLeft };
      }
      if (room.id === target.id) {
        const open = { ...room };
        delete open.parked;
        return open;
      }
      return room;
    }),
  };
}

/**
 * Applies `edit` to a class's record, which should be repaired already
 * (`ensureClassRooms`): the changed record, or why the change cannot be made.
 * Pure — ids and dates come with the edit — so the repository can apply it
 * and a test can predict it.
 */
export function applyClassEdit(
  record: ClassRecord,
  edit: ClassEdit,
): { record: ClassRecord } | { problem: ClassEditProblem } {
  const rooms = record.rooms ?? [];
  const plans = record.seatingHistory;
  const findPlan = (planId: string) => plans.find((plan) => plan.id === planId);

  switch (edit.kind) {
    case 'renamePlan': {
      if (!findPlan(edit.planId)) return { problem: 'not-found' };
      const problem = checkPlanName(plans, edit.name, edit.planId);
      if (problem) return { problem };
      return {
        record: {
          ...record,
          seatingHistory: plans.map((plan) =>
            plan.id === edit.planId
              ? { ...plan, name: edit.name.trim() }
              : plan,
          ),
        },
      };
    }
    case 'deletePlan': {
      if (!findPlan(edit.planId)) return { problem: 'not-found' };
      return {
        record: {
          ...record,
          seatingHistory: plans.filter((plan) => plan.id !== edit.planId),
          activePlanId:
            record.activePlanId === edit.planId ? null : record.activePlanId,
          rooms: withoutParkedPlan(rooms, edit.planId),
        },
      };
    }
    case 'duplicatePlan': {
      const plan = findPlan(edit.planId);
      if (!plan) return { problem: 'not-found' };
      const problem = checkPlanName(plans, edit.name);
      if (problem) return { problem };
      const copy: SavedPlan = {
        ...plan,
        id: edit.newId,
        name: edit.name.trim(),
        date: edit.date,
      };
      delete copy.autoSaved;
      return { record: { ...record, seatingHistory: [...plans, copy] } };
    }
    case 'movePlan': {
      const plan = findPlan(edit.planId);
      const target = rooms.find((room) => room.id === edit.roomId);
      if (!plan || !target) return { problem: 'not-found' };
      if (plan.roomId === target.id) return { record };
      return { record: movePlan(record, plan, target, false) };
    }
    case 'movePlanToNewRoom': {
      const plan = findPlan(edit.planId);
      if (!plan) return { problem: 'not-found' };
      if (rooms.length >= MAX_ROOMS_PER_CLASS) return { problem: 'room-limit' };
      const problem = checkRoomName(rooms, edit.room.name);
      if (problem) return { problem };
      return {
        record: movePlan(
          record,
          plan,
          { ...edit.room, name: edit.room.name.trim() },
          true,
        ),
      };
    }
    case 'deleteMix': {
      if (!record.mixHistory.some((mix) => mix.id === edit.mixId)) {
        return { problem: 'not-found' };
      }
      return {
        record: {
          ...record,
          mixHistory: record.mixHistory.filter((mix) => mix.id !== edit.mixId),
        },
      };
    }
    case 'createRoom': {
      if (rooms.length >= MAX_ROOMS_PER_CLASS) return { problem: 'room-limit' };
      const problem = checkRoomName(rooms, edit.room.name);
      if (problem) return { problem };
      return {
        record: {
          ...record,
          rooms: [...rooms, { ...edit.room, name: edit.room.name.trim() }],
        },
      };
    }
    case 'renameRoom': {
      if (!rooms.some((room) => room.id === edit.roomId)) {
        return { problem: 'not-found' };
      }
      const problem = checkRoomName(rooms, edit.name, edit.roomId);
      if (problem) return { problem };
      return {
        record: {
          ...record,
          rooms: rooms.map((room) =>
            room.id === edit.roomId
              ? { ...room, name: edit.name.trim() }
              : room,
          ),
        },
      };
    }
    case 'deleteRoom': {
      if (!rooms.some((room) => room.id === edit.roomId)) {
        return { problem: 'not-found' };
      }
      if (edit.roomId === record.activeRoomId) return { problem: 'room-open' };
      if (rooms.length <= 1) return { problem: 'last-room' };
      return {
        record: {
          ...record,
          rooms: rooms.filter((room) => room.id !== edit.roomId),
          seatingHistory: plans.filter((plan) => plan.roomId !== edit.roomId),
          mixHistory: record.mixHistory.filter(
            (mix) => mix.roomId !== edit.roomId,
          ),
        },
      };
    }
  }
}
