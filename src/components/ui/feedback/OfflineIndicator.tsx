// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { CloudSlashIcon } from '@phosphor-icons/react';
import { useOnlineStatus } from '@/hooks/ui/useOnlineStatus';
import { useFloatingActionOffset } from '@/hooks/ui/useFloatingActionOffset';
import { floatingStatusClass } from '@/utils';

/**
 * Discreet badge shown while the browser reports no network connection.
 *
 * Klassenplan is offline-first — every feature keeps working — so this is
 * reassurance, not a warning: it says what still works instead of what broke.
 * Rendered app-wide (including the fullscreen surfaces, which hide the footer)
 * and anchored bottom-left so it never sits on the floating actions.
 */
export default function OfflineIndicator() {
  const { t } = useTranslation('common');
  const isOnline = useOnlineStatus();
  const offsets = useFloatingActionOffset({ side: 'left' });

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={offsets}
      className={`${floatingStatusClass} pointer-events-none fixed z-40 gap-2 text-amber-700 dark:text-amber-300`}
    >
      <CloudSlashIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t('offline.badge')}</span>
    </div>
  );
}
