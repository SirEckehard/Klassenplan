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
  projectRoot,
  publicDir,
  readRoutes,
} from './utils/seoRoutes.mjs';

const execFileAsync = promisify(execFile);
const SOURCE = 'generate-sitemap';
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

// Source files whose last commit determines a route's <lastmod>. seoRoutes.json
// is added to every route so metadata edits move the date too.
const ROUTE_SOURCES = {
  '/': ['src/pages/StartPage.tsx'],
  '/generator': [
    'src/components/SeatingPlanGenerator/SeatingPlanGenerator.tsx',
  ],
  '/export': ['src/pages/Export.tsx'],
  '/present': ['src/pages/Present.tsx'],
  '/impressum': ['src/pages/Impressum.tsx'],
  '/datenschutz': ['src/pages/Datenschutz.tsx'],
  '/feedback': ['src/pages/Feedback.tsx'],
  '/faq': ['src/pages/FAQ.tsx'],
  '/changelog': [
    'src/pages/Changelog.tsx',
    'src/i18n/locales/de/changelog.json',
  ],
  '/support': ['src/pages/Support.tsx'],
};
const SHARED_SOURCES = ['src/data/seoRoutes.json'];

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

/**
 * ISO date of the last commit touching a route's sources, or null when git
 * knows nothing about them. Google discounts <lastmod> once it looks
 * unreliable, so a missing date beats an invented one — which is exactly what a
 * single build timestamp shared by every URL would be.
 */
async function getLastModified(basePath) {
  const files = [...(ROUTE_SOURCES[basePath] ?? []), ...SHARED_SOURCES];
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '-1', '--format=%cI', '--', ...files],
      { cwd: projectRoot },
    );
    return stdout.trim() || null;
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
    // Routes marked noindex carry a noindex meta tag; listing them in the
    // sitemap would send Google contradictory signals.
    if (route.noindex === true) {
      continue;
    }

    const lastmod = await getLastModified(route.path);
    const changefreq = route.changefreq || 'monthly';
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
  const indexable = routes.filter((route) => route.noindex !== true);

  // Without git we cannot date the routes. Rather than regenerate a sitemap
  // whose every <lastmod> is missing, keep the committed one — it was produced
  // by a checkout that did have git. This is the normal case inside Docker,
  // where .dockerignore excludes .git.
  if (!(await isGitAvailable()) && (await sitemapExists())) {
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
