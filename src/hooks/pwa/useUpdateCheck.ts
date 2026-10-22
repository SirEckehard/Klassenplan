// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dismissToast, showToast } from '@/utils/ui/toast';
import { logError } from '@/utils';
import { isOffline } from '@/utils/performance/chunkLoad';
import { applyPendingUpdate, checkForUpdate } from './swUpdateController';

/**
 * Shared toast id for everything update related. The automatic prompt from
 * ReloadPrompt and a manual check would otherwise stack two identical
 * "new version available" toasts on top of each other.
 */
export const UPDATE_TOAST_ID = 'pwa-update';

/** How long the gear's row says the version is current. */
const UP_TO_DATE_MS = 3000;

interface UseUpdateCheckResult {
  /** True while a check is in flight; drives the spinner on the trigger. */
  checking: boolean;
  /**
   * True for a few seconds after a check found nothing new. The answer stands
   * in the gear's row itself: a toast lay over the very menu it came from.
   */
  upToDate: boolean;
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
  const { t } = useTranslation('common');
  const [checking, setChecking] = useState(false);
  const [upToDate, setUpToDate] = useState(false);
  const upToDateTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(upToDateTimer.current), []);

  const checkNow = useCallback(() => {
    window.clearTimeout(upToDateTimer.current);
    setUpToDate(false);

    // Nothing to ask without a connection — and the fallback below, a plain
    // reload, would trade the app for the browser's offline page.
    if (isOffline()) {
      showToast('info', t('pwa.updateCheckOffline'), { id: UPDATE_TOAST_ID });
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
          showToast('info', t('pwa.updateAvailable'), {
            id: UPDATE_TOAST_ID,
            duration: 0, // Stays until the teacher acts on it
            action: {
              label: t('pwa.reload'),
              onClick: applyPendingUpdate,
            },
          });
          return;
        }

        // An earlier "offline" or "failed" is answered now.
        dismissToast(UPDATE_TOAST_ID);
        setUpToDate(true);
        upToDateTimer.current = window.setTimeout(
          () => setUpToDate(false),
          UP_TO_DATE_MS,
        );
      })
      .catch((error: unknown) => {
        logError('Manual update check failed', { error }, 'PWA');
        showToast('error', t('pwa.updateCheckFailed'), { id: UPDATE_TOAST_ID });
      })
      .finally(() => {
        setChecking(false);
      });
  }, [t]);

  return { checking, upToDate, checkNow };
}
