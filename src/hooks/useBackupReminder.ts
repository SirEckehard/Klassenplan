// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  daysSince,
  disableBackupReminder,
  isBackupReminderDue,
  markBackupDataPresent,
  readBackupReminderState,
  snoozeBackupReminder,
  type BackupReminderState,
} from '@/utils/data/backupReminder';

export interface BackupReminderView {
  isDue: boolean;
  /** Days since the last backup, or since data first appeared without one. */
  ageInDays: number;
  hasEverBackedUp: boolean;
  /** Hide until the snooze runs out. */
  remindLater: () => void;
  /** Hide for good. */
  neverRemind: () => void;
  /** Re-read the stored state, e.g. after an export may have written a file. */
  refresh: () => void;
}

/**
 * Decides whether to ask the user for a backup.
 *
 * Evaluated once per mount rather than on a timer: the threshold is measured in
 * weeks, so a reminder that appears on the next visit instead of mid-session is
 * both accurate enough and far less intrusive.
 *
 * @param hasData - Whether the browser holds class data worth backing up
 */
export function useBackupReminder(hasData: boolean): BackupReminderView {
  const [dismissed, setDismissed] = React.useState(false);
  const [reread, setReread] = React.useState<BackupReminderState | null>(null);

  React.useEffect(() => {
    if (!hasData) {
      return;
    }
    // Start the clock the first time this browser holds anything: a fresh
    // install must not be nagged about backing up an empty app.
    markBackupDataPresent();
  }, [hasData]);

  // Read during render rather than from the effect above, which means the very
  // first visit that produces data sees no `dataSince` yet and stays quiet.
  // That is the wanted order: nobody gets asked to back up a class they created
  // a minute ago. Reading storage is idempotent, so a repeated render is safe.
  const initialState = React.useMemo<BackupReminderState | null>(
    () => (hasData ? readBackupReminderState() : null),
    [hasData],
  );
  const state = reread ?? initialState;

  const remindLater = React.useCallback(() => {
    snoozeBackupReminder();
    setDismissed(true);
  }, []);

  const neverRemind = React.useCallback(() => {
    disableBackupReminder();
    setDismissed(true);
  }, []);

  const refresh = React.useCallback(() => {
    setReread(readBackupReminderState());
  }, []);

  const isDue = React.useMemo(
    () => !dismissed && state !== null && isBackupReminderDue(state, hasData),
    [dismissed, state, hasData],
  );

  const reference = state?.lastBackupAt ?? state?.dataSince ?? null;

  return {
    isDue,
    ageInDays: reference ? daysSince(reference) : 0,
    hasEverBackedUp: state?.lastBackupAt != null,
    remindLater,
    neverRemind,
    refresh,
  };
}
