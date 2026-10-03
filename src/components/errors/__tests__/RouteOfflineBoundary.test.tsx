// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import RouteOfflineBoundary from '@/components/errors/RouteOfflineBoundary';
import { lazyWithRetry } from '@/utils/performance/lazyWithRetry';
import { getButton } from '@/__tests__/utils';

const setOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
};

/** A page whose chunk the browser cannot fetch, as Firefox words it. */
const unreachablePage = () =>
  lazyWithRetry(() =>
    Promise.reject(
      new TypeError(
        'error loading dynamically imported module: http://x/chunks/StorageHistoryModal.js',
      ),
    ),
  );

class CatchAll extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <p>caught: {this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

const renderAt = (pathname: string, page: React.ReactNode) =>
  render(
    <MemoryRouter>
      <CatchAll>
        <Suspense fallback={<p>loading</p>}>
          <RouteOfflineBoundary pathname={pathname}>
            {page}
          </RouteOfflineBoundary>
        </Suspense>
      </CatchAll>
    </MemoryRouter>,
  );

afterEach(() => {
  setOnline(true);
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('RouteOfflineBoundary', () => {
  // Without a service worker a reload offline leads to the browser's own
  // offline page, so the page explains itself and offers the way back.
  it('explains a page that could not be loaded offline, without reloading', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setOnline(false);
    const Page = unreachablePage();

    renderAt('/export', <Page />);

    expect(
      await screen.findByRole('heading', {
        name: /offline noch nicht verfügbar|not available offline yet/i,
      }),
    ).toBeInTheDocument();
    expect(getButton(/^(Zurück|Back)$/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /seite neu laden|reload page/i }),
    ).not.toBeInTheDocument();
    // The one-shot reload marks itself before it navigates.
    expect(window.sessionStorage.getItem('kp-chunk-reload')).toBeNull();
  });

  it('lets the notice go once the teacher is elsewhere', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setOnline(false);
    const Page = unreachablePage();
    const { rerender } = renderAt('/export', <Page />);
    await screen.findByRole('heading', {
      name: /offline noch nicht verfügbar|not available offline yet/i,
    });

    rerender(
      <MemoryRouter>
        <CatchAll>
          <Suspense fallback={<p>loading</p>}>
            <RouteOfflineBoundary pathname="/generator">
              <p>workspace</p>
            </RouteOfflineBoundary>
          </Suspense>
        </CatchAll>
      </MemoryRouter>,
    );

    expect(screen.getByText('workspace')).toBeInTheDocument();
  });

  it('passes every other error on to the boundary above', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('boom');
    };

    renderAt('/generator', <Broken />);

    expect(screen.getByText('caught: boom')).toBeInTheDocument();
  });
});
