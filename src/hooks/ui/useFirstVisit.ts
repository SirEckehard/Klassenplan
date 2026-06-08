// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { logDebug } from '@/utils';

/**
 * Hook to detect if this is the user's first visit to the app.
 * Sets a flag in localStorage after first use.
 *
 * @returns {boolean} true if this is the user's first visit, false otherwise
 */
export function useFirstVisit(): boolean {
  const [isFirstVisit] = useState<boolean>(() => {
    try {
      const hasVisited = localStorage.getItem(LOCAL_STORAGE_KEYS.hasVisitedApp);
      return hasVisited === null;
    } catch (error) {
      logDebug('Failed to read first visit flag from localStorage', { error });
      return false; // If localStorage is unavailable, assume not first visit
    }
  });

  useEffect(() => {
    if (isFirstVisit) {
      try {
        // Mark as visited after component mounts
        localStorage.setItem(LOCAL_STORAGE_KEYS.hasVisitedApp, 'true');
      } catch (error) {
        logDebug('Failed to persist first visit flag to localStorage', {
          error,
        });
      }
    }
  }, [isFirstVisit]);

  return isFirstVisit;
}
