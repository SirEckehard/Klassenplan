# Contributing to Klassenplan

Thanks for your interest in improving Klassenplan! Contributions of all kinds —
bug reports, feature ideas, and pull requests — are welcome.

## Getting started

- Node.js ≥ 26 and npm ≥ 10.9 are required (see `package.json` → `engines`).
- Install dependencies and start the dev server:

  ```bash
  npm install
  npm run dev
  ```

## Before opening a pull request

Please run the local checks and make sure they pass:

```bash
npm test -- --run
npm run lint
npm run typecheck:all
npm run check:i18n
npm run check:unused
npm run check:docs
npm run check:licenses
npm run format
```

CI runs the same checks plus the Playwright specs and a full static build, so a
green local run is a good predictor.

## Guidelines

- Keep changes focused — one logical change per pull request.
- Match the existing code style (TypeScript strict, ESLint, Prettier).
- Update or add tests for behavioural changes.
- The app is bilingual: every new or changed UI text needs keys in **both**
  `src/i18n/locales/de/` and `src/i18n/locales/en/`. User-facing strings never
  live in `src/utils` — use i18n keys there instead.
- For architectural context, see the docs in `docs/` (start with
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), then
  [`docs/MODULE_BOUNDARIES.md`](docs/MODULE_BOUNDARIES.md) and
  [`docs/DESIGNSYSTEM.md`](docs/DESIGNSYSTEM.md)).
- Some changes need a short decision record before the code: a new stored
  format, new personal data, different seating results for the same input, a
  changed route, a looser CSP or a hard-to-replace dependency. The list and the
  template are in [`docs/decisions/`](docs/decisions/README.md).

## Reporting security issues

Please do **not** open public issues for security vulnerabilities. See
[`docs/SECURITY.md`](docs/SECURITY.md) for responsible-disclosure contact details.

## Licence and the CLA

Klassenplan is published under the [AGPL-3.0-or-later](LICENSE). Before a pull
request can be merged, its author accepts the
[Contributor Licence Agreement](CLA.md) by ticking its box in the pull request
description; the template contains it, and the check in
`.github/workflows/cla.yml` waits for it. Bots and the maintainer are exempt.

In short: you keep the copyright in your contribution and give the maintainer a
non-exclusive licence to publish it under the AGPL and under other terms as
well, for example in an app store. In return, your contribution stays available
under the AGPL or another open-source licence. Contributing on behalf of your
employer or another organisation? Write to webmaster@klassenplan.de first.
