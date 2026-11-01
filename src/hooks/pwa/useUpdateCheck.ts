// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef, useState } from 'react';
import { dismissToast } from '@/utils/ui/toast';
import { logError } from '@/utils';
import { isOffline } from '@/utils/performance/chunkLoad';
import { checkForUpdate, setUpdateReady } from './swUpdateController';

/**
 * Shared toast id for everything update related. The automatic prompt from
 * ReloadPrompt and a manual check would otherwise stack two identical
 * "new version available" toasts on top of each other.
 */
export const UPDATE_TOAST_ID = 'pwa-update';

/** How long the gear's row says what a check found. */
const ANSWER_MS = 3000;

/** What a check found, said in the gear's row for a few seconds. */
export type UpdateCheckAnswer = 'upToDate' | 'offline' | 'failed';

interface UseUpdateCheckResult {
  /** True while a check is in flight; drives the spinner on the trigger. */
  checking: boolean;
  /**
   * What the last check found, for a few seconds. The answer stands in the
   * gear's row itself: a toast lay over the very menu it came from.
   */
  answer: UpdateCheckAnswer | null;
  checkNow: () => void;
}

/**
 * Explicit update check for the settings gear.
 *
 * The app runs a service worker in prompt mode, so a plain reload keeps serving
 * the precached shell — the new version only appears after the waiting worker
 * has been activated. This hook makes that path reachable on demand.
 */
export function useUpdateCheck(): UseUpdateCheckResult {
  const [checking, setChecking] = useState(false);
  const [answer, setAnswer] = useState<UpdateCheckAnswer | null>(null);
  const answerTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(answerTimer.current), []);

  const say = useCallback((next: UpdateCheckAnswer) => {
    window.clearTimeout(answerTimer.current);
    setAnswer(next);
    answerTimer.current = window.setTimeout(() => setAnswer(null), ANSWER_MS);
  }, []);

  const checkNow = useCallback(() => {
    window.clearTimeout(answerTimer.current);
    setAnswer(null);

    // Nothing to ask without a connection — and the fallback below, a plain
    // reload, would trade the app for the browser's offline page.
    if (isOffline()) {
      say('offline');
      return;
    }

    setChecking(true);

    checkForUpdate()
      .then((result) => {
        if (result === 'unavailable') {
          // Without a service worker nginx serves index.html as `no-cache`,
          // so an ordinary reload already brings the new version.
          window.location.reload();
          return;
        }

        if (result === 'update-ready') {
          // The row that asked offers it now ("Aktualisieren"), and so does
          // the status bar where there is one (decision 0037).
          setUpdateReady(true);
          return;
        }

        dismissToast(UPDATE_TOAST_ID);
        say('upToDate');
      })
      .catch((error: unknown) => {
        logError('Manual update check failed', { error }, 'PWA');
        say('failed');
      })
      .finally(() => {
        setChecking(false);
      });
  }, [say]);

  return { checking, answer, checkNow };
}
