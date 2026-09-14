// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// Shared route/language helpers for the SEO build scripts (sitemap, prerender,
// verify). Keeping them in one place stops the sitemap and the prerendered
// files from drifting apart.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Loaded through Node's type stripping, so the build scripts and vite.config.ts
// validate IMPRINT_URL / PRIVACY_URL with the same code.
import { readLegalPageUrls } from '../../src/config/legalPageUrls.ts';

export const LANGUAGES = ['de', 'en'];
export const DEFAULT_LANG = 'de';

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
export const distDir = path.resolve(projectRoot, 'dist');
export const publicDir = path.resolve(projectRoot, 'public');

const routesPath = path.resolve(projectRoot, 'src', 'data', 'seoRoutes.json');

export async function readRoutes() {
  return JSON.parse(await fs.readFile(routesPath, 'utf-8'));
}

const DEFAULT_SITE_URL = 'https://klassenplan.de';

export function getSiteUrl() {
  const fromEnv = process.env.SITE_URL;
  return fromEnv ? fromEnv.replace(/\/$/, '') : DEFAULT_SITE_URL;
}

/**
 * Legal routes this build replaces with a forward to the operator's own page
 * (IMPRINT_URL / PRIVACY_URL, decision 0012).
 */
export function getForwardedLegalRoutes(env = process.env) {
  const urls = readLegalPageUrls(env);
  return new Set(Object.keys(urls).filter((route) => urls[route] !== null));
}

/**
 * True for routes that belong in the sitemap and carry `index,follow`. A
 * forwarded legal page is `noindex`: the operator's own page is the one to find.
 */
export function isIndexableRoute(
  route,
  forwardedLegalRoutes = getForwardedLegalRoutes(),
) {
  return route.noindex !== true && !forwardedLegalRoutes.has(route.path);
}

/**
 * True for klassenplan.de's own build: the default `SITE_URL` and its own legal
 * pages. Every other build serves a different site and needs its own sitemap.
 */
export function isDefaultSiteBuild(env = process.env) {
  return (
    getSiteUrl() === DEFAULT_SITE_URL && getForwardedLegalRoutes(env).size === 0
  );
}

/**
 * Localized path for a base route. German uses no prefix, English uses `/en`.
 */
export function getLocalizedPath(basePath, lang) {
  if (lang === DEFAULT_LANG) {
    return basePath;
  }
  return basePath === '/' ? `/${lang}` : `/${lang}${basePath}`;
}

/**
 * Localized title/description for a route, falling back to the German fields.
 */
export function getLocalizedMeta(route, lang) {
  const useEnglish = lang === 'en';
  return {
    title: useEnglish && route.titleEn ? route.titleEn : route.title,
    description:
      useEnglish && route.descriptionEn
        ? route.descriptionEn
        : route.description,
  };
}

/**
 * Expand the route table into one entry per route × language.
 */
export function expandRoutes(routes) {
  const forwardedLegalRoutes = getForwardedLegalRoutes();
  const expanded = [];
  for (const route of routes) {
    for (const lang of LANGUAGES) {
      expanded.push({
        route,
        lang,
        basePath: route.path,
        localizedPath: getLocalizedPath(route.path, lang),
        noindex: !isIndexableRoute(route, forwardedLegalRoutes),
        ...getLocalizedMeta(route, lang),
      });
    }
  }
  return expanded;
}

/**
 * Output file for a localized path, relative to dist/.
 * `/` → index.html, `/en` → en/index.html, `/faq` → faq/index.html.
 */
export function outputFileFor(localizedPath) {
  const trimmed = localizedPath.replace(/^\/+|\/+$/g, '');
  return trimmed ? path.join(trimmed, 'index.html') : 'index.html';
}
