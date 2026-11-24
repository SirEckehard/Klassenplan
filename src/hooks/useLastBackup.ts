// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { readBackupReminderState } from '@/utils/data/backupReminder';

/**
 * When this browser last saved a backup, by hand or automatically (the
 * automatic backup notes its files as the backup by hand does), or null
 * where it never did. Read when the component that asks is drawn — the
 * backup menu, as it opens.
 */
export function useLastBackupAt(): Date | null {
  return useMemo(() => readBackupReminderState().lastBackupAt, []);
}
