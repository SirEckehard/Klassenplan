// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  detectInstallBrowser,
  INSTALL_BROWSERS,
  INSTALL_STEP_COUNT,
  isRunningInstalled,
} from '../installGuide';

const UA = {
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
  chrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0',
  firefoxLinux:
    'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
};

describe('detectInstallBrowser', () => {
  it.each([
    ['edge', UA.edge, 0],
    ['chrome', UA.chrome, 0],
    ['safariMac', UA.safariMac, 0],
    ['ios', UA.iphone, 5],
    ['ios', UA.chromeIos, 5],
    ['android', UA.android, 5],
    ['firefoxWindows', UA.firefoxWindows, 0],
    ['firefox', UA.firefoxLinux, 0],
    ['other', 'curl/8.0', 0],
  ] as const)('%s', (expected, userAgent, maxTouchPoints) => {
    expect(detectInstallBrowser({ userAgent, maxTouchPoints })).toBe(expected);
  });

  it('takes an iPad that reports a Mac for an iPad', () => {
    expect(
      detectInstallBrowser({ userAgent: UA.safariMac, maxTouchPoints: 5 }),
    ).toBe('ios');
  });
});

describe('the guide', () => {
  it('has a way, or a note, for every browser it lists', () => {
    for (const browser of INSTALL_BROWSERS) {
      expect(INSTALL_STEP_COUNT[browser]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('isRunningInstalled', () => {
  const win = (standaloneQuery: string | null, standalone?: boolean) => ({
    navigator: { standalone } as Navigator,
    matchMedia: (query: string) =>
      ({ matches: query === standaloneQuery }) as MediaQueryList,
  });

  it('is false in a browser tab', () => {
    expect(isRunningInstalled(win(null))).toBe(false);
  });

  it.each([
    '(display-mode: standalone)',
    '(display-mode: window-controls-overlay)',
    '(display-mode: minimal-ui)',
  ])('is true for %s', (query) => {
    expect(isRunningInstalled(win(query))).toBe(true);
  });

  it('is true for a home-screen app on older iOS', () => {
    expect(isRunningInstalled(win(null, true))).toBe(true);
  });
});
