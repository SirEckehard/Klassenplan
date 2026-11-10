# 0015 – A sample class and coach marks for the first visit

- **Status:** accepted
- **In place since:** v2.1.0 (2026-09-16)
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
creates an ordinary class named "Beispielklasse": 24 invented students whose
attributes give every criterion something to work with, a furnished room and a
picture per student (`useDemoClass`). The class goes through `createClass` like
any other and carries no marker. The pictures are drawn on a canvas in the
browser and stored as the same small JPEG an uploaded photo becomes
(`renderDemoAvatarBlob`), before the class that refers to them.

There is only ever one. Once a class of that name exists — in either UI
language, ignoring case (`findDemoClass`) — the same entries read "Zur
Beispielklasse wechseln" and switch to it through `selectClass`. While the
sample class is open, the add menu and the empty-class link do not offer it.

**Coach marks.** One tour per wizard context (`components/onboarding/tours.ts`)
points at elements tagged `data-tour`; marks whose element is not on screen are
skipped:

- welcome (no class yet): the empty state;
- class list: class switcher, the "Ansicht" group (list, attributes,
  relationships; since 2026-10-06), add menu, student row, "Weiter",
  "Bibliothek" at the foot of the toolbar (since 2026-10-06), the backup (first
  the settings gear, since 2026-09-21 the "Backup" entry of the class toolbar,
  since 2026-09-26 the same entry at the foot of every toolbar), the Help
  button;
- room: canvas, view settings (the whole "Ansichtseinstellungen" group since
  2026-09-26; its text names the options of step 3 and the seating circle as
  well), sidebar, seat status, "Weiter";
- seating plan: shuffle, criteria sidebar, toolbar toggle, canvas, statistics,
  the switch between seating plan and circle (both entries of the "Ansicht"
  group since 2026-09-26), save/present/export (present and export beside
  Help in the header since 2026-09-26; from 2026-09-21 they sat in the middle
  of the status bar, which now carries undo/redo). This tour waits until the
  automatic first shuffle has finished, so the statistics exist when it starts;
- "Bibliothek" (since 2026-10-06, the one page outside the layers with a tour):
  the columns, the inspector, the path in the status bar, "Öffnen", the
  toolbar, the Help button.

A tour counts as seen the moment it appears, "Nicht mehr zeigen" switches all
tours off, and the Help dialog starts the current step's tour again. The record
is `spg.onboardingTour` in localStorage: `{ version: 1, seen, skipped }`. When
the record is first created on an installation where `spg.hasVisitedApp` is
already set, it starts with `skipped: true`. The tour never blocks the page and
steps aside while any other overlay is open (`useOtherDialogLayerOpen`).

**The update to 3.0** (added 2026-10-06). A teacher whose last seen version
(`spg.lastSeenVersion`) predates 3.0 gets `RedesignWelcome` in place of the
post-update notice, once: the layers, the rooms and "Bibliothek" in three
points. Its "Tour starten" resets the record to `{ seen: [], skipped: false }`
(`restartTours`), so every tour runs again — the current layer's as soon as the
dialog closes, the others when their view opens; any way of closing it
acknowledges the update. Without that, tours stay skipped for them as before.

## Alternatives considered

- **A marker on the class record (`isDemo`).** Would allow a banner and a
  dedicated clean-up, but changes the class collection and the backup format for
  a class that can be deleted like any other.
- **A button on the start page.** Built first — passing the request to the
  generator as router state — and removed again the same day at the
  maintainer's request, who preferred removing it to making it smaller. No
  further reason is recorded.
- **A new copy on every click ("Beispielklasse 2", …).** Built first and
  replaced the same day at the maintainer's request: a second copy of invented
  data helps nobody, and the class switcher filled up with them.
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
  deleted like any class, and nothing is ever overwritten.
- The sample class is recognised by its name alone. A renamed one counts as the
  teacher's own class, so the next click creates a fresh sample; a class of
  their own named "Beispielklasse" is opened instead. Starting afresh means
  deleting the sample class and loading it again.
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
  it; nothing fails loudly in the app, so a changed view should be checked
  against `tours.ts`. `e2e/onboarding.spec.ts` asserts the German tour titles
  word for word and in order: a renamed title, or a mark that is added, removed,
  moved or no longer on screen, needs the title lists there updated as well.
- Prerendering (`scripts/prerender.mjs`) and the Playwright core flow switch the
  tours off, because a fresh browser profile is a first visit.
  `e2e/onboarding.spec.ts` covers the sample class and the tours in a real
  browser instead: the anchors on screen in the finished views, the plan tour
  waiting for the first shuffle, "Nicht mehr zeigen", the restart from the Help
  dialog and the returning teacher.

## Addendum of 2026-11-10: the help's words, in reading order

The help became short topics the same day (`components/help/workspaceHelpTopics.ts`):
two or three words and one sentence each, the keys left to "Tastenkürzel". The
tour's texts were older and longer, named keys, and said some things otherwise
than the help. Its order went back and forth across the screen: the class list
tour went from the stage to "Weiter" at the right of the status bar and back to
the foot of the toolbar, the plan tour from the middle of the status bar to the
toolbar, its left end, the stage, its left end again, the toolbar and its right
end. Maintainer request of 2026-11-10: texts that agree with the help, an order
that makes sense and does not jump about, and a short, smooth motion.

- **The help's words.** A mark that explains what a help topic explains takes
  that topic's key (`help.*`), title and body; a text of the tour's own
  (`tour.*`) is left only for what the help leaves to the screen — the
  welcome, the toolbar's foot, its switch, mixing, the switch to the circle,
  the way on and the help itself. `tours.test.ts` holds every mark to a topic
  of `WORKSPACE_HELP_TOPICS` or a `tour.*` key.
- **Reading order.** A tour reads its screen as a page is read — header,
  toolbar from the top, stage, inspector, status bar from left to right — and
  ends where the teacher goes on:
  - class list: classes, the views ("Merkmale und Beziehungen"), adding,
    editing a student, "Bibliothek", the backup, the toolbar's switch (moved
    here from the plan tour: the class list is where the toolbar is first
    met), "Weiter", the help;
  - room: the inspector's "Raum" (a new anchor, `layout-rooms`) and "Neu
    einrichten", moving and turning on the stage, "Hinzufügen" (the toolbar's
    group, no longer the whole toolbar; below `lg` the tray), "Weiter";
  - seating plan: the switch to the circle, swapping and locking on the stage,
    the criteria in the inspector, the fulfilment, "Mischen", presenting and
    exporting;
  - "Bibliothek": the columns, "Hinzufügen" in the toolbar (its group), the
    inspector, "Öffnen", the help.
- **Left out:** "Werkzeuge" on the plan's toolbar, which said again what the
  circle's mark and the foot's marks say; "Plätze im Blick", which the status
  bar states in words; the room's view settings, for which the help has no
  topic.
- **Motion** (`useCoachMarkMotion`, `docs/DESIGNSYSTEM.md` § 6g). It comes in
  as a menu does: the dimmed page and the ring fade in, the card slides the
  last 4 px from its element's side (140 ms, `arrive`). On to another mark the
  ring and the card glide there together, the card's words already the next
  ones (280 ms, `settle`). A glide sets out from where ring and card stand, so
  "Weiter" pressed again mid-way turns them without a jump, and one under way
  while the page scrolls the element into view glides on to where it went in
  the time that is left. Closed, it is gone at once and a copy fades out where
  it stood (100 ms, `leave`). Otherwise following the page as it scrolls or
  resizes moves nothing. The ring's CSS
  transition (200 ms, on every remeasure) is gone.

### Alternatives considered

- **Texts of the tour's own, aligned by hand.** They had drifted from the help
  once already.
- **A mark for every help topic.** Nearly thirty topics across the layers; a
  tour that long is skipped.
- **The card fading in at the next mark instead of gliding.** It would appear
  before the ring arrives, or wait for it.

### Consequences

- Changing a help topic changes the tour; removing one fails `tours.test.ts`,
  and the German titles `e2e/onboarding.spec.ts` asserts are the help's.
- Below `lg` the inspector's marks are skipped, so the room tour starts on the
  stage there and the plan tour leaves out the criteria.
