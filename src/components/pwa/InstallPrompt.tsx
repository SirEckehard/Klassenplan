// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { showToast } from '@/utils/ui/toast';
import { logInfo } from '@/utils';

/**
 * Component to handle PWA install prompt via Toast
 */
export default function InstallPrompt() {
  const { t } = useTranslation('common');
  const { isInstallable, triggerInstall } = useInstallPrompt();
  const hasShown = React.useRef(false);

  useEffect(() => {
    // CheckIcon if user previously dismissed the prompt completely
    const isDismissed = localStorage.getItem('pwa-install-dismissed');

    if (isInstallable && !isDismissed && !hasShown.current) {
      logInfo('Showing install prompt toast', {}, 'PWA');
      hasShown.current = true;

      showToast('info', t('pwa.installDesc'), {
        duration: 0,
        id: 'pwa-install-prompt',
        action: {
          label: t('pwa.install'),
          onClick: triggerInstall,
        },
        onDismiss: () => {
          logInfo('User dismissed install prompt permanently', {}, 'PWA');
          localStorage.setItem('pwa-install-dismissed', 'true');
        },
      });
    }
  }, [isInstallable, triggerInstall, t]);

  return null;
}
