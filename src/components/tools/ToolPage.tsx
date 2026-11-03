// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import Seo from '@/components/Seo';
import AppHeader, { HeaderTitle } from '@/components/shell/AppHeader';
import HelpButton from '@/components/ui/buttons/HelpButton';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useBackThroughHistory } from '@/hooks/useReturnToApp';
import { primaryButtonClass } from '@/utils';

/**
 * The frame the classroom tools share: one screen, one job, one thumb.
 *
 * "Wer kommt dran?", "Wo sitzt wer?", "Gruppen bilden", "Dienste
 * verteilen" and the name game are used standing up
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
  faqSection = 'unterricht',
  onBack,
  backTitle,
  footer,
  children,
}: {
  /** The route's own path, for its SEO metadata (`src/data/seoRoutes.json`). */
  route: string;
  title: string;
  /** Which class this is about — the tools act on the one that is open. */
  subtitle?: string;
  help?: React.ReactNode;
  /** The FAQ section the help leads to. */
  faqSection?: string;
  /**
   * A step back inside the tool (the name game's round back to its choice of
   * game) for the arrow on top; Alt/⌥+← still leaves the page.
   */
  onBack?: () => void;
  backTitle?: string;
  /** The primary action, pinned above the bottom edge. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo(route);

  // Back is where the tool was opened from: the workspace's toolbar, or the
  // projection whose bar offers "Gruppen bilden" — which then comes back as it
  // was left.
  const goBack = useBackThroughHistory();

  // The same shortcut as the export and present pages.
  useKeyboardShortcuts({ 'alt+arrowleft': goBack });

  return (
    // Fixed to the window, the page leaves the body's distance from a phone's
    // notch behind and keeps its own.
    <div className="fixed inset-0 flex flex-col bg-(--surface-sunken) pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <AppHeader
        start={<HeaderTitle title={title} subtitle={subtitle} />}
        back={{
          onClick: onBack ?? goBack,
          title: backTitle ?? t('tools.backTitle'),
        }}
        help={
          help ? (
            <HelpButton
              title={title}
              instructions={help}
              faqSection={faqSection}
            />
          ) : undefined
        }
      />

      <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
        <Seo {...metadata} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-(--border-card) bg-(--surface-card) px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Under a phone's thumb it takes the width; on anything wider it
                stays a button rather than a band across the window. */}
            <div className="mx-auto w-full max-w-md">{footer}</div>
          </div>
        )}
      </main>
    </div>
  );
}

/** What a tool says when the class it needs is not there yet. */
export function ToolEmptyState({
  title,
  body,
  actionLabel,
  step,
}: {
  title: string;
  body: string;
  actionLabel: string;
  /**
   * The layer that supplies what is missing — 1 for the class list, 3 for the
   * seating plan. The tools open from every layer, so the workspace is told
   * where to land rather than returning to whichever layer was open last.
   */
  step: 1 | 3;
}) {
  const navigate = useLocalizedNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-base font-semibold text-(--text-page)">{title}</p>
      <p className="max-w-xs text-sm text-(--text-muted)">{body}</p>
      <button
        type="button"
        onClick={() => navigate('/generator', { state: { step } })}
        className={`${primaryButtonClass} h-10 px-4 text-sm font-semibold`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
