// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Light or dark: the teacher's choice, or the system's while there is none.
 *
 * A stored `light` or `dark` (`LOCAL_STORAGE_KEYS.theme`) is a choice and
 * holds whatever the system does; with nothing stored the page follows the
 * system, and keeps following it when the system turns from day to night.
 * "Wie das System" in the settings menu removes the choice again — before it,
 * a single press of the theme switch tied the page to one look for good.
 * The page wears the theme as the `dark` class on `<html>`.
 */
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

export type ThemePreference = 'light' | 'dark' | 'system';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function systemQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia(SYSTEM_DARK_QUERY)
    : null;
}

function prefersDark(): boolean {
  return systemQuery()?.matches ?? false;
}

/** The stored choice, `system` when none is stored or storage is blocked. */
export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.theme);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Whether the preference comes out dark, the system asked where needed. */
export function resolvesDark(preference: ThemePreference): boolean {
  return preference === 'system' ? prefersDark() : preference === 'dark';
}

/** Puts the theme on the page without a transition running through it. */
function applyDark(root: HTMLElement, dark: boolean): void {
  if (root.classList.contains('dark') === dark) return;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', dark);
  requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  });
}

/** Stores the choice — `system` removes it — and puts it on the page. */
export function setThemePreference(
  preference: ThemePreference,
  root: HTMLElement = document.documentElement,
): void {
  try {
    if (preference === 'system') {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.theme);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.theme, preference);
    }
  } catch {
    // Storage blocked: the choice lasts for this page.
  }
  applyDark(root, resolvesDark(preference));
  notify();
}

/** Calls `listener` whenever the choice or the theme on the page changes. */
export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Follows the system's light and dark on `root` for as long as no choice is
 * stored — a choice made in another tab included, since it is read on every
 * change. Returns the way to stop.
 */
export function followSystemTheme(root: HTMLElement): () => void {
  const query = systemQuery();
  if (!query) return () => {};
  const handleChange = (event: MediaQueryListEvent) => {
    if (readThemePreference() !== 'system') return;
    applyDark(root, event.matches);
    notify();
  };
  query.addEventListener('change', handleChange);
  return () => query.removeEventListener('change', handleChange);
}
