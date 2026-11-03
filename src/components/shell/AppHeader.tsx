// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { KpLockup } from '@/components/KpLockup';
import { LocalizedLink } from '@/components/LocalizedLink';
import AppSettingsMenu from '@/components/shell/AppSettingsMenu';
import { touchHitAreaClass } from '@/components/shell/shellTokens';
import { secondaryButtonClass } from '@/utils';

export interface HeaderBack {
  onClick: () => void;
  /** The accessible name, where it says more than "Zurück". */
  label?: string;
  title?: string;
}

/**
 * The head of every page: the mark on the left with what the page is about
 * beside it, and on the right three places that hang from the window's edge —
 * the way back, Help, the settings. Hanging from that edge, nothing on the left
 * can move them. A page without help has its way back right beside the settings.
 *
 * A page with a bar of its own at the bottom keeps its way back there, not
 * twice: the layers, the export page and "Bibliothek" in the status bar, the
 * projection as "Beenden" in its bar.
 *
 * The start page keeps the same row but not the band (`inColumn`): it sells
 * rather than works, so the row stands in the page's column, the logo over the
 * title and the gear over the preview's edge, on a hairline as wide as the
 * ones between its sections, and it scrolls away with the page. The logo is
 * larger there, and the row as high as the logo needs.
 */
export default function AppHeader({
  brand = 'mark',
  brandIsHeading = false,
  inColumn = false,
  ariaLabel,
  start,
  center,
  back,
  help,
  children,
}: {
  /** The mark alone in the app; with the wordmark where the name is news. */
  brand?: 'mark' | 'lockup';
  /** The workspace names no page of its own, so its mark is the heading. */
  brandIsHeading?: boolean;
  /** The row in the page's column instead of a band across the window. */
  inColumn?: boolean;
  /** Names the banner landmark, e.g. "FAQ Überblick". */
  ariaLabel?: string;
  /** What this page is about: a title, or the class menu. */
  start?: React.ReactNode;
  /** The layer switcher, on the pages that have it. */
  center?: React.ReactNode;
  back?: HeaderBack;
  help?: React.ReactNode;
  /** What hangs from the header without taking a place in it (the tour). */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation(['common', 'pages']);
  const word = t('common:nav.back');

  const brandLink = (
    <LocalizedLink
      to="/"
      // Both halves of the lockup are decorative, so without a label the link
      // has no accessible name at all.
      aria-label={t('pages:header.homeLink')}
      className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
    >
      <KpLockup size={inColumn ? 'md' : 'sm'} markOnly={brand === 'mark'} />
    </LocalizedLink>
  );

  return (
    <header
      aria-label={ariaLabel}
      className={
        inColumn
          ? 'shrink-0 px-4 pt-[env(safe-area-inset-top)] sm:px-6'
          : 'sticky top-0 z-30 shrink-0 border-b border-(--border-card) bg-(--surface-card) pt-[env(safe-area-inset-top)]'
      }
    >
      <div
        className={`flex items-center justify-between gap-3 ${
          inColumn
            ? 'mx-auto max-w-6xl border-b border-(--border-card) py-3 sm:py-4'
            : 'h-14 px-4'
        }`}
      >
        <div
          className={`flex min-w-0 items-center gap-3 ${
            center ? 'shrink lg:w-95' : 'flex-1'
          }`}
        >
          {brandIsHeading ? (
            <h1 className="flex shrink-0 items-center">{brandLink}</h1>
          ) : (
            <div className="flex shrink-0 items-center">{brandLink}</div>
          )}
          {start}
        </div>

        {center}

        <div
          className={`flex shrink-0 items-center justify-end gap-2 ${
            center ? 'lg:w-95' : ''
          }`}
        >
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label ?? word}
              title={back.title}
              // A phone's head has no room for the word beside a title.
              className={`${secondaryButtonClass} ${touchHitAreaClass} h-9 shrink-0 gap-2 px-3 whitespace-nowrap max-sm:w-9 max-sm:px-0`}
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              <span className="max-sm:hidden">{word}</span>
            </button>
          )}
          {help}
          <AppSettingsMenu />
        </div>
      </div>
      {children}
    </header>
  );
}

/** What a page is, with the class it is about under it: the page's heading. */
export function HeaderTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <h1 className="truncate text-base font-semibold text-(--text-page)">
        {title}
      </h1>
      {subtitle && (
        <span className="truncate text-xs text-(--text-muted)">{subtitle}</span>
      )}
    </div>
  );
}
