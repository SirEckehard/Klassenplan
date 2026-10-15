// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { logError, logInfo, logWarn } from './utils/logger.mjs';
import {
  LANGUAGES,
  getLocalizedPath,
  getSiteUrl,
  isDefaultSiteBuild,
  isIndexableRoute,
  projectRoot,
  publicDir,
  readRoutes,
} from './utils/seoRoutes.mjs';

const execFileAsync = promisify(execFile);
const SOURCE = 'generate-sitemap';
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

// `build:static` passes this flag: klassenplan.de's own build keeps the
// committed sitemap.xml and robots.txt, so their <lastmod> dates only move with
// a commit. A build for any other site rewrites both for its SITE_URL.
const onlyForOtherSites = process.argv.includes('--only-for-other-sites');

// What a route's <lastmod> is dated by: the last commit that changed what the
// page shows. A string is a file or a directory; `{ locale, key }` is one
// subtree of a translation file, in both languages — `pages.json` holds the
// copy of several pages, so dating by the whole file would move them all
// together. The route's own entry in seoRoutes.json (title, description) is
// added to every route. Shared chrome (header, footer, page frame) is left out
// on purpose: it is on every page and changes none of them.
const ROUTE_SOURCES = {
  '/': [
    'src/pages/StartPage.tsx',
    'src/components/HeroMockup.tsx',
    'src/data/previewImages.json',
    { locale: 'pages', key: 'startPage' },
  ],
  '/generator': [
    'src/components/SeatingPlanGenerator',
    'src/components/shell',
    { locale: 'generator' },
    { locale: 'pages', key: 'generator' },
  ],
  '/export': [
    'src/pages/Export.tsx',
    'src/components/SeatingPlanGenerator/ExportToolPanel.tsx',
    'src/components/SeatingPlanGenerator/ExportSheetInspector.tsx',
    'src/components/SeatingPlanGenerator/ExportStatusBar.tsx',
    { locale: 'generator', key: 'export' },
  ],
  '/present': ['src/pages/Present.tsx'],
  '/impressum': ['src/pages/Impressum.tsx', { locale: 'pages', key: 'legal' }],
  '/datenschutz': [
    'src/pages/Datenschutz.tsx',
    { locale: 'pages', key: 'legal' },
  ],
  '/feedback': ['src/pages/Feedback.tsx', { locale: 'pages', key: 'feedback' }],
  '/faq': [
    'src/pages/FAQ.tsx',
    'src/components/FAQ',
    { locale: 'pages', key: 'faq' },
  ],
  '/changelog': [
    'src/pages/Changelog.tsx',
    'src/data/changelogEntries.ts',
    { locale: 'changelog' },
  ],
  '/support': ['src/pages/Support.tsx', { locale: 'pages', key: 'support' }],
};
// The values the sitemap protocol allows (sitemaps.org).
const CHANGEFREQ_VALUES = new Set([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
]);
const SEO_ROUTES_FILE = 'src/data/seoRoutes.json';
// The fields of a route's entry that show on the page or in the results;
// changefreq and priority change nothing a visitor sees.
const SEO_CONTENT_FIELDS = ['title', 'description', 'titleEn', 'descriptionEn'];

/** The Docker build context excludes .git (see .dockerignore). */
async function isGitAvailable() {
  try {
    await execFileAsync('git', ['rev-parse', '--git-dir'], {
      cwd: projectRoot,
    });
    return true;
  } catch {
    return false;
  }
}

async function git(args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: projectRoot,
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

/** Date of the last commit touching any of the paths, or null. */
async function lastCommitTouching(paths) {
  return (
    (await git(['log', '-1', '--format=%cI', '--', ...paths])).trim() || null
  );
}

const contentAtRevision = new Map();

/** A file's content at a revision, or null where it did not exist. */
async function readAtRevision(revision, file) {
  const cacheKey = `${revision}:${file}`;
  if (!contentAtRevision.has(cacheKey)) {
    contentAtRevision.set(
      cacheKey,
      git(['show', `${revision}:${file}`]).catch(() => null),
    );
  }
  return contentAtRevision.get(cacheKey);
}

/**
 * Date of the last commit that changed `select(content)` of a file — a part of
 * it rather than the whole. Walks the file's history from the newest commit
 * and compares each version with its parent's.
 */
async function lastChangeOf(file, select) {
  const log = (await git(['log', '--format=%H %cI', '--', file]))
    .split('\n')
    .filter(Boolean);
  for (const line of log) {
    const [hash, date] = line.split(' ');
    const after = select(await readAtRevision(hash, file));
    const before = select(await readAtRevision(`${hash}^`, file));
    if (after !== before) return date;
  }
  return null;
}

function parseJson(content) {
  try {
    return content === null ? null : JSON.parse(content);
  } catch {
    return null;
  }
}

function selectKey(key) {
  return (content) =>
    JSON.stringify(
      key.split('.').reduce((value, part) => value?.[part], parseJson(content)),
    ) ?? null;
}

function selectRouteEntry(basePath) {
  return (content) => {
    const routes = parseJson(content);
    const entry = Array.isArray(routes)
      ? routes.find((route) => route.path === basePath)
      : undefined;
    return entry
      ? JSON.stringify(SEO_CONTENT_FIELDS.map((field) => entry[field]))
      : null;
  };
}

function latest(dates) {
  const known = dates.filter(Boolean);
  if (known.length === 0) return null;
  return known.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}

/**
 * ISO date of the last commit that changed what a route shows, or null when
 * git knows nothing about it. Google discounts <lastmod> once it looks
 * unreliable, so a missing date beats an invented one — and one date shared by
 * every URL, which dating by shared files produced, is exactly that.
 */
async function getLastModified(basePath) {
  const sources = ROUTE_SOURCES[basePath] ?? [];
  try {
    const paths = sources.filter((source) => typeof source === 'string');
    const dates = [
      paths.length > 0 ? await lastCommitTouching(paths) : null,
      await lastChangeOf(SEO_ROUTES_FILE, selectRouteEntry(basePath)),
    ];
    for (const source of sources) {
      if (typeof source === 'string') continue;
      for (const lang of LANGUAGES) {
        const file = `src/i18n/locales/${lang}/${source.locale}.json`;
        dates.push(
          source.key
            ? await lastChangeOf(file, selectKey(source.key))
            : await lastCommitTouching([file]),
        );
      }
    }
    return latest(dates);
  } catch {
    return null;
  }
}

/**
 * hreflang alternates for a route. x-default targets English: it only applies
 * to visitors whose language matches no hreflang entry, and German speakers are
 * already covered by hreflang="de".
 */
function generateHreflangLinks(basePath, siteUrl) {
  const links = LANGUAGES.map((lang) => {
    const href = new URL(getLocalizedPath(basePath, lang), siteUrl).toString();
    return `      <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`;
  });

  const defaultHref = new URL(
    getLocalizedPath(basePath, 'en'),
    siteUrl,
  ).toString();
  links.push(
    `      <xhtml:link rel="alternate" hreflang="x-default" href="${defaultHref}"/>`,
  );

  return links.join('\n');
}

async function toXml(routes, siteUrl) {
  const urlEntries = [];

  for (const route of routes) {
    // Routes marked noindex — and legal pages this build forwards elsewhere —
    // carry a noindex meta tag; listing them in the sitemap would send Google
    // contradictory signals.
    if (!isIndexableRoute(route)) {
      continue;
    }

    const lastmod = await getLastModified(route.path);
    const changefreq = route.changefreq || 'monthly';
    // Search Console rejects any other value ("Ungültiger Tag-Wert").
    if (!CHANGEFREQ_VALUES.has(changefreq)) {
      throw new Error(
        `Invalid changefreq "${changefreq}" for ${route.path} — allowed: ${[...CHANGEFREQ_VALUES].join(', ')}`,
      );
    }
    const priority =
      typeof route.priority === 'number' ? route.priority.toFixed(1) : '0.5';
    const hreflangLinks = generateHreflangLinks(route.path, siteUrl);

    for (const lang of LANGUAGES) {
      const location = new URL(
        getLocalizedPath(route.path, lang),
        siteUrl,
      ).toString();

      urlEntries.push(
        [
          '    <url>',
          `      <loc>${location}</loc>`,
          ...(lastmod ? [`      <lastmod>${lastmod}</lastmod>`] : []),
          `      <changefreq>${changefreq}</changefreq>`,
          `      <priority>${priority}</priority>`,
          hreflangLinks,
          '    </url>',
        ].join('\n'),
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;
}

async function updateRobots(siteUrl) {
  const robotsPath = path.resolve(publicDir, 'robots.txt');
  const robotsContent = [
    'User-agent: *',
    '# Content preferences (contentsignals.org). Current stance: fully allow',
    '# search indexing, AI-assisted answers and AI training. Adjust a value to',
    '# "no" to opt out of that use without blocking the crawler outright.',
    'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin/',
    'Disallow: /server/',
    '',
    '# AI crawlers are explicitly welcome. A condensed, machine-readable',
    '# description of this site is available at /llms.txt and /llms-full.txt',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
  await fs.writeFile(robotsPath, robotsContent, 'utf-8');
}

async function sitemapExists() {
  try {
    await fs.access(sitemapPath);
    return true;
  } catch {
    return false;
  }
}

async function generate() {
  await fs.mkdir(publicDir, { recursive: true });
  const routes = await readRoutes();
  const siteUrl = getSiteUrl();
  const indexable = routes.filter((route) => isIndexableRoute(route));
  const defaultSite = isDefaultSiteBuild();

  if (onlyForOtherSites && defaultSite) {
    logInfo(
      'Build for the default site — keeping the committed sitemap.xml and robots.txt',
      { siteUrl },
      SOURCE,
    );
    return;
  }

  // Without git we cannot date the routes. For the default site, rather than
  // regenerate a sitemap whose every <lastmod> is missing, keep the committed
  // one — it was produced by a checkout that did have git. This is the normal
  // case inside Docker, where .dockerignore excludes .git. Another site gets a
  // sitemap without dates: one listing klassenplan.de would be worse.
  if (!(await isGitAvailable()) && defaultSite && (await sitemapExists())) {
    await updateRobots(siteUrl);
    logWarn(
      'git unavailable — keeping the committed sitemap.xml',
      { sitemapPath },
      SOURCE,
    );
    return;
  }

  const xml = await toXml(routes, siteUrl);
  await fs.writeFile(sitemapPath, xml, 'utf-8');
  await updateRobots(siteUrl);
  logInfo(
    'Sitemap generated',
    {
      entries: indexable.length * LANGUAGES.length,
      excluded: routes.length - indexable.length,
      languages: LANGUAGES,
      outputPath: sitemapPath,
      siteUrl,
    },
    SOURCE,
  );
}

generate().catch((error) => {
  const errorContext =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Failed to generate sitemap', errorContext, SOURCE);
  process.exitCode = 1;
});
