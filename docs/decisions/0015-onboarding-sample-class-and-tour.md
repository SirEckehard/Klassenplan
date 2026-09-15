# 0015 – A sample class and coach marks for the first visit

- **Status:** accepted
- **In place since:** unreleased (2026-09-15)
- **Sources:** maintainer requests of 2026-09-15, `src/utils/demo/demoClass.ts`,
  `src/utils/image/demoAvatar.ts`, `src/hooks/onboarding/`,
  `src/components/onboarding/`

## Context

A first visit opened an empty wizard. Before a room, a shuffled plan or the
statistics could be seen, a teacher had to create a class and type in or import
a class list — real student data, for a tool they had not yet decided to use.
Help existed only as the dialog behind the question mark. `useFirstVisit`
recognised a first visit but only used it to expand the sidebar.

## Decision

**Sample class.** "Beispielklasse laden" in step 1 — next to "Neue Klasse" while
no class exists, as a link in an empty class and in the "Hinzufügen" menu —
creates an ordinary class named "Beispielklasse" ("Beispielklasse 2", … when
taken): 24 invented students whose attributes give every criterion something to
work with, a furnished room and a picture per student (`useDemoClass`). The class
goes through `createClass` like any other and carries no marker. The pictures
are drawn on a canvas in the browser and stored as the same small JPEG an
uploaded photo becomes (`renderDemoAvatarBlob`), before the class that refers to
them.

**Coach marks.** One tour per wizard context (`components/onboarding/tours.ts`)
points at elements tagged `data-tour`; marks whose element is not on screen are
skipped:

- welcome (no class yet): the empty state;
- class list: class switcher, add menu, student row, "Weiter", the settings gear
  in the footer (backup), the Help button;
- room: canvas, sidebar, seat status, "Weiter";
- seating plan: shuffle, criteria sidebar, sidebar toggle (explained once for
  step 2 and the export page as well), canvas, statistics, seating circle
  toggle, save/present/export. This tour waits until the automatic first
  shuffle has finished, so the statistics exist when it starts.

A tour counts as seen the moment it appears, "Nicht mehr zeigen" switches all
tours off, and the Help dialog starts the current step's tour again. The record
is `spg.onboardingTour` in localStorage: `{ version: 1, seen, skipped }`. When
the record is first created on an installation where `spg.hasVisitedApp` is
already set, it starts with `skipped: true`. The tour never blocks the page and
steps aside while any other overlay is open (`useOtherDialogLayerOpen`).

## Alternatives considered

- **A marker on the class record (`isDemo`).** Would allow a banner and a
  dedicated clean-up, but changes the class collection and the backup format for
  a class that can be deleted like any other.
- **A button on the start page.** Built first — passing the request to the
  generator as router state — and removed again the same day at the
  maintainer's request, who preferred removing it to making it smaller. No
  further reason is recorded.
- **Image files in the bundle or an avatar service.** Files add weight and
  licensing questions; a service is an external connection
  ([0001](0001-offline-first-no-server.md), CSP `connect-src 'self'`).
- **Photos of real people, stock photos included.** Not in a tool about minors.
- **A tour library (driver.js, Shepherd, react-joyride).** A dependency for four
  short tours, with styles of its own to align with the design tokens and dark
  mode, and its own idea of focus and Escape next to `useDialogLayer`.
- **Tours for everyone after the update.** Teachers who know the app would be
  interrupted in the middle of their work.

## Consequences

- The sample class holds no personal data. It is saved, backed up, exported and
  deleted like any class; loading it twice creates two classes, and nothing is
  ever overwritten.
- The students' names are taken from the UI language when the class is created
  and stay when the language changes later.
- The sidebar no longer opens expanded on a first visit; the tour's
  sidebar-toggle mark and the Help dialog explain it instead. `useFirstVisit`
  now only sets `spg.hasVisitedApp`, and a sidebar preference already stored
  stays as it is.
- `spg.onboardingTour` is a new localStorage key. "Delete all data" removes it,
  so a teacher who wipes the app sees the tours again.
- A teacher whose first visit was the export page — the other place that sets
  `spg.hasVisitedApp` — counts as returning and gets no automatic tour; the Help
  dialog still offers it.
- A view that renames or removes an anchor shortens a tour rather than breaking
  it; nothing fails loudly, so a changed view should be checked against
  `tours.ts`.
- Prerendering (`scripts/prerender.mjs`) and the Playwright journey switch the
  tours off, because a fresh browser profile is a first visit.
