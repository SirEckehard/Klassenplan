import { PROJECT_LOCAL_STORAGE_KEYS } from './storageKeys';
import { logError, logWarn, logDebug } from '@/utils';

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
 *   showToast('warning', 'Speicherplatz wird knapp');
 * }
 */
export async function checkStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    !navigator.storage.estimate
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
