import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const routesPath = path.resolve(projectRoot, 'src', 'data', 'seoRoutes.json');
const publicDir = path.resolve(projectRoot, 'public');
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

// Supported languages
const LANGUAGES = ['de', 'en'];
const DEFAULT_LANG = 'de';

async function readRoutes() {
  const fileContent = await fs.readFile(routesPath, 'utf-8');
  return JSON.parse(fileContent);
}

function getSiteUrl() {
  const fromEnv = process.env.SITE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'https://klassenplan.de';
}

/**
 * Get the localized path for a given route and language.
 * German (de) uses no prefix, English (en) uses /en prefix.
 */
function getLocalizedPath(basePath, lang) {
  if (lang === DEFAULT_LANG) {
    return basePath;
  }
  // For root path, just return /en, otherwise /en/path
  return basePath === '/' ? `/${lang}` : `/${lang}${basePath}`;
}

/**
 * Generate hreflang alternate links for a route.
 */
function generateHreflangLinks(basePath, siteUrl) {
  const links = LANGUAGES.map((lang) => {
    const localizedPath = getLocalizedPath(basePath, lang);
    const href = new URL(localizedPath, siteUrl).toString();
    return `      <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`;
  });

  // Add x-default pointing to German version
  const defaultHref = new URL(basePath, siteUrl).toString();
  links.push(`      <xhtml:link rel="alternate" hreflang="x-default" href="${defaultHref}"/>`);

  return links.join('\n');
}

function toXml(routes, siteUrl) {
  const now = new Date().toISOString();
  const urlEntries = [];

  for (const route of routes) {
    for (const lang of LANGUAGES) {
      const localizedPath = getLocalizedPath(route.path, lang);
      const location = new URL(localizedPath, siteUrl).toString();
      const changefreq = route.changefreq || 'monthly';
      const priority =
        typeof route.priority === 'number' ? route.priority.toFixed(1) : '0.5';
      const hreflangLinks = generateHreflangLinks(route.path, siteUrl);

      urlEntries.push(`    <url>
      <loc>${location}</loc>
      <lastmod>${now}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${priority}</priority>
${hreflangLinks}
    </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;
}

async function ensurePublicDir() {
  await fs.mkdir(publicDir, { recursive: true });
}

async function writeSitemap(xml) {
  await fs.writeFile(sitemapPath, xml, 'utf-8');
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

async function generate() {
  await ensurePublicDir();
  const routes = await readRoutes();
  const siteUrl = getSiteUrl();
  const xml = toXml(routes, siteUrl);
  await writeSitemap(xml);
  await updateRobots(siteUrl);
  logInfo(
    'Sitemap generated',
    {
      entries: routes.length * LANGUAGES.length,
      languages: LANGUAGES,
      outputPath: sitemapPath,
      siteUrl,
    },
    'generate-sitemap',
  );
}

generate().catch((error) => {
  const errorContext =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Failed to generate sitemap', errorContext, 'generate-sitemap');
  process.exitCode = 1;
});

