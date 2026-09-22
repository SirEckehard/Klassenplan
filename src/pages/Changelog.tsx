// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  BroomIcon,
  BugIcon,
  PlusIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import PublicPageHeader from '@/components/publicPage/PublicPageHeader';
import {
  pageEyebrowClass,
  pageSectionTitleClass,
  pageTitleClass,
} from '@/components/publicPage/pageTokens';
import {
  formatLongDate,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import { usePageSeo } from '@/hooks/usePageSeo';
import { changelogVersions, type ChangeItem } from '@/data/changelogEntries';
import { useTranslation } from 'react-i18next';

/**
 * The kinds of change, in the order every version lists them. Icon and word
 * tell them apart; none of them is something to act on, so none takes a
 * colour.
 */
const CHANGE_TYPES: {
  type: ChangeItem['type'];
  labelKey: string;
  icon: Icon;
}[] = [
  { type: 'feature', labelKey: 'types.feature', icon: PlusIcon },
  { type: 'improvement', labelKey: 'types.improvement', icon: WrenchIcon },
  { type: 'bugfix', labelKey: 'types.bugfix', icon: BroomIcon },
  { type: 'knownissue', labelKey: 'types.knownissue', icon: BugIcon },
];

/** A version, or the closing note: its name on the left, the rest beside it. */
const rowClass =
  'grid gap-6 border-t border-(--border-card) py-10 lg:grid-cols-12 lg:gap-12 lg:py-14';

export default function Changelog() {
  const { t } = useTranslation('changelog');
  const metadata = usePageSeo('/changelog');

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
      <Seo {...metadata} />
      <div className="mx-auto max-w-6xl">
        <PublicPageHeader bannerLabel={t('header.aria.banner')} />

        <div className="max-w-3xl pt-4 pb-10 lg:pb-14">
          <p className={pageEyebrowClass}>{t('header.eyebrow')}</p>
          <h1 className={pageTitleClass}>{t('header.title')}</h1>
          <p className="mt-4 text-lg text-pretty text-(--text-muted)">
            {t('header.subtitle')}
          </p>
        </div>

        <div className="pb-16 lg:pb-24">
          {changelogVersions.map((version) => {
            const headingId = `version-${version.version}`;

            return (
              <section
                key={version.version}
                aria-labelledby={headingId}
                className={rowClass}
              >
                {/* The version stays in view while its changes are read. */}
                <div className="lg:col-span-4">
                  <div className="lg:sticky lg:top-8">
                    <h2 id={headingId} className={pageSectionTitleClass}>
                      Version {version.version}
                    </h2>
                    <time
                      className="mt-2 block text-sm text-(--text-muted)"
                      dateTime={version.date}
                    >
                      {formatLongDate(version.date)}
                    </time>
                  </div>
                </div>

                <div className="min-w-0 space-y-8 lg:col-span-8">
                  {CHANGE_TYPES.map(({ type, labelKey, icon: TypeIcon }) => {
                    const items = version.changes.filter(
                      (change) => change.type === type,
                    );
                    if (items.length === 0) return null;

                    return (
                      <div key={type}>
                        <h3
                          className={`flex items-center gap-2 ${pageEyebrowClass}`}
                        >
                          <TypeIcon size={16} aria-hidden="true" />
                          {t(labelKey)}
                        </h3>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-pretty text-(--text-page) marker:text-(--text-muted)">
                          {items.map((item, index) => (
                            <li key={index}>
                              {item.text ||
                                (item.textKey ? t(item.textKey) : '')}
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

          <section aria-labelledby="changelog-more-title" className={rowClass}>
            <h2
              id="changelog-more-title"
              className={`${pageSectionTitleClass} lg:col-span-4`}
            >
              {t('footer.title')}
            </h2>
            <div className="lg:col-span-8">
              <p className="text-pretty text-(--text-muted)">
                {t('footer.text')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LocalizedLink
                  to="/generator"
                  className={`${primaryButtonClass} px-5 py-2.5 text-base font-semibold`}
                >
                  {t('footer.generatorBtn')}
                </LocalizedLink>
                <LocalizedLink
                  to="/feedback"
                  className={`${secondaryButtonClass} px-5 py-2.5 text-base font-semibold`}
                >
                  {t('footer.feedbackBtn')}
                </LocalizedLink>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
