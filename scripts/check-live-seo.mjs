// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Checks the deployed site against the addressing rules of decision 0029:
// every page has exactly one address, and every other spelling of it moves
// there for good. Search Console reports a breach weeks later as "Seite mit
// Weiterleitung" or "Alternative Seite mit richtigem kanonischen Tag"; this
// reports it right after a deploy.
//
//   npm run check:live-seo                       # klassenplan.de
//   SITE_URL=https://example.org npm run check:live-seo
//
// By hand, not in CI: it needs the network and checks what is deployed, not
// what is built.
import { logError, logInfo, logWarn } from './utils/logger.mjs';
import { getSiteUrl } from './utils/seoRoutes.mjs';

const SOURCE = 'check-live-seo';
const PERMANENT = new Set([301, 308]);
const MAX_HOPS = 4;
const USER_AGENT =
  'Mozilla/5.0 (compatible; KlassenplanSeoCheck/1.0; +https://klassenplan.de)';

async function request(url) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': USER_AGENT },
  });
  const location = response.headers.get('location');
  return {
    status: response.status,
    location: location ? new URL(location, url).toString() : null,
    body: response.status === 200 ? await response.text() : '',
  };
}

/** Follows redirects by hand so every hop's status can be judged. */
async function follow(url) {
  const hops = [];
  let current = url;
  for (let i = 0; i < MAX_HOPS; i++) {
    const response = await request(current);
    hops.push({ url: current, status: response.status });
    if (!response.location) {
      return { hops, final: current, response };
    }
    current = response.location;
  }
  return { hops, final: current, response: null };
}

function canonicalOf(html) {
  return (
    html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] ??
    null
  );
}

function robotsOf(html) {
  return (
    html.match(
      /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i,
    )?.[1] ?? null
  );
}

function describeHops(hops) {
  return hops.map((hop) => `${hop.status} ${hop.url}`).join(' → ');
}

/** The other host spelling: www.example.org ↔ example.org. */
function alternateHost(siteUrl) {
  const url = new URL(siteUrl);
  url.hostname = url.hostname.startsWith('www.')
    ? url.hostname.slice(4)
    : `www.${url.hostname}`;
  return url.toString().replace(/\/$/, '');
}

async function readSitemapUrls(siteUrl) {
  const response = await request(`${siteUrl}/sitemap.xml`);
  if (response.status !== 200) {
    throw new Error(`sitemap.xml answered ${response.status}`);
  }
  return [...response.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].trim(),
  );
}

async function run() {
  const siteUrl = getSiteUrl();
  const results = [];
  const record = (group, label, ok, detail) =>
    results.push({ group, label, ok, detail });

  // 1. Every address in the sitemap is the page itself: 200, no redirect,
  //    declaring itself canonical and indexable.
  const pages = await readSitemapUrls(siteUrl);
  for (const page of pages) {
    const response = await request(page);
    if (response.status !== 200) {
      record(
        'sitemap',
        page,
        false,
        `answers ${response.status} → ${response.location ?? '–'}`,
      );
      continue;
    }
    const canonical = canonicalOf(response.body);
    const robots = robotsOf(response.body);
    const ok = canonical === page && robots === 'index,follow';
    record(
      'sitemap',
      page,
      ok,
      ok ? '200, canonical self' : `canonical ${canonical}, robots ${robots}`,
    );
  }

  // 2. The trailing-slash spelling of a page moves there for good.
  for (const page of pages) {
    if (new URL(page).pathname === '/') continue;
    const { hops, final } = await follow(`${page}/`);
    const ok =
      final === page &&
      hops.slice(0, -1).every((hop) => PERMANENT.has(hop.status));
    record('slash', `${page}/`, ok, describeHops(hops));
  }

  // 3. The other host and plain http end on the canonical origin, every hop
  //    permanent. A host without DNS is fine — there is nothing to index.
  const home = `${siteUrl}/`;
  const alternate = alternateHost(siteUrl);
  const variants = [
    home.replace(/^https:/, 'http:'),
    `${alternate}/`,
    `${alternate}/`.replace(/^https:/, 'http:'),
    `${alternate}/faq`,
  ];
  for (const variant of variants) {
    try {
      const { hops, final } = await follow(variant);
      const target = variant.endsWith('/faq') ? `${siteUrl}/faq` : home;
      const ok =
        final === target &&
        hops.length > 1 &&
        hops.slice(0, -1).every((hop) => PERMANENT.has(hop.status));
      record('host', variant, ok, describeHops(hops));
    } catch (error) {
      logWarn(
        'Host not reachable, skipped',
        { variant, error: String(error) },
        SOURCE,
      );
    }
  }

  // 4. An address no page has is a real 404, not the start page.
  const missing = `${siteUrl}/gibt-es-nicht-${Date.now()}`;
  const notFound = await request(missing);
  record('404', missing, notFound.status === 404, `answers ${notFound.status}`);

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const log = result.ok ? logInfo : logError;
    log(
      `${result.ok ? 'ok  ' : 'FAIL'} [${result.group}] ${result.label}`,
      { detail: result.detail },
      SOURCE,
    );
  }
  const summary = { checked: results.length, failed: failed.length, siteUrl };
  if (failed.length > 0) {
    logError('Live SEO check failed', summary, SOURCE);
    process.exitCode = 1;
    return;
  }
  logInfo('Live SEO check passed', summary, SOURCE);
}

run().catch((error) => {
  const context =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Live SEO check crashed', context, SOURCE);
  process.exitCode = 1;
});
