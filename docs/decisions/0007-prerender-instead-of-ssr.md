# 0007 – Prerendered HTML instead of server-side rendering

- **Status:** accepted
- **Sources:** [SEO.md](../SEO.md)

## Context

Klassenplan is a client-rendered single-page app. nginx answered every URL with
the same `index.html`, which declares German, the German title and the home page
as canonical. Crawlers that do not run JavaScript — Bing, DuckDuckGo, social
preview bots, AI crawlers — therefore saw every page as a duplicate of the
German home page, and the English pages canonicalised themselves out of the
index.

## Decision

`npm run build:static` renders every route in both languages in Chromium and
writes the result to `dist/<path>/index.html`; `verify:prerender` fails the build
when the output lacks per-route metadata. nginx serves those files without any
configuration change. Canonical URLs come from the build-time `SITE_URL`.

## Alternatives considered

- **Server-side rendering.** It needs a server at runtime, while the app is
  delivered as static files ([0001](0001-offline-first-no-server.md)).
- **Prerendering as a `postbuild` hook.** Rejected so that `npm run build` keeps
  working on machines without Chromium.
- **Deriving canonical URLs from `window.location.origin`.** Rejected:
  prerendering runs against `localhost` and previews run on staging hosts, both
  of which would end up in canonical, hreflang and `og:url`.

## Consequences

- The Docker build stage runs on Debian, because Playwright does not support
  Alpine.
- HTML must never be precompressed, or nginx would serve the stale shell from
  before prerendering.
- Route chunks are preloaded before the first render so the prerendered page
  does not flash a loading skeleton.
