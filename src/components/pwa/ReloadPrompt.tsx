import { useEffect } from 'react';
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

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      logInfo('SW Registered: ' + r, {}, 'PWA');
    },
    onRegisterError(error) {
      logInfo('SW registration error', { error }, 'PWA');
    },
  });

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
