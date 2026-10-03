// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CloudSlashIcon } from '@phosphor-icons/react';
import { useOnlineStatus } from '@/hooks/ui/useOnlineStatus';
import { OfflineChunkError } from '@/utils/performance/chunkLoad';
import { primaryButtonClass, secondaryButtonClass } from '@/utils';

/**
 * What a page that could not be loaded offline shows instead of itself: what
 * happened, the way back to the page the teacher came from — whose code is
 * loaded, or they would not have been there — and, once the connection is
 * back, a reload. Offline there is no reload: without a service worker it
 * would only bring the browser's offline page.
 */
function RouteOfflineNotice() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const online = useOnlineStatus();

  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex justify-center bg-(--surface-page) px-4 py-16"
    >
      <div className="w-full max-w-lg">
        <CloudSlashIcon
          className="h-8 w-8 text-(--text-muted)"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-xl font-semibold text-balance text-(--text-page)">
          {t('offline.pageTitle')}
        </h1>
        <p className="mt-2 text-sm text-pretty text-(--text-muted)">
          {t('offline.pageMessage')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`${online ? secondaryButtonClass : primaryButtonClass} gap-2`}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {t('nav.back')}
          </button>
          {online && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={primaryButtonClass}
            >
              {t('common.reloadPage')}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

type RouteOfflineBoundaryProps = {
  /** The boundary lets the notice go as soon as the teacher goes elsewhere. */
  pathname: string;
  children: React.ReactNode;
};

type RouteOfflineBoundaryState = {
  error: unknown;
  pathname: string;
};

/**
 * Catches a page whose code could not be fetched while offline
 * (`OfflineChunkError`, raised by `lazyWithRetry`) and shows a notice in its
 * place. Everything else passes on to `RootErrorBoundary` as before.
 */
export default class RouteOfflineBoundary extends React.Component<
  RouteOfflineBoundaryProps,
  RouteOfflineBoundaryState
> {
  constructor(props: RouteOfflineBoundaryProps) {
    super(props);
    this.state = { error: null, pathname: props.pathname };
  }

  static getDerivedStateFromError(
    error: unknown,
  ): Partial<RouteOfflineBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: RouteOfflineBoundaryProps,
    state: RouteOfflineBoundaryState,
  ): Partial<RouteOfflineBoundaryState> | null {
    return props.pathname === state.pathname
      ? null
      : { error: null, pathname: props.pathname };
  }

  render() {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    if (error instanceof OfflineChunkError) {
      return <RouteOfflineNotice />;
    }
    // Not ours: rethrown from the boundary itself, it reaches the next one up.
    throw error;
  }
}
