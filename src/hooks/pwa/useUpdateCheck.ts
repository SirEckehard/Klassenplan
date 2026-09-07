// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/ui/toast';
import { logError } from '@/utils';
import { getAppVersion } from '@/utils/version';
import { applyPendingUpdate, checkForUpdate } from './swUpdateController';

/**
 * Shared toast id for everything update related. The automatic prompt from
 * ReloadPrompt and a manual check would otherwise stack two identical
 * "new version available" toasts on top of each other.
 */
export const UPDATE_TOAST_ID = 'pwa-update';

interface UseUpdateCheckResult {
  /** True while a check is in flight; drives the spinner on the trigger. */
  checking: boolean;
  checkNow: () => void;
}

/**
 * Explicit update check for the footer button.
 *
 * The app runs a service worker in prompt mode, so a plain reload keeps serving
 * the precached shell — the new version only appears after the waiting worker
 * has been activated. This hook makes that path reachable on demand.
 */
export function useUpdateCheck(): UseUpdateCheckResult {
  const { t } = useTranslation('common');
  const [checking, setChecking] = useState(false);

  const checkNow = useCallback(() => {
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

        showToast('success', t('pwa.upToDate', { version: getAppVersion() }), {
          id: UPDATE_TOAST_ID,
        });
      })
      .catch((error: unknown) => {
        logError('Manual update check failed', { error }, 'PWA');
        showToast('error', t('pwa.updateCheckFailed'), { id: UPDATE_TOAST_ID });
      })
      .finally(() => {
        setChecking(false);
      });
  }, [t]);

  return { checking, checkNow };
}
