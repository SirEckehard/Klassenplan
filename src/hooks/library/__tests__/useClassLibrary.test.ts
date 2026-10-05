// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassRecord, ClassSummary, RoomRecord } from '@/types';
import {
  createMockClassroomScene,
  createMockSavedPlan,
} from '@/__tests__/utils';
import { useClassLibrary } from '../useClassLibrary';

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  actions: {} as Record<string, ReturnType<typeof vi.fn>>,
  repository: {
    loadClassRecord: vi.fn(),
    editInactiveClass: vi.fn(),
  },
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => mocks.actions,
}));
vi.mock('@/hooks/useSeatingRepository', () => ({
  useSeatingRepository: () => mocks.repository,
}));

const room = (id: string, name: string): RoomRecord => ({
  id,
  name,
  createdAt: '2026-10-04',
});

const summary = (id: string, name: string): ClassSummary => ({
  id,
  name,
  createdAt: '2026-10-04',
  updatedAt: '2026-10-04',
  studentCount: 0,
});

const storedClass = (id: string, name: string): ClassRecord => ({
  id,
  name,
  createdAt: '2026-10-04',
  updatedAt: '2026-10-04',
  students: [],
  seatingHistory: [createMockSavedPlan({ id: `${id}-plan`, roomId: 'r1' })],
  mixHistory: [],
  currentSeating: [],
  lockedPositions: {},
  mixSettings: null,
  classroomScene: createMockClassroomScene(5),
  circleLayout: null,
  rooms: [room('r1', 'Klassenraum')],
  activeRoomId: 'r1',
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = {
    activeClass: { id: 'open', name: '7a' },
    classSummaries: [summary('open', '7a'), summary('other', '8c')],
    students: [],
    rooms: [room('r1', 'Klassenraum'), room('r2', 'Labor')],
    activeRoomId: 'r1',
    activePlanId: null,
    seatingHistory: [createMockSavedPlan({ id: 'p1', roomId: 'r2' })],
    mixHistory: [],
    classroomScene: createMockClassroomScene(3),
  };
  mocks.actions = {
    renameSeatingPlan: vi.fn(() => true),
    deleteSeatingPlan: vi.fn(),
    addRoom: vi.fn(() => room('r3', 'Turnhalle')),
    renameRoom: vi.fn(() => null),
  };
  mocks.repository.loadClassRecord.mockImplementation(async (id: string) => ({
    success: true,
    data: storedClass(id, id === 'other' ? '8c' : id),
  }));
  mocks.repository.editInactiveClass.mockResolvedValue({
    success: true,
    data: { ok: true },
  });
});

describe('useClassLibrary', () => {
  it('reads the open class from the live state, never from storage', () => {
    const { result } = renderHook(() => useClassLibrary('open'));

    expect(result.current.selected?.isOpen).toBe(true);
    expect(result.current.selected?.rooms.map((entry) => entry.name)).toEqual([
      'Klassenraum',
      'Labor',
    ]);
    // The open room shows the tables on screen.
    expect(result.current.selected?.rooms[0]?.scene.tables).toHaveLength(3);
    expect(mocks.repository.loadClassRecord).not.toHaveBeenCalled();
  });

  it('reads another class from storage', async () => {
    const { result } = renderHook(() => useClassLibrary('other'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.selected?.name).toBe('8c'));
    expect(result.current.loading).toBe(false);
    expect(result.current.selected?.isOpen).toBe(false);
    expect(result.current.selected?.rooms[0]?.scene.tables).toHaveLength(5);
  });

  it('drops an answer that arrives for a class no longer selected', async () => {
    let answerFirst: (value: unknown) => void = () => {};
    mocks.repository.loadClassRecord.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answerFirst = resolve;
        }),
    );
    const { result, rerender } = renderHook(({ id }) => useClassLibrary(id), {
      initialProps: { id: 'slow' as string | null },
    });

    rerender({ id: 'other' });
    await waitFor(() => expect(result.current.selected?.name).toBe('8c'));
    await act(async () => {
      answerFirst({ success: true, data: storedClass('slow', 'Langsam') });
    });

    expect(result.current.selected?.name).toBe('8c');
  });

  it('changes the open class through its live actions', async () => {
    const { result } = renderHook(() => useClassLibrary('open'));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.edit('open', {
        kind: 'createRoom',
        name: 'Turnhalle',
      });
    });

    expect(outcome).toEqual({ ok: true, roomId: 'r3' });
    expect(mocks.actions.addRoom).toHaveBeenCalledWith('Turnhalle');
    expect(mocks.repository.editInactiveClass).not.toHaveBeenCalled();
  });

  it('refuses a plan name the open class has, before asking the live action', async () => {
    mocks.state.seatingHistory = [
      createMockSavedPlan({ id: 'p1', name: 'September' }),
      createMockSavedPlan({ id: 'p2', name: 'Oktober' }),
    ];
    const { result } = renderHook(() => useClassLibrary('open'));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.edit('open', {
        kind: 'renamePlan',
        planId: 'p2',
        name: 'September',
      });
    });

    expect(outcome).toEqual({ ok: false, reason: 'taken' });
    expect(mocks.actions.renameSeatingPlan).not.toHaveBeenCalled();
  });

  it('changes another class in storage and reads it again', async () => {
    const { result } = renderHook(() => useClassLibrary('other'));
    await waitFor(() => expect(result.current.selected?.name).toBe('8c'));
    mocks.repository.loadClassRecord.mockClear();

    await act(async () => {
      await result.current.edit('other', {
        kind: 'duplicatePlan',
        planId: 'other-plan',
      });
    });

    expect(mocks.repository.editInactiveClass).toHaveBeenCalledWith(
      'other',
      expect.objectContaining({
        kind: 'duplicatePlan',
        planId: 'other-plan',
        newId: expect.any(String),
        name: expect.stringMatching(/\(2\)$/),
      }),
    );
    await waitFor(() =>
      expect(mocks.repository.loadClassRecord).toHaveBeenCalledWith('other'),
    );
  });
});
