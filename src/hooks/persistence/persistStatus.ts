// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Whether the class data on screen has reached storage.
 *
 * The persist queue writes in the background, so a write that fails has no
 * button of its own to report to. It sets this status instead; the status bar
 * reads it and shows "Nicht gespeichert" with a way to try again, and leaving
 * the page asks first while it holds. A module of its own rather than a
 * context: the queue lives deep inside the seating plan providers, the status
 * bar beside them.
 */
import { useSyncExternalStore } from 'react';
import {
  hasNewerStoredData,
  subscribeNewerStoredData,
} from '@/repositories/newerStoredData';

/**
 * `newer`: what is stored comes from a newer version, so nothing is written
 * until a reload (`newerStoredData`). It wins over the other two, which a
 * write can change; this one only a reload does.
 */
export type PersistStatus = 'saved' | 'failed' | 'newer';

let status: PersistStatus = 'saved';
const listeners = new Set<() => void>();
let retryHandler: (() => void) | null = null;

export function getPersistStatus(): PersistStatus {
  return hasNewerStoredData() ? 'newer' : status;
}

export function setPersistStatus(next: PersistStatus): void {
  if (next === status) return;
  status = next;
  for (const listener of [...listeners]) listener();
}

function subscribePersistStatus(listener: () => void): () => void {
  listeners.add(listener);
  const stopNewer = subscribeNewerStoredData(listener);
  return () => {
    listeners.delete(listener);
    stopNewer();
  };
}

/** The status, re-rendering whoever reads it when it changes. */
export function usePersistStatus(): PersistStatus {
  return useSyncExternalStore(
    subscribePersistStatus,
    getPersistStatus,
    getPersistStatus,
  );
}

/**
 * The queue hands in how to write what it holds right away; the status bar's
 * button calls it. Returns the way to take it back again.
 */
export function registerPersistRetry(handler: () => void): () => void {
  retryHandler = handler;
  return () => {
    if (retryHandler === handler) retryHandler = null;
  };
}

/** Write what failed now instead of at the next scheduled attempt. */
export function retryPersistNow(): void {
  retryHandler?.();
}
