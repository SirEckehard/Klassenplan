// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { PROJECT_LOCAL_STORAGE_KEYS } from './storageKeys';
import { logError, logWarn, logDebug, logInfo } from '@/utils';
// Imported from the toast module directly rather than the '@/utils' barrel:
// storage.ts is itself re-exported by that barrel, and the direct path keeps
// the cycle out of the module graph.
import { showToast } from '@/utils/ui/toast';

// Note: LOCAL_STORAGE_KEYS and ProjectLocalStorageKey are exported by ./storageKeys

/** Threshold percentage at which to warn about storage quota */
const STORAGE_QUOTA_WARNING_THRESHOLD = 80;

export type StorageQuotaInfo = {
  usage: number;
  quota: number;
  percentUsed: number;
  isLow: boolean;
};

/**
 * Check storage quota and log a warning if usage exceeds threshold.
 * Uses the Storage Manager API if available.
 *
 * @returns Storage quota info if available, null otherwise
 *
 * @example
 * const info = await checkStorageQuota();
 * if (info?.isLow) {
 *   showToast('warning', 'toast:storage.quotaLow');
 * }
 */
export async function checkStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    typeof navigator.storage?.estimate !== 'function'
  ) {
    return null;
  }

  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined || quota === 0) {
      return null;
    }

    const percentUsed = (usage / quota) * 100;
    const isLow = percentUsed > STORAGE_QUOTA_WARNING_THRESHOLD;

    if (isLow) {
      logWarn(
        'Storage quota running low',
        {
          usage: formatBytes(usage),
          quota: formatBytes(quota),
          percentUsed: `${percentUsed.toFixed(1)}%`,
        },
        'storage',
      );
    } else {
      logDebug(
        'Storage quota check',
        {
          usage: formatBytes(usage),
          quota: formatBytes(quota),
          percentUsed: `${percentUsed.toFixed(1)}%`,
        },
        'storage',
      );
    }

    return { usage, quota, percentUsed, isLow };
  } catch (error) {
    logError('Failed to check storage quota', { error }, 'storage');
    return null;
  }
}

/**
 * Format bytes to human-readable string (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Ask the browser to exempt this origin from its storage eviction sweep.
 *
 * Everything the user owns — classes, students, photos, plans — lives in
 * IndexedDB. Without a persistence grant that data is "best effort" storage:
 * Safari discards it after seven days without a visit, and Chromium clears
 * non-persisted origins first when the disk fills up. A teacher returning from
 * the holidays would find their classes gone.
 *
 * Chromium grants this silently once the site is installed or has enough
 * engagement; Firefox asks the user. Both answers are final for the session,
 * so callers should go through {@link ensureStoragePersistence} rather than
 * asking again on every write.
 *
 * @returns `true`/`false` for the browser's answer, `null` when the API is
 *   unavailable or the call failed.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    typeof navigator.storage?.persist !== 'function' ||
    typeof navigator.storage?.persisted !== 'function'
  ) {
    return null;
  }

  try {
    if (await navigator.storage.persisted()) {
      logDebug('Storage is already persistent', {}, 'storage');
      return true;
    }

    const granted = await navigator.storage.persist();
    if (granted) {
      logInfo('Persistent storage granted', {}, 'storage');
    } else {
      // Not an error: the browser may simply require more engagement, or the
      // user declined. Data still works, it is just evictable.
      logWarn('Persistent storage denied', {}, 'storage');
    }
    return granted;
  } catch (error) {
    logError('Failed to request persistent storage', { error }, 'storage');
    return null;
  }
}

// The browser's answer does not change within a page load, and the quota toast
// should appear at most once. Both are therefore requested a single time.
let storagePersistenceEnsured = false;

/**
 * Request persistent storage and warn once when the quota runs low.
 *
 * Idempotent per page load, so callers can invoke it from any point that means
 * "the user now owns data worth keeping". Never rejects — every failure is
 * logged and swallowed, because losing this is not a reason to break a save.
 */
export async function ensureStoragePersistence(): Promise<void> {
  if (storagePersistenceEnsured) {
    return;
  }
  storagePersistenceEnsured = true;

  await requestPersistentStorage();

  const quota = await checkStorageQuota();
  if (quota?.isLow) {
    showToast('warning', 'toast:storage.quotaLow', { duration: 8000 });
  }
}

/**
 * Reset the once-per-page-load latch so each test starts from a clean slate.
 */
export function resetStoragePersistenceForTests(): void {
  storagePersistenceEnsured = false;
}

/**
 * Remove all localStorage entries owned by the seating plan app.
 */
export function clearProjectLocalStorage(): void {
  if (typeof window === 'undefined') return;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    return;
  }
  if (!storage) return;
  PROJECT_LOCAL_STORAGE_KEYS.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch (error) {
      logError('Failed to remove localStorage key', { key, error }, 'storage');
    }
  });
}
