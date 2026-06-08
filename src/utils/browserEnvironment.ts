/**
 * Utilities for guarding access to browser-only globals like `window` or `localStorage`.
 * These helpers make it easy to write code that can run in non-browser environments,
 * including SSR and certain test setups.
 */

/**
 * Check whether a browser `window` object is available.
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Safely retrieve the global `window` object.
 */
export function getBrowserWindow(): Window | undefined {
  return isBrowserEnvironment() ? window : undefined;
}

/**
 * Execute a callback only when the browser `window` object is available.
 */
export function withBrowserWindow<T>(
  handler: (browserWindow: Window) => T,
  fallback?: T,
): T | undefined {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return fallback;
  }

  try {
    return handler(browserWindow);
  } catch {
    return fallback;
  }
}

/**
 * Check whether `localStorage` is available.
 */
export function hasBrowserLocalStorage(): boolean {
  return withBrowserWindow((browserWindow) => {
    try {
      return typeof browserWindow.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }, false) as boolean;
}

/**
 * Safely retrieve `localStorage` if it exists.
 */
export function getBrowserLocalStorage(): Storage | undefined {
  if (!hasBrowserLocalStorage()) {
    return undefined;
  }

  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return undefined;
  }

  try {
    return browserWindow.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Execute a callback only when `localStorage` is available.
 */
export function withBrowserLocalStorage<T>(
  handler: (storage: Storage) => T,
  fallback?: T,
): T | undefined {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return fallback;
  }

  try {
    return handler(storage);
  } catch {
    return fallback;
  }
}

/**
 * Safely access the global `document` object through the browser window.
 */
export function getBrowserDocument(): Document | undefined {
  const browserWindow = getBrowserWindow();
  return browserWindow?.document;
}
