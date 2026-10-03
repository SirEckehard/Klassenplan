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

- `registerType: 'prompt'` with `skipWaiting` disabled: a new service worker
  waits until the teacher confirms the reload in `ReloadPrompt`.
- `clientsClaim` enabled (since 2026-10-03). It reaches only pages that no
  worker controls yet: a page with a worker moves to the new one when it
  activates, claim or not, so an update still waits for the confirmation. What
  it changes is the first visit, which stayed uncontrolled until a reload —
  offline, every chunk it had not fetched yet failed although the precache held
  it.
- Only `ReloadPrompt` calls `useRegisterSW`; everyone else reads the
  registration from the `swUpdateController` singleton.
- An open tab checks for updates every hour, when it becomes visible again and
  when the connection returns; the footer offers a manual check.

The changelog states the behaviour but no reason beyond it.

## Alternatives considered

- **Activating new versions immediately** (`skipWaiting`). Rejected in the
  build configuration because it contradicts the prompt model.
- **Leaving `clientsClaim` off as well.** It was off until 2026-10-03, on the
  reading that it activates new versions too. It does not, and without it the
  promise "offline after the first visit" held only after a second one.

## Consequences

- A teacher can keep using an older version until they confirm the update, and
  an update never reloads the page on its own.
- The first visit works offline as soon as the service worker has installed,
  without a reload.
- The update notice has to stay open until it is clicked. A toast that must stay
  open takes `duration: 0`; `Infinity` made it vanish after about a millisecond
  until v2.0.4.
