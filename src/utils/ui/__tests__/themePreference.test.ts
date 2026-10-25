// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  followSystemTheme,
  readThemePreference,
  setThemePreference,
  subscribeThemePreference,
} from '@/utils/ui/themePreference';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

/** A system preference that can turn, as the night setting does. */
function mockSystem(dark: boolean) {
  const handlers = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches: dark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) =>
      handlers.add(handler),
    removeEventListener: (
      _: string,
      handler: (e: MediaQueryListEvent) => void,
    ) => handlers.delete(handler),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return (next: boolean) => {
    query.matches = next;
    handlers.forEach((handler) =>
      handler({ matches: next } as MediaQueryListEvent),
    );
  };
}

describe('themePreference', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('html');
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('reads no stored choice, or an unknown one, as the system', () => {
    expect(readThemePreference()).toBe('system');
    localStorage.setItem(LOCAL_STORAGE_KEYS.theme, 'sepia');
    expect(readThemePreference()).toBe('system');
    localStorage.setItem(LOCAL_STORAGE_KEYS.theme, 'dark');
    expect(readThemePreference()).toBe('dark');
  });

  // The old key held a choice made once, perhaps only to try it.
  it('lets a theme chosen before the system became the way back go', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.legacyTheme, 'dark');
    expect(readThemePreference()).toBe('system');
  });

  it('follows the system turning dark and light while nothing is chosen', () => {
    const turn = mockSystem(false);
    const stop = followSystemTheme(root);

    turn(true);
    expect(root.classList.contains('dark')).toBe(true);
    turn(false);
    expect(root.classList.contains('dark')).toBe(false);
    stop();
  });

  it('holds a choice against the system, and follows it again on request', () => {
    const turn = mockSystem(false);
    const stop = followSystemTheme(root);
    const listener = vi.fn();
    const unsubscribe = subscribeThemePreference(listener);

    setThemePreference('light', root);
    turn(true);
    expect(root.classList.contains('dark')).toBe(false);

    setThemePreference('system', root);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.theme)).toBeNull();
    expect(root.classList.contains('dark')).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    stop();
  });
});
