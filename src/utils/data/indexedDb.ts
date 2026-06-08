// Note: DB_KEYS is exported by ./storageKeys

export const APP_DATA_VERSION = 2;

export function hasIndexedDB(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.indexedDB;
  } catch {
    return false;
  }
}
