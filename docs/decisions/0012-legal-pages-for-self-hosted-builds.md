# 0012 – Operators link their own legal pages at build time

- **Status:** accepted
- **In place since:** v2.1.0 (2026-09-16)
- **Sources:** [PRIVACY.md](../PRIVACY.md#running-your-own-instance), proposal
  agreed with the maintainer on 2026-09-14, `src/config/legalPageUrls.ts`

## Context

Every build from this repository — including the published Docker image —
contains the Impressum and the Datenschutzerklärung of klassenplan.de: the
maintainer's name and address and a description of the hosting at Hetzner. A
school that hosts its own instance would publish those pages as its own, while
it needs an Impressum of its own and a privacy policy that describes its own
hosting.

## Decision

Two optional build variables, `IMPRINT_URL` and `PRIVACY_URL`, name the
operator's own pages. `src/config/legalPageUrls.ts` validates them; anything but
an absolute http(s) URL fails the build.

When a variable is set:

- the footer and the local storage notice link to that page, in a new tab
  (`LegalPageLink`);
- `vite.config.ts` aliases `@/pages/Impressum` or `@/pages/Datenschutz` to a
  forwarding page, so klassenplan.de's text is not part of the bundle;
- the route keeps working and shows a short page that links to the operator's
  page; it is `noindex`, left out of the sitemap, and the prerender verification
  expects exactly that.

Without the variables nothing changes; the published image stays the image of
klassenplan.de.

## Alternatives considered

- **Configuration at container start**, for example a same-origin script
  generated from environment variables, without a rebuild. Rejected: the pages
  are prerendered at build time, so klassenplan.de's texts would still sit in the
  HTML until JavaScript replaces them, and every page load would need an extra
  request.
- **Filling the operator's name and address into the existing pages.** Rejected:
  the rest of the text describes klassenplan.de's hosting and its server logs,
  which does not apply to another instance.
- **Removing the routes in such a build.** Rejected: `/impressum` and
  `/datenschutz` would turn into 404s for anyone who types them.

## Consequences

- An operator has to build the image (`docker compose up -d --build`); the
  published image cannot be reconfigured.
- The operator still writes the privacy policy for their instance, including its
  access logs.
- Links to the legal pages must go through `LegalPageLink`, never a plain
  `LocalizedLink`.
- `build:static` rewrites `sitemap.xml` and `robots.txt` for such a build, so
  neither lists klassenplan.de or a forwarded page
  ([SEO.md](../SEO.md#build-pipeline)).
