// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import {
  withBrowserLocalStorage,
  logWarn,
  logDebug,
  showToast,
  TOAST_MESSAGES,
} from '@/utils';

/**
 * Persist a state value in `localStorage`.
 * @param key Storage key
 * @param defaultValue Initial value when nothing is stored
 * @returns Tuple of value and setter behaving like `useState`
 */
export default function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const storedValue = withBrowserLocalStorage<T>((storage) => {
      const stored = storage.getItem(key);
      if (stored === null) {
        return defaultValue;
      }

      try {
        return JSON.parse(stored) as T;
      } catch (error) {
        try {
          storage.removeItem(key);
        } catch (removeError) {
          logDebug('Failed to remove corrupted localStorage entry', {
            key,
            error: removeError,
          });
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown parse error';
        logWarn('usePersistentState: corrupted entry removed', {
          key,
          error: errorMessage,
        });
        showToast('warning', TOAST_MESSAGES.PREFERENCES_RESET);
        return defaultValue;
      }
    }, defaultValue);

    return storedValue ?? defaultValue;
  });

  useEffect(() => {
    withBrowserLocalStorage<void>((storage) => {
      storage.setItem(key, JSON.stringify(value)); // persist updates
    });
  }, [key, value]);

  return [value, setValue];
}
