// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The canvas view toggles used to be `useState`/`usePersistentState` inside
 * `useSeatingPlanViewLogic`, drilled into the editor views as eight props — and
 * `EnhancedSeatingPlanView` kept a second `usePersistentState` on the same
 * `showGrid` key. These tests pin what moving them into one context has to
 * preserve: the same defaults, the same storage keys, and the same distinction
 * between what survives a reload and what does not.
 */
import '@testing-library/jest-dom/vitest';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CanvasPreferencesProvider,
  useCanvasPreferences,
} from '@/contexts/seatingPlan/CanvasPreferencesContext';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CanvasPreferencesProvider>{children}</CanvasPreferencesProvider>
);

const renderPreferences = () =>
  renderHook(() => useCanvasPreferences(), { wrapper });

beforeEach(() => {
  localStorage.clear();
});

describe('CanvasPreferencesContext', () => {
  it('starts with every canvas aid switched on', () => {
    const { result } = renderPreferences();

    expect(result.current.snapToGrid).toBe(true);
    expect(result.current.showGrid).toBe(true);
    expect(result.current.showAlignmentGuides).toBe(true);
    expect(result.current.showPhotoOverlapWarning).toBe(true);
  });

  it('persists the grid, the guides and the photo warning', async () => {
    const { result } = renderPreferences();

    await act(async () => {
      result.current.setShowGrid(false);
      result.current.setShowAlignmentGuides(false);
      result.current.setShowPhotoOverlapWarning(false);
    });

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.showGrid)).toBe('false');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.alignmentGuides)).toBe(
      'false',
    );
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.photoOverlapWarning)).toBe(
      'false',
    );
  });

  it('seeds the persisted toggles from storage', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.showGrid, 'false');

    const { result } = renderPreferences();

    expect(result.current.showGrid).toBe(false);
  });

  it('keeps snapping out of storage', async () => {
    const { result } = renderPreferences();

    await act(async () => {
      result.current.setSnapToGrid(false);
    });

    expect(result.current.snapToGrid).toBe(false);
    // Snapping is a per-session editing aid: turning it off to nudge one table
    // must not still be off next week.
    expect(localStorage.getItem('snapToGrid')).toBeNull();
  });

  it('serves one shared value to every consumer', async () => {
    const { result } = renderHook(
      () => ({
        a: useCanvasPreferences(),
        b: useCanvasPreferences(),
      }),
      { wrapper },
    );

    await act(async () => {
      result.current.a.setShowGrid(false);
    });

    // The regression: two components each holding their own
    // `usePersistentState` on the same key only looked consistent because
    // nothing toggled the grid while both were mounted.
    expect(result.current.b.showGrid).toBe(false);
  });

  it('refuses to work outside the provider', () => {
    expect(() => renderHook(() => useCanvasPreferences())).toThrow(
      /SeatingPlanGeneratorProvider/,
    );
  });
});

describe('CanvasPreferencesContext view settings', () => {
  // The table plan and the circle both read these. They used to keep a copy
  // each, and the circle's container — mounted for both arrangements — never
  // saw a change made in the table plan.
  it('gives the plan and the circle one value, changed in either', async () => {
    const { result } = renderHook(
      () => ({ plan: useCanvasPreferences(), circle: useCanvasPreferences() }),
      { wrapper },
    );

    await act(async () => {
      result.current.plan.setBadgeDisplay('active');
      result.current.plan.setBadgeHover({ tooltip: false, highlight: true });
      result.current.plan.setNameDisplay('full');
      result.current.plan.setPhotoDisplayMode('off');
    });

    expect(result.current.circle).toMatchObject({
      badgeDisplay: 'active',
      badgeHover: { tooltip: false, highlight: true },
      nameDisplay: 'full',
      photoDisplayMode: 'off',
    });
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.badgeDisplay)).toBe(
      '"active"',
    );
  });

  it('reads a stored value it does not know as the default', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.badgeDisplay, '"sometimes"');
    localStorage.setItem(LOCAL_STORAGE_KEYS.photoDisplayMode, '"blurred"');
    const { result } = renderPreferences();

    expect(result.current.badgeDisplay).toBe('all');
    expect(result.current.photoDisplayMode).toBe('hover');
    expect(result.current.badgeHover).toEqual({
      tooltip: true,
      highlight: true,
    });
  });
});
