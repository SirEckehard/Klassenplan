// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * State behind the "your last backup is old" reminder.
 *
 * Everything the app knows lives in this browser: no account, no cloud, no
 * server copy. A browser that evicts the origin — Safari does it after seven
 * days without a visit — takes the classes with it, and the only way back is a
 * backup file the teacher exported. So the app has to ask for one now and then.
 *
 * Deliberately plain `localStorage` and no personal data: four timestamps and a
 * flag. They are registered in `PROJECT_LOCAL_STORAGE_KEYS`, so "delete all
 * data" clears them along with everything else.
 */
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { logWarn } from '@/utils';

/** How old a backup may get before the reminder appears. */
export const BACKUP_REMINDER_AGE_DAYS = 30;

/** How long "remind me later" keeps the reminder away. */
export const BACKUP_REMINDER_SNOOZE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const SOURCE = 'backupReminder';

const readStamp = (key: string): number | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? null : parsed;
  } catch (error) {
    logWarn(
      'Could not read a backup reminder timestamp',
      { key, error },
      SOURCE,
    );
    return null;
  }
};

const writeStamp = (key: string, value: Date): void => {
  try {
    window.localStorage.setItem(key, value.toISOString());
  } catch (error) {
    // A full or blocked storage is not worth interrupting the user over; the
    // reminder simply behaves as if it had never been snoozed.
    logWarn(
      'Could not store a backup reminder timestamp',
      { key, error },
      SOURCE,
    );
  }
};

export interface BackupReminderState {
  /** When the last backup file was written, or null if there never was one. */
  lastBackupAt: Date | null;
  /** When this browser first held class data worth backing up. */
  dataSince: Date | null;
  snoozedUntil: Date | null;
  disabled: boolean;
}

export function readBackupReminderState(): BackupReminderState {
  const lastBackupAt = readStamp(LOCAL_STORAGE_KEYS.lastBackupAt);
  const dataSince = readStamp(LOCAL_STORAGE_KEYS.backupDataSince);
  const snoozedUntil = readStamp(LOCAL_STORAGE_KEYS.backupReminderSnoozedUntil);
  let disabled = false;
  try {
    disabled =
      window.localStorage.getItem(LOCAL_STORAGE_KEYS.backupReminderDisabled) ===
      'true';
  } catch (error) {
    logWarn('Could not read the backup reminder opt-out', { error }, SOURCE);
  }

  return {
    lastBackupAt: lastBackupAt === null ? null : new Date(lastBackupAt),
    dataSince: dataSince === null ? null : new Date(dataSince),
    snoozedUntil: snoozedUntil === null ? null : new Date(snoozedUntil),
    disabled,
  };
}

/**
 * Marks a successful backup export. Also lifts a snooze: the reminder has
 * served its purpose and the age clock restarts from here.
 */
export function recordBackupCreated(now: Date = new Date()): void {
  writeStamp(LOCAL_STORAGE_KEYS.lastBackupAt, now);
  try {
    window.localStorage.removeItem(
      LOCAL_STORAGE_KEYS.backupReminderSnoozedUntil,
    );
  } catch (error) {
    logWarn('Could not clear the backup reminder snooze', { error }, SOURCE);
  }
}

/**
 * Remembers when this browser first held data worth backing up, so a brand new
 * install does not get asked for a backup of nothing. Writes once and then
 * leaves the value alone.
 */
export function markBackupDataPresent(now: Date = new Date()): void {
  if (readStamp(LOCAL_STORAGE_KEYS.backupDataSince) !== null) {
    return;
  }
  writeStamp(LOCAL_STORAGE_KEYS.backupDataSince, now);
}

export function snoozeBackupReminder(now: Date = new Date()): void {
  writeStamp(
    LOCAL_STORAGE_KEYS.backupReminderSnoozedUntil,
    new Date(now.getTime() + BACKUP_REMINDER_SNOOZE_DAYS * DAY_MS),
  );
}

export function disableBackupReminder(): void {
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEYS.backupReminderDisabled,
      'true',
    );
  } catch (error) {
    logWarn('Could not store the backup reminder opt-out', { error }, SOURCE);
  }
}

/**
 * Whether the reminder is due.
 *
 * @param state - Current reminder state, from `readBackupReminderState()`
 * @param hasData - Whether the browser holds class data at all
 * @param now - Injectable clock for tests
 */
export function isBackupReminderDue(
  state: BackupReminderState,
  hasData: boolean,
  now: Date = new Date(),
): boolean {
  if (!hasData || state.disabled) {
    return false;
  }
  if (state.snoozedUntil && state.snoozedUntil.getTime() > now.getTime()) {
    return false;
  }

  // Without a backup the clock runs from the day data first appeared, so the
  // reminder measures "how long has this been unprotected" either way.
  const reference = state.lastBackupAt ?? state.dataSince;
  if (!reference) {
    return false;
  }

  return (
    now.getTime() - reference.getTime() >= BACKUP_REMINDER_AGE_DAYS * DAY_MS
  );
}

/** Whole days since the given date, floored at 0. */
export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}
