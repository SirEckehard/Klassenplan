// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Whether this window found class data that a newer version of Klassenplan
 * wrote.
 *
 * Two ways lead there: another window took an update while this one still
 * runs the version before (the prompt update model lets both run side by
 * side), or the operator went back to an older image. Either way this build
 * does not know the newer shape, and whatever it wrote back would be the
 * newer data as this build misreads it. So the repository reads such data as
 * well as it can and writes nothing over it; the status bar asks for a
 * reload, which brings the newer version where there is one. The smaller
 * stores (presets, plan usage, duties, name game) guard themselves the same
 * way. A plain module, like `persistStatus`: the repository raises it, the
 * status bar reads it.
 */

const listeners = new Set<() => void>();
let found = false;

/** Whether `stored` carries a version above the one this build knows. */
export function isFromNewerVersion(
  stored: { version?: unknown } | null | undefined,
  knownVersion: number,
): boolean {
  return typeof stored?.version === 'number' && stored.version > knownVersion;
}

/** The repository found newer data; from now on it stays so for the page. */
export function noteNewerStoredData(): void {
  if (found) return;
  found = true;
  for (const listener of [...listeners]) listener();
}

export function hasNewerStoredData(): boolean {
  return found;
}

export function subscribeNewerStoredData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
