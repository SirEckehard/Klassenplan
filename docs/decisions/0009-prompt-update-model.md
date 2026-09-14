# 0009 – Service worker updates only after confirmation

- **Status:** accepted
- **In place since:** v1.7.0 (2026-07-09)
- **Sources:** [CHANGELOG.md](../CHANGELOG.md) (1.7.0, 2.0.4), `VitePWA` options in
  `vite.config.ts`, `AGENTS.md` (Security & Deployment)

## Context

The service worker caches the app so it works offline. A new release therefore
reaches a teacher only through a new service worker, including in a tab that
stays open on the classroom projector for a whole school day.

## Decision

- `registerType: 'prompt'` with `skipWaiting` and `clientsClaim` disabled: a new
  service worker waits until the teacher confirms the reload in `ReloadPrompt`.
- Only `ReloadPrompt` calls `useRegisterSW`; everyone else reads the
  registration from the `swUpdateController` singleton.
- An open tab checks for updates every hour, when it becomes visible again and
  when the connection returns; the footer offers a manual check.

The changelog states the behaviour but no reason beyond it.

## Alternatives considered

- **Activating new versions immediately** (`skipWaiting` / `clientsClaim`).
  Rejected in the build configuration because it contradicts the prompt model.

## Consequences

- A teacher can keep using an older version until they confirm the update, and
  an update never reloads the page on its own.
- The update notice has to stay open until it is clicked. A toast that must stay
  open takes `duration: 0`; `Infinity` made it vanish after about a millisecond
  until v2.0.4.
