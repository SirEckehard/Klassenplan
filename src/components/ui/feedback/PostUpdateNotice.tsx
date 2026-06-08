import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MegaphoneIcon, ArrowRightIcon } from '@phosphor-icons/react';
import {
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { CHANGELOG_ROUTE, logInfo } from '@/utils';
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
      className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-5 text-blue-900 shadow-xs backdrop-blur dark:border-blue-500/40 dark:bg-blue-900/30 dark:text-blue-100"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-600 dark:bg-blue-500/30 dark:text-blue-200">
          <MegaphoneIcon aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-200">
              {t('updateNotice.newInVersion', {
                version: latestChangelogEntry.version,
              })}
            </p>
            {latestChangelogEntry.date ? (
              <p className="text-xs text-blue-500/80 dark:text-blue-200/80">
                {latestChangelogEntry.date}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-blue-900/90 dark:text-blue-100/90">
              {t('updateNotice.intro')}
            </p>
          </div>
          {highlights.length > 0 ? (
            <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
              {highlights.map((highlight, index) => (
                <li key={`${highlight.sectionKey}-${index}`}>
                  <span className="font-semibold text-blue-700 dark:text-blue-200">
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
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              {t('updateNotice.dismiss')}
            </button>
            <Link
              to={CHANGELOG_ROUTE}
              onClick={handleOpenChangelog}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 underline decoration-blue-400 underline-offset-4 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:text-blue-200 dark:hover:text-blue-100 dark:focus-visible:ring-offset-gray-900"
            >
              {t('updateNotice.link')}
              <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
