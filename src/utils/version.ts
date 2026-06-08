// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
const FALLBACK_VERSION = '0.0.0';

/**
 * Read the application version injected by Vite at build time.
 */
export function getAppVersion(): string {
  if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__.length > 0) {
    return __APP_VERSION__;
  }
  return FALLBACK_VERSION;
}

export { FALLBACK_VERSION };
