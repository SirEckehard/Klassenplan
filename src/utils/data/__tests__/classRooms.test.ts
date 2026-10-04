// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type {
  ClassCollectionState,
  ClassRecord,
  MixResult,
  RoomRecord,
  SavedPlan,
} from '@/types';
import {
  createMockClassroomScene,
  createMockMixResult,
  createMockSavedPlan,
} from '@/__tests__/utils';
import {
  checkRoomName,
  EMPTY_ROOM_STATE,
  ensureClassRooms,
  ensureCollectionRooms,
  fittingLocks,
  roomStateToOpen,
  switchRoomState,
  workingStateFromPlan,
} from '../classRooms';

const room = (id: string, extra: Partial<RoomRecord> = {}): RoomRecord => ({
  id,
  name: id,
  createdAt: '2026-10-04T08:00:00.000Z',
  ...extra,
});

const plan = (id: string, roomId?: string): SavedPlan =>
  createMockSavedPlan({ id, name: id, ...(roomId && { roomId }) });

const mix = (id: number, roomId?: string): MixResult =>
  createMockMixResult({ id, ...(roomId && { roomId }) });

const classRecord = (extra: Partial<ClassRecord> = {}): ClassRecord => ({
  id: 'class-a',
  name: '7a',
  createdAt: '2026-10-04T08:00:00.000Z',
  updatedAt: '2026-10-04T08:00:00.000Z',
  students: [],
  seatingHistory: [],
  mixHistory: [],
  currentSeating: [],
  lockedPositions: {},
  mixSettings: null,
  classroomScene: null,
  circleLayout: null,
  ...extra,
});

const newRoom = () => room('made', { name: 'Klassenraum' });

describe('ensureClassRooms', () => {
  it('gives a class from before rooms one room that holds every plan and mix', () => {
    const repaired = ensureClassRooms(
      classRecord({
        seatingHistory: [plan('p1'), plan('p2')],
        mixHistory: [mix(1)],
        activePlanId: 'p2',
      }),
      newRoom,
    );

    expect(repaired.rooms).toEqual([newRoom()]);
    expect(repaired.activeRoomId).toBe('made');
    expect(repaired.seatingHistory.map((entry) => entry.roomId)).toEqual([
      'made',
      'made',
    ]);
    expect(repaired.mixHistory[0]?.roomId).toBe('made');
    expect(repaired.activePlanId).toBe('p2');
  });

  it('names the room it makes in the language of the app', () => {
    const repaired = ensureClassRooms(classRecord());

    expect(repaired.rooms).toHaveLength(1);
    expect(repaired.rooms?.[0]?.name).toMatch(/Klassenraum|Classroom/);
    expect(repaired.activeRoomId).toBe(repaired.rooms?.[0]?.id);
  });

  it('returns the class itself when nothing is amiss, and is idempotent', () => {
    const sound = classRecord({
      rooms: [room('a'), room('b', { parked: undefined })],
      activeRoomId: 'a',
      seatingHistory: [plan('p1', 'a'), plan('p2', 'b')],
      mixHistory: [mix(1, 'b')],
    });

    expect(ensureClassRooms(sound, newRoom)).toBe(sound);
    const repaired = ensureClassRooms(classRecord(), newRoom);
    expect(ensureClassRooms(repaired, newRoom)).toBe(repaired);
  });

  it('opens the room of the open plan, whose state the working fields hold', () => {
    const repaired = ensureClassRooms(
      classRecord({
        rooms: [room('a'), room('b')],
        activeRoomId: 'a',
        seatingHistory: [plan('p1', 'a'), plan('p2', 'b')],
        activePlanId: 'p2',
      }),
      newRoom,
    );

    expect(repaired.activeRoomId).toBe('b');
  });

  it('falls back to the first room when the open one is gone', () => {
    const repaired = ensureClassRooms(
      classRecord({ rooms: [room('a'), room('b')], activeRoomId: 'gone' }),
      newRoom,
    );

    expect(repaired.activeRoomId).toBe('a');
  });

  it('puts plans and mixes of a room that is gone into the open room', () => {
    const repaired = ensureClassRooms(
      classRecord({
        rooms: [room('a'), room('b')],
        activeRoomId: 'b',
        seatingHistory: [plan('p1', 'gone'), plan('p2', 'a')],
        mixHistory: [mix(1, 'gone')],
      }),
      newRoom,
    );

    expect(repaired.seatingHistory.map((entry) => entry.roomId)).toEqual([
      'b',
      'a',
    ]);
    expect(repaired.mixHistory[0]?.roomId).toBe('b');
  });

  it('parks nothing for the open room', () => {
    const parked = {
      scene: createMockClassroomScene(2),
      seating: [],
      lockedPositions: {},
      circleLayout: null,
      activePlanId: null,
    };
    const repaired = ensureClassRooms(
      classRecord({
        rooms: [room('a', { parked }), room('b', { parked })],
        activeRoomId: 'a',
      }),
      newRoom,
    );

    expect(repaired.rooms?.[0]).not.toHaveProperty('parked');
    expect(repaired.rooms?.[1]?.parked).toBe(parked);
  });

  it('lets a parked room open no plan of another room', () => {
    const parkedOn = (activePlanId: string) => ({
      scene: null,
      seating: [],
      lockedPositions: {},
      circleLayout: null,
      activePlanId,
    });
    const repaired = ensureClassRooms(
      classRecord({
        rooms: [
          room('a'),
          room('b', { parked: parkedOn('p-a') }),
          room('c', { parked: parkedOn('p-c') }),
        ],
        activeRoomId: 'a',
        seatingHistory: [plan('p-a', 'a'), plan('p-c', 'c')],
      }),
      newRoom,
    );

    expect(repaired.rooms?.[1]?.parked?.activePlanId).toBeNull();
    expect(repaired.rooms?.[2]?.parked?.activePlanId).toBe('p-c');
  });

  it('keeps the first of two rooms with one id and leaves names alone', () => {
    const repaired = ensureClassRooms(
      classRecord({
        rooms: [room('a', { name: 'Labor' }), room('a', { name: 'Gym' })],
        activeRoomId: 'a',
      }),
      newRoom,
    );

    expect(repaired.rooms).toEqual([room('a', { name: 'Labor' })]);
  });
});

describe('ensureCollectionRooms', () => {
  it('returns the collection itself when every class is sound', () => {
    const sound = ensureClassRooms(classRecord(), newRoom);
    const collection: ClassCollectionState = {
      version: 2,
      activeClassId: 'class-a',
      classes: [sound],
    };

    expect(ensureCollectionRooms(collection)).toBe(collection);
  });

  it('repairs the classes that need it', () => {
    const collection: ClassCollectionState = {
      version: 1,
      activeClassId: 'class-a',
      classes: [classRecord()],
    };

    const repaired = ensureCollectionRooms(collection);

    expect(repaired).not.toBe(collection);
    expect(repaired.classes[0]?.rooms).toHaveLength(1);
  });
});

describe('opening another room', () => {
  const working = {
    scene: createMockClassroomScene(2),
    seating: [],
    lockedPositions: {},
    circleLayout: null,
    activePlanId: 'p-a',
  };
  const labState = {
    scene: createMockClassroomScene(3),
    seating: [],
    lockedPositions: {},
    circleLayout: null,
    activePlanId: null,
  };
  const rooms = [room('a'), room('b', { parked: labState }), room('c')];

  it('parks the room left and opens the other as it was left', () => {
    const next = switchRoomState(
      { rooms, activeRoomId: 'a', working, plans: [] },
      'b',
    );

    expect(next?.activeRoomId).toBe('b');
    expect(next?.working).toBe(labState);
    expect(next?.rooms[0]?.parked).toBe(working);
    expect(next?.rooms[1]).not.toHaveProperty('parked');
  });

  it("takes what is opened in place of the room's own state", () => {
    const plan = createMockSavedPlan({ id: 'p-b', roomId: 'b' });

    const next = switchRoomState(
      { rooms, activeRoomId: 'a', working, plans: [plan] },
      'b',
      workingStateFromPlan(plan),
    );

    expect(next?.working.activePlanId).toBe('p-b');
    expect(next?.working.scene).toBe(plan.scene);
  });

  it('opens a room that parked nothing with its last plan, or empty', () => {
    const older = createMockSavedPlan({ id: 'old', roomId: 'c' });
    const newer = createMockSavedPlan({ id: 'new', roomId: 'c' });

    expect(roomStateToOpen(room('c'), [older, newer]).activePlanId).toBe('new');
    expect(roomStateToOpen(room('c'), [])).toBe(EMPTY_ROOM_STATE);
  });

  it("opens nothing for a room that is open or not the class's", () => {
    const scope = { rooms, activeRoomId: 'a', working, plans: [] };

    expect(switchRoomState(scope, 'a')).toBeNull();
    expect(switchRoomState(scope, 'elsewhere')).toBeNull();
  });
});

describe('checkRoomName', () => {
  const rooms = [
    room('a', { name: 'Klassenraum' }),
    room('b', { name: 'Labor' }),
  ];

  it('refuses an empty name, one too long and one another room carries', () => {
    expect(checkRoomName(rooms, '  ')).toBe('empty');
    expect(checkRoomName(rooms, 'x'.repeat(121))).toBe('too-long');
    expect(checkRoomName(rooms, 'labor')).toBe('taken');
  });

  it('lets a room keep its own name and take a free one', () => {
    expect(checkRoomName(rooms, 'Labor', 'b')).toBeNull();
    expect(checkRoomName(rooms, 'Turnhalle')).toBeNull();
  });
});

describe('fittingLocks', () => {
  it('keeps locks of students in the class on seats the seating has', () => {
    const seating = [
      [null, null],
      [null, null, null],
    ];
    const locks = fittingLocks(
      {
        ada: { table: 1, seat: 2 },
        gone: { table: 0, seat: 0 },
        off: { table: 2, seat: 0 },
        beyond: { table: 0, seat: 2 },
      },
      seating,
      new Set(['ada', 'off', 'beyond']),
    );

    expect(locks).toEqual({ ada: { table: 1, seat: 2 } });
  });
});
