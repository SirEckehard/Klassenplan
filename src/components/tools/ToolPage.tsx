// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { KpLockup } from '@/components/KpLockup';
import { LocalizedLink } from '@/components/LocalizedLink';
import HelpButton from '@/components/ui/buttons/HelpButton';
import AppearanceControls from '@/components/ui/navigation/AppearanceControls';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { primaryButtonClass, quietIconButtonClass } from '@/utils';

/**
 * The frame the three classroom tools share: one screen, one job, one thumb.
 *
 * "Wer kommt dran?", "Wo sitzt wer?" and "Gruppen bilden" are used standing up
 * — in the doorway, between two desks, in front of the class — so each of them
 * is its own page instead of a panel inside the workspace: a phone is held in
 * one hand, and what it shows has to be the whole answer. The action sits at
 * the bottom, where the thumb is; the way back sits at the top, out of it.
 */
export default function ToolPage({
  route,
  title,
  subtitle,
  help,
  footer,
  children,
}: {
  /** The route's own path, for its SEO metadata (`src/data/seoRoutes.json`). */
  route: string;
  title: string;
  /** Which class this is about — the tools act on the one that is open. */
  subtitle?: string;
  help?: React.ReactNode;
  /** The primary action, pinned above the bottom edge. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo(route);
  const navigate = useLocalizedNavigate();
  const location = useLocation();

  // Back is where the tool was opened from: the workspace's toolbar, or the
  // projection whose bar offers "Gruppen bilden" — which then comes back as it
  // was left. Opened straight from a link or a bookmark there is nothing behind
  // it inside the app, and the workspace is the way in.
  const goBack = React.useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate('/generator');
  }, [location.key, navigate]);

  // The same shortcut as the export, present and name game pages.
  useKeyboardShortcuts({ 'alt+arrowleft': goBack });

  return (
    <main
      id="main"
      tabIndex={-1}
      className="fixed inset-0 flex flex-col bg-(--surface-sunken)"
    >
      <Seo {...metadata} />

      <div className="flex shrink-0 items-center gap-2 border-b border-(--border-card) bg-(--surface-card) px-3 py-2">
        <button
          type="button"
          onClick={goBack}
          className={`${quietIconButtonClass} h-10 w-10 shrink-0`}
          aria-label={t('tools.back')}
          title={t('tools.backTitle')}
        >
          <ArrowLeftIcon size={20} aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-base font-semibold text-(--text-page)">
            {title}
          </h1>
          {subtitle && (
            <span className="truncate text-xs text-(--text-muted)">
              {subtitle}
            </span>
          )}
        </div>
        <LocalizedLink
          to="/"
          className="kp-lockup hidden shrink-0 focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2 sm:flex"
        >
          <KpLockup size="sm" hideWordmarkOnMobile />
        </LocalizedLink>
        <AppearanceControls />
        {help && <HelpButton title={title} instructions={help} />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

      {footer && (
        <div className="shrink-0 border-t border-(--border-card) bg-(--surface-card) px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      )}
    </main>
  );
}

/** What a tool says when the class it needs is not there yet. */
export function ToolEmptyState({
  title,
  body,
  actionLabel,
}: {
  title: string;
  body: string;
  actionLabel: string;
}) {
  const navigate = useLocalizedNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-base font-semibold text-(--text-page)">{title}</p>
      <p className="max-w-xs text-sm text-(--text-muted)">{body}</p>
      <button
        type="button"
        onClick={() => navigate('/generator')}
        className={`${primaryButtonClass} h-10 px-4 text-sm font-semibold`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
