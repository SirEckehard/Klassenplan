// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The mix history feeds "avoid previous pairs" and can be loaded back onto the
 * screen, so it has to hold the plan the teacher actually got: after a mix and
 * its refinement, that is the refined arrangement (decision 0014).
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
const constructed: SeatingArrangement = [[ada, ben]];
const refined: SeatingArrangement = [[ben, ada]];

const settings = normalizeMixSettings(
  { avoidRestlessTogether: 5 },
  neutralSettings,
);
const scene = createMockClassroomScene(2);
const refineOptions = { triesPerPass: 600, passes: 2 };

const setup = () => {
  let mixHistory: MixResult[] = [];
  const state = {
    studentState: { students: [ada, ben] },
    historyState: {
      seatingHistory: [],
      mixHistory: [],
      addMixResult: (result: MixResult) => {
        mixHistory = [...mixHistory, result];
      },
      setMixHistory: (
        next: MixResult[] | ((prev: MixResult[]) => MixResult[]),
      ) => {
        mixHistory = typeof next === 'function' ? next(mixHistory) : next;
      },
    },
    algorithmState: { lockedPositions: {}, setLastStatistics: vi.fn() },
    planState: { currentSeating: [], setCurrentSeating: vi.fn() },
  } as unknown as SeatingState;

  const { result } = renderHook(() => useSeatingAlgorithm(state));
  return { result, getMixHistory: () => mixHistory };
};

beforeEach(() => {
  callOperation.mockReset();
  callOperation
    .mockResolvedValueOnce({ seating: constructed })
    .mockResolvedValueOnce({ seating: refined });
});

describe('useSeatingAlgorithm mix history', () => {
  it('replaces the mix result with the refined arrangement', async () => {
    const { result, getMixHistory } = setup();

    await act(async () => {
      const arrangement = await result.current.generateSeatingPlan(
        settings,
        scene,
      );
      await result.current.refineSeatingLocal(
        settings,
        scene,
        refineOptions,
        arrangement,
      );
    });

    expect(getMixHistory()).toHaveLength(1);
    expect(getMixHistory()[0]?.seating).toBe(refined);
  });

  it('leaves the entry alone when a refinement starts elsewhere', async () => {
    const { result, getMixHistory } = setup();

    await act(async () => {
      await result.current.generateSeatingPlan(settings, scene);
      await result.current.refineSeatingLocal(settings, scene, refineOptions);
    });

    expect(getMixHistory()).toHaveLength(1);
    expect(getMixHistory()[0]?.seating).toBe(constructed);
  });
});
