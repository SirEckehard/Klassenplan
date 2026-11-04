# 0039 – One head on every page, the way back beside the page's bar

- **Status:** accepted
- **In place since:** v3.3.0 (2026-11-04)
- **Sources:** the maintainer's decisions of 2026-11-03 (the head of the
  projection and the class tools to follow the workspace's and the support
  page's, "Zurück" where one does not have to look for it, the layers, the
  export page and "Bibliothek" keeping theirs in the status bar, "Beenden"
  staying in the projection's bar, "Zurück" up to the gear where a page has no
  help, a better head and title for the start page that still fits the others),
  `src/components/shell/AppHeader.tsx`,
  `src/components/publicPage/PublicPage.tsx`,
  `src/components/tools/ToolPage.tsx`, `src/pages/Present.tsx`,
  `e2e/page-header.spec.ts`, [UI.md](../UI.md)

## Context

The pages had grown four heads. Measured at the start: 57px in the workspace
and the class tools, 52 to 60px in the projection, 120px on the pages beside
the app. The logo stood on the left, on the class tools on the right, and on
the pages beside the app in the page's centred column, so it moved with the
window. The settings gear was missing from the class tools and the projection.
"Zurück" stood in four places: the status bar, the projection's bar (as
"Beenden"), top left on a class tool, top right on a page beside the app, where
it moved with the window as well.

On a phone that last one pushed every page beside the app to 420px, past the
screen's edge, as soon as it appeared. Nothing noticed: no spec measured a
page's width.

## Decision

Every page wears `AppHeader`: 56px and a hairline across the window, sticking
to the top, the mark on the left with what the page is about beside it, and on
the right what hangs from the window's edge — "Zurück", Help, the settings gear.
A page without help has "Zurück" right beside the gear, one button further right
than on a class tool. The pages beside the app and the start page add the
wordmark.

A page with a bar of its own at the bottom keeps its way back there, not in the
head and never twice: the layers, the export page and "Bibliothek" in the status
bar, beside the way on, the projection as "Beenden" in its bar, within reach at
a board. So "Zurück" stands in the head on the class tools and the pages beside
the app. Where each way back leads did not change.

The start page keeps the same row but not the band (`inColumn`): logo and gear
stand in the page's column, over the title and the preview's edge, on a hairline
as wide as those between its sections, and the row scrolls away with the page.
The logo is larger there, where the name is news, and the row as high as it
needs. Its title opens as on the pages beside it, with small caps above the serif. The
band across the window had left the logo far from the title on a wide window.

`e2e/page-header.spec.ts` holds the positions on all four devices, and that no
page scrolls sideways.

## Alternatives considered

- **"Zurück" in the head on every page**, out of the status bars. It was the
  first plan: one place for all, the layer switcher doing the status bar's job
  and 44px more for a phone's bar. The maintainer preferred it beside "Weiter"
  and the other actions of a page with a status bar. Two places remain, each
  page's being the bar it already works in.
- **Top left, as on the class tools.** Familiar from the browser and the phone,
  but it either moves the logo from page to page or stands behind a logo of
  varying width.
- **"Beenden" in the bar in fullscreen only**, with "Zurück" in the head
  otherwise. One way out in sight at any time, but out of reach at a board
  without fullscreen.

## Consequences

- On a wide window the logo of the pages beside the app no longer stands over
  their column, and those pages are less airy on top.
- On a wide window logo and gear move outward when the start page opens one of
  those pages, and the logo shrinks; on a phone and a tablet, where the column
  is the window, the two heads differ by the logo and its row's height.
- What stays in view while a page is read sticks below the head (`lg:top-22`),
  and the head costs a phone held sideways 57 of about 400px.
- The class tools and the projection reach theme and language through the gear,
  one press further than before.
- On a phone the projection's bar is one row that scrolls sideways, with
  "Beenden" in sight beside it and without the size slider: 70px rather than
  282px, but not every control is in view at once.
