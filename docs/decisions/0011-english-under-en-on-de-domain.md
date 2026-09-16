# 0011 – English under `/en` on the `.de` domain

- **Status:** accepted
- **In place since:** v1.3.0 (2026-01-04); the gTLD question was deferred later;
  the path alone decides the language since v2.1.1 (2026-09-16)
- **Sources:** [SEO.md](../SEO.md#internationalisation),
  [SEO.md](../SEO.md#known-limitation-the-de-cctld),
  [PERFORMANCE.md](../PERFORMANCE.md#start-page-load),
  `languageForPath` in `src/i18n/i18n.ts`, [CHANGELOG.md](../CHANGELOG.md)

## Context

German is the primary language; the app became fully bilingual in v1.3.0.
`klassenplan.de` is a country-code domain, which Google geotargets to Germany
without a way to override it.

## Decision

- German uses no URL prefix, English lives under `/en`.
- The path alone decides the language, before the first render
  (`languageForPath` in `src/i18n/i18n.ts`, applied again after navigation by
  `LanguageWrapper` in `src/App.tsx`). No preference is stored and the browser
  language is not consulted. Until v2.1.1 i18next-browser-languagedetector
  picked the start language from localStorage or the browser; its cached
  `de-DE` failed the check for `de`, so a first visit rendered German pages in
  English for a frame and loaded the English bundle for nothing.
- Every page declares `hreflang` for `de`, `en` and `x-default`; `x-default`
  points at English, because it only applies to visitors whose language matches
  neither.
- Impressum and Datenschutz are published in German only, as German law
  requires, and say so in their English titles.

## Alternatives considered

- **Serving the English version from a generic top-level domain**, joined to
  `.de` through hreflang. Considered and deliberately deferred.

## Consequences

English pages are indexable and correctly annotated, but the geotargeting
handicap remains: realistic in English are long-tail queries, brand searches and
AI crawlers, not competitive head terms.
