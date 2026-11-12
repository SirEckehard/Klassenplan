// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0024 as properties: whatever shape a class arrives in — rooms
 * missing or repeated, plans in rooms that are gone, an open room that is not
 * the class's — `ensureClassRooms` repairs it once, and a repaired class comes
 * back untouched, so a read never asks for a write.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ensureClassRooms } from '@/utils/data/classRooms';
import { classRecordArb } from '@/__tests__/utils/arbitraries';

const RUNS = { numRuns: 200 };

describe('the rooms of a class', () => {
  it('repairs a class once and leaves a repaired one as it is', () => {
    fc.assert(
      fc.property(classRecordArb(), (record) => {
        const repaired = ensureClassRooms(record);
        expect(ensureClassRooms(repaired)).toBe(repaired);
      }),
      RUNS,
    );
  });

  it('puts every plan and every mix into a room of the class', () => {
    fc.assert(
      fc.property(classRecordArb(), (record) => {
        const repaired = ensureClassRooms(record);
        const roomIds = new Set(repaired.rooms!.map((room) => room.id));
        expect(roomIds.has(repaired.activeRoomId!)).toBe(true);
        for (const entry of [
          ...repaired.seatingHistory,
          ...repaired.mixHistory,
        ]) {
          expect(roomIds.has(entry.roomId!)).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it('parks nothing in the open room and opens the open plan’s room', () => {
    fc.assert(
      fc.property(classRecordArb(), (record) => {
        const repaired = ensureClassRooms(record);
        const open = repaired.rooms!.find(
          (room) => room.id === repaired.activeRoomId,
        );
        expect(open?.parked).toBeUndefined();
        const openPlan = repaired.seatingHistory.find(
          (plan) => plan.id === repaired.activePlanId,
        );
        if (openPlan) expect(openPlan.roomId).toBe(repaired.activeRoomId);
      }),
      RUNS,
    );
  });

  it('loses no plan, no mix and no student', () => {
    fc.assert(
      fc.property(classRecordArb(), (record) => {
        const repaired = ensureClassRooms(record);
        expect(repaired.seatingHistory.map((plan) => plan.id)).toEqual(
          record.seatingHistory.map((plan) => plan.id),
        );
        expect(repaired.mixHistory.map((mix) => mix.id)).toEqual(
          record.mixHistory.map((mix) => mix.id),
        );
        expect(repaired.students).toBe(record.students);
        expect(repaired.currentSeating).toBe(record.currentSeating);
      }),
      RUNS,
    );
  });
});
