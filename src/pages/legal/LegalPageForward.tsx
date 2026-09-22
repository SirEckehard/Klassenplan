// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LegalPage } from '@/components/publicPage/LegalPage';
import { primaryButtonClass } from '@/utils';
import { usePageSeo } from '@/hooks/usePageSeo';
import {
  getExternalLegalPageUrl,
  type LegalPageRoute,
} from '@/config/legalPages';

const PAGES = {
  '/impressum': {
    titleKey: 'legal.forward.imprintTitle',
    bannerKey: 'header.banner.impressum',
  },
  '/datenschutz': {
    titleKey: 'legal.forward.privacyTitle',
    bannerKey: 'header.banner.datenschutz',
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
  const { titleKey, bannerKey } = PAGES[route];

  return (
    <>
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
      <LegalPage
        bannerLabel={t(bannerKey)}
        title={t(titleKey)}
        lead={t('legal.forward.text')}
      >
        {/* The page's one action. */}
        {externalUrl && (
          <a
            href={externalUrl}
            className={`${primaryButtonClass} w-full gap-2 px-6 py-3 text-base font-semibold sm:w-auto`}
          >
            {t('legal.forward.link')}
            <ArrowUpRightIcon size={16} aria-hidden="true" />
          </a>
        )}
      </LegalPage>
    </>
  );
}
