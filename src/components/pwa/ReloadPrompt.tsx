// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/ui/toast';
import { logInfo } from '@/utils';
import {
  getUpdateController,
  setUpdateController,
} from '@/hooks/pwa/swUpdateController';
import { UPDATE_TOAST_ID } from '@/hooks/pwa/useUpdateCheck';

/** How often an open session re-checks for a new deployment. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Component to handle PWA updates
 * Shows a toast when a new version is available
 */
export default function ReloadPrompt() {
  const { t } = useTranslation('common');

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      logInfo('SW Registered: ' + r, {}, 'PWA');
      // Publish the registration so the footer's update button can reach it —
      // calling useRegisterSW a second time would register a second worker.
      setUpdateController(
        r
          ? { registration: r, applyUpdate: () => updateServiceWorker(true) }
          : null,
      );
    },
    onRegisterError(error) {
      logInfo('SW registration error', { error }, 'PWA');
    },
  });

  useEffect(() => () => setUpdateController(null), []);

  // Without this the check only ever runs on page load. A session that started
  // offline never got to check at all, and a tab left open on the projector for
  // a whole school day would never notice a deployment.
  useEffect(() => {
    const runCheck = (trigger: string) => {
      const registration = getUpdateController()?.registration;
      if (!registration) {
        return;
      }
      registration.update().catch((error: unknown) => {
        logInfo('SW update check failed', { error, trigger }, 'PWA');
      });
    };

    const handleOnline = () => runCheck('online');
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck('visible');
      }
    };
    const intervalId = window.setInterval(
      () => runCheck('interval'),
      UPDATE_CHECK_INTERVAL_MS,
    );

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      logInfo('New content available, showing update toast', {}, 'PWA');

      showToast('info', t('pwa.updateAvailable'), {
        // Shared with the manual check so both cannot stack the same toast.
        id: UPDATE_TOAST_ID,
        // 0 keeps the toast open until clicked. `Infinity` does not: the
        // timeout is clamped to a 32-bit int, so it fires after ~1 ms.
        duration: 0,
        action: {
          label: t('pwa.reload'),
          onClick: () => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          },
        },
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh, t]);

  return null; // Logic only component, renders nothing directly
}
