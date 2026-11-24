# 0048 – The published image takes its operator when it starts

- **Status:** accepted
- **In place since:** v3.4.1 (2026-11-19)
- **Sources:** the review "Schneller, leichter, einfacher" of 2026-11-17
  (E1, chosen by the maintainer on 2026-11-18),
  [decision 0012](0012-legal-pages-for-self-hosted-builds.md),
  `scripts/configure-instance.sh`, `scripts/docker-entrypoint.sh`,
  `scripts/prerender.mjs` (`captureForwardingPages`, `writeInstanceInfo`),
  `src/config/legalPages.ts`, `src/pages/lazyPages.ts`,
  `src/__tests__/configureInstance.test.ts`

## Context

Whoever publishes an instance needs their own Impressum, Datenschutzerklärung
and contact address, and the instance's own address in its canonical links.
[Decision 0012](0012-legal-pages-for-self-hosted-builds.md) bakes all four in
at build time, so the published image could not be configured: an operator
had to build it — `npm ci`, Chromium with its system packages and the
prerender of every page, minutes and gigabytes, hard on a small server or a
Raspberry Pi.

0012 rejected configuration at start because the pages are prerendered:
klassenplan.de's texts would sit in the HTML until JavaScript replaced them,
and every page load would need an extra request for the configuration.

## Decision

The image is built as before, for klassenplan.de, and gives a copy of the
build its operator each time it starts: `docker-entrypoint.sh` copies the
unchanged build from `/usr/share/klassenplan/site` to nginx's root and runs
`configure-instance.sh` on it with `SITE_URL`, `IMPRINT_URL`, `PRIVACY_URL`
and `CONTACT_EMAIL` from the environment. The script changes the files
themselves, so neither of 0012's objections applies:

- **The address** replaces the build's own (`https://klassenplan.de`) in every
  text file — wherever a build names it, it means "this site": canonical,
  hreflang, Open Graph, structured data, sitemap, robots, `llms.txt`.
- **The contact** replaces the build's own everywhere but in klassenplan.de's
  Impressum and Datenschutzerklärung, which stay the maintainer's pages where
  they are still served.
- **A legal page** set by URL: the bundle holds a placeholder for it that
  means "none" (`LEGAL_PAGE_URL_TOKENS`, read by a pattern the minifier
  cannot fold), and the route chooses its module at runtime
  (`lazyPages.ts`), so klassenplan.de's page is never loaded once the script
  has put the URL in. The prerender draws the forwarding pages from a copy of
  the bundle with a placeholder URL and leaves them in `dist/.instance/` with
  the build's own values (`build.env`); the script puts them in place of
  klassenplan.de's pages, so no HTML shows their texts, and drops the page
  from the sitemap.

Values that could leave an HTML attribute or a JavaScript string are refused,
not escaped. A changed file loses its precompressed copies; nginx compresses
it as it serves it. Unset, every variable keeps the build's value, and a start
without any leaves the build byte for byte as it was. The release archive of
every version (`klassenplan-X.Y.Z.tar.gz`, `deploy/README.md`) is that build
with the same script, for a web server without Docker.

Build arguments stay: a build given `IMPRINT_URL` or `PRIVACY_URL` still
aliases klassenplan.de's pages away (0012) and forwards on its own; the script
then accepts the same URL and refuses another.

## Alternatives considered

- **Placeholders for every value, filled at start.** Precise, but the build
  would not work until a script ran — not on `vite preview`, not from a plain
  copy of `dist/`. Only the legal URLs, whose absence the bundle can read,
  are placeholders.
- **A configuration file fetched at runtime** (`/instance.json`) or a
  same-origin script. Rejected in 0012 and still: an extra request on every
  load, and the prerendered HTML would still carry klassenplan.de's texts.
- **Prerendering at start.** Needs Chromium in the image, what this decision
  takes out of the operator's way.
- **Keeping the build-time configuration only.** The obstacle the review
  found: the published image could not serve anybody's own instance.

## Consequences

- An operator sets four variables on `docker run` or in the compose file; no
  build of their own. The build arguments still exist for whoever wants
  klassenplan.de's texts out of the bundle entirely.
- klassenplan.de's two legal page chunks stay in such a container's files,
  never linked and never loaded. A build with the arguments still leaves them
  out.
- A start copies 17 MB and passes over the text files: about three seconds
  with every variable set, on a laptop. A value changed later reaches
  browsers with a service worker at the next release, when their precache is
  renewed — set the variables before teachers start working.
- Prerendered pages for another address no longer need their own build; the
  sitemap's `lastmod` stays klassenplan.de's.
- A new place that writes the site's address or the maintainer's contact into
  the build must be one the script reaches: a text file of `dist/`, or a
  placeholder of its own in `.instance/`. A new legal route needs a token, a
  forwarding page and a line in the script.
