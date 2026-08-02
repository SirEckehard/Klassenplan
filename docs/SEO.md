# SEO

Klassenplan is a client-rendered SPA. Everything a crawler needs — title,
description, `<html lang>`, canonical, hreflang, JSON-LD and the page copy
itself — is produced by React at runtime. To make that visible to crawlers, the
build prerenders every route into a static HTML file.

## Why prerendering exists

`nginx` resolves unknown paths with `try_files $uri $uri/ /index.html`. Before
prerendering, that meant **all 22 URLs served the same `index.html`**, which
hardcodes `<html lang="de">`, the German title, and
`<link rel="canonical" href="https://klassenplan.de/">`.

Any crawler that does not execute JavaScript — Bing, DuckDuckGo, social preview
bots, and the AI crawlers explicitly welcomed in `robots.txt` — therefore saw
every page declare itself a duplicate of the German home page. The English pages
canonicalised themselves out of the index.

`scripts/prerender.mjs` renders each route in a real Chromium and writes the
result to `dist/<path>/index.html`. nginx picks those up through the `$uri/`
branch of `try_files`; no server configuration change was needed.

## Build pipeline

| Command                    | What it does                                                 |
| -------------------------- | ------------------------------------------------------------ |
| `npm run build`            | Plain Vite build. No browser required.                       |
| `npm run prerender`        | Renders all routes × languages into `dist/`. Needs Chromium. |
| `npm run verify:prerender` | Asserts the output really carries per-route metadata.        |
| `npm run build:static`     | All three, in order. **This is what Docker and CI run.**     |

`prebuild` still regenerates `public/sitemap.xml` and `public/robots.txt` before
the Vite build.

Prerendering is deliberately _not_ a `postbuild` hook: `npm run build` must stay
usable on a machine without Chromium.

### Chromium

`scripts/prerender.mjs` drives Playwright's Chromium. Install it once locally
with `npx playwright install chromium`. The Docker builder stage runs on
`node:24-bookworm-slim` rather than Alpine, which Playwright does not support.

## Single source of truth

`src/data/seoRoutes.json` holds every route with its German and English title,
description, `changefreq`, `priority`, `ogType` and optional `noindex`. It feeds:

- `src/utils/seo/routeMetadata.ts` → `usePageSeo()` → `<Seo>` at runtime
- `scripts/generate-sitemap.mjs` (sitemap entries)
- `scripts/prerender.mjs` and `scripts/verify-prerender.mjs` (which URLs to render and check)

Shared route/language helpers live in `scripts/utils/seoRoutes.mjs` so the
sitemap and the prerendered files cannot drift apart.

### German-only routes

`/impressum` and `/datenschutz` are published in German only, as German law
requires. Their `titleEn`/`descriptionEn` therefore say so explicitly
("Legal Notice (German)"), rather than promising an English translation that
the page does not deliver — the pages themselves already show a banner to that
effect. They stay indexed and keep their hreflang pair: the content is relevant
to English-speaking visitors, it is simply not in their language.

## Canonical origin

`SITE_URL` (default `https://klassenplan.de`) is injected into the bundle at
build time via `define` in `vite.config.ts` and read by `Seo.tsx`.

It must **not** be derived from `window.location.origin`: prerendering runs
against `http://localhost:4173`, and preview deploys run on staging hosts. Both
would otherwise be baked into canonical, hreflang and `og:url`.

A build for a staging host must set `SITE_URL` accordingly.

## Things that will silently break prerendering

These are covered by `scripts/verify-prerender.mjs`, which fails the build.

1. **Precompressed HTML.** nginx serves `.br` files first (`brotli_static on`).
   If `vite-plugin-compression` were allowed to compress HTML, it would emit
   `index.html.br` from the _pre-prerender_ shell and nginx would serve that
   stale copy to every Brotli-capable client. HTML is excluded from the plugin's
   `filter`; nginx compresses it on the fly instead.
2. **Absolute preview URLs.** Vite's dynamic-import preload helper and
   `addPrefetchHint()` write absolute hrefs, so the captured DOM carries
   `http://localhost:4173/...`. `prerender.mjs` rewrites the preview origin to
   root-relative paths before writing.
3. **An empty `#root`.** If the readiness probe were weakened, a page could be
   written as a bare shell without anyone noticing.

## Rendering without a flash

`createRoot` discards the prerendered DOM and re-renders. Because routes are
lazy, the user would see content → loading skeleton → content, worth roughly
300 ms and a large layout shift.

`React.lazy` suspends on its first render even when the module is already in the
ESM cache — it only reads the settled promise on a later microtask. Preloading
the chunk is therefore not enough on its own.

`lazyWithRetry()` (`src/utils/performance/lazyWithRetry.tsx`) returns a component
with a `preload()` method that caches the module and renders it **synchronously**
on the next mount. `src/index.tsx` awaits `preloadRoute(...)` for the current
route — and, on `/en/*`, the English bundle — before calling `createRoot`.

The router and the preloader must share the same component instances, which is
why they both import from `src/pages/lazyPages.ts`.

Measured on the start page: CLS improved from 0.1018 to 0.0666, and the skeleton
no longer appears on initial mount. Routes that were not preloaded (e.g. 404)
still use the Suspense fallback as before.

## Internationalisation

German is the default language and uses no URL prefix; English lives under
`/en`. Each page emits `hreflang` for `de`, `en` and `x-default`.

`x-default` points at the **English** version. It only applies to visitors whose
language matches no `hreflang` entry — German speakers are already served by
`hreflang="de"` — so English is the more useful landing page for everyone else.

## `noindex`

Set `"noindex": true` on a route in `seoRoutes.json`. The route is then:

- rendered with `<meta name="robots" content="noindex,follow">`
- excluded from `sitemap.xml`
- still prerendered, so canonical and hreflang stay consistent

`/present` is marked this way: without a saved plan it renders only an empty
state ("Noch kein Sitzplan zum Präsentieren"), which has no business in the
index.

## Sitemap `lastmod`

`<lastmod>` is the date of the last commit touching a route's source files
(`ROUTE_SOURCES` in `scripts/generate-sitemap.mjs`), not the build timestamp.
Google discounts `lastmod` once it looks unreliable, and one identical timestamp
across every URL is exactly that.

When git is unavailable the committed `public/sitemap.xml` is kept as-is rather
than regenerated without dates. This is the normal case inside Docker, where
`.dockerignore` excludes `.git`.

## Known limitation: the `.de` ccTLD

`klassenplan.de` is a country-code TLD. Google geotargets it to Germany, and
that cannot be overridden in the Search Console — the setting is disabled for
ccTLDs.

Prerendering makes the English pages indexable and correctly annotated, which is
the precondition for ranking at all. It does not remove the geotargeting
handicap. Realistically achievable in English: longtail queries, brand searches,
and visibility to AI crawlers. Competitive US/UK head terms such as "seating
chart generator" remain unlikely on a `.de` domain.

Lifting that ceiling would require serving the English version from a gTLD
(joined to `.de` via hreflang). That was considered and deliberately deferred.

## After a deploy

1. Search Console → URL inspection for `https://klassenplan.de/en/faq`. The
   "user-declared canonical" must read `/en/faq`, not `/`.
2. `npm run indexnow:ping` (requires `INDEXNOW_KEY`) to notify Bing.

## Checking the raw HTML

Use "View source", not the DevTools inspector — the inspector shows the rendered
DOM and will look correct either way.

```bash
npm run build:static
grep -o 'rel="canonical"[^>]*' dist/en/faq/index.html
```
