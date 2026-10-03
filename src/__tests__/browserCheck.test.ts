// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * `public/browser-check.js` runs outside the bundle, in browsers the bundle
 * cannot serve; here it runs against a `CSS` object that says what the
 * browser supports.
 */
const source = readFileSync(
  resolve(__dirname, '../../public/browser-check.js'),
  'utf8',
);

const runIn = (css: Partial<typeof CSS> | undefined, path = '/generator') => {
  window.history.replaceState(null, '', path);
  Object.defineProperty(window, 'CSS', {
    configurable: true,
    writable: true,
    value: css,
  });
  new Function(source)();
};

const banner = () => document.body.querySelector('[role="alert"]');

const current: Partial<typeof CSS> = {
  supports: () => true,
  registerProperty: () => undefined,
};

describe('browser-check.js', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '/');
  });

  it('stays silent in a current browser', () => {
    runIn(current);

    expect(banner()).toBeNull();
  });

  it('says why in a browser without color-mix()', () => {
    runIn({ ...current, supports: () => false });

    expect(banner()?.textContent).toMatch(/zu alt für Klassenplan/);
  });

  it('says it in English under /en', () => {
    runIn(undefined, '/en/generator');

    expect(banner()?.textContent).toMatch(/too old for Klassenplan/);
  });

  it('can be closed', () => {
    runIn({ ...current, registerProperty: undefined });

    (banner()?.querySelector('button') as HTMLButtonElement).click();

    expect(banner()).toBeNull();
  });
});
