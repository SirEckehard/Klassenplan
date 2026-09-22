// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChatCircleTextIcon,
  GithubLogoIcon,
  HandHeartIcon,
  MegaphoneIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import PublicPageHeader from '@/components/publicPage/PublicPageHeader';
import {
  pageEyebrowClass,
  pageTitleClass,
} from '@/components/publicPage/pageTokens';
import { primaryButtonClass, quietLinkClass } from '@/utils';
import { GITHUB_REPO_URL } from '@/config/links';
import { usePageSeo } from '@/hooks/usePageSeo';

const DONATION_URL =
  'https://www.paypal.com/donate/?hosted_button_id=995GP57S2EA9G';

export default function Support() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/support');

  const otherWays = [
    {
      key: 'feedback',
      icon: ChatCircleTextIcon,
      link: (
        <LocalizedLink to="/feedback" className={`${quietLinkClass} text-sm`}>
          {t('support.other.feedback.link')}
          <ArrowRightIcon size={14} aria-hidden="true" />
        </LocalizedLink>
      ),
    },
    {
      key: 'code',
      icon: GithubLogoIcon,
      link: (
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${quietLinkClass} text-sm`}
        >
          {t('support.other.code.link')}
          <ArrowUpRightIcon size={14} aria-hidden="true" />
        </a>
      ),
    },
    { key: 'share', icon: MegaphoneIcon, link: null },
  ];

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
      <Seo {...metadata} />
      <div className="mx-auto max-w-6xl">
        <PublicPageHeader bannerLabel={t('header.banner.support')} />

        <div className="grid gap-12 pt-4 pb-16 lg:grid-cols-12 lg:pb-24">
          <div className="lg:col-span-7">
            <p className={pageEyebrowClass}>{t('support.eyebrow')}</p>
            <h1 className={pageTitleClass}>{t('support.title')}</h1>
            <div className="mt-6 max-w-xl space-y-4 text-lg text-pretty text-(--text-muted)">
              <p>{t('support.description1')}</p>
              <p>{t('support.description2')}</p>
            </div>

            {/* The page's one action. A new tab, so the app stays where the
                toolbar's entry left it. */}
            <a
              href={DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${primaryButtonClass} mt-8 w-full gap-2 px-6 py-3 text-base font-semibold sm:w-auto`}
            >
              <HandHeartIcon size={20} aria-hidden="true" />
              {t('support.donateButton')}
              <ArrowUpRightIcon size={16} aria-hidden="true" />
            </a>
            <p className="mt-3 text-sm text-(--text-muted)">
              {t('support.donateHint')}
            </p>
          </div>

          <section aria-labelledby="support-other" className="lg:col-span-5">
            <h2 id="support-other" className={pageEyebrowClass}>
              {t('support.other.title')}
            </h2>
            <ul className="mt-3 border-t border-(--border-card)">
              {otherWays.map((way) => (
                <li
                  key={way.key}
                  className="flex gap-4 border-b border-(--border-card) py-5"
                >
                  <way.icon
                    size={22}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-(--text-muted)"
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-(--text-page)">
                      {t(`support.other.${way.key}.title`)}
                    </h3>
                    <p className="mt-1 text-pretty text-(--text-muted)">
                      {t(`support.other.${way.key}.text`)}
                    </p>
                    {way.link && <div className="mt-2">{way.link}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
