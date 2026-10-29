# 0031 – One criterion model for mixing, fulfilment and highlights

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the review of the mixing algorithm of 2026-10-18 and the
  maintainer's decisions of the same day,
  [ALGORITHM.md](../ALGORITHM.md), [PEDAGOGY.md](../PEDAGOGY.md),
  [PERFORMANCE.md](../PERFORMANCE.md#algorithm-runtime),
  `src/utils/algorithm/model/`, `src/utils/algorithm/seatingAlgorithm.ts`,
  `src/utils/algorithm/simulatedAnnealing.ts`, `src/utils/pairs.ts`,
  `src/utils/mixImportance.ts` (`migrateStoredMixSettings`),
  `src/utils/algorithm/__tests__/mixRegressions.test.ts`,
  `src/utils/algorithm/__tests__/mixQuality.test.ts`

## Context

Every criterion existed four times: once in the construction (`scoring/*`),
once in the refinement (`scoring/arrangementScoring.ts`), once in the
fulfilment the teacher reads (`seatingStatistics.ts`) and once in the
highlights that explain it (`criterionHighlights.ts`). The four disagreed, and
the refinement — which decides last — did not see what the construction saw.
Measured with fixed seeds before the change:

- The annealing's delta read only the two swapped tables, while relations
  across tables were counted at the table with the lower index. Its running
  score drifted by about 200 points on average, and in 4 of 40 runs the
  "best" plan it handed back was worse than its start by its own score.
- At single desks the refinement saw no wish or distance wish — it scored
  seat pairs only: wish partners sat side by side in 74 % of constructions and
  32 % of mixes (chance: 29 %), conflict pairs in 17 % and 31 %.
- Students needing a front seat were placed by coordinate before anyone else,
  at any level, and frozen there: two of them who avoid each other and are
  both restless shared a desk in 100 of 100 mixes when one desk of the front
  row stood 2 px further forward.
- The refinement charged a weak student beside a neutral one as much as two
  weak students together, so the weak students left over always sat together;
  distractible-beside-restless counted only when the distractible student had
  the lower seat index (3.67 against 0.00 points for the same situation).
- The fulfilment counted restless neighbours across aisles, which nothing
  optimised (0 restless desk pairs read as 0.7 %), capped language support
  structurally (a perfect plan: 21 %) and read distance wishes at single desks
  as always met.
- "Mischen" without a criterion was not random: an unweighted capacity term,
  a fixed order (restless students first) and a tie broken by `rng() < 0.5`
  kept restless students apart in every plan (chance: 26 %) and put them at
  the tables added last (0.00 at the first, 0.66 at the last).
- Directions were screen directions: with the board on the right — the
  default — "beside" and "in front" were swapped, and the construction seated
  wish partners one behind the other.

## Decision

- **One model** in `src/utils/algorithm/model/`: `seatRelations.ts` relates
  every two seats once per scene — `partner` (the seat pair by index),
  `table` (the rest of the table), and at another table only the nearest seat
  `beside`, `ahead` or `behind`, read relative to the board
  (`determineFrontDirection`), with no aisle in between (`ADJACENT_GAP` 40 px
  along the board, `ROW_GAP` 70 px to the next row). `criteria.ts` writes
  every criterion down once as a pair, seat, table or language term, weighted
  by `RELATION_WEIGHTS` (1 / 0.6 / 0.5 / 0.3 / 0.3) and `CRITERION_WEIGHTS`.
  `objective.ts` sums them (`scoreArrangement`) and computes a swap exactly
  (`swapDelta`); `fulfilment.ts` turns the same terms into the cases the
  fulfilment and the highlights read. The scorers of `scoring/` are gone.
- **What "next to" means** (maintainer, 2026-10-18): the seat partner fully,
  the same table strongly, the seat directly beside, in front or behind at
  the next table less — for wishes, distance wishes, restless and distractible
  students alike, in the mixing and in what the teacher reads.
- **The fulfilment counts against what is possible:** a wish met as well as
  the room allows is met (single desks: the seat beside), a student with two
  wishes counts once by the wish met best, tutoring and same-level pairs count
  against the pairs the class and the tables can hold, gender against the
  tables the class's make-up can balance.
- **Front seats by level** (maintainer): only "Sehr wichtig" keeps a student
  needing a front seat within the front rows (`frontPool.ts`, rows as
  `tableRowsFromFront` counts them); who sits beside whom there is decided by
  every other criterion, and the refinement may swap such students within
  the pool. Below "Sehr wichtig" the front seat is a weight like any other.
  _How it weighs there: [addendum of 2026-10-19](#addendum-of-2026-10-19-the-row-behind-below-sehr-wichtig)._
  The recommended weight and the recipes set 8; settings stored before carry
  no `criteriaVersion` and are lifted once from a level below to 8
  (`migrateStoredMixSettings`), since every level guaranteed the front row
  until now.
- **Without a criterion, chance** (maintainer): the students are dealt onto
  the seats the tables take by Fisher–Yates, as the circle's shuffle is.
- **Gender** (maintainer): boys, girls and diverse students are three genders
  of their own; "not stated" is none. A table is balanced while no gender
  holds more than half of it; the criterion is offered once two different
  genders are in the class.
- **Repetition** (maintainer): an earlier plan weighs by its rank in a fixed
  window, whatever the number of plans, and a pair that sat together more
  often weighs more, up to `MAX_PAIR_WEIGHT` = 2. _Which plans count:
  [decision 0032](0032-repetition-reads-plans-in-use.md)._
- **The refinement** is simulated annealing alone, on the exact delta, with
  students picked evenly. Greedy refinement, which the app never ran, is gone
  with its tries, passes and table selection; so is `circle:generate`, which
  nothing could reach. "Mischen" takes three starts and keeps the best plan by
  the score, never one worse than a construction.
- **Hints:** `feasibility.ts` names in the plan's inspector what cannot be
  met — more students needing a front seat "Sehr wichtig" than the front row
  holds, a group avoiding each other larger than the tables, a wish answered
  with a distance wish, a student wished for by more than can sit around
  anybody.
- **The first plan** on the plan layer no longer sets weights of its own; it
  mixes by the teacher's.

## Alternatives considered

- **Correcting each finding within the four definitions.** Declined on
  2026-10-18: the four copies would keep drifting apart, and every correction
  changes the plans anyway.
- **Correcting only the critical findings.** Leaves the fulfilment measuring
  something else than the mixing optimises.
- **"Next to" as the same table only,** as the refinement had it — single
  desks would have no neighbours at all; **as the whole surrounding,** as the
  fulfilment had it — often impossible to meet in a full room.
- **Front seats guaranteed at every level, but aware of the other criteria.**
  Declined in favour of the levels meaning what they say.
- **Divers as neutral, balancing boys and girls only.** Declined: divers is a
  gender of its own.
- **"Freunde trennen"** for written tests, wish partners kept apart. Declined.

## Consequences

- Every plan with a criterion changes. A seed comparison — five rooms, 30 seeds
  each, by the new fulfilment
  (`MIX_QUALITY=1 npx vitest run mixQuality`) — found the weighted fulfilment:

  | Room                                       | Before |  After |
  | ------------------------------------------ | -----: | -----: |
  | Single desks close together                | 76.9 % | 87.0 % |
  | Double desks as "Neu einrichten" sets them | 84.2 % | 88.1 % |
  | Group tables of four                       | 85.1 % | 88.8 % |
  | Mixed and turned tables                    | 82.0 % | 86.7 % |
  | Double desks with history and locks        | 83.4 % | 84.9 % |

  Wishes at single desks 16.8 → 69.4 %, distance wishes 98 → 100 % in every
  room, restless students 66.8–95.3 → 75.0–100 %. Criteria at a low level give
  way more than before where the old refinement weighed them by accident:
  tutoring ("Beachten") 74.0 → 54.7 % beside a heavy history.

- "Mischen" is faster although it starts three times: 109 / 116 / 120 →
  63 / 70 / 72 ms for 12 / 24 / 36 students under Vitest 5
  ([PERFORMANCE.md](../PERFORMANCE.md#algorithm-runtime)).
- A "random" mix is random: restless students sit together as often as chance
  has it.
- The percentages a teacher reads change, mostly upwards, and mean what they
  say: 100 % is a plan the class and the room allow no better on that
  criterion.
- Stored settings gain `criteriaVersion`; older settings, backups and mixes of
  the history are migrated where they come in. `neighborWeights` stays in the
  stored settings and backups but is no longer read — there never was a
  control for it.
- The worker's `mix:run` takes `refine` as a flag, and `circle:generate` is
  gone; the worker ships with the app, so no stored data is affected.
- The initial payload grows by 6 KB brotli (195 → 201 KB of 220): the
  fulfilment reads the model.

## Addendum of 2026-10-19: the row behind below "Sehr wichtig"

Below "Sehr wichtig" the front seat was a seat term by the seat's depth, 0 at
the back to 1 at the front of the room: the second row cost as much more than
the first as the fifth more than the fourth, and how much a row cost depended
on how deep the room was — in a room three rows deep the second row was
halfway to the back. The fulfilment counted only the front rows as met at
every level, so a student in the second row read as unmet at "Wichtig" too.
Most students needing a front seat need to be near the teacher, not to read
the board, and for them the second row is a front seat (maintainer).

- **By rows, not by depth** (`frontRowsOf` in `model/frontPool.ts`): the
  front rows are the rows of the pool — row by row from the board until every
  student needing a front seat fits on the seats in use. Below "Sehr
  wichtig" the row behind them counts as a front seat too
  (`FRONT_TOLERANCE_ROWS` = 1), while a row of the mix stays behind it: a room
  two rows deep keeps its back row a back row, and a pool that already takes
  every row but the last gets no tolerance.
- **The cost** (`frontSeatCost`, `CRITERION_WEIGHTS.front`): nothing in the
  front rows, 0.15 in the tolerated row — so the front row still wins when
  nothing else matters — 1 in the first row that no longer counts and 0.25
  more per row behind it. "Beachten" and "Wichtig" share the rule and differ
  by their weight alone.
- **The fulfilment counts the same**: the front rows and the tolerated row
  are met, a row further back is not. A hint is not needed: the front rows
  grow until every student needing one fits, so the soft levels ask nothing
  the room cannot give.
- **"Sehr wichtig" is unchanged**: the pool, its fulfilment, and within the
  pool the seat term by depth, which draws a student to the board's side of
  a group table. The seed comparison at the recommended weight gives the same
  plans as before.

The seed comparison with "Vordere Plätze" at "Wichtig" (weight 5, otherwise
as in `mixQuality`, 30 seeds per room; the fulfilment before counts the
second row as unmet):

| Room                                       | Front seats before → after | Overall before → after |
| ------------------------------------------ | -------------------------: | ---------------------: |
| Single desks close together                |               50.0 → 100 % |          81.6 → 86.9 % |
| Double desks as "Neu einrichten" sets them |              47.8 → 93.3 % |          83.5 → 87.6 % |
| Group tables of four                       |              60.0 → 98.9 % |          84.7 → 88.2 % |
| Mixed and turned tables                    |                100 → 100 % |          85.8 → 86.0 % |
| Double desks with history and locks        |               66.7 → 100 % |          81.7 → 84.3 % |

Beyond the tolerated row a row costs more than before, so the criterion
holds harder against the back: wishes at single desks 74.7 → 69.5 %, the
other criteria within a point.

## Addendum of 2026-10-29: where a seat sits at a group table

`table` weighed every seat of a group table but the partner's alike, 0.6: at a
table of six the seat round the corner, shoulder to shoulder, counted as much
as the seat at the far end of the diagonal, and the gender mix by pairs did not
see the corner at all. Two restless students round a corner or face to face
cost as much as two at opposite ends.

- **Four relations at one table** (`seatRelations.ts`, `tableSeatKind`):
  `partner` stays the seat pair by index; `corner` is a seat whose cell
  touches at another edge, `opposite` one at the facing edge in the same
  column or row, `table` every seat further away. They are read from the
  template's grid and the edge each seat faces (`determineSeatEdge`), in the
  table's own frame, so a turn changes nothing; a seat count no template knows
  keeps the pair and the rest of the table (`hasTemplateSeatLayout`). A test
  holds that the pairs by index are exactly the seats side by side at one
  edge in every template.
- **Three steps for the teacher** (maintainer): partner 1, round the corner
  or across 0.8, further away at the table 0.4 — a little less than the seat
  directly beside at the next table (0.5), which is closer than the far end
  of a table of six. A table of four keeps its mean of 0.6 between the
  across pairs and the diagonals.
- **Every criterion reads the steps** (maintainer): one relation, one
  weight, as before — repetition and tutoring too, which therefore count a
  diagonal at a table of six less than before. All four relations count as
  the same table for repetition, tutoring, shyness and language support.
- **The gender mix by pairs counts the corner** (maintainer): partner,
  corner and beside; across the table does not.

Where pairs end up, counted by the seats' position alone and so comparable
before and after (`arrangeTables` with five tables of six and seven of four,
28 and 26 students, recommended weights, 30 seeds, per mix):

| Table of six                                    | before | after |
| ----------------------------------------------- | -----: | ----: |
| Two restless students round a corner/across     |   1.13 |  0.17 |
| Distractible and restless round a corner/across |   2.13 |  0.40 |
| Wish as the seat partner                        |   9.50 |  8.73 |
| Wish round the corner/across                    |   2.80 |  6.30 |
| Wish further away at the table                  |   6.33 |  2.93 |
| Same gender round the corner                    |   4.50 |  3.50 |

At the tables of four the across pairs take the wishes from the diagonals
(2.67 → 4.63 across, 2.20 → 1.20 diagonal) and no distractible student sits
across from a restless one any more (0.30 → 0).

The fulfilment over 80 other seeds (the percentages of wishes and restless
students read the new weights, so they are not quite the same measure):

| Room                 | Overall before → after | Social roles before → after |
| -------------------- | ---------------------: | --------------------------: |
| Group tables of four |          88.9 → 89.6 % |               78.3 → 72.6 % |
| Group tables of six  |          85.7 → 86.9 % |               65.5 → 62.4 % |

The social roles, a table term, lose because pairs at one table now differ
more and the mixing trades a role for a better pair; raising their weight
would move every room, the double and single desks too, so it stays as it is
— "Sehr wichtig" gives the roles precedence. Double desks and single desks
mix as before, and a mix takes no longer.

Repetition reads the same steps, while the history only knows who shared a
table: a group put together again at the far seats of a table of six costs
0.4 instead of 0.6. Measured over a run of five plans, each mixed with the
ones before as its history (30 seeds, plans 2 to 5, pairs that wish to sit
together left out, which were then no repetition), repeated table pairs per
plan against every earlier plan:

| Room, repetition at            | before | after | close (partner, corner, across) | further away |
| ------------------------------ | -----: | ----: | ------------------------------: | -----------: |
| Tables of six, recommended     |   7.03 |  7.87 |                     2.74 → 1.05 |  4.28 → 6.82 |
| Tables of six, "Sehr wichtig"  |   5.24 |  5.93 |                     1.96 → 0.47 |  3.28 → 5.47 |
| Tables of four, recommended    |   1.38 |  1.79 |                     0.77 → 0.30 |  0.61 → 1.49 |
| Tables of four, "Sehr wichtig" |   0.39 |  0.84 |                     0.17 → 0.06 |  0.23 → 0.78 |

A table of six seats about 50 pairs that do not wish each other; a random
plan repeats about 11 of the plan before, the mixing 2.4 (2.0 before). So
repetition is still held off firmly, and where a pair repeats it now sits at
the far end of the table rather than shoulder to shoulder: close repetitions
fall by about 60 %, the far ones rise. Read as the make-up of a group working
at the whole table that is a small step back (+12 %), read as who talks to
and distracts whom a step forward, and the second reading is the one the other
criteria now follow. A flat weight for repetition alone would win back the
0.8 pairs and most likely the close repetitions with them, so it stays as it
is; "Sehr wichtig" holds the groups apart harder than the recommended level
did before.
