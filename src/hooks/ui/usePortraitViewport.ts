// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useSyncExternalStore } from 'react';

const isPortrait = () =>
  typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

function subscribe(listener: () => void): () => void {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}

/**
 * Whether the window is taller than wide — a phone or a tablet held upright —
 * and follows it as the device turns. The layout viewport, as the breakpoints
 * read it, so the on-screen keyboard does not turn the plan.
 */
export function usePortraitViewport(): boolean {
  return useSyncExternalStore(subscribe, isPortrait, () => false);
}
