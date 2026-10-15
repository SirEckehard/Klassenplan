// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef } from 'react';
import { logError } from '@/utils';
import { showToast } from '@/utils/ui/toast';
import { BACKUP_ERROR_MESSAGES } from '@/utils/validation/backupLimits';

/**
 * Restores a backup the installed app was opened with.
 *
 * The manifest registers the app for `.klassenplan` files (`file_handlers` in
 * `vite.config.ts`), so a double-click on a backup opens it — in the app's
 * window that is already open (`launch_handler`), or in a new one. The browser
 * hands the file over through `window.launchQueue`; from there it takes the
 * same way as a file chosen with "Backup importieren": password, then replace
 * or merge. Where there is no launch queue — every browser tab, Safari,
 * Firefox — nothing happens.
 */
export function useBackupFileLaunch(importBackupFile: (file: File) => void) {
  // The consumer is set once; it calls whatever import is current then.
  const importRef = useRef(importBackupFile);
  useEffect(() => {
    importRef.current = importBackupFile;
  }, [importBackupFile]);

  useEffect(() => {
    const queue =
      typeof window === 'undefined' ? undefined : window.launchQueue;
    if (!queue) return;

    queue.setConsumer((params) => {
      // Opening several backups at once restores the first of them.
      const handle = params.files.find(
        (entry): entry is FileSystemFileHandle => entry.kind === 'file',
      );
      if (!handle) return;
      handle.getFile().then(
        (file) => importRef.current(file),
        (error: unknown) => {
          logError(
            'Could not read the file the app was opened with',
            { error },
            'useBackupFileLaunch',
          );
          showToast('error', BACKUP_ERROR_MESSAGES.processingFailed);
        },
      );
    });
  }, []);
}
