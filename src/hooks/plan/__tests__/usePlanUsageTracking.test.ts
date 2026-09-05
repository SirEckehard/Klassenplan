// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const recordPlanUsage = vi.fn(async (..._args: unknown[]) => {});

vi.mock('@/repositories/planUsageStore', () => ({
  recordPlanUsage: (...args: unknown[]) => recordPlanUsage(...args),
}));

import { usePlanUsageTracking } from '../usePlanUsageTracking';
import { createMockStudent } from '@/__tests__/utils';
import type { SeatingArrangement } from '@/types';

const anna = createMockStudent({ id: 'a', name: 'Anna' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });
const carla = createMockStudent({ id: 'c', name: 'Carla' });

const seatedWithBen: SeatingArrangement = [[anna, ben]];
const seatedWithCarla: SeatingArrangement = [[anna, carla]];

beforeEach(() => {
  vi.useFakeTimers();
  recordPlanUsage.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlanUsageTracking', () => {
  it('records a hand-edited arrangement only after the drags stop', () => {
    const { result } = renderHook(() =>
      usePlanUsageTracking({
        classId: 'c1',
        currentSeating: seatedWithBen,
      }),
    );

    act(() => {
      result.current.noteSeatingEdited();
    });
    expect(recordPlanUsage).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(recordPlanUsage).toHaveBeenCalledExactlyOnceWith(
      'c1',
      seatedWithBen,
      'edited',
    );
  });

  it('writes once for a burst of swaps, with the arrangement they end on', () => {
    const { result, rerender } = renderHook(
      ({ seating }: { seating: SeatingArrangement }) =>
        usePlanUsageTracking({
          classId: 'c1',
          currentSeating: seating,
        }),
      { initialProps: { seating: seatedWithBen } },
    );

    act(() => {
      result.current.noteSeatingEdited();
      vi.advanceTimersByTime(3000);
    });

    rerender({ seating: seatedWithCarla });

    act(() => {
      result.current.noteSeatingEdited();
      vi.advanceTimersByTime(4000);
    });

    expect(recordPlanUsage).toHaveBeenCalledExactlyOnceWith(
      'c1',
      seatedWithCarla,
      'edited',
    );
  });

  it('drops a pending signal when the view goes away', () => {
    const { result, unmount } = renderHook(() =>
      usePlanUsageTracking({
        classId: 'c1',
        currentSeating: seatedWithBen,
      }),
    );

    act(() => {
      result.current.noteSeatingEdited();
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(recordPlanUsage).not.toHaveBeenCalled();
  });

  it('records nothing while no class is active', () => {
    const { result } = renderHook(() =>
      usePlanUsageTracking({
        classId: null,
        currentSeating: seatedWithBen,
      }),
    );

    act(() => {
      result.current.noteSeatingEdited();
      vi.advanceTimersByTime(4000);
    });

    expect(recordPlanUsage).toHaveBeenCalledExactlyOnceWith(
      null,
      seatedWithBen,
      'edited',
    );
  });

  it('drops a pending edit when the class is switched', () => {
    const { result, rerender } = renderHook(
      ({ classId }: { classId: string }) =>
        usePlanUsageTracking({ classId, currentSeating: seatedWithBen }),
      { initialProps: { classId: 'c1' } },
    );

    act(() => {
      result.current.noteSeatingEdited();
    });

    rerender({ classId: 'c2' });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // The arrangement is read at fire time, so letting the signal through would
    // file the newly loaded class under an edit made in the previous one.
    expect(recordPlanUsage).not.toHaveBeenCalled();
  });
});
