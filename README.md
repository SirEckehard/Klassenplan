# Klassenplan

A web-based tool for creating seating plans and seating circles for teachers. Klassenplan combines a workspace of three layers – class, room, plan – with a constraint-based mixing algorithm and an SVG-based classroom editor.

**100 % local** – no accounts, no server, all data stays in the browser. Optionally installable as a PWA and usable offline.

**Tech stack:** React 19 · Vite 8 · TypeScript (strict) · Tailwind CSS 4 · Zustand · XState · IndexedDB · i18next (DE/EN)

## Features

- **Class management** for any number of classes, each with its own rooms – the classroom, the lab – and the plans and mixes made in them
- **Library** that shows classes, rooms, plans, recent mixes, neighbourhoods and room templates as folders in columns
- **Inspector** in which a student, several ticked students, a table or a room element is edited; an attribute mode asks one question of the whole class at once
- **CSV import** for class lists, including the exports of WebUntis, Schulmanager Online and SchILD-NRW
- **Classroom editor** with drag-and-drop, grid, multi-select, keyboard control, and touch optimization
- **Constraint-based mixing algorithm** with sixteen criteria set in words and presets, locked seats, distance and preferred-partner logic, and the plans already used kept apart – detected or marked by hand
- **Seating circle mode** with its own export view and alignment with the table layout
- **Presentation mode** for interactive whiteboards and projectors with teacher/student perspective, a contrast mode, pan & zoom, and pinch gestures
- **Export** as PDF, PNG or SVG, or straight to the printer – the seating plan, the seating circle, and a note list with room to write beside every name
- **Class tools** – "Who's next?", "Where does who sit?", "Build groups", "Hand out duties" and a name game – each a screen of its own
- **Optional student photos** — stored locally only, automatically downscaled with metadata (EXIF/GPS) stripped
- **Backup & restore** as an encrypted `.klassenplan` file (AES-GCM, password-protected) for moving between devices
- **Bilingual** (German/English) with full i18n coverage
- **Accessible** with full keyboard control, screen-reader support, focus management, and layouts for desktop, tablet, phone and interactive whiteboard

## Prerequisites

- Node.js ≥ 26
- npm ≥ 10.9

## Supported browsers

Chrome and Edge from version 111, Safari from 16.4 and Firefox from 128 — what Tailwind CSS 4 requires; the bundle targets current browsers only. Many interactive whiteboards run an old built-in Android browser: there Chrome or Edge on the board's PC is the way. An older browser gets a notice in German or English instead of a blank page (`public/browser-check.js`).

## Installation & start

```bash
npm install
npm run dev
```

Dev server: <http://localhost:3000> (the port is set in `vite.config.ts`; Playwright starts its own on 5173).

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

A production-ready [`Dockerfile`](Dockerfile) (multi-stage build with nginx) ships with the repository. Release tags publish a multi-arch image (amd64/arm64) to GitHub Container Registry. One command starts it on port 8080:

```bash
docker run -d --name klassenplan -p 8080:80 --restart unless-stopped ghcr.io/sireckehard/klassenplan:3.4
```

Tags follow the release: `3.4.0` and `3.4` pin a version, `latest` always tracks the newest release. To set variables and update with one command, use [`docker-compose.yml`](docker-compose.yml):

```bash
docker compose up -d           # uses the published image, serves on port 8080
docker compose pull && docker compose up -d   # update to the current image
docker compose up -d --build   # builds from this repository instead
```

The compose file reads these optional variables from a `.env` file next to it (see [`.env.example`](.env.example)); with `docker run`, pass them as `-e NAME=value`. The image applies them each time it starts ([decision 0048](docs/decisions/0048-instance-configured-at-start.md)), so the published image serves your own instance without a build of your own:

| Variable                     | Default                  | Effect                                                                  |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `SITE_URL`                   | `https://klassenplan.de` | The address the instance is served under: canonical, hreflang, sitemap  |
| `IMPRINT_URL`, `PRIVACY_URL` | empty                    | Your own Impressum and Datenschutzerklärung instead of klassenplan.de's |
| `CONTACT_EMAIL`              | empty                    | Your contact address for the contact page and the error reports         |
| `KLASSENPLAN_VERSION`        | `latest`                 | Compose only: pins the image tag, e.g. `3.4.0`                          |
| `KLASSENPLAN_PORT`           | `8080`                   | Compose only: host port the container is published on                   |

TLS terminates upstream — put a reverse proxy in front. Serve it over HTTPS: browsers install the app and let it work offline only on a secure address.

**Publishing your own instance?** Set `IMPRINT_URL`, `PRIVACY_URL` and `CONTACT_EMAIL`. Without the first two the instance shows the legal pages of klassenplan.de, including the maintainer's address; without the third your users' bug reports go to that maintainer too — see [PRIVACY.md](docs/PRIVACY.md#running-your-own-instance). Given as build arguments instead (`docker build --build-arg IMPRINT_URL=…`), klassenplan.de's legal texts stay out of the bundle altogether.

**Without Docker.** Every release carries `klassenplan-X.Y.Z.tar.gz`: the site as the image serves it, the script that gives it your address, legal pages and contact, and configurations for Caddy, Apache and nginx — for a school server, a NAS or a Raspberry Pi with a web server of its own ([deploy/README.md](deploy/README.md)). Built from the repository, the same site is `npm run build:static` (prerendered pages, needs Chromium); a plain `npm run build` has no file per page, so a reload on any page but the start page needs a rewrite to `index.html` on the server.

## Project structure

The app follows a modular structure with clear separation between UI (`components/`, `pages/`), state (`contexts/`, `stores/`, `stateMachines/`), persistence (`repositories/`), and domain logic (`utils/`, `services/`, `workers/`). Imports use the `@/…` alias. See [docs/MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) for details.

## Documentation

Further details in the [`docs/`](docs/) folder:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) – Goals, non-goals, scenarios and how the parts fit together (start here)
- [ALGORITHM.md](docs/ALGORITHM.md) – Shuffle algorithm & constraint system
- [PEDAGOGY.md](docs/PEDAGOGY.md) – Pedagogical background of the criteria
- [UI.md](docs/UI.md) – The interface: shell, layers, inspector, status bar and their rules
- [DESIGNSYSTEM.md](docs/DESIGNSYSTEM.md) – Design tokens & component guidelines
- [MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) – Module API & import guidelines
- [ERROR-HANDLING.md](docs/ERROR-HANDLING.md) – Error handling & result pattern
- [LOGGING.md](docs/LOGGING.md) – Logging & debug mode
- [PERFORMANCE.md](docs/PERFORMANCE.md) – Measurements & optimizations
- [SECURITY.md](docs/SECURITY.md) – Threat model, CSP & deployment headers
- [PRIVACY.md](docs/PRIVACY.md) – Personal data: inventory, visibility, self-hosting obligations
- [data-model.md](docs/data-model.md) – Stored data: keys, shapes, versions, retention
- [backup-format.md](docs/backup-format.md) – Backup file format & encryption
- [school-deployment.md](docs/school-deployment.md) – For a school's IT: central installation, self-hosting, keeping the data
- [csv-import.md](docs/csv-import.md) – Class list import: columns, values, school software exports
- [worker-protocol.md](docs/worker-protocol.md) – Messages between the app and its web workers
- [decisions/](docs/decisions/) – Recorded design decisions and their reasons
- [canvas-interactions.md](docs/canvas-interactions.md) – Canvas interaction state machines
- [CHANGELOG.md](docs/CHANGELOG.md) – Release history

## Contributing

Contributions are welcome – please open issues and pull requests on GitHub. Before opening a PR, run the checks listed above (`lint`, `typecheck`, `test`) locally. A pull request is merged once its author has accepted the [Contributor Licence Agreement](CLA.md) by ticking its box in the PR description; see [CONTRIBUTING.md](CONTRIBUTING.md#licence-and-the-cla).

## License

GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later) – see [LICENSE](LICENSE).

The build writes the licences of the third-party packages it bundles to `dist/third-party-licenses.txt`, served as `/third-party-licenses.txt` (see [SECURITY.md](docs/SECURITY.md#4-third-party-licences)).

Copyright (C) 2026 Eike Schäfer. Klassenplan is free software: you can redistribute it and/or modify it under the terms of the AGPL. Note that the AGPL's network clause (§13) applies – if you run a modified version on a server, you must make the corresponding source code available to its users.
