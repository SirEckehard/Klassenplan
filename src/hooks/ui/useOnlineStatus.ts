// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useSyncExternalStore } from 'react';

/**
 * Shared online/offline state.
 *
 * One pair of window listeners feeds every consumer (same approach as
 * `useBreakpoint`), so mounting the indicator in several places costs nothing.
 *
 * `navigator.onLine` only proves that a network interface is up — it cannot
 * tell whether the internet is actually reachable. That is good enough here:
 * the app is offline-first and the indicator is informational, never a gate in
 * front of a feature.
 */
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('online', notify);
      window.removeEventListener('offline', notify);
    }
  };
}

function getSnapshot(): boolean {
  // Browsers without the property are treated as online.
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

// Prerendered HTML is always produced online.
const getServerSnapshot = (): boolean => true;

/** @returns `true` while the browser reports a network connection. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
