// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '@/utils';
import {
  resetOnboardingTourForTests,
  useOnboardingTour,
} from '../onboardingTourStore';

const readRecord = () =>
  JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.onboardingTour) ?? 'null');

/** A new page load: module state is gone, localStorage is not. */
const reload = () => resetOnboardingTourForTests();

beforeEach(() => {
  localStorage.clear();
  resetOnboardingTourForTests();
});

describe('useOnboardingTour', () => {
  it('has every tour due on a first visit and stores that right away', () => {
    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.isTourDue('welcome')).toBe(true);
    expect(result.current.isTourDue('plan')).toBe(true);
    expect(readRecord()).toEqual({ version: 1, seen: [], skipped: false });
  });

  it('leaves installations from before the tours alone', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.hasVisitedApp, 'true');

    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.isTourDue('students')).toBe(false);
    expect(readRecord()).toEqual({ version: 1, seen: [], skipped: true });
  });

  it('keeps a new teacher new after the visit flag appears', () => {
    renderHook(() => useOnboardingTour()).unmount();
    // `useFirstVisit` sets its flag as soon as step 2 opens.
    localStorage.setItem(LOCAL_STORAGE_KEYS.hasVisitedApp, 'true');
    reload();

    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.isTourDue('layout')).toBe(true);
  });

  it('shows each tour once, across page loads', () => {
    const { result, unmount } = renderHook(() => useOnboardingTour());

    act(() => result.current.markTourSeen('layout'));

    expect(result.current.isTourDue('layout')).toBe(false);
    expect(result.current.isTourDue('plan')).toBe(true);
    expect(readRecord().seen).toEqual(['layout']);

    unmount();
    reload();
    const next = renderHook(() => useOnboardingTour());
    expect(next.result.current.isTourDue('layout')).toBe(false);
  });

  it('switches every tour off', () => {
    const { result } = renderHook(() => useOnboardingTour());

    act(() => result.current.skipTours());

    expect(result.current.isTourDue('plan')).toBe(false);
    expect(readRecord().skipped).toBe(true);
  });

  it('runs a tour asked for from the Help dialog even when tours are off', () => {
    const { result } = renderHook(() => useOnboardingTour());
    act(() => result.current.skipTours());

    act(() => result.current.requestTour('plan'));
    expect(result.current.isTourDue('plan')).toBe(true);
    expect(result.current.isTourDue('layout')).toBe(false);

    // Once shown, the request is used up.
    act(() => result.current.markTourSeen('plan'));
    expect(result.current.isTourDue('plan')).toBe(false);
  });

  it('starts over from a record it cannot read', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.onboardingTour, '{not json');

    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.isTourDue('students')).toBe(true);
    expect(readRecord()).toEqual({ version: 1, seen: [], skipped: false });
  });

  it('drops unknown tour ids from a stored record', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.onboardingTour,
      JSON.stringify({ version: 1, seen: ['plan', 'export'], skipped: false }),
    );

    const { result } = renderHook(() => useOnboardingTour());

    expect(result.current.isTourDue('plan')).toBe(false);
    expect(result.current.isTourDue('layout')).toBe(true);
  });
});
