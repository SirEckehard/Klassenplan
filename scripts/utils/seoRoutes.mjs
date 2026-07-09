// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// Shared route/language helpers for the SEO build scripts (sitemap, prerender,
// verify). Keeping them in one place stops the sitemap and the prerendered
// files from drifting apart.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function getSiteUrl() {
  const fromEnv = process.env.SITE_URL;
  return fromEnv ? fromEnv.replace(/\/$/, '') : 'https://klassenplan.de';
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
  const expanded = [];
  for (const route of routes) {
    for (const lang of LANGUAGES) {
      expanded.push({
        route,
        lang,
        basePath: route.path,
        localizedPath: getLocalizedPath(route.path, lang),
        noindex: route.noindex === true,
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
