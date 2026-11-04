# 0036 – Tables carry ids, and locks name their table by id

- **Status:** accepted
- **In place since:** v3.3.0 (2026-11-04)
- **Sources:** the review of 3.2.3 on 2026-11-01 (finding M10, idea I3, the
  maintainer's choice to implement it), the bug reviews of 2026-10-26 and
  2026-10-29 (commit `9941b5d2`: locks follow their students after a room
  undo; `1c673520`: setting the room up anew lets the locks go),
  `src/utils/data/tableIds.ts`, `src/hooks/scene/useSceneManager.ts`,
  `src/stores/layoutStore.ts`, `src/hooks/useSeatingState.ts`
  (`removeTables`), [data-model.md](../data-model.md)

## Context

A lock fixes a student to a seat for the next mix (`LockedPositions`,
`{ table, seat }`), and the table was named by its place in the scene's list.
Every change that moves tables in the list had to move the locks along, and
each was found one at a time: removing a table moved the locks behind it, its
undo did not, so locks pointed at the wrong table until `9941b5d2` made them
follow their students after a room undo; setting the room up anew left locks
on seat numbers of tables that were gone until `1c673520` let them go. One
case stayed: removing a table dropped the locks of the students at it, and
the undo that brought the table and the students back could not bring the
locks back — there was nothing left to bring.

## Decision

- Every table of the live scene carries an `id`, unique in its scene and kept
  for the table's life. `withTableIds` gives one where a scene enters the live
  state — the layout store's setter and initial scene, the canvas's scene
  transaction and its commit — and gives a copy (a paste, a duplicate) an id
  of its own, the table earlier in the list keeping the one they share.
  Tables stored before have none and get one there.
- A lock carries the `tableId` of its table beside the index. `anchorLocks`
  derives the index from the id whenever the scene's tables or the locks
  change (an effect in `useSeatingGenerator`, and before the locks follow
  their students after a room undo or redo): where the table now stands, or
  `RESTING_LOCK_TABLE` (-1) while it is gone. A lock without an id, just set
  or written before, takes the id of the table at its index.
- `removeTables` rests the locks at a removed table instead of dropping them.
  A resting lock binds nothing — no mix, no seat, no swap reads index -1 — and
  stays as it is while its student sits elsewhere (`heldLocks`,
  `locksFollowingStudents`); the room's undo brings the table back with its
  id, and the lock with it.

## Alternatives considered

- **Keep the index and put the dropped locks into the room's undo step**, as
  "Neu einrichten" does with `released`. It fixes the one case and leaves the
  next change that moves tables to be found the same way.
- **Name tables by id everywhere** — the seating's rows, the selection, the
  highlights, the algorithm's layout. The seating is aligned with the tables
  by construction (both change in one transaction), and the rest is not
  stored; changing all of it would touch most of the canvas and the algorithm
  for no case known to go wrong.

## Consequences

- Undoing the removal of a table brings back the locks of the students at it.
- Stored scenes carry table ids from their next write on, and stored locks a
  `tableId`; a lock may hold `table: -1` while it rests. The backup validator
  takes both (`id` on a table, `tableId` and -1 on a lock); an earlier version
  reads a resting lock as one on no table, which binds nothing there either.
- A resting lock stays in the data until its student is locked elsewhere, a
  plan or a mix is opened, or the room is set up anew. It is invisible and
  binds nothing meanwhile.
- New code that creates tables needs no id of its own: the scene's entry
  points give one. Code that copies a table must not hand the copy on as the
  original; the later table in the list is the one that gets a new id.
