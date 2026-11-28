// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How the plan layer asks how a plan in use went (decision 0054, addendum of
 * 2026-11-27): "Mischen" asks first, "Nicht gut" turns to the tables, and a
 * mix waits until the class's records carry what was said.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanFeedback, PlanUsage, SeatingArrangement } from '@/types';
import { usePlanFeedbackFlow } from '../usePlanFeedbackFlow';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '@/utils/data/planUsage';

const PAIR = [
  [
    { id: 'anna', name: 'Anna' },
    { id: 'ben', name: 'Ben' },
  ],
] as SeatingArrangement;
const SCENE = { tables: [{ seatCount: 2 }], features: [] };
const PAIRS = collectSeatingPairKeys(PAIR, null);

const inUse = (feedback?: PlanFeedback): PlanUsage => ({
  id: 'u1',
  fingerprint: computePlanFingerprint(PAIRS),
  pairs: PAIRS,
  firstSeenAt: '2026-10-12T08:00:00.000Z',
  lastSeenAt: '2026-10-20T08:00:00.000Z',
  sources: ['presented'],
  confidence: 1,
  ...(feedback ? { feedback } : {}),
});

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  setFeedback: vi.fn(),
  handleMix: vi.fn(async () => 'mixed' as const),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
}));
vi.mock('@/hooks/plan/usePlanSaveState', () => ({
  usePlanSaveState: () => ({
    openPlan: undefined,
    hasUnsavedChanges: () => true,
  }),
}));
vi.mock('@/hooks/plan/useSetPlanFeedback', () => ({
  useSetPlanFeedback: () => mocks.setFeedback,
}));

const setState = (patch: Record<string, unknown> = {}) => {
  mocks.state = {
    activeClass: { id: 'c1', name: '7b' },
    classroomScene: SCENE,
    currentSeating: PAIR,
    mixSettings: { considerPlanFeedback: 6 },
    planUsage: [inUse()],
    seatingHistory: [],
    ...patch,
  };
};

const renderFlow = () =>
  renderHook(() =>
    usePlanFeedbackFlow({ handleMix: mocks.handleMix, mixingLocked: false }),
  );

beforeEach(() => {
  localStorage.clear();
  setState();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('usePlanFeedbackFlow', () => {
  it('mixes at once where no plan in use is on the stage', async () => {
    setState({ planUsage: [] });
    const { result } = renderFlow();

    act(() => result.current.requestMix());

    expect(result.current.question).toBeNull();
    await waitFor(() => expect(mocks.handleMix).toHaveBeenCalledTimes(1));
  });

  it('asks first about a plan in use, once', async () => {
    const { result } = renderFlow();

    act(() => result.current.requestMix());
    expect(result.current.question?.record.id).toBe('u1');
    expect(mocks.handleMix).not.toHaveBeenCalled();

    act(() => result.current.answer('skip'));
    await waitFor(() => expect(mocks.handleMix).toHaveBeenCalledTimes(1));
    expect(mocks.setFeedback).not.toHaveBeenCalled();

    act(() => result.current.requestMix());
    expect(result.current.question).toBeNull();
    await waitFor(() => expect(mocks.handleMix).toHaveBeenCalledTimes(2));
  });

  it('asks nothing while "Erfahrung" does not count', async () => {
    setState({ mixSettings: { considerPlanFeedback: 0 } });
    const { result } = renderFlow();

    act(() => result.current.requestMix());

    expect(result.current.question).toBeNull();
    await waitFor(() => expect(mocks.handleMix).toHaveBeenCalledTimes(1));
  });

  it('puts the question away without mixing', () => {
    const { result } = renderFlow();

    act(() => result.current.requestMix());
    act(() => result.current.answer('dismiss'));

    expect(result.current.question).toBeNull();
    expect(mocks.handleMix).not.toHaveBeenCalled();
    // Not answered: the next "Mischen" asks again.
    act(() => result.current.requestMix());
    expect(result.current.question).not.toBeNull();
  });

  it('mixes after "Gut" once the records carry it', async () => {
    const { result, rerender } = renderFlow();

    act(() => result.current.requestMix());
    act(() => result.current.answer('good'));

    const given = mocks.setFeedback.mock.calls[0]?.[2] as PlanFeedback;
    expect(given).toEqual({ rating: 'good', at: expect.any(String) });
    expect(result.current.feedback).toEqual(given);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.handleMix).not.toHaveBeenCalled();

    setState({ planUsage: [inUse(given)] });
    rerender();

    await waitFor(() => expect(mocks.handleMix).toHaveBeenCalledTimes(1));
  });

  it('turns to the tables after "Nicht gut" and mixes when they are chosen', async () => {
    const { result, rerender } = renderFlow();

    act(() => result.current.requestMix());
    act(() => result.current.answer('poor'));
    expect(result.current.picking).toBe('mix');

    act(() => result.current.toggleTable(['ben', 'anna']));
    const chosen = mocks.setFeedback.mock.calls[1]?.[2] as PlanFeedback;
    expect(chosen).toEqual({
      rating: 'poor',
      poorTables: [['anna', 'ben']],
      at: expect.any(String),
    });

    // "Mischen" while the tables are chosen ends that and mixes.
    act(() => result.current.requestMix());
    expect(result.current.picking).toBeNull();
    expect(mocks.handleMix).not.toHaveBeenCalled();

    setState({ planUsage: [inUse(chosen)] });
    rerender();
    await waitFor(() => expect(mocks.handleMix).toHaveBeenCalledTimes(1));
  });

  it('takes a table out on a second tap', () => {
    setState({
      planUsage: [
        inUse({
          rating: 'poor',
          poorTables: [['anna', 'ben']],
          at: '2026-11-01T08:00:00.000Z',
        }),
      ],
    });
    const { result } = renderFlow();

    act(() => result.current.toggleTable(['anna', 'ben']));

    expect(mocks.setFeedback.mock.calls[0]?.[2]).toEqual({
      rating: 'poor',
      at: expect.any(String),
    });
  });

  it('ends the choice of tables when another plan comes on the stage', () => {
    const { result, rerender } = renderFlow();

    act(() => result.current.startPicking('done'));
    expect(result.current.picking).toBe('done');

    setState({ currentSeating: [[...PAIR[0]!].reverse()] });
    rerender();

    expect(result.current.picking).toBeNull();
  });

  it('offers no feedback for a plan first used today', () => {
    setState({
      planUsage: [{ ...inUse(), firstSeenAt: new Date().toISOString() }],
    });
    const { result } = renderFlow();

    expect(result.current.available).toBe(false);
    act(() => result.current.requestMix());
    expect(result.current.question).toBeNull();
  });
});
