// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import AppHeader from '@/components/shell/AppHeader';
import { pageMainClass } from '@/components/publicPage/pageTokens';
import { useReturnToApp } from '@/hooks/useReturnToApp';

/**
 * The frame of a page outside the workspace: the head every page wears, with
 * the wordmark beside the mark — this may be the first a visitor sees of the
 * product — and the page's column under it.
 *
 * The head stands above the column, across the window: only there does "Zurück"
 * keep its place whatever the window's width. It shows when the app opened the
 * page; for a visitor from a search engine it would lead out of the site.
 */
export default function PublicPage({
  bannerLabel,
  headInColumn = false,
  children,
}: {
  /** Names the banner landmark, e.g. "FAQ Überblick". */
  bannerLabel: string;
  /** The start page's head, in the page's column (`AppHeader`'s `inColumn`). */
  headInColumn?: boolean;
  children: React.ReactNode;
}) {
  const goBack = useReturnToApp();

  return (
    <>
      <AppHeader
        brand="lockup"
        inColumn={headInColumn}
        ariaLabel={bannerLabel}
        back={goBack ? { onClick: goBack } : undefined}
      />
      <main id="main" tabIndex={-1} className={pageMainClass}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
