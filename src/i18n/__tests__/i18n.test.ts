// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import { languageForPath } from '../i18n';

describe('languageForPath', () => {
  it.each([
    ['/', 'de'],
    ['/generator', 'de'],
    ['/english', 'de'],
    ['/de/en', 'de'],
    ['/en', 'en'],
    ['/en/', 'en'],
    ['/en/export', 'en'],
  ])('%s → %s', (pathname, expected) => {
    expect(languageForPath(pathname)).toBe(expected);
  });
});

describe('initial language', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
  });

  // jsdom reports navigator.language as en-US — the browser setting that used
  // to turn a German first visit into an English render.
  it('stays German on a German path regardless of the browser language', async () => {
    expect(navigator.language.startsWith('de')).toBe(false);
    window.history.replaceState({}, '', '/generator');
    vi.resetModules();

    const { default: i18n, i18nReady } = await import('../i18n');
    await i18nReady;

    expect(i18n.language).toBe('de');
    expect(i18n.hasResourceBundle('en', 'pages')).toBe(false);
    expect(localStorage.getItem('klassenplan-language')).toBeNull();
  });

  it('switches to English before the first render on /en paths', async () => {
    window.history.replaceState({}, '', '/en/generator');
    vi.resetModules();

    const { default: i18n, i18nReady } = await import('../i18n');
    await i18nReady;

    expect(i18n.language).toBe('en');
    expect(i18n.hasResourceBundle('en', 'pages')).toBe(true);
  });
});
