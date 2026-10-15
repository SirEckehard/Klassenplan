# 0029 – One address per page

- **Status:** accepted
- **In place since:** not yet released
- **Sources:** [SEO.md](../SEO.md#one-address-per-page), `nginx.conf`,
  `scripts/prerender.mjs`, `scripts/verify-prerender.mjs`,
  `scripts/check-live-seo.mjs`; Search Console report of 2026-10-10
  ("Seite mit Weiterleitung" 10 pages, "Alternative Seite mit richtigem
  kanonischen Tag" 8 pages, both validations failed)

## Context

Every route is prerendered into `dist/<path>/index.html`
([decision 0007](0007-prerender-instead-of-ssr.md)). nginx found those files
through `try_files $uri $uri/ /index.html`, and on a directory the `$uri/`
branch answers `/faq` with a 301 to `/faq/`. The canonical, the hreflang
links, the sitemap, the speculation rules and every link in the app name
`/faq`. Google therefore crawled each listed address as a redirect, found the
slash variant declaring `/faq` canonical, and filed the one under "Seite mit
Weiterleitung" and the other under "Alternative Seite". Its validation failed,
because the redirects were still there. The prefetches of the speculation
rules ended at the same 301.

Two more spellings answered with content: `www.klassenplan.de` served every
page with status 200, and an address no route renders returned the start page
with 200 — a soft 404 that declared itself a copy of `/`. Plain `http://` moved
to `https://` with a temporary 302.

## Decision

A page has exactly one address: the canonical origin, no trailing slash
(`https://klassenplan.de/faq`, `https://klassenplan.de/en`; the start page is
`/`). Every other spelling moves there with a permanent redirect, and an
address that is no page is a 404.

- `nginx.conf` serves `<path>/index.html` for `/<path>` itself (the named
  location `@page`, which carries the HTML headers), redirects `/<path>/` to
  `/<path>` with a 301, and answers every other address with `dist/404.html`
  and status 404.
- `scripts/prerender.mjs` renders the "not found" page into `dist/404.html`;
  `scripts/verify-prerender.mjs` fails the build when it is missing, indexable
  or the start page.
- The reverse proxy in front of nginx, which terminates TLS, moves `http://`
  to `https://` and `www.` to the bare domain with a permanent redirect. It is
  not part of this repository; [SEO.md](../SEO.md#one-address-per-page) states
  what it must do.
- `npm run check:live-seo` checks the deployed site against these rules.

## Alternatives considered

- **Trailing slash as the canonical form** (`/faq/`): nginx would need no
  change, but the canonical, the hreflang links, the sitemap, the speculation
  rules, `LocalizedLink` and every address Google already knows would have to
  move instead. Not taken.
- **Writing `dist/faq.html` instead of `dist/faq/index.html`**: equivalent for
  nginx, but every other static host and the build scripts expect the
  directory form. Not taken.
- **Keeping the SPA fallback to `/index.html` for unknown addresses**: all
  routes are prerendered, so the fallback only ever served the start page under
  a wrong address. The service worker still answers navigations it controls
  with its precached shell, which renders the app's own "not found" page.

## Consequences

- Addresses do not change; only the redirects that contradicted them go away.
  Search Console keeps listing the `http://` and `www.` spellings under "Seite
  mit Weiterleitung" — correctly, so that report's validation will still fail
  for them; it is a report of redirects, not of errors.
- A mistyped or outdated address now gets a 404 instead of the start page.
  `/plaene`, the name "Bibliothek" had during development, was never released.
- An operator behind another proxy has to set up the host and scheme redirects
  there as well.
