// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { announce, getToastMessage, showToast } from './toast';

/**
 * A short confirmation for the status bar's line: something was kept that
 * the screen does not show — a plan saved while its inspector is out of
 * sight, a backup or a template written to a file, writes that work again
 * after failing.
 * The line says it for a few seconds where the layer's status stands, the
 * way the gear's row says "Aktuell" (decision 0037).
 *
 * The bars on screen listen; a page without one gets `false` back and says
 * it its own way — a toast.
 */
export type StatusNoticeKind =
  'saved' | 'planSaved' | 'backupSaved' | 'fileSaved';

export interface StatusNotice {
  id: number;
  kind: StatusNoticeKind;
}

const listeners = new Set<(notice: StatusNotice) => void>();
let nextId = 1;

/** Called by a status bar while it is mounted. */
export function subscribeToStatusNotices(
  listener: (notice: StatusNotice) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hands a confirmation to the bars on screen; false when there is none. */
function noteInStatusBar(kind: StatusNoticeKind): boolean {
  if (listeners.size === 0) return false;
  const notice = { id: nextId++, kind };
  listeners.forEach((listener) => listener(notice));
  return true;
}

/**
 * Confirms something the screen does not show: in the status bar's line,
 * with the words said to a screen reader, or as a success toast where there
 * is no bar.
 */
export function confirmInStatusBar(
  kind: StatusNoticeKind,
  message: string,
): void {
  if (noteInStatusBar(kind)) {
    announce(getToastMessage(message));
    return;
  }
  showToast('success', message);
}
