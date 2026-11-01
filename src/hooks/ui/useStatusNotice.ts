// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  subscribeToStatusNotices,
  type StatusNotice,
} from '@/utils/ui/statusNotice';

/** How long the line says it, as long as the gear's "Aktuell". */
const STATUS_NOTICE_MS = 3000;

/**
 * The confirmation the status bar's line shows now, or null: each one for
 * a few seconds, a newer one in its place (`noteInStatusBar`).
 */
export function useStatusNotice(): StatusNotice | null {
  const [notice, setNotice] = React.useState<StatusNotice | null>(null);

  React.useEffect(() => subscribeToStatusNotices(setNotice), []);

  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), STATUS_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return notice;
}
