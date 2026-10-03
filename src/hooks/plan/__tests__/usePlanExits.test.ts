// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlanExits } from '@/hooks/plan/usePlanExits';
import { createMockStudent } from '@/__tests__/utils';
import type { SavedPlan, SeatingArrangement } from '@/types';

const anna = createMockStudent({ id: 'a', name: 'Anna' });

const mocks = vi.hoisted(() => ({
  state: {
    planName: '',
    activePlanId: null as string | null,
    classroomScene: { tables: [], features: [] },
    currentSeating: [] as SeatingArrangement,
    seatingHistory: [] as SavedPlan[],
    circleLayout: null,
    seatingMode: 'table' as 'table' | 'circle',
  },
  handleSaveSeatingPlan: vi.fn(() => true),
  navigate: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => ({
    handleSaveSeatingPlan: mocks.handleSaveSeatingPlan,
  }),
}));

vi.mock('@/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => mocks.navigate,
}));

const saved = (id: string, name: string, seating: SeatingArrangement) =>
  ({
    id,
    name,
    seating,
    scene: mocks.state.classroomScene,
  }) as unknown as SavedPlan;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.state, {
    planName: '',
    activePlanId: null,
    currentSeating: [[anna, null]],
    seatingHistory: [],
    seatingMode: 'table',
  });
});

describe('usePlanExits', () => {
  it('has no way out while nobody is seated', () => {
    mocks.state.currentSeating = [[null, null]];

    const { result } = renderHook(() => usePlanExits());

    // Tables without students are the room, not a plan: the export would be
    // an empty sheet, and the status bar says "no plan yet" for the same.
    expect(result.current.canExit).toBe(false);
  });

  it('leaves the open plan alone when it matches what is saved', () => {
    const seating: SeatingArrangement = [[anna, null]];
    mocks.state.currentSeating = seating;
    mocks.state.activePlanId = 'p1';
    mocks.state.planName = 'Deutsch';
    mocks.state.seatingHistory = [saved('p1', 'Deutsch', seating)];

    const { result } = renderHook(() => usePlanExits());
    act(() => result.current.exportPlan());

    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/export', {
      state: { mode: 'table' },
    });
  });

  // The sheet opens on what the stage showed: from the circle, the circle.
  it('takes the circle along to the export', () => {
    mocks.state.seatingMode = 'circle';

    const { result } = renderHook(() => usePlanExits());
    act(() => result.current.exportPlan());

    expect(mocks.navigate).toHaveBeenCalledWith('/export', {
      state: { mode: 'circle' },
    });
  });

  it('saves first when the plan was never saved, whatever its name', () => {
    // A saved plan of the same name that is not the open one does not count.
    mocks.state.planName = 'Deutsch';
    mocks.state.seatingHistory = [
      saved('p1', 'Deutsch', mocks.state.currentSeating),
    ];

    const { result } = renderHook(() => usePlanExits());
    act(() => result.current.presentPlan());

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith('/present', {
      state: { mode: 'table' },
    });
  });
});
