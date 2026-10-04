// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleLayout } from '@/types/Circle';
import type { RoomRecord } from '@/types';
import {
  createMockClassroomScene,
  createMockMixResult,
  createMockSavedPlan,
  createMockSeatingArrangement,
} from '@/__tests__/utils';
import { usePlanPersistenceHandlers } from '../usePlanPersistenceHandlers';

const rooms: RoomRecord[] = [
  { id: 'classroom', name: 'Klassenraum', createdAt: '2026-10-04' },
  {
    id: 'lab',
    name: 'Labor',
    createdAt: '2026-10-04',
    parked: {
      scene: createMockClassroomScene(3),
      seating: [],
      lockedPositions: {},
      circleLayout: null,
      activePlanId: null,
    },
  },
];

const setup = () => {
  const params = {
    hasPlan: true,
    circleLayout: null,
    saveSeatingPlan: vi.fn(() => true),
    loadSeatingPlan: vi.fn(),
    setPlanName: vi.fn(),
    setPlanNameError: vi.fn(),
    updateClassroomScene: vi.fn(),
    setCircleLayout: vi.fn(),
    setStep: vi.fn(),
    step: 3,
    setCurrentSeating: vi.fn(),
    setMixSettings: vi.fn(),
    markClassroomSynced: vi.fn(),
    syncSeatingSnapshot: vi.fn(),
    recordSeatingSnapshot: vi.fn(),
    classroomScene: createMockClassroomScene(2),
    students: [],
    rooms,
    activeRoomId: 'classroom',
    seatingHistory: [],
    switchRoom: vi.fn(() => true),
  };
  const { result } = renderHook(() => usePlanPersistenceHandlers(params));
  return { params, result };
};

describe('usePlanPersistenceHandlers.handleHistoryLoad', () => {
  it('takes the circle on screen away when the plan has none', () => {
    const { params, result } = setup();
    const plan = createMockSavedPlan({ scene: createMockClassroomScene(2) });
    delete plan.circleLayout;

    result.current.handleHistoryLoad(plan);

    expect(params.setCircleLayout).toHaveBeenCalledWith(null);
    expect(params.syncSeatingSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ circleLayout: null }),
    );
  });

  it("puts the plan's own circle on screen", () => {
    const { params, result } = setup();
    const circleLayout = { students: [] } as unknown as CircleLayout;
    const plan = createMockSavedPlan({
      scene: createMockClassroomScene(2),
      circleLayout,
    });

    result.current.handleHistoryLoad(plan);

    expect(params.setCircleLayout).toHaveBeenCalledWith(circleLayout);
  });
});

describe('usePlanPersistenceHandlers across rooms', () => {
  it('opens the room of a plan from another room, with the plan on screen', () => {
    const { params, result } = setup();
    const plan = createMockSavedPlan({ id: 'lab-plan', roomId: 'lab' });

    result.current.handleHistoryLoad(plan);

    expect(params.switchRoom).toHaveBeenCalledWith(
      'lab',
      expect.objectContaining({ activePlanId: 'lab-plan' }),
    );
    expect(params.loadSeatingPlan).not.toHaveBeenCalled();
  });

  it('loads a plan of the open room in place', () => {
    const { params, result } = setup();
    const plan = createMockSavedPlan({ roomId: 'classroom' });

    result.current.handleHistoryLoad(plan);

    expect(params.switchRoom).not.toHaveBeenCalled();
    expect(params.loadSeatingPlan).toHaveBeenCalled();
  });

  it('puts a mix back in the room it was made in when it fits there', () => {
    const { params, result } = setup();
    const mix = createMockMixResult({
      roomId: 'lab',
      seating: createMockSeatingArrangement([], createMockClassroomScene(3)),
    });

    expect(result.current.handleMixLoad(mix)).toBe(true);
    expect(params.switchRoom).toHaveBeenCalledWith('lab');
    expect(params.setCurrentSeating).toHaveBeenCalled();
  });

  it('refuses a mix that no longer fits its room', () => {
    const { params, result } = setup();
    const mix = createMockMixResult({
      roomId: 'classroom',
      seating: createMockSeatingArrangement([], createMockClassroomScene(5)),
    });

    expect(result.current.handleMixLoad(mix)).toBe(false);
    expect(params.setCurrentSeating).not.toHaveBeenCalled();
    expect(params.switchRoom).not.toHaveBeenCalled();
  });
});
