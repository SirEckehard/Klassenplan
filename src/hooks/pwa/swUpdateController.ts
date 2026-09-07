// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Outcome of an explicit "check for updates" run.
 *
 * - `update-ready` – a newer worker is installing or already waiting
 * - `up-to-date` – the registered worker matches the deployed one
 * - `unavailable` – no service worker owns this page (first visit, disabled SW,
 *   browser without support); the caller has to fall back to a plain reload
 */
export type UpdateCheckResult = 'update-ready' | 'up-to-date' | 'unavailable';

export interface UpdateController {
  registration: ServiceWorkerRegistration;
  /** Sends SKIP_WAITING; the reload follows once the new worker takes over. */
  applyUpdate: () => void;
}

/**
 * Module-level singleton. `useRegisterSW` builds a fresh Workbox instance on
 * every call, so only ReloadPrompt may register — everyone else reads the
 * registration from here instead of registering a second worker.
 */
let controller: UpdateController | null = null;

export function setUpdateController(next: UpdateController | null): void {
  controller = next;
}

export function getUpdateController(): UpdateController | null {
  return controller;
}

/**
 * Asks the browser to re-fetch the service worker script. The top-level script
 * bypasses the HTTP cache (`updateViaCache` defaults to `'imports'`, and nginx
 * sends `no-store` for /sw.js), so this really hits the server.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const registration = controller?.registration;
  if (!registration) {
    return 'unavailable';
  }

  // A worker that already waits was found by an earlier check. Re-fetching
  // would compare the same bytes and report "no change", hiding the pending
  // update from anyone who dismissed the toast.
  if (registration.waiting) {
    return 'update-ready';
  }

  await registration.update();

  // The spec sets `registration.installing` before update()'s promise resolves,
  // which makes this deterministic. The `updatefound` event is queued as a task
  // and may well arrive later, so it is not a reliable signal here.
  const pending = registration.installing ?? registration.waiting;
  return pending ? 'update-ready' : 'up-to-date';
}

/** Activates the waiting worker. No-op while nothing is waiting. */
export function applyPendingUpdate(): void {
  controller?.applyUpdate();
}
