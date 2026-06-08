// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  getRouteMetadata,
  type SupportedLang,
} from '@/utils/seo/routeMetadata';

export interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  lang: SupportedLang;
}

/**
 * Resolve localised SEO props for a page given its base (German) path.
 *
 * Returns the title/description in the active language, the language-prefixed
 * canonical path (e.g. `/en/faq`) and the matching `lang` so that `<Seo>` can
 * emit a correct canonical URL, `og:locale` and `<html lang>` per route.
 */
export function usePageSeo(basePath: string): PageSeoProps {
  const { i18n } = useTranslation();
  const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'de';
  const metadata = getRouteMetadata(basePath, lang);

  const path =
    lang === 'en' ? (basePath === '/' ? '/en' : `/en${basePath}`) : basePath;

  return {
    title: metadata.title,
    description: metadata.description,
    ogType: metadata.ogType,
    path,
    lang,
  };
}
