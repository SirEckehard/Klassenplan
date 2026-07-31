// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useInstallPrompt,
  isInstallPromptDismissed,
  dismissInstallPrompt,
} from '@/hooks/useInstallPrompt';
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
    // The toast is offered once. After a dismissal the footer settings menu
    // stays as the way back in, so nothing becomes unreachable.
    if (isInstallable && !isInstallPromptDismissed() && !hasShown.current) {
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
          logInfo('User dismissed the install toast', {}, 'PWA');
          dismissInstallPrompt();
        },
      });
    }
  }, [isInstallable, triggerInstall, t]);

  return null;
}
