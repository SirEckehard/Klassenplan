// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi } from 'vitest';
import { routeComponents } from '@/pages/lazyPages';
import { preloadLikelyRoutes } from '@/pages/routePreloader';

vi.mock('@/pages/lazyPages', () => {
  const names = [
    'startpage',
    'generator',
    'export',
    'present',
    'namensspiel',
    'wer-kommt-dran',
    'wo-sitzt-wer',
    'gruppen',
    'impressum',
    'datenschutz',
    'feedback',
    'faq',
    'changelog',
    'support',
  ];
  return {
    routeComponents: Object.fromEntries(
      names.map((name) => [name, { preload: vi.fn(async () => {}) }]),
    ),
  };
});

vi.mock('@/utils/performance/idleTasks', () => ({
  scheduleIdleTask: (task: () => void) => task(),
}));

vi.mock('@/utils/performance/prefetchHints', () => ({
  addPrefetchHint: vi.fn(),
}));

describe('preloadLikelyRoutes', () => {
  // A prerendered route is a directory, so the workspace lives at
  // `/generator/`. Compared with `'/generator'`, it preloaded the start page
  // alone — and where no service worker serves the page, exporting,
  // presenting and the class tools then failed offline.
  it('preloads the ways out of the workspace at its trailing-slash URL', async () => {
    preloadLikelyRoutes('/generator/');

    await vi.waitFor(() =>
      expect(routeComponents.export.preload).toHaveBeenCalled(),
    );
    expect(routeComponents.present.preload).toHaveBeenCalled();
    expect(routeComponents['wer-kommt-dran'].preload).toHaveBeenCalled();
    expect(routeComponents['wo-sitzt-wer'].preload).toHaveBeenCalled();
    expect(routeComponents.gruppen.preload).toHaveBeenCalled();
    expect(routeComponents.namensspiel.preload).toHaveBeenCalled();
  });
});
