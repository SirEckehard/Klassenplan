// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { TranslateIcon } from '@phosphor-icons/react';
import PublicPageHeader from '@/components/publicPage/PublicPageHeader';
import {
  pageEyebrowClass,
  pageTitleClass,
} from '@/components/publicPage/pageTokens';

/**
 * The frame of the Impressum, the Datenschutzerklärung and the page that
 * forwards to an operator's own: the title under "Rechtliches", then the text
 * as `LegalSection` rows.
 */
export function LegalPage({
  bannerLabel,
  title,
  lead,
  germanOnly = false,
  children,
}: {
  /** Names the banner landmark, e.g. "Impressum Überblick". */
  bannerLabel: string;
  title: string;
  lead?: string;
  /**
   * The text is binding in German only. On /en the page says so, and title,
   * lead and text carry `lang="de"` so a screen reader reads them as German.
   */
  germanOnly?: boolean;
  children: React.ReactNode;
}) {
  const { t, i18n } = useTranslation('pages');
  const textLang = germanOnly ? 'de' : undefined;

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <PublicPageHeader bannerLabel={bannerLabel} />

        <div className="max-w-3xl pt-4 pb-10 lg:pb-14">
          <p className={pageEyebrowClass}>{t('legal.eyebrow')}</p>
          <h1 lang={textLang} className={pageTitleClass}>
            {title}
          </h1>
          {lead && (
            <p
              lang={textLang}
              className="mt-4 text-lg text-pretty text-(--text-muted)"
            >
              {lead}
            </p>
          )}
          {germanOnly && i18n.language === 'en' && (
            <p className="mt-6 flex items-start gap-3 rounded-(--radius-card) bg-(--surface-sunken) p-4 text-sm text-(--text-muted)">
              <TranslateIcon
                size={18}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              {t('legal.germanOnlyNote')}
            </p>
          )}
        </div>

        <div lang={textLang} className="pb-16 lg:pb-24">
          {children}
        </div>
      </div>
    </main>
  );
}

/**
 * One part of a legal text: its heading on the left, the text on the right,
 * divided from the next by a hairline. The heading stays in view while a long
 * part is read.
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  /** Id of the heading, which names the section. */
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-3 border-t border-(--border-card) py-8 lg:grid-cols-12 lg:gap-12 lg:py-10"
    >
      <div className="lg:col-span-4">
        <h2
          id={id}
          className="text-lg font-semibold text-balance text-(--text-page) lg:sticky lg:top-8"
        >
          {title}
        </h2>
      </div>
      <div className="max-w-2xl min-w-0 space-y-3 leading-relaxed text-(--text-page) lg:col-span-8">
        {children}
      </div>
    </section>
  );
}
