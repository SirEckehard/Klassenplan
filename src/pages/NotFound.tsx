// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ArrowRightIcon, HouseLineIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import PublicPageHeader from '@/components/publicPage/PublicPageHeader';
import {
  pageEyebrowClass,
  pageTitleClass,
} from '@/components/publicPage/pageTokens';
import ClassRegisterEntry from '@/components/ui/feedback/ClassRegisterEntry';
import { primaryButtonClass, quietLinkClass } from '@/utils';

/** A pasted address can be long; the register line keeps its start. */
const MAX_PATH_LENGTH = 40;

export default function NotFound() {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();
  const lang = i18n.language === 'en' ? 'en' : 'de';
  // The register line names the address that was asked for and today's
  // date (an easter egg). The prerender's browser leaves it out — 404.html
  // would otherwise keep the build's date and path for good — and the app,
  // which renders the page anew, puts it in.
  const [today] = React.useState(() =>
    typeof navigator !== 'undefined' && navigator.webdriver ? null : new Date(),
  );
  const path =
    location.pathname.length > MAX_PATH_LENGTH
      ? `${location.pathname.slice(0, MAX_PATH_LENGTH - 1)}…`
      : location.pathname;

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
      <Seo
        title={t('notFound.title')}
        description={t('notFound.message')}
        path={location.pathname}
        lang={lang}
        ogType="website"
        noindex
      />
      <div className="mx-auto max-w-6xl">
        <PublicPageHeader bannerLabel={t('pages:header.banner.notFound')} />

        <div className="max-w-2xl pt-4 pb-16 lg:pb-24">
          <p className={pageEyebrowClass}>{t('notFound.eyebrow')}</p>
          <h1 className={pageTitleClass}>{t('notFound.title')}</h1>
          <p className="mt-4 text-lg text-pretty text-(--text-muted)">
            {t('notFound.message')}
          </p>
          {today && (
            <ClassRegisterEntry
              className="mt-6"
              date={today}
              entry={path}
              remark={t('notFound.registerRemark')}
            />
          )}

          {/* Home is the page's one action; whoever came back for a plan
              finds the generator one step closer. */}
          <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
            <LocalizedLink
              to="/"
              className={`${primaryButtonClass} w-full gap-2 px-6 py-3 text-base font-semibold sm:w-auto`}
            >
              <HouseLineIcon size={20} aria-hidden="true" />
              {t('notFound.home')}
            </LocalizedLink>
            <LocalizedLink to="/generator" className={quietLinkClass}>
              {t('notFound.generator')}
              <ArrowRightIcon size={16} aria-hidden="true" />
            </LocalizedLink>
          </div>
        </div>
      </div>
    </main>
  );
}
