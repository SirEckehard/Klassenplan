// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0045: who is missing today is marked per class, for the day, and
 * never stored.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  absentIdsOf,
  clearAbsent,
  resetAbsences,
  toggleAbsent,
  useAbsentIds,
} from '../absenceStore';

beforeEach(() => resetAbsences());
afterEach(() => vi.useRealTimers());

describe('absenceStore', () => {
  it('marks a student, and a second tap brings them back', () => {
    toggleAbsent('c1', 'ada');
    expect(absentIdsOf('c1')).toEqual(['ada']);

    toggleAbsent('c1', 'ada');
    expect(absentIdsOf('c1')).toEqual([]);
  });

  it('keeps the classes apart', () => {
    toggleAbsent('c1', 'ada');

    expect(absentIdsOf('c2')).toEqual([]);
    expect(absentIdsOf(null)).toEqual([]);
  });

  it('brings everybody back with "Alle da"', () => {
    toggleAbsent('c1', 'ada');
    toggleAbsent('c1', 'ben');
    toggleAbsent('c2', 'cem');

    clearAbsent('c1');

    expect(absentIdsOf('c1')).toEqual([]);
    expect(absentIdsOf('c2')).toEqual(['cem']);
  });

  it('forgets yesterday', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 15, 0));
    resetAbsences();
    toggleAbsent('c1', 'ada');

    vi.setSystemTime(new Date(2026, 10, 14, 7, 30));

    expect(absentIdsOf('c1')).toEqual([]);
  });

  it('stores nothing in the browser', () => {
    localStorage.clear();
    toggleAbsent('c1', 'ada');

    expect(localStorage.length).toBe(0);
  });

  it('renders anew when a mark changes', () => {
    const { result } = renderHook(() => useAbsentIds('c1'));
    expect(result.current.size).toBe(0);

    act(() => toggleAbsent('c1', 'ada'));

    expect(result.current.has('ada')).toBe(true);
  });
});
