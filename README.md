# Klassenplan

A web-based tool for creating seating plans and seating circles for teachers. Klassenplan combines a multi-step wizard, a constraint-based shuffle algorithm, and an SVG-based classroom editor.

**100 % local** – no accounts, no server, all data stays in the browser. Optionally installable as a PWA and usable offline.

**Tech stack:** React 19 · Vite 8 · TypeScript (strict) · Tailwind CSS 4 · Zustand · XState · IndexedDB · i18next (DE/EN)

## Features

- **Class management** for any number of classes, each with its own seating plans and shuffle history
- **Classroom editor** with drag-and-drop, grid, multi-select, keyboard control, and touch optimization
- **Constraint-based shuffle algorithm** with weighted criteria, locked seats, distance and preferred-partner logic
- **Seating circle mode** with its own export view and synchronization from the table layout
- **Presentation mode** for smartboards and projectors with teacher/student perspective, pan & zoom, and pinch gestures
- **Optional student photos** — stored locally only, automatically downscaled with metadata (EXIF/GPS) stripped
- **Backup & restore** in encrypted JSON format (AES-GCM, password-protected) for moving between devices
- **Bilingual** (German/English) with full i18n coverage
- **Accessible** with full keyboard control, screen-reader support, focus management, and responsive layout

## Prerequisites

- Node.js ≥ 24
- npm ≥ 10.9

## Installation & start

```bash
npm install
npm run dev
```

Dev server: <http://localhost:5173>

## Key scripts

| Script                                      | Description                                            |
| ------------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                               | Vite dev server                                        |
| `npm run build`                             | Production bundle (incl. sitemap generation)           |
| `npm run preview`                           | Local preview of the build artifact                    |
| `npm test`                                  | Vitest in watch mode                                   |
| `npm run test:e2e`                          | Playwright end-to-end tests                            |
| `npm run lint` · `typecheck:all` · `format` | ESLint, TypeScript strict mode (app + tests), Prettier |

Recommended before commits: `npm test -- --run && npm run lint && npm run typecheck:all && npm run format`.

## Deployment

A production-ready [`Dockerfile`](Dockerfile) (multi-stage build with nginx) ships with the repository. Release tags publish a multi-arch image (amd64/arm64) to GitHub Container Registry:

```bash
docker pull ghcr.io/sireckehard/klassenplan:latest
```

The easiest way to run it is via [`docker-compose.yml`](docker-compose.yml):

```bash
docker compose up -d           # uses the published image, serves on port 8080
docker compose up -d --build   # builds from this repository instead
```

TLS terminates upstream — put a reverse proxy in front. When building for a host other than klassenplan.de, set `SITE_URL` (baked into canonical/hreflang/og:url at build time): `SITE_URL=https://example.org docker compose up -d --build`.

The static bundle produced by `npm run build` can alternatively be served on any static host (Vercel, Netlify, GitHub Pages, your own web server).

## Project structure

The app follows a modular structure with clear separation between UI (`components/`, `pages/`), state (`contexts/`, `stores/`, `stateMachines/`), persistence (`repositories/`), and domain logic (`utils/`, `services/`, `workers/`). Imports use the `@/…` alias. See [docs/MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) for details.

## Documentation

Further details in the [`docs/`](docs/) folder:

- [ALGORITHM.md](docs/ALGORITHM.md) – Shuffle algorithm & constraint system
- [PEDAGOGY.md](docs/PEDAGOGY.md) – Pedagogical background of the criteria
- [DESIGNSYSTEM.md](docs/DESIGNSYSTEM.md) – Design tokens & component guidelines
- [MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) – Module API & import guidelines
- [ERROR-HANDLING.md](docs/ERROR-HANDLING.md) – Error handling & result pattern
- [LOGGING.md](docs/LOGGING.md) – Logging & debug mode
- [PERFORMANCE.md](docs/PERFORMANCE.md) – Measurements & optimizations
- [SECURITY.md](docs/SECURITY.md) – Security guidelines, CSP & deployment headers
- [backup-format.md](docs/backup-format.md) – Backup file format & encryption
- [canvas-interactions.md](docs/canvas-interactions.md) – Canvas interaction state machines
- [CHANGELOG.md](docs/CHANGELOG.md) – Release history

## Contributing

Contributions are welcome – please open issues and pull requests on GitHub. Before opening a PR, run the checks listed above (`lint`, `typecheck`, `test`) locally.

## License

GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later) – see [LICENSE](LICENSE).

Copyright (C) 2026 Eike Schäfer. Klassenplan is free software: you can redistribute it and/or modify it under the terms of the AGPL. Note that the AGPL's network clause (§13) applies – if you run a modified version on a server, you must make the corresponding source code available to its users.
