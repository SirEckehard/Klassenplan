# 0053 – "Neu einrichten" sets tables towards the board, and offers arrangements

- **Status:** accepted
- **In place since:** — (the next release)
- **Sources:** the maintainer's choices of 2026-11-20 on the page
  "Raum-Aufstellungen" (every point taken but group tables staggered by
  default; notes on the herringbone, sketches of the islands and the market
  place; desks facing the walls asked for in addition; no photos colliding),
  [UI.md § The room](../UI.md#the-room),
  [ALGORITHM.md](../ALGORITHM.md), `src/utils/algorithm/autoArrange.ts`,
  `src/utils/algorithm/arrangements.ts`,
  `src/utils/algorithm/roomComposer.ts`, `src/utils/algorithm/roomRules.ts`

## Context

"Neu einrichten" placed tables of one kind in rows of a fixed length — four
groups of four one behind another, three groups of six — and put what was
left flush at the board: six groups of four stood as four and two, four
groups of six as three and one. The board was always taken to hang on the
right wall, wherever it hung, and nine groups of four (33 to 36 students) put
two tables on top of each other. Teachers also seat their classes in a
horseshoe, an arena, at desks along the walls — rooms they had to build table
by table.

## Decision

- **Every layout is drawn in the board's frame** (`roomFrame`): depth from
  the back wall to the board's wall, across along it; `toRoomTables` turns it
  into the room for a board on any wall (`determineFrontDirection`) and
  numbers the tables from the board backwards.
- **Desks in rows** (`deskRows`): rows along the board, filled from the
  front; a row that does not fill stands at the back, in the middle. Full rows
  with the board on the right stand exactly where they stood.
- **Group tables in lanes** (`groupLanes`): even gaps over the room, as many
  lanes as leave the most room round every table, a strip kept free before the
  board (`TEACHER_ROOM`). Six groups of four stand three rows of two, four of
  six two by two. A grid, not staggered: the maintainer chose the grid.
- **Seven arrangements** (`ROOM_ARRANGEMENTS`), built from the four kinds of
  table: horseshoe (a second U inside for a large class), herringbone (every
  other row a little further out), arena, islands with quiet desks (groups of
  four as a die's five, single desks facing both side walls in the gaps
  between its rows), conference, market place (groups of four along both side
  walls, the inner ones a little nearer the wall, the middle free) and desks
  facing the walls (an island in the middle for whoever the walls cannot
  seat). An arrangement too small for the class stays in the menu, greyed,
  with the class size it seats.
- **No photo collides**: a photo sits behind its seat's edge, 37 px deep, and
  the room warns when one covers another or crosses a wall
  (`getPhotoCollisions`). The back row of desks keeps 40 px from the wall for
  it, the arena's arcs end before their photos reach the side walls, and the
  tests hold every kind and arrangement to it, on every wall, for 1 to 36
  students.
- **"Zufällige Anordnung" puts a room together** (`composeRoom`) rather
  than picking from the list: the depth before the board is cut into one to
  three bands, each filled with a pattern of its own — an arc (at the front
  only), rows of single or double desks, islands of four or six (in a grid or
  staggered), a conference table, a herringbone — never the same twice in a
  row, and the side walls may take two to six quiet desks facing them.
  Distances, benches or single desks, an aisle are chance too. Every
  candidate is checked against the room's rules (`roomProblems`): nothing
  overlaps or crosses a wall, no chair stands in a table, no photo collides,
  tables touch or stand at least 15 px apart, nobody sits with their back to
  the board (sideways is allowed, as at any group table), the strip before
  the board and the way to the door stay free, there are enough seats and at
  most five to spare, at most three kinds of table. Of 40 tries a combination
  of patterns is chosen at random among those that kept the rules, and of
  that combination the room that uses the space best. Where none came out
  right — at 36 students now and then — it falls back on an arrangement
  that seats the class, never the one it fell back on last. A screen reader
  hears what was put together ("Zufällig zusammengestellt: Bogen,
  4er-Inseln").
- **The rules are one module** (`roomRules.ts`): the random room keeps them,
  and the tests hold every kind and arrangement to them.
- Desks the arrangements push together touch, so the mix reads them as
  tables pushed together by hand (decision 0031); an arrangement is a room
  like any other afterwards, and nothing records which one built it.

## Alternatives considered

- **Group tables staggered by default:** drawn and offered; the maintainer
  kept the grid, staggering stays with the islands.
- **Pure chance** — tables scattered at random: no teacher would keep such a
  room. **Picking an arrangement at random**, as first built: offers nothing
  the list does not; the maintainer chose rooms put together from zones,
  under rules.
- **Keeping out of the door's way:** the strip before the board keeps the
  default door free; a door on another wall is not looked at, as before.
- **Recording the arrangement on the room:** would add a stored field for a
  label nobody needs once the tables can be moved; not taken.

## Consequences

- The sample class's room has a desk more than the class needs, thirteen:
  the thirteenth now stands at the back in the middle, no longer in the back
  corner. Sample classes already made keep their room.
- A room set up anew with group tables mixes differently: the islands stand
  further apart than the 70 px that make a row, so seats at two islands are no
  longer "ahead" or "behind" each other. Rooms already set up keep their
  tables.
- The herringbone and the arena turn desks by angles such as 30°; the
  inspector's buttons turn in 45° steps, the handle freely.
- What an arrangement seats depends on the board's wall: on a short wall
  every one seats 36 but the herringbone, which seats 24; on a long wall the
  horseshoe seats 28, the islands and the walls 26, the arena 25 and the
  market place and the herringbone 24.
- Nothing stored changes: an arrangement is tables of the four kinds.
