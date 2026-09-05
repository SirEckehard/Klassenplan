// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@/i18n'; // Initialize i18n for tests

const recordPlanUsage = vi.fn(
  async (..._args: unknown[]) =>
    ({
      id: 'u1',
      created: true,
      firstStrongSignal: true,
    }) as unknown,
);
const setPlanUsageConfirmed = vi.fn(async (..._args: unknown[]) => {});

vi.mock('@/repositories/planUsageStore', () => ({
  recordPlanUsage: (...args: unknown[]) => recordPlanUsage(...args),
  setPlanUsageConfirmed: (...args: unknown[]) => setPlanUsageConfirmed(...args),
}));

import { usePlanUsagePrompt } from '../usePlanUsagePrompt';
import { subscribeToToasts, type ToastInstance } from '@/utils/ui/toast';
import { createMockStudent } from '@/__tests__/utils';
import type { SeatingArrangement } from '@/types';

const seating: SeatingArrangement = [
  [
    createMockStudent({ id: 'a', name: 'Anna' }),
    createMockStudent({ id: 'b', name: 'Ben' }),
  ],
];

/** Collect the toasts raised while the hook runs. */
function collectToasts() {
  const toasts: ToastInstance[] = [];
  const unsubscribe = subscribeToToasts((event) => {
    if (event.action === 'add') toasts.push(event.toast);
  });
  return { toasts, unsubscribe };
}

beforeEach(() => {
  recordPlanUsage.mockClear();
  setPlanUsageConfirmed.mockClear();
});

describe('usePlanUsagePrompt', () => {
  it('records the signal and offers to take it back', async () => {
    const { toasts, unsubscribe } = collectToasts();
    const { result } = renderHook(() => usePlanUsagePrompt('c1'));

    act(() => {
      result.current(seating, 'presented');
    });

    await waitFor(() => expect(toasts).toHaveLength(1));
    expect(recordPlanUsage).toHaveBeenCalledExactlyOnceWith(
      'c1',
      seating,
      'presented',
    );
    expect(toasts[0].action?.label).toMatch(/War nur ein Test|Just a test/i);

    unsubscribe();
  });

  it('withdraws the record when the teacher says it was a test', async () => {
    const { toasts, unsubscribe } = collectToasts();
    const { result } = renderHook(() => usePlanUsagePrompt('c1'));

    act(() => {
      result.current(seating, 'exported');
    });
    await waitFor(() => expect(toasts).toHaveLength(1));

    act(() => {
      toasts[0].action?.onClick();
    });

    expect(setPlanUsageConfirmed).toHaveBeenCalledExactlyOnceWith(
      'c1',
      'u1',
      false,
    );
    unsubscribe();
  });

  it('stays quiet for an arrangement that was already asked about', async () => {
    recordPlanUsage.mockResolvedValueOnce({
      id: 'u1',
      created: false,
      firstStrongSignal: false,
    });
    const { toasts, unsubscribe } = collectToasts();
    const { result } = renderHook(() => usePlanUsagePrompt('c1'));

    act(() => {
      result.current(seating, 'presented');
    });

    await waitFor(() => expect(recordPlanUsage).toHaveBeenCalled());
    expect(toasts).toHaveLength(0);
    unsubscribe();
  });

  it('stays quiet once the teacher has answered for that plan', async () => {
    recordPlanUsage.mockResolvedValueOnce({
      id: 'u1',
      created: false,
      firstStrongSignal: true,
      confirmed: false,
    });
    const { toasts, unsubscribe } = collectToasts();
    const { result } = renderHook(() => usePlanUsagePrompt('c1'));

    act(() => {
      result.current(seating, 'exported');
    });

    await waitFor(() => expect(recordPlanUsage).toHaveBeenCalled());
    expect(toasts).toHaveLength(0);
    unsubscribe();
  });
});
