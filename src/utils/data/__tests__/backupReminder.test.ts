// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The backup reminder is the only place the app ever tells a teacher, unasked,
 * that their data is at risk. It has to fire late enough not to nag and early
 * enough to matter — and "never remind me again" has to mean exactly that.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BACKUP_REMINDER_AGE_DAYS,
  BACKUP_REMINDER_SNOOZE_DAYS,
  daysSince,
  disableBackupReminder,
  isBackupReminderDue,
  markBackupDataPresent,
  readBackupReminderState,
  recordBackupCreated,
  snoozeBackupReminder,
} from '../backupReminder';
import { LOCAL_STORAGE_KEYS } from '../storageKeys';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-05T10:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('backup reminder state', () => {
  it('starts the clock the first time data appears', () => {
    markBackupDataPresent(NOW);

    expect(readBackupReminderState().dataSince?.toISOString()).toBe(
      NOW.toISOString(),
    );
  });

  it('does not move the clock on later visits', () => {
    markBackupDataPresent(daysAgo(40));
    markBackupDataPresent(NOW);

    // Otherwise every visit would reset the age and the reminder could never
    // come due.
    expect(readBackupReminderState().dataSince?.toISOString()).toBe(
      daysAgo(40).toISOString(),
    );
  });

  it('records an export and lifts a running snooze', () => {
    snoozeBackupReminder(NOW);
    recordBackupCreated(NOW);

    const state = readBackupReminderState();
    expect(state.lastBackupAt?.toISOString()).toBe(NOW.toISOString());
    expect(state.snoozedUntil).toBeNull();
  });

  it('survives a storage that refuses to be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    // Private windows and locked-down browsers throw here; the reminder should
    // stay quiet rather than take the page down with it.
    expect(() => readBackupReminderState()).not.toThrow();
    expect(readBackupReminderState().lastBackupAt).toBeNull();
  });

  it('survives a storage that refuses to be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => recordBackupCreated(NOW)).not.toThrow();
    expect(() => disableBackupReminder()).not.toThrow();
  });

  it('ignores a corrupted timestamp', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.lastBackupAt, 'not-a-date');

    expect(readBackupReminderState().lastBackupAt).toBeNull();
  });
});

describe('isBackupReminderDue', () => {
  const dueState = () => {
    markBackupDataPresent(daysAgo(BACKUP_REMINDER_AGE_DAYS + 1));
    return readBackupReminderState();
  };

  it('stays quiet while there is no data to lose', () => {
    expect(isBackupReminderDue(dueState(), false, NOW)).toBe(false);
  });

  it('stays quiet on a fresh install with no reference point', () => {
    expect(isBackupReminderDue(readBackupReminderState(), true, NOW)).toBe(
      false,
    );
  });

  it('fires once data has gone unprotected for long enough', () => {
    expect(isBackupReminderDue(dueState(), true, NOW)).toBe(true);
  });

  it('stays quiet one day short of the threshold', () => {
    markBackupDataPresent(daysAgo(BACKUP_REMINDER_AGE_DAYS - 1));

    expect(isBackupReminderDue(readBackupReminderState(), true, NOW)).toBe(
      false,
    );
  });

  it('measures from the last backup once there is one', () => {
    markBackupDataPresent(daysAgo(200));
    recordBackupCreated(daysAgo(1));

    expect(isBackupReminderDue(readBackupReminderState(), true, NOW)).toBe(
      false,
    );
  });

  it('comes back after the snooze runs out', () => {
    markBackupDataPresent(daysAgo(BACKUP_REMINDER_AGE_DAYS + 1));
    snoozeBackupReminder(NOW);

    const state = readBackupReminderState();
    expect(isBackupReminderDue(state, true, NOW)).toBe(false);
    expect(
      isBackupReminderDue(
        state,
        true,
        new Date(NOW.getTime() + (BACKUP_REMINDER_SNOOZE_DAYS + 1) * DAY_MS),
      ),
    ).toBe(true);
  });

  it('never comes back once switched off', () => {
    markBackupDataPresent(daysAgo(400));
    disableBackupReminder();

    expect(
      isBackupReminderDue(
        readBackupReminderState(),
        true,
        new Date(NOW.getTime() + 400 * DAY_MS),
      ),
    ).toBe(false);
  });
});

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince(daysAgo(3), NOW)).toBe(3);
  });

  it('never goes negative for a future date', () => {
    expect(daysSince(new Date(NOW.getTime() + DAY_MS), NOW)).toBe(0);
  });
});
