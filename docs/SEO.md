# SEO

Klassenplan is a client-rendered SPA. Everything a crawler needs — title,
description, `<html lang>`, canonical, hreflang, JSON-LD and the page copy
itself — is produced by React at runtime. To make that visible to crawlers, the
build prerenders every route into a static HTML file.

## Why prerendering exists

`nginx` resolved unknown paths with `try_files $uri $uri/ /index.html`. Before
prerendering, that meant **all 22 URLs served the same `index.html`**, which
hardcodes `<html lang="de">`, the German title, and
`<link rel="canonical" href="https://klassenplan.de/">`.

Any crawler that does not execute JavaScript — Bing, DuckDuckGo, social preview
bots, and the AI crawlers explicitly welcomed in `robots.txt` — therefore saw
every page declare itself a duplicate of the German home page. The English pages
canonicalised themselves out of the index.

`scripts/prerender.mjs` renders each route in a real Chromium and writes the
result to `dist/<path>/index.html`, and the "not found" page to
`dist/404.html`. nginx serves `<path>/index.html` for `/<path>` itself and
`404.html` with status 404 for any address no route renders — see
[One address per page](#one-address-per-page).

## Build pipeline

| Command                    | What it does                                                 |
| -------------------------- | ------------------------------------------------------------ |
| `npm run build`            | Plain Vite build. No browser required.                       |
| `npm run prerender`        | Renders all routes × languages into `dist/`. Needs Chromium. |
| `npm run verify:prerender` | Asserts the output really carries per-route metadata.        |
| `npm run build:static`     | All three, in order. **This is what Docker and CI run.**     |

`npm run build` regenerates `public/sitemap.xml` and `public/robots.txt` in its
`prebuild` step. `build:static` first runs the same script with
`--only-for-other-sites`: klassenplan.de's own build keeps the committed files,
while a build with another `SITE_URL`, or with `IMPRINT_URL` / `PRIVACY_URL`,
rewrites both for its own site.

Prerendering is deliberately _not_ a `postbuild` hook: `npm run build` must stay
usable on a machine without Chromium.

### Chromium

`scripts/prerender.mjs` drives Playwright's Chromium. Install it once locally
with `npx playwright install chromium`. The Docker builder stage runs on
`node:26-bookworm-slim` rather than Alpine, which Playwright does not support.

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

A build with `IMPRINT_URL` or `PRIVACY_URL` replaces the page in question with a
short page that links to the operator's own one. That stand-in is `noindex` and
left out of the sitemap, and `verify:prerender` expects it that way
([decision 0012](decisions/0012-legal-pages-for-self-hosted-builds.md)).

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

## One address per page

Every page has exactly one address: the canonical origin, no trailing slash —
`https://klassenplan.de/faq`, `https://klassenplan.de/en`, the start page `/`.
That is the address the canonical, hreflang, the sitemap, the speculation rules
and every link in the app name, so it must answer 200 itself. Every other
spelling moves there for good, and an address that is no page is a 404
([decision 0029](decisions/0029-one-address-per-page.md)).

| Spelling                       | Answer                               | Where           |
| ------------------------------ | ------------------------------------ | --------------- |
| `https://klassenplan.de/faq`   | 200, canonical to itself             | nginx (`@page`) |
| `https://klassenplan.de/faq/`  | 301 → `/faq`                         | nginx           |
| `https://klassenplan.de/xyz`   | 404, prerendered `404.html`          | nginx (`@page`) |
| `http://klassenplan.de/…`      | 301/308 → `https://…`                | reverse proxy   |
| `https://www.klassenplan.de/…` | 301/308 → `https://klassenplan.de/…` | reverse proxy   |

Until 3.1.2, nginx found the prerendered files through `try_files $uri $uri/`,
whose `$uri/` branch answered `/faq` with a 301 to `/faq/`. Search Console then
listed every address in the sitemap under "Seite mit Weiterleitung" and the
slash variants under "Alternative Seite mit richtigem kanonischen Tag".

### The reverse proxy

TLS terminates in front of nginx, so the scheme and host redirects belong to
that proxy and are not in this repository. It must answer `http://` and the
`www.` host with a **permanent** redirect (301 or 308) straight to
`https://klassenplan.de`, keeping the path. A temporary 302/307 tells Google
to keep the old address. With Traefik, for example:

```yaml
http:
  middlewares:
    to-https:
      redirectScheme: { scheme: https, permanent: true }
    to-apex:
      redirectRegex:
        regex: '^https?://www\.klassenplan\.de/(.*)'
        replacement: 'https://klassenplan.de/${1}'
        permanent: true
```

`to-https` goes on the router for the `web` entry point, `to-apex` on a router
for ``Host(`www.klassenplan.de`)`` on both entry points. Caddy does the scheme
redirect by itself with a 308; the host takes
`www.klassenplan.de { redir https://klassenplan.de{uri} permanent }`.

### Checking it

`npm run check:live-seo` asks the deployed site (`SITE_URL`, default
klassenplan.de): every sitemap address answers 200 and declares itself
canonical and indexable, its slash variant and the `http://` and `www.`
spellings arrive there through permanent redirects only, and an unknown address
is a 404. It needs the network and runs by hand after a deploy, not in CI.

### Search Console

"Seite mit Weiterleitung" and "Alternative Seite mit richtigem kanonischen Tag"
are reports, not errors: they list addresses that correctly point elsewhere.
Their validation fails for as long as such an address exists — which, for
`http://` and `www.`, is forever. What matters is that no address in the
sitemap appears in either report. After a fix, start a validation only for the
report that listed sitemap addresses.

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

`/present`, `/namensspiel` and the classroom tools (`/wer-kommt-dran`,
`/wo-sitzt-wer`, `/gruppen`, `/dienste`) are marked this way: without a class in this
browser they render only an empty state ("Noch kein Sitzplan zum
Präsentieren"), which has no business in the index
([decision 0019](decisions/0019-classroom-tools-as-routes.md)). So is
`/bibliothek`, "Bibliothek", which lists what this browser keeps and nothing
else ([decision 0024](decisions/0024-rooms-of-a-class.md)). And so is `/export`:
the sheet shows the plan this browser keeps, and a crawler meets only "Noch
kein Sitzplan gemischt" — Search Console listed `/en/export` as "Gecrawlt –
zurzeit nicht indexiert" while it stood in the sitemap.

## Sitemap `lastmod`

`<lastmod>` is the date of the last commit that changed what a route shows
(`ROUTE_SOURCES` in `scripts/generate-sitemap.mjs`), not the build timestamp.
Google discounts `lastmod` once it looks unreliable, and one identical timestamp
across every URL is exactly that.

A route is dated by its own sources only: its page and components, its own
subtree of a translation file in both languages (`pages.json` → `faq` for the
FAQ — the file holds the copy of several pages), and the title and description
of its own entry in `seoRoutes.json`. Until 3.1.2 the whole `seoRoutes.json`
counted for every route, so adding `/dienste` dated 14 of 18 addresses to the
same minute. Shared chrome — header, footer, page frame — is left out: it is on
every page and changes none of them.

The committed `public/sitemap.xml` is what klassenplan.de serves (the Docker
build has no git), so its dates move only when it is regenerated and committed —
`npm run generate:sitemap` before a release that changed a page's content.

When git is unavailable — the normal case inside Docker, where `.dockerignore`
excludes `.git` — klassenplan.de's own build keeps the committed
`public/sitemap.xml` rather than regenerating it without dates. A build for
another site regenerates it anyway and leaves `<lastmod>` out: a sitemap without
dates is better than one that lists klassenplan.de.

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

1. `npm run check:live-seo` — every check passes.
2. Search Console → URL inspection for `https://klassenplan.de/en/faq`. The
   "user-declared canonical" must read `/en/faq`, not `/`.
3. `npm run indexnow:ping` (requires `INDEXNOW_KEY`) to notify Bing.

## Checking the raw HTML

Use "View source", not the DevTools inspector — the inspector shows the rendered
DOM and will look correct either way.

```bash
npm run build:static
grep -o 'rel="canonical"[^>]*' dist/en/faq/index.html
```
