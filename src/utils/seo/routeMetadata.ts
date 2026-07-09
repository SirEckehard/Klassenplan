// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import routes from '@/data/seoRoutes.json';

export type SupportedLang = 'de' | 'en';

interface RawRouteMetadata {
  path: string;
  title: string;
  description: string;
  titleEn?: string;
  descriptionEn?: string;
  changefreq: string;
  priority: number;
  ogType?: string;
  noindex?: boolean;
}

export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  changefreq: string;
  priority: number;
  ogType?: string;
  noindex?: boolean;
}

/**
 * Resolve SEO metadata for a base path, localised for the given language.
 * Falls back to the German fields when an English variant is missing.
 */
export function getRouteMetadata(
  path: string,
  lang: SupportedLang = 'de',
): RouteMetadata {
  const metadata = (routes as RawRouteMetadata[]).find(
    (route) => route.path === path,
  );

  if (!metadata) {
    throw new Error(`Missing SEO metadata for path: ${path}`);
  }

  return {
    path: metadata.path,
    title:
      lang === 'en' && metadata.titleEn ? metadata.titleEn : metadata.title,
    description:
      lang === 'en' && metadata.descriptionEn
        ? metadata.descriptionEn
        : metadata.description,
    changefreq: metadata.changefreq,
    priority: metadata.priority,
    ogType: metadata.ogType,
    noindex: metadata.noindex,
  };
}

export function getAllRouteMetadata(): RouteMetadata[] {
  return (routes as RawRouteMetadata[]).map((route) => ({
    path: route.path,
    title: route.title,
    description: route.description,
    changefreq: route.changefreq,
    priority: route.priority,
    ogType: route.ogType,
    noindex: route.noindex,
  }));
}
