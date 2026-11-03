# 0040 – The logo takes its seats, and runs to its end

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the maintainer's decisions of 2026-11-03 (the swap of equal letters
  as long as the mark's animation, "Die Klasse nimmt Platz" without fading the
  old page out, only between the start page and the workspace, the logo's
  animations running to their end),
  `src/components/shell/brandMotion.ts`, `src/components/shell/AppHeader.tsx`,
  `e2e/page-header.spec.ts`, [DESIGNSYSTEM.md](../DESIGNSYSTEM.md) § 6g

## Context

Pointed at, the wordmark grew by 4 % and the mark built its K anew, both through
`:hover` in CSS: when the pointer left, the mark snapped back half-built. Between
the start page and the workspace the logo jumped from 64 to 36 px and, on a wide
window, by more than 100 px, and the wordmark was gone. § 6g kept the pages beside
the app still.

"Klassenplan" has 11 letters and the mark 11 filled seats, 10 blue and one amber.

## Decision

**Pointed at**, by a mouse or the keyboard's focus, the mark builds its K as before
while four pairs of equal letters (s, l, a, n) swap seats and K, e and p stay.
Equal letters leave the word as it was, so nothing has to go back. The last pair
flies with the mark's amber seat, so both end at 1280 ms. It runs on the Web
Animations API, plays to its end whatever the pointer does and does not start
again while it runs (`brandHoverHandlers`). A finger's tap leaves the page and
plays nothing.

**Between the start page and the workspace**, in both directions and under `/en`,
the letters fly onto the seats (`useBrandFlight`): "Klass" to the K's stem, the
last "n" to the amber seat, the seats empty before and full after. The mark, the
gear and the hairline glide along. As everywhere in § 6g the change itself happens
at once: inert copies fly in a layer above the pages, the new page is there and
can be used, and it fades in over 180 ms like another layer. The old page is gone
at once.

Both heads are measured rather than assumed: the head leaving is read in its layout
effect's cleanup, the head arriving in its layout effect. That holds because
`BrowserRouter` changes the route in a transition, so both happen in one commit;
`e2e/page-header.spec.ts` would notice if it stopped holding. Nothing flies on the
first drawing, between other pages, from a logo out of view or under reduced
motion. A change of the window's size or another navigation ends the flight.

The logo's dark colours follow `.dark` alone. A `prefers-color-scheme` block beside
it also applied them under a chosen light theme on a dark system.

## Alternatives considered

- **The browser's View Transitions.** About 30 lines, but 22 named elements for
  this flight, a frozen page that swallows clicks meanwhile, and the state a frame
  late, which § 6g already rejects for the layers.
- **One head above the routes.** Real transitions on one element, against decision
  0039: the start page's head scrolls with the page, the others stick.
- **Fading the old page out as well.** Softer, but needs a copy of the start page's
  column with its preview. The maintainer preferred it without.
- **Calmer forms** ("Gleiten", "Einfahren"; letters moving apart on hover). Tried
  out on a demo page and not chosen.

## Consequences

- The pages beside the app are no longer still in one place: their logo moves when
  pointed at. Their head does not fly; the logo still jumps from the start page to
  those pages.
- A finger never sees the hover, as before, so on a tablet or a whiteboard the
  flight is the logo's only movement.
- The flight has not been tried with the iPad's swipe back, whose own animation
  may run alongside it.
- `prefers-color-scheme` no longer colours the logo before the bundle has set
  `.dark`, like the rest of the page's tokens.
