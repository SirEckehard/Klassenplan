# 0011 – English under `/en` on the `.de` domain

- **Status:** accepted
- **In place since:** v1.3.0 (2026-01-04); the gTLD question was deferred later
- **Sources:** [SEO.md](../SEO.md#internationalisation),
  [SEO.md](../SEO.md#known-limitation-the-de-cctld), [CHANGELOG.md](../CHANGELOG.md)

## Context

German is the primary language; the app became fully bilingual in v1.3.0.
`klassenplan.de` is a country-code domain, which Google geotargets to Germany
without a way to override it.

## Decision

- German uses no URL prefix, English lives under `/en`.
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
