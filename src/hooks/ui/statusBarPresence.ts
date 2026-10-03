// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Whether a status bar is on screen.
 *
 * The workspace and the export page say that the app is offline in their
 * status bar, a small icon beside the toolbar's switch. Every other page has
 * no bar and keeps the floating badge (`OfflineIndicator`), which is mounted
 * once for the whole app, far outside the shell — hence a store rather than a
 * context: the bar announces itself here, the badge stands down.
 */
const listeners = new Set<() => void>();
let mountedBars = 0;

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): boolean => mountedBars > 0;
const getServerSnapshot = (): boolean => false;

/** Called by the status bar: counts it as on screen while it is mounted. */
export function useRegisterStatusBar(): void {
  useEffect(() => {
    mountedBars += 1;
    notify();
    return () => {
      mountedBars -= 1;
      notify();
    };
  }, []);
}

/** True while at least one status bar is mounted. */
export function useStatusBarMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
