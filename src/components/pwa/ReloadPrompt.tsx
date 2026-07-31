// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/ui/toast';
import { logInfo } from '@/utils';

/**
 * Component to handle PWA updates
 * Shows a toast when a new version is available
 */
export default function ReloadPrompt() {
  const { t } = useTranslation('common');
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      logInfo('SW Registered: ' + r, {}, 'PWA');
      registrationRef.current = r ?? null;
    },
    onRegisterError(error) {
      logInfo('SW registration error', { error }, 'PWA');
    },
  });

  // A session that started offline never got to check for a new version.
  // Re-check once the connection returns, so the update toast can still appear.
  useEffect(() => {
    const handleOnline = () => {
      const registration = registrationRef.current;
      if (!registration) {
        return;
      }
      registration.update().catch((error: unknown) => {
        logInfo('SW update check after reconnect failed', { error }, 'PWA');
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (needRefresh) {
      logInfo('New content available, showing update toast', {}, 'PWA');

      showToast('info', t('pwa.updateAvailable'), {
        duration: Infinity, // Keep open until clicked
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
