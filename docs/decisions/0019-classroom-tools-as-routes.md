# 0019 – The three classroom tools are routes, not panels

- **Status:** accepted
- **In place since:** unreleased (2026-09-21)
- **Sources:** maintainer decision of 2026-09-20, the redesign concept
  "Papier & Werkzeug" (stage 5, "Beamer & Handy"), `src/pages/WhoIsNext.tsx`,
  `src/pages/SeatFinder.tsx`, `src/pages/Groups.tsx`,
  `src/components/tools/ToolPage.tsx`

## Context

Three things a teacher does with a class have nothing to do with editing a
seating plan: calling on somebody at random, looking up where a student sits,
and splitting the class into groups. Two of them existed only inside the
projection (`/present`), where they need a beamer and a laptop; the third did
not exist at all.

All three happen standing up — in the doorway of a room you are covering for
somebody, between two desks, in front of the class — with a phone in one hand.
The workspace is the opposite of that: three layers, a toolbar, an inspector
and a canvas that wants a pointer.

## Decision

Each tool becomes its own route, bilingual and prerendered like every other
page: `/wer-kommt-dran`, `/wo-sitzt-wer`, `/gruppen`. They share one frame
(`components/tools/ToolPage.tsx`): the way back at the top, the answer in the
middle, the one action pinned to the bottom edge where the thumb is.

All three are `noindex` in `src/data/seoRoutes.json`, for the reason `/present`
and `/namensspiel` are: without a class in this browser they render an empty
state, which has no business in a search index. They stay prerendered, so
canonical and hreflang remain consistent, and they are left out of the sitemap.

They are reachable from the plan layer's toolbar, and "Gruppen bilden" also
from the projection's bar. Nothing about them is stored: the draw, the search
and the groups live for as long as the screen is open.

## Alternatives considered

- **Panels inside the workspace.** No routing, no metadata, no new frame. But
  the workspace is a three-column window from `lg` up and a stacked page below
  it; a tool used in the doorway would arrive behind a layer switcher and a
  toolbar, and could not be opened straight from a home screen.
- **Modes inside `/present`.** Closest to the concept's own drawing, and they
  would inherit the class data. A phone would then always go through a view
  built for a projector, and the URL could not name what is on screen.
- **One combined "Unterricht" page with three tabs.** One route instead of
  three. Tabs would make each tool one tap further away and put two answers on
  a screen that has room for one.
- **Storing the last draw.** The group draw is deliberately not persisted: a
  group that matters gets written on the board within the minute, and one that
  does not gets re-rolled. Storing it would add a format to migrate for a value
  that is stale by the next lesson.

## Consequences

- Three more prerendered routes per language (28 pages instead of 22), and
  three more entries in `seoRoutes.json`. The sitemap is unchanged, because
  `noindex` routes stay out of it.
- The tools read the class that is open in this browser. Opening one of them
  from a link on another device shows the empty state, and says so.
- `useRandomStudentPicker` now falls back to the class list when no plan is
  seated, so the draw works before a plan exists. Its `tableIndex` is `-1` in
  that case, which the callers check before naming a seat.
- Group drawing keeps two students with a distance wish apart while the group
  sizes allow it, and names the pairs it could not separate. It is not the
  seating algorithm and does not consult its weights — a group is for one
  lesson, a seat for the term.
- A new tool of this kind means a route, an entry in `seoRoutes.json`, a
  `hidesFooter` entry in `App.tsx` and a `routeComponents` key; the frame and
  the empty state come from `ToolPage`.
