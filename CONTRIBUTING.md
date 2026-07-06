# Contributing to Klassenplan

Thanks for your interest in improving Klassenplan! Contributions of all kinds —
bug reports, feature ideas, and pull requests — are welcome.

## Getting started

- Node.js ≥ 24 and npm ≥ 10.9 are required (see `package.json` → `engines`).
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
npm run format
```

## Guidelines

- Keep changes focused — one logical change per pull request.
- Match the existing code style (TypeScript strict, ESLint, Prettier).
- Update or add tests for behavioural changes.
- The app is bilingual: every new or changed UI text needs keys in **both**
  `src/i18n/locales/de/` and `src/i18n/locales/en/`. User-facing strings never
  live in `src/utils` — use i18n keys there instead.
- For architectural context, see the docs in `docs/` (start with
  [`docs/MODULE_BOUNDARIES.md`](docs/MODULE_BOUNDARIES.md) and
  [`docs/DESIGNSYSTEM.md`](docs/DESIGNSYSTEM.md)).

## Reporting security issues

Please do **not** open public issues for security vulnerabilities. See
[`docs/SECURITY.md`](docs/SECURITY.md) for responsible-disclosure contact details.

## License

By contributing, you agree that your contributions will be licensed under the
project's [AGPL-3.0-or-later](LICENSE) license.
