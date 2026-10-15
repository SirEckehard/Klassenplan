// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Which browser's way of installing the app the guide shows first. Chrome and
 * Edge may also offer their own prompt (`beforeinstallprompt`); the guide is
 * for when they do not, and for every browser that never does.
 */
export type InstallBrowser =
  | 'chrome'
  | 'edge'
  | 'safariMac'
  | 'ios'
  | 'android'
  | 'firefoxWindows'
  | 'firefox'
  | 'other';

/** The order the guide lists the browsers in under "Andere Browser". */
export const INSTALL_BROWSERS: readonly Exclude<InstallBrowser, 'other'>[] = [
  'edge',
  'chrome',
  'safariMac',
  'ios',
  'android',
  'firefoxWindows',
  'firefox',
];

/**
 * How many steps a browser's guide has. Firefox outside Windows cannot install
 * a web app at all and gets a note instead.
 */
export const INSTALL_STEP_COUNT: Record<
  Exclude<InstallBrowser, 'other'>,
  number
> = {
  edge: 2,
  chrome: 2,
  safariMac: 2,
  ios: 2,
  android: 2,
  firefoxWindows: 1,
  firefox: 0,
};

export interface InstallEnvironment {
  userAgent: string;
  /** iPadOS reports a Mac; its touch points give it away. */
  maxTouchPoints: number;
}

export function detectInstallBrowser({
  userAgent,
  maxTouchPoints,
}: InstallEnvironment): InstallBrowser {
  const isIos =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  // Every browser on iOS adds to the home screen through the share sheet.
  if (isIos) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  if (/Edg\//.test(userAgent)) return 'edge';
  if (/Firefox\//.test(userAgent)) {
    return /Windows/.test(userAgent) ? 'firefoxWindows' : 'firefox';
  }
  if (/Chrome\/|Chromium\//.test(userAgent)) return 'chrome';
  if (/Macintosh/.test(userAgent) && /Safari\//.test(userAgent)) {
    return 'safariMac';
  }
  return 'other';
}

/**
 * Whether the page runs as the installed app rather than in a browser tab:
 * then there is nothing left to install.
 */
export function isRunningInstalled(
  win: Pick<Window, 'matchMedia' | 'navigator'> | undefined = typeof window ===
  'undefined'
    ? undefined
    : window,
): boolean {
  if (!win) return false;
  // Safari on iOS before display-mode support marks a home-screen app here.
  if ((win.navigator as Navigator & { standalone?: boolean }).standalone) {
    return true;
  }
  if (typeof win.matchMedia !== 'function') return false;
  return ['standalone', 'window-controls-overlay', 'minimal-ui'].some(
    (mode) => win.matchMedia(`(display-mode: ${mode})`).matches,
  );
}
