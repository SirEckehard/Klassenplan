// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef } from 'react';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';
import {
  registerAutoBackupActions,
  setAutoBackupState,
  type AutoBackupDeps,
} from '@/hooks/persistence/autoBackupStatus';
import { loadAutoBackupConfig } from '@/repositories/autoBackupStore';
import {
  loadOnDemand,
  reportChunkLoadFailure,
} from '@/utils/performance/chunkLoad';
import { logError } from '@/utils';

const LOG_SOURCE = 'useAutoBackup';

/** How often an open app looks whether a file is due. */
const CHECK_EVERY_MS = 5 * 60 * 1000;
/** The first look waits until the start-up has settled. */
const FIRST_CHECK_AFTER_MS = 15 * 1000;

const runner = loadOnDemand(
  () => import('@/hooks/autoBackupRunner'),
  'autoBackupRunner',
);

/**
 * The automatic backup (decision 0050): once a day after a change, an
 * encrypted `.klassenplan` file into the folder the teacher chose, the
 * newest seven kept (`autoBackupRunner`, loaded when first needed). Looked
 * for at start, every five minutes and when the page goes to the background.
 * Where the browser wants the folder allowed again, the status bar offers it
 * (`autoBackupStatus`).
 */
export function useAutoBackup({
  exportAllAsJson,
}: {
  exportAllAsJson: () => Promise<string>;
}): void {
  const repository = useSeatingRepository();
  const depsRef = useRef<AutoBackupDeps>({
    exportAllAsJson,
    listClasses: () => repository.listClasses(),
  });
  useEffect(() => {
    depsRef.current = {
      exportAllAsJson,
      listClasses: () => repository.listClasses(),
    };
  }, [exportAllAsJson, repository]);

  useEffect(
    () =>
      registerAutoBackupActions({
        setUp: () => {
          const pickFolder = window.showDirectoryPicker;
          if (!pickFolder) return Promise.resolve();
          // In the click, before anything loads: the picker needs it.
          const chosen = pickFolder({
            id: 'klassenplan-auto-backup',
            mode: 'readwrite',
            startIn: 'documents',
          });
          return runner.load().then(
            (module) => module.default.finishSetUp(chosen, depsRef.current),
            (error: unknown) => {
              chosen.catch(() => undefined);
              reportChunkLoadFailure(error, LOG_SOURCE);
            },
          );
        },
        stop: () =>
          runner.load().then(
            (module) => module.default.stop(),
            (error: unknown) => reportChunkLoadFailure(error, LOG_SOURCE),
          ),
        // Only ever offered after a look, which loaded the runner.
        resume: () =>
          runner.get()?.default.resume(depsRef.current) ?? Promise.resolve(),
      }),
    [],
  );

  // Whether it is set up, at once: the backup menu offers to set it up or to
  // stop it, and the first look below waits for the start-up to settle.
  useEffect(() => {
    let live = true;
    loadAutoBackupConfig()
      .then((config) => {
        if (!live || !config) return;
        setAutoBackupState({
          configured: true,
          folderName: config.folderName,
          lastWrittenAt: config.lastWrittenAt,
          waiting: false,
        });
      })
      .catch((error: unknown) => {
        logError('Failed to read the automatic backup', { error }, LOG_SOURCE);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const runCheck = () => {
      runner
        .load()
        .then((module) => module.default.check(depsRef.current))
        .catch((error: unknown) => {
          logError('Automatic backup check failed', { error }, LOG_SOURCE);
        });
    };
    const first = window.setTimeout(runCheck, FIRST_CHECK_AFTER_MS);
    const every = window.setInterval(runCheck, CHECK_EVERY_MS);
    // Leaving the app — a tab closed, a laptop shut — is when a change of
    // the day is complete.
    const onHidden = () => {
      if (document.visibilityState === 'hidden') runCheck();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);
}
