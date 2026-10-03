// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canHaveServiceWorker,
  warmOfflineFiles,
} from '@/utils/performance/offlineWarmup';

const setOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
};

const fileResponse = () => new Response('export {}', { status: 200 });

/** A server holding the list and every file on it. */
const serve = (files: unknown) =>
  vi.fn(async (input: RequestInfo | URL) =>
    String(input).endsWith('offline-files.json')
      ? new Response(JSON.stringify(files), { status: 200 })
      : fileResponse(),
  );

const requested = (fetchMock: ReturnType<typeof serve>) =>
  fetchMock.mock.calls.map(([input]) => String(input));

beforeEach(() => {
  setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

describe('warmOfflineFiles', () => {
  // Where no service worker precaches the app, the browser's cache has to
  // hold every part of it, or whatever was not opened yet fails offline.
  it('loads every listed file once', async () => {
    const fetchMock = serve([
      'chunks/StorageHistoryModal-a1.js',
      'workers/algorithmWorker-b2.js',
      'css/index-c3.css',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await warmOfflineFiles();

    expect(requested(fetchMock).sort()).toEqual(
      [
        '/chunks/StorageHistoryModal-a1.js',
        '/css/index-c3.css',
        '/offline-files.json',
        '/workers/algorithmWorker-b2.js',
      ].sort(),
    );
    // The list's name stays while its content changes with each deployment.
    expect(fetchMock).toHaveBeenCalledWith('/offline-files.json', {
      cache: 'no-cache',
    });
  });

  it('skips a file that fails and goes on with the rest', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('offline-files.json')) {
        return new Response(JSON.stringify(['a.js', 'b.js', 'c.js']));
      }
      if (url.endsWith('a.js')) {
        throw new TypeError('NetworkError');
      }
      return fileResponse();
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(warmOfflineFiles()).resolves.toBeUndefined();

    expect(requested(fetchMock)).toEqual(
      expect.arrayContaining(['/b.js', '/c.js']),
    );
  });

  it('stops once the connection is gone', async () => {
    const fetchMock = serve(['a.js', 'b.js']);
    vi.stubGlobal('fetch', fetchMock);
    setOnline(false);

    await warmOfflineFiles();

    expect(requested(fetchMock)).toEqual(['/offline-files.json']);
  });

  // A server without the list — a build from before it existed.
  it('does nothing without a list', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await warmOfflineFiles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('canHaveServiceWorker', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'isSecureContext');
    Reflect.deleteProperty(window.navigator, 'serviceWorker');
  });

  // Plain HTTP — an intranet, a staging host — is no secure context, and
  // there the browser offers no service worker at all.
  it('says no outside a secure context', () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    });

    expect(canHaveServiceWorker()).toBe(false);
  });

  it('says yes over HTTPS where the browser offers one', () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    });

    expect(canHaveServiceWorker()).toBe(true);
  });
});
