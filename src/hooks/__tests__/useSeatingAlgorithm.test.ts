// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The mix history feeds "avoid previous pairs" and can be loaded back onto the
 * screen, so it has to hold the plan the teacher actually got (decision 0014).
 * A mix is one session in the worker — construction and refinement — and its
 * entry is the arrangement the session settled on (decision 0027).
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MixResult, SeatingArrangement } from '@/types';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import { neutralSettings, normalizeMixSettings } from '@/utils';
import type { SeatingState } from '../useSeatingState';
import { useSeatingAlgorithm } from '../useSeatingAlgorithm';

const { callOperation } = vi.hoisted(() => ({ callOperation: vi.fn() }));

vi.mock('@/workers/algorithmWorkerClient', () => ({
  algorithmWorkerClient: { callOperation },
}));
vi.mock('../useSeatingStatisticsUpdater', () => ({
  calculateCurrentStatistics: () => [],
}));

const ada = createMockStudent({ id: 'ada', name: 'Ada' });
const ben = createMockStudent({ id: 'ben', name: 'Ben' });
const mixed: SeatingArrangement = [[ben, ada]];

const settings = normalizeMixSettings(
  { avoidRestlessTogether: 5 },
  neutralSettings,
);
const scene = createMockClassroomScene(2);

const setup = () => {
  let mixHistory: MixResult[] = [];
  const setCurrentSeating = vi.fn();
  const stateFor = (classId: string, roomId = 'room-1') =>
    ({
      studentState: { students: [ada, ben] },
      historyState: {
        seatingHistory: [],
        mixHistory: [],
        addMixResult: (result: MixResult) => {
          mixHistory = [...mixHistory, result];
        },
      },
      algorithmState: { lockedPositions: {}, setLastStatistics: vi.fn() },
      planState: { currentSeating: [], setCurrentSeating },
      roomState: { activeRoomId: roomId },
      classState: { activeClass: { id: classId, name: classId } },
    }) as unknown as SeatingState;

  const { result, rerender } = renderHook(
    ({ classId, roomId }) => useSeatingAlgorithm(stateFor(classId, roomId)),
    { initialProps: { classId: 'class-a', roomId: 'room-1' } },
  );
  return {
    result,
    openClass: (classId: string) => rerender({ classId, roomId: 'room-1' }),
    openRoom: (roomId: string) => rerender({ classId: 'class-a', roomId }),
    setCurrentSeating,
    getMixHistory: () => mixHistory,
  };
};

beforeEach(() => {
  callOperation.mockReset();
  callOperation.mockResolvedValueOnce({ seating: mixed });
});

describe('useSeatingAlgorithm mix history', () => {
  it('records the arrangement the session settled on, once', async () => {
    const { result, getMixHistory, setCurrentSeating } = setup();

    await act(async () => {
      await result.current.generateSeatingPlan(settings, scene);
    });

    expect(callOperation).toHaveBeenCalledTimes(1);
    expect(getMixHistory()).toHaveLength(1);
    expect(getMixHistory()[0]?.seating).toBe(mixed);
    expect(setCurrentSeating).toHaveBeenCalledWith(mixed);
  });

  it('asks the session to refine while a criterion is on, and only then', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.generateSeatingPlan(settings, scene);
    });
    callOperation.mockResolvedValueOnce({ seating: mixed });
    await act(async () => {
      await result.current.generateSeatingPlan(neutralSettings, scene);
    });

    const [first, second] = callOperation.mock.calls;
    expect(first?.[0]).toBe('mix:run');
    expect(first?.[1]).toMatchObject({
      refine: true,
    });
    expect(second?.[1]).toMatchObject({ refine: false });
  });
});

describe('useSeatingAlgorithm and rooms', () => {
  it('notes the room a mix was made in', async () => {
    const { result, getMixHistory } = setup();

    await act(async () => {
      await result.current.generateSeatingPlan(settings, scene);
    });

    expect(getMixHistory()[0]?.roomId).toBe('room-1');
  });

  it('drops a mix that ends after another room opened', async () => {
    let finish: (value: { seating: SeatingArrangement }) => void = () => {};
    callOperation.mockReset();
    callOperation.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, openRoom, setCurrentSeating, getMixHistory } = setup();

    const run = result.current.generateSeatingPlan(settings, scene);
    openRoom('room-2');
    finish({ seating: mixed });

    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    expect(setCurrentSeating).not.toHaveBeenCalled();
    expect(getMixHistory()).toEqual([]);
  });
});

describe('useSeatingAlgorithm across a class switch', () => {
  it('drops a mix that ends after another class opened', async () => {
    let finish: (value: { seating: SeatingArrangement }) => void = () => {};
    callOperation.mockReset();
    callOperation.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, openClass, setCurrentSeating, getMixHistory } = setup();

    const run = result.current.generateSeatingPlan(settings, scene);
    openClass('class-b');
    finish({ seating: mixed });

    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    expect(setCurrentSeating).not.toHaveBeenCalled();
    expect(getMixHistory()).toEqual([]);
  });
});
