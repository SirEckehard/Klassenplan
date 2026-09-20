// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  ArrowSquareOutIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { KpLockup } from '@/components/KpLockup';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';
import { usePageSeo } from '@/hooks/usePageSeo';
import {
  getExternalLegalPageUrl,
  type LegalPageRoute,
} from '@/config/legalPages';

const PAGES = {
  '/impressum': {
    titleKey: 'legal.forward.imprintTitle',
    bannerKey: 'header.banner.impressum',
    Icon: IdentificationCardIcon,
  },
  '/datenschutz': {
    titleKey: 'legal.forward.privacyTitle',
    bannerKey: 'header.banner.datenschutz',
    Icon: ShieldCheckIcon,
  },
} as const;

/**
 * Stand-in for the Impressum or the Datenschutzerklärung in a build whose
 * operator publishes them elsewhere (`IMPRINT_URL` / `PRIVACY_URL`).
 *
 * `vite.config.ts` swaps it in for the klassenplan.de pages, so their texts
 * never reach such a build. The route keeps working for anyone who types it,
 * but the page is `noindex`: the operator's own page is the one to find.
 */
export default function LegalPageForward({ route }: { route: LegalPageRoute }) {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo(route);
  const externalUrl = getExternalLegalPageUrl(route);
  const { titleKey, bannerKey, Icon } = PAGES[route];

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-(--surface-page) px-4 py-12"
    >
      <Seo
        {...metadata}
        noindex
        structuredData={{
          '@type': 'WebPage',
          name: metadata.title,
          inLanguage: metadata.lang,
          description: metadata.description,
        }}
      />
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <header className="text-center" role="banner" aria-label={t(bannerKey)}>
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            aria-label={t('header.homeLink')}
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} p-5 sm:p-8`}
          aria-labelledby="legal-forward-title"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-(--border-card) bg-(--surface-option-selected) text-(--text-badge) shadow-sm/20">
              <Icon aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2
              id="legal-forward-title"
              className="text-xl font-bold tracking-tight text-(--text-page) sm:text-3xl"
            >
              {t(titleKey)}
            </h2>
          </div>
          <p className="mt-6 leading-relaxed text-(--text-page)">
            {t('legal.forward.text')}
          </p>
          {externalUrl && (
            <a
              href={externalUrl}
              className={`${primaryButtonClass} mt-6 inline-flex items-center gap-2`}
            >
              {t('legal.forward.link')}
              <ArrowSquareOutIcon aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
        </section>
      </div>
    </main>
  );
}
