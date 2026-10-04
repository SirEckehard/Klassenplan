// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The rooms of a class (decision 0024). A class keeps the rooms its plans and
 * mixes were made in; the open room's state lives in the class's working
 * fields, every other room parks its own. Data written before rooms existed —
 * by an older build, in a backup — is brought into that shape as it is read.
 */
import { generateId } from '@/utils';
import type { ClassCollectionState, ClassRecord, RoomRecord } from '@/types';
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
