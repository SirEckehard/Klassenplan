// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '@/utils';

// `setupTests.ts` switches the greeting off for every other test.
vi.unmock('@/hooks/ui/useTeachersDayGreeting');
const { useTeachersDayGreeting } =
  await import('@/hooks/ui/useTeachersDayGreeting');

const teachersDay = () => new Date(2026, 9, 5, 7, 45);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const greetsOn = (date: Date) => {
  localStorage.clear();
  const { result, unmount } = renderHook(() =>
    useTeachersDayGreeting(() => date),
  );
  const { visible } = result.current;
  unmount();
  return visible;
};

describe('useTeachersDayGreeting', () => {
  it('greets on 5 October by the local calendar and on no other day', () => {
    expect(greetsOn(new Date(2026, 9, 5, 23, 59))).toBe(true);
    expect(greetsOn(new Date(2026, 9, 6, 0, 0))).toBe(false);
    expect(greetsOn(new Date(2026, 4, 10))).toBe(false);
  });

  it('greets once a year and fades after ten seconds', () => {
    const { result, unmount } = renderHook(() =>
      useTeachersDayGreeting(teachersDay),
    );
    expect(result.current.visible).toBe(true);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.teachersDayGreeted)).toBe(
      '2026',
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.fading).toBe(true);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.visible).toBe(false);
    unmount();

    const again = renderHook(() => useTeachersDayGreeting(teachersDay));
    expect(again.result.current.visible).toBe(false);
  });

  it('makes way at the first key or pointer press', () => {
    const { result } = renderHook(() => useTeachersDayGreeting(teachersDay));

    fireEvent.keyDown(window, { key: 'a' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.visible).toBe(false);
  });

  it('still greets where storage refuses to be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    const { result } = renderHook(() => useTeachersDayGreeting(teachersDay));

    expect(result.current.visible).toBe(true);
  });
});
