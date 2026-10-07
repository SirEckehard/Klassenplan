# 0026 – Tables can be taken out of the mix, and a room can fill from the front

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** maintainer request of 2026-10-07 (every table of the room kept,
  but only the wanted ones used; spare seats at the back instead of the front),
  [ALGORITHM.md](../ALGORITHM.md#how-many-students-a-table-takes),
  [data-model.md](../data-model.md#class-collection),
  `src/utils/algorithm/seatTargets.ts` (`seatTargetsFor`,
  `frontToBackTableOrder`),
  `src/components/SeatingPlanGenerator/views/SceneInspector.tsx`

## Context

A room holds the tables it really has. A class smaller than the room left two
ways: delete the tables it does not need — and lose them for the next class in
the same room — or keep them and let the mix spread the class over all of
them. The mix spreads evenly (`evenTargetsFor`, from a random table on), so
the empty seats land anywhere, the front row included, where a teacher wants
the class.

## Decision

Both are properties of the room, stored in its `ClassroomScene`:

- **`ClassroomTable.inactive`** takes a table out of the mix. The table stays
  in the room, in the plan, on the export and on the wall, drawn with a dashed
  edge and faint while empty. Mixing seats nobody there; a student put there
  by hand stays, and a lock there holds. The switch "In der Mischung" in the
  inspector of a table, or of a selection of tables, sets it. The status bar
  of the room counts only the seats in the mix and names the rest apart, and
  the way on to the plan asks only for those.
- **`ClassroomScene.fillFromFront`** fills the tables of the mix one after the
  other, row by row away from the board and, within a row, from the board's
  middle outwards. The room's own inspector carries it ("Von vorne besetzen").

Both work through the number of students each table takes (`targets`), which
construction, greedy refinement and Simulated Annealing already honour: a
table out of the mix takes none, filling from the front fills the targets in
that order. Absent means the old behaviour, and a room with neither flag takes
the same call with the same draw from `rng` as before, so its plans do not
change.

## Alternatives considered

- **A mix setting instead of a room property.** The criteria and recipes are
  about the class; which tables a room offers and where its gaps belong are
  about the room, and differ between the classroom and the lab.
- **Filling seat by seat rather than table by table.** It would scatter the
  last row's students one per desk; a table filled up keeps groups whole.
- **Choosing the half-filled row's tables at random.** The order is fixed
  (the board's middle first, then the table index), so the construction and
  the refinement agree on which tables stay empty; a random pick in each would
  disagree.

## Consequences

- Stored data gains two optional booleans; older data reads as before, and a
  table taken back in loses the flag rather than storing `false`. The backup
  validation accepts both and rejects anything but a boolean.
- A table out of the mix also drops out of the seat extent the front/back and
  height criteria measure against, so "at the back" means the back of the
  seats in use.
- The plan in place is not mixed again when a table is taken out: a student
  sitting there stays until the next "Mischen".
- Within a half-filled table the first seats by index are taken, as before —
  not necessarily its front-most ones.
