// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Where the automatic backup stands (decision 0050), for the backup menu
 * and the status bar, and the way to its actions. A module of its own, as
 * `persistStatus` is: the backup runs inside the seating plan providers
 * (`useAutoBackup`), its menu and the status bar beside them.
 */
import { useSyncExternalStore } from 'react';
import type { Result } from '@/repositories/types';
import type { ClassSummary } from '@/types';

/** What the backup needs of the app (`autoBackupRunner`). */
export interface AutoBackupDeps {
  exportAllAsJson: () => Promise<string>;
  listClasses: () => Promise<Result<ClassSummary[]>>;
}

/**
 * Why the last file could not be written: too large or not restorable, as
 * the backup by hand is refused too; the folder gone or no longer allowed;
 * or the write itself.
 */
export type AutoBackupFailure =
  | { reason: 'tooLarge'; sizeBytes: number; maxBytes: number }
  | { reason: 'notRestorable' | 'folder' | 'write' };

export interface AutoBackupState {
  /** Whether a folder is set up. */
  configured: boolean;
  folderName: string | null;
  /** When the last file was written, ISO 8601. */
  lastWrittenAt: string | null;
  /**
   * A file is due but the browser wants the folder allowed again — after a
   * restart, in a tab — which takes a click: the status bar offers it.
   */
  waiting: boolean;
  /**
   * The last file could not be written, and why. No permission helps here:
   * the status bar tries again and says why, the backup menu offers to set
   * the backup up anew.
   */
  failure: AutoBackupFailure | null;
}

const NOT_SET_UP: AutoBackupState = {
  configured: false,
  folderName: null,
  lastWrittenAt: null,
  waiting: false,
  failure: null,
};

let state = NOT_SET_UP;
const listeners = new Set<() => void>();

const sameFailure = (
  a: AutoBackupFailure | null,
  b: AutoBackupFailure | null,
): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

export function setAutoBackupState(next: AutoBackupState): void {
  if (
    next.configured === state.configured &&
    next.folderName === state.folderName &&
    next.lastWrittenAt === state.lastWrittenAt &&
    next.waiting === state.waiting &&
    sameFailure(next.failure, state.failure)
  ) {
    return;
  }
  state = next;
  for (const listener of [...listeners]) listener();
}

/**
 * Back to "not set up", after "Alle Daten löschen" took the settings: the
 * runner's next look would say so only minutes later.
 */
export function clearAutoBackupState(): void {
  setAutoBackupState(NOT_SET_UP);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getState = () => state;

export function useAutoBackupState(): AutoBackupState {
  return useSyncExternalStore(subscribe, getState, getState);
}

interface AutoBackupActions {
  /** Chooses a folder and a password; starts in a click, for the picker. */
  setUp: () => Promise<void>;
  stop: () => Promise<void>;
  /**
   * Asks for the folder again and writes what is due, or tries a failed
   * write again and says why it failed; also in a click.
   */
  resume: () => Promise<void>;
}

let actions: AutoBackupActions | null = null;

/** `useAutoBackup` hands in its actions; returns the way to take them back. */
export function registerAutoBackupActions(next: AutoBackupActions): () => void {
  actions = next;
  return () => {
    if (actions === next) actions = null;
  };
}

/** The actions for a menu row or a button; nothing while none are there. */
export const autoBackupActions: AutoBackupActions = {
  setUp: () => actions?.setUp() ?? Promise.resolve(),
  stop: () => actions?.stop() ?? Promise.resolve(),
  resume: () => actions?.resume() ?? Promise.resolve(),
};

/**
 * Whether this browser can write into a folder of the teacher's choosing:
 * Chrome and Edge on the desktop, on a secure address. Firefox and Safari
 * keep the reminder.
 */
export const supportsAutoBackup = (): boolean =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
    'function';
