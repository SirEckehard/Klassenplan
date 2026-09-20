// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  GitDiffIcon,
  PlusIcon,
  WrenchIcon,
  BugIcon,
  BroomIcon,
  type Icon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import {
  cardSurfaceClass,
  formatLongDate,
  secondaryButtonClass,
} from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import { changelogVersions, type ChangeItem } from '@/data/changelogEntries';
import { useTranslation } from 'react-i18next';

// Type mapping for change categories
const changeTypeConfig: Record<
  ChangeItem['type'],
  { labelKey: string; icon: Icon; color: string }
> = {
  feature: {
    labelKey: 'types.feature',
    icon: PlusIcon,
    color: 'text-(--button-success-bg)',
  },
  improvement: {
    labelKey: 'types.improvement',
    icon: WrenchIcon,
    color: 'text-(--text-badge)',
  },
  bugfix: {
    labelKey: 'types.bugfix',
    icon: BroomIcon,
    color: 'text-(--button-danger-bg)',
  },
  knownissue: {
    labelKey: 'types.knownissue',
    icon: BugIcon,
    color: 'text-(--text-page)',
  },
};

const versions = changelogVersions;

export default function Changelog() {
  const { t } = useTranslation('changelog');
  const metadata = usePageSeo('/changelog');

  // Group changes by type for each version
  const getGroupedChanges = (changes: ChangeItem[]) => {
    const grouped: Partial<Record<ChangeItem['type'], ChangeItem[]>> = {};
    changes.forEach((change) => {
      if (!grouped[change.type]) {
        grouped[change.type] = [];
      }
      grouped[change.type]!.push(change);
    });
    return grouped;
  };

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-(--surface-page) px-4 py-12"
    >
      <Seo {...metadata} />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label={t('header.aria.banner', 'Changelog Überblick')}
        >
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            aria-label={t('header.homeLink')}
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} border px-5 py-5 sm:px-8 sm:py-8`}
          aria-labelledby="changelog-intro"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-(--border-card) bg-(--surface-option-selected) text-(--text-badge) shadow-sm/20">
              <GitDiffIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <h1
                id="changelog-intro"
                className="text-xl font-bold sm:text-3xl"
              >
                {t('header.title', 'Changelog')}
              </h1>
              <p className="mt-1 text-sm text-(--text-muted) sm:text-base">
                {t(
                  'header.subtitle',
                  'Alle Änderungen und neuen Features im Überblick',
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {versions.map((version) => {
            const groupedChanges = getGroupedChanges(version.changes);

            return (
              <section
                key={version.version}
                className={`${cardSurfaceClass} border px-8 py-8`}
                aria-labelledby={`version-${version.version}`}
              >
                <div className="flex flex-col gap-2 border-b border-(--border-card) pb-4">
                  <h2
                    id={`version-${version.version}`}
                    className="text-2xl font-semibold text-(--text-badge)"
                  >
                    Version {version.version}
                  </h2>
                  <time
                    className="text-sm text-(--text-muted)"
                    dateTime={version.date}
                  >
                    {formatLongDate(version.date)}
                  </time>
                </div>

                <div className="mt-6 space-y-6">
                  {(
                    Object.entries(groupedChanges) as [
                      ChangeItem['type'],
                      ChangeItem[],
                    ][]
                  ).map(([type, items]) => {
                    const config = changeTypeConfig[type];
                    const Icon = config.icon;

                    return (
                      <div key={type}>
                        <h3
                          className={`mb-3 flex items-center gap-2 text-lg font-medium ${config.color}`}
                        >
                          <Icon aria-hidden="true" className="h-5 w-5" />
                          {t(config.labelKey)}
                        </h3>
                        <ul className="space-y-2">
                          {items.map((item, index) => (
                            <li
                              key={index}
                              className="flex gap-2 text-(--text-muted)"
                            >
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--button-primary-bg)"
                                aria-hidden="true"
                              />
                              <span>
                                {item.text ||
                                  (item.textKey ? t(item.textKey) : '')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <footer className={`${cardSurfaceClass} border px-8 py-8 text-center`}>
          <h2 className="text-2xl font-semibold text-(--text-badge)">
            {t('footer.title', 'Fragen oder Feedback?')}
          </h2>
          <p className="mt-2 text-(--text-muted)">
            {t(
              'footer.text',
              'Ich freue mich über dein Feedback zu neuen Features und Verbesserungen.',
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <LocalizedLink
              to="/feedback"
              className={`${secondaryButtonClass} px-5 py-2.5 text-base font-semibold`}
            >
              {t('footer.feedbackBtn', 'Feedback geben')}
            </LocalizedLink>
            <LocalizedLink
              to="/generator"
              className={`${secondaryButtonClass} px-5 py-2.5 text-base font-semibold`}
            >
              {t('footer.generatorBtn', 'Direkt zum Generator')}
            </LocalizedLink>
          </div>
        </footer>
      </div>
    </main>
  );
}
