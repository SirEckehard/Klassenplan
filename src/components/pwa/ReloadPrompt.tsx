// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { dismissToast, showToast } from '@/utils/ui/toast';
import { logInfo } from '@/utils';
import {
  getUpdateController,
  setUpdateController,
  setUpdateReady,
} from '@/hooks/pwa/swUpdateController';
import { useStatusBarMounted } from '@/hooks/ui/statusBarPresence';
import { UPDATE_TOAST_ID } from '@/hooks/pwa/useUpdateCheck';
import { startOfflineWarmup } from '@/utils/performance/offlineWarmup';

/** How often an open session re-checks for a new deployment. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Component to handle PWA updates.
 *
 * A new version is a state: the status bar shows it as a quiet button and
 * the gear's row offers it (`useUpdateReady`). Only a page without a bar —
 * the start page, the pages beside the app — shows it as a toast, which
 * stays until it is acted on (decision 0037).
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
      // A browser that refuses a worker (a private window, a policy) gets
      // the app into its cache another way, so it still works offline.
      startOfflineWarmup();
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

  const statusBarMounted = useStatusBarMounted();

  useEffect(() => {
    if (!needRefresh) return;
    setUpdateReady(true);
    if (statusBarMounted) {
      // The bar says it; a toast left from a page without one goes.
      dismissToast(UPDATE_TOAST_ID);
      return;
    }
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
  }, [needRefresh, statusBarMounted, updateServiceWorker, setNeedRefresh, t]);

  return null; // Logic only component, renders nothing directly
}
