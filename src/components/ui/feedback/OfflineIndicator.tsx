// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudSlashIcon } from '@phosphor-icons/react';
import { useOnlineStatus } from '@/hooks/ui/useOnlineStatus';
import { useFloatingActionOffset } from '@/hooks/ui/useFloatingActionOffset';
import { floatingStatusClass } from '@/utils';

/** How long the labelled badge stays before it shrinks to the icon. */
const COLLAPSE_DELAY_MS = 5000;

/**
 * Discreet badge shown while the browser reports no network connection.
 *
 * Klassenplan is offline-first — every feature keeps working — so this is
 * reassurance, not a warning. It says so once with a label and then shrinks to
 * the icon alone, because the state can last a whole lesson and a permanent
 * pill would only take up room. The label stays available to screen readers.
 * Rendered app-wide (including the fullscreen surfaces, which hide the footer)
 * and anchored bottom-left so it never sits on the floating actions.
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  // Mounted per disconnect, so every new one starts with the labelled badge.
  return <OfflineBadge />;
}

function OfflineBadge() {
  const { t } = useTranslation('common');
  const offsets = useFloatingActionOffset({ side: 'left' });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setIsCollapsed(true),
      COLLAPSE_DELAY_MS,
    );

    return () => window.clearTimeout(timer);
  }, []);

  const label = t('offline.badge');

  return (
    <div
      role="status"
      aria-live="polite"
      style={offsets}
      title={label}
      className={`${floatingStatusClass} pointer-events-none fixed z-40 gap-2 text-amber-700 dark:text-amber-300 ${
        isCollapsed ? 'p-2!' : ''
      }`}
    >
      <CloudSlashIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={isCollapsed ? 'sr-only' : undefined}>{label}</span>
    </div>
  );
}
