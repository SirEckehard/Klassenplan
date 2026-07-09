// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect } from 'react';
import { logWarn } from '@/utils';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  lang?: string;
  image?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

// Dimensions of the default Open-Graph lockup image (brand/lockup PNG).
const DEFAULT_IMAGE_WIDTH = '1200';
const DEFAULT_IMAGE_HEIGHT = '226';

const DEFAULT_SITE_NAME = 'Klassenplan';
const FALLBACK_SITE_URL = 'https://klassenplan.de';
const DEFAULT_IMAGE_PATH = '/brand/lockup/klassenplan-lockup.png';
const STRUCTURED_DATA_ELEMENT_ID = 'page-structured-data';

// Supported languages for hreflang
const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
const DEFAULT_LANG = 'de';

/**
 * Canonical origin. Baked in at build time rather than read from
 * window.location.origin: the prerender step renders against localhost and
 * preview deploys run on staging hosts, both of which would otherwise be
 * emitted into canonical, hreflang and og:url.
 */
function resolveSiteUrl() {
  const configured = import.meta.env.VITE_SITE_URL;
  return typeof configured === 'string' && configured
    ? configured
    : FALLBACK_SITE_URL;
}

function resolveUrl(path: string, siteUrl: string) {
  try {
    return new URL(path, siteUrl).toString();
  } catch (error) {
    logWarn('Failed to resolve URL for path', { path, error }, 'Seo');
    return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

/**
 * Get the base path without language prefix.
 */
function getBasePathWithoutLang(path: string): string {
  return path.replace(/^\/(en|de)/, '') || '/';
}

/**
 * Get the localized path for a given language.
 */
function getLocalizedPath(basePath: string, lang: string): string {
  if (lang === DEFAULT_LANG) {
    return basePath;
  }
  return basePath === '/' ? `/${lang}` : `/${lang}${basePath}`;
}

function setMetaTag(
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  if (typeof document === 'undefined') {
    return;
  }
  let element = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  ) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined') {
    return;
  }
  let element = document.head.querySelector(
    `link[rel="${rel}"]`,
  ) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

/**
 * Set or update hreflang link tags for multilingual SEO.
 */
function setHreflangLinks(basePath: string, siteUrl: string): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const createdElements: HTMLLinkElement[] = [];

  // Create hreflang links for each supported language
  for (const lang of SUPPORTED_LANGUAGES) {
    const localizedPath = getLocalizedPath(basePath, lang);
    const href = resolveUrl(localizedPath, siteUrl);
    const selector = `link[rel="alternate"][hreflang="${lang}"]`;

    let element = document.head.querySelector(
      selector,
    ) as HTMLLinkElement | null;

    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', 'alternate');
      element.setAttribute('hreflang', lang);
      document.head.appendChild(element);
      createdElements.push(element);
    }

    element.setAttribute('href', href);
  }

  // x-default only applies to visitors whose language matches no hreflang
  // entry; German speakers are already served by hreflang="de". English is the
  // more useful landing page for everyone else.
  const xDefaultHref = resolveUrl(getLocalizedPath(basePath, 'en'), siteUrl);
  const xDefaultSelector = 'link[rel="alternate"][hreflang="x-default"]';
  let xDefaultElement = document.head.querySelector(
    xDefaultSelector,
  ) as HTMLLinkElement | null;

  if (!xDefaultElement) {
    xDefaultElement = document.createElement('link');
    xDefaultElement.setAttribute('rel', 'alternate');
    xDefaultElement.setAttribute('hreflang', 'x-default');
    document.head.appendChild(xDefaultElement);
    createdElements.push(xDefaultElement);
  }

  xDefaultElement.setAttribute('href', xDefaultHref);

  // Return cleanup function
  return () => {
    for (const element of createdElements) {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  };
}

export default function Seo({
  title,
  description,
  path,
  ogType = 'website',
  lang = 'de',
  image = DEFAULT_IMAGE_PATH,
  structuredData,
  noindex = false,
}: SeoProps) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const siteUrl = resolveSiteUrl();
    const canonicalUrl = resolveUrl(path, siteUrl);
    const imageUrl = resolveUrl(image, siteUrl);
    const basePath = getBasePathWithoutLang(path);

    document.title = title.includes(DEFAULT_SITE_NAME)
      ? title
      : `${title} | ${DEFAULT_SITE_NAME}`;
    document.documentElement.setAttribute('lang', lang);

    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', noindex ? 'noindex,follow' : 'index,follow');

    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', DEFAULT_SITE_NAME);
    setMetaTag('property', 'og:locale', lang === 'de' ? 'de_DE' : 'en_US');
    setMetaTag(
      'property',
      'og:locale:alternate',
      lang === 'de' ? 'en_US' : 'de_DE',
    );
    setMetaTag('property', 'og:image', imageUrl);
    setMetaTag('property', 'og:image:width', DEFAULT_IMAGE_WIDTH);
    setMetaTag('property', 'og:image:height', DEFAULT_IMAGE_HEIGHT);
    setMetaTag('property', 'og:image:alt', title);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', imageUrl);

    setLinkTag('canonical', canonicalUrl);

    // Set hreflang links for multilingual SEO
    const cleanupHreflang = setHreflangLinks(basePath, siteUrl);

    // Assemble the JSON-LD graph: caller-provided node(s) plus an automatic
    // BreadcrumbList for every non-home page (Home → current page).
    const userNodes = structuredData
      ? Array.isArray(structuredData)
        ? structuredData
        : [structuredData]
      : [];

    const graph: Record<string, unknown>[] = userNodes.map((node) => ({
      ...node,
      url: typeof node.url === 'string' ? node.url : canonicalUrl,
    }));

    if (basePath !== '/') {
      const homeUrl = resolveUrl(getLocalizedPath('/', lang), siteUrl);
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: lang === 'en' ? 'Home' : 'Startseite',
            item: homeUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      });
    }

    let cleanupStructuredData: (() => void) | undefined;

    if (graph.length > 0) {
      const elementId = STRUCTURED_DATA_ELEMENT_ID;
      const headElement = document.head;
      const payload =
        graph.length === 1
          ? { '@context': 'https://schema.org', ...graph[0] }
          : { '@context': 'https://schema.org', '@graph': graph };
      const serialized = JSON.stringify(payload);
      const scriptElement = document.getElementById(
        elementId,
      ) as HTMLScriptElement | null;

      if (scriptElement) {
        scriptElement.text = serialized;
      } else {
        const script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.id = elementId;
        script.text = serialized;
        headElement.appendChild(script);
      }

      cleanupStructuredData = () => {
        const existing = document.getElementById(elementId);
        if (existing) {
          headElement.removeChild(existing);
        }
      };
    }

    return () => {
      cleanupHreflang();
      if (cleanupStructuredData) {
        cleanupStructuredData();
      }
    };
  }, [description, image, lang, noindex, ogType, path, structuredData, title]);

  return null;
}
