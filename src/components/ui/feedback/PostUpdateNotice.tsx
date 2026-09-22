// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback, useMemo } from 'react';
import { MegaphoneIcon, ArrowRightIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { LocalizedLink } from '@/components/LocalizedLink';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { CHANGELOG_ROUTE, formatLongDate, logInfo } from '@/utils';
import { useTranslation } from 'react-i18next';

const MAX_HIGHLIGHTS = 3;

export default function PostUpdateNotice() {
  const { t } = useTranslation('changelog');
  const { showPostUpdateNotice, latestChangelogEntry, currentAppVersion } =
    useSeatingPlanState();
  const { acknowledgePostUpdateNotice } = useSeatingPlanActions();

  const highlights = useMemo(() => {
    if (!latestChangelogEntry) {
      return [];
    }

    const collected = latestChangelogEntry.sections.flatMap((section) =>
      section.items.map((itemKey) => ({
        sectionKey: section.titleKey,
        itemKey,
      })),
    );

    return collected.slice(0, MAX_HIGHLIGHTS);
  }, [latestChangelogEntry]);

  const handleOpenChangelog = useCallback(() => {
    logInfo(
      'Post update changelog link opened',
      { version: currentAppVersion },
      'PostUpdateNotice',
    );
  }, [currentAppVersion]);

  if (!showPostUpdateNotice || !latestChangelogEntry) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      role="status"
      className="mb-6 rounded-2xl border border-(--border-option-selected) bg-(--surface-option-selected) px-4 py-5 text-(--text-page) shadow-xs backdrop-blur"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-(--button-primary-bg)/15 text-(--text-badge)/30">
          <MegaphoneIcon aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-badge)">
              {t('updateNotice.newInVersion', {
                version: latestChangelogEntry.version,
              })}
            </p>
            {latestChangelogEntry.date ? (
              <time
                className="block text-xs text-(--text-muted)"
                dateTime={latestChangelogEntry.date}
              >
                {formatLongDate(latestChangelogEntry.date)}
              </time>
            ) : null}
            <p className="mt-2 text-sm text-(--text-muted)">
              {t('updateNotice.intro')}
            </p>
          </div>
          {highlights.length > 0 ? (
            <ul className="space-y-2 text-sm text-(--text-page)">
              {highlights.map((highlight, index) => (
                <li key={`${highlight.sectionKey}-${index}`}>
                  <span className="font-semibold text-(--text-badge)">
                    {t(highlight.sectionKey)}:
                  </span>{' '}
                  {t(highlight.itemKey)}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={acknowledgePostUpdateNotice}
              className="inline-flex items-center justify-center rounded-xl bg-(--button-primary-bg) px-4 py-2 text-sm font-medium text-(--button-primary-text) transition hover:bg-(--button-primary-bg-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            >
              {t('updateNotice.dismiss')}
            </button>
            {/* In the language of the workspace, and with the way back to
                it: the notice is read inside a plan. */}
            <LocalizedLink
              to={CHANGELOG_ROUTE}
              state={APP_RETURN_STATE}
              onClick={handleOpenChangelog}
              className="inline-flex items-center gap-1 text-sm font-medium text-(--text-badge) underline decoration-(--border-card) underline-offset-4 transition hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            >
              {t('updateNotice.link')}
              <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
            </LocalizedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
