// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import {
  isChunkLoadError,
  loadOnDemand,
  reportChunkLoadFailure,
} from '@/utils/performance/chunkLoad';
import { showToast } from '@/utils/ui/toast';

vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  showToast: vi.fn(),
}));

const setOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
};

afterEach(() => {
  setOnline(true);
  vi.mocked(showToast).mockClear();
});

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/chunks/a.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: http://x/chunks/a.js',
  ])('recognises “%s”', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('leaves other errors alone', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('loadOnDemand', () => {
  it('fetches once, however often it is asked for', async () => {
    const module = { default: 'dialog' };
    const factory = vi.fn(async () => module);
    const loader = loadOnDemand(factory, 'test');

    expect(loader.get()).toBeNull();
    const [first, second] = await Promise.all([loader.load(), loader.load()]);
    await loader.load();

    expect(first).toBe(module);
    expect(second).toBe(module);
    expect(loader.get()).toBe(module);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  // Offline the fetch fails; once the connection is back the next request
  // must try again rather than repeat the old failure.
  it('forgets a failed load', async () => {
    const module = { default: 'dialog' };
    const factory = vi
      .fn<() => Promise<typeof module>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(module);
    const loader = loadOnDemand(factory, 'test');

    await expect(loader.load()).rejects.toThrow('Failed to fetch');
    expect(loader.get()).toBeNull();
    await expect(loader.load()).resolves.toBe(module);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('preloads without ever rejecting', async () => {
    const factory = vi.fn(() => Promise.reject(new TypeError('offline')));
    const loader = loadOnDemand(factory, 'test');

    expect(() => loader.preload()).not.toThrow();
    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    expect(loader.get()).toBeNull();
  });
});

describe('reportChunkLoadFailure', () => {
  it('asks to try again online when the browser is offline', () => {
    setOnline(false);

    reportChunkLoadFailure(new TypeError('offline'), 'test');

    expect(showToast).toHaveBeenCalledWith(
      'error',
      'toast:errors.chunkOffline',
      expect.not.objectContaining({ action: expect.anything() }),
    );
  });

  // Online the chunk is most likely gone after a deployment, and a reload
  // brings the current one. Offline a reload would show the browser's offline
  // page instead, which is why the offline message offers none.
  it('offers a reload when the browser is online', () => {
    reportChunkLoadFailure(new TypeError('gone'), 'test');

    expect(showToast).toHaveBeenCalledWith(
      'error',
      'toast:errors.chunkFailed',
      expect.objectContaining({
        action: expect.objectContaining({
          label: expect.stringMatching(/^(Seite neu laden|Reload page)$/i),
        }),
      }),
    );
  });
});
