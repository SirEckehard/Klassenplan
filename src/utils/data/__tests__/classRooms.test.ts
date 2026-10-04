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
import { ensureClassRooms, ensureCollectionRooms } from '../classRooms';

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
