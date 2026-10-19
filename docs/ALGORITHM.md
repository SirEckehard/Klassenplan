# Algorithm Documentation

> **Status:** current · **Last reviewed:** 2026-10-19

This document describes the algorithms used in the Klassenplan seating generator.

## Overview

A plan is mixed in two phases that decide by one score:

1.  **Construction**: the students are placed one by one, each on the seat that costs the plan least so far.
2.  **Refinement**: simulated annealing swaps students to lower the score.

Both run as one session, in one worker call (`mix:run`, `runMixSession`), and
decide by the same facts ([decision 0027](decisions/0027-one-mix-session.md)):
the tables' targets the construction draws, and the pairs of the plans in use
— never an earlier mix or the plan on screen as such
([decision 0032](decisions/0032-repetition-reads-plans-in-use.md)) —
weighed alike in both phases, never the pairs the construction itself just
made. They also decide by the same **criterion model**
([decision 0031](decisions/0031-one-criterion-model.md)), which the
fulfilment beside each criterion and the highlights on the seats read too: a
criterion is written down once, so what a teacher reads is what was optimised.

| UI action                                   | Runs                                                                         |
| :------------------------------------------ | :--------------------------------------------------------------------------- |
| "Mischen" / shuffle, at least one criterion | three starts of construction and refinement, the best plan by the score wins |
| "Mischen" / shuffle, all weights at 0       | the students dealt onto the seats at random (Fisher–Yates), nothing else     |
| The first plan on the plan layer            | the same as "Mischen", with the teacher's weights (`useSeatingWizard`)       |

Nothing refines outside a mix: a restored backup keeps its plan as it was
saved. The mix history gains one entry per mix, the arrangement the session
settled on — the one on screen, the plan the teacher actually got.

## The criterion model

`src/utils/algorithm/model/` holds it:

- **`seatRelations.ts`** relates every two seats of a scene once: `partner`
  (the seat pair by index — (0,1), (2,3), (4,5)), `table` (the rest of the
  same table) and, at another table, only the nearest seat in each direction
  — `beside` along the board, `ahead` towards it, `behind` away from it. The
  directions are read relative to the board (`determineFrontDirection`), not
  the screen, and a turned table meets its neighbours where it is drawn. A gap
  of more than `ADJACENT_GAP` (40 px, about 45 cm) along the board is an
  aisle; the next row counts while the gap is at most `ROW_GAP` (70 px, the
  room a chair takes). Diagonal seats and a seat beyond a seat are no
  neighbours. "Neu einrichten" leaves 60 px between desks along the board, so
  there the desks of a row are apart and the row behind is close.
- **`criteria.ts`** writes every criterion down once, as a `pair` term (two
  students in a relation), a `seat` term (a student on a seat), a `table`
  term (who shares a table) or the language term (who sits around a student
  needing support). A relation weighs by `RELATION_WEIGHTS` — partner 1, table
  0.6, beside 0.5, ahead and behind 0.3 — and a criterion by its weight and
  the multipliers in `CRITERION_WEIGHTS`.
- **`objective.ts`** builds a context once per mix and sums the terms
  (`scoreArrangement`); `swapDelta` computes what a swap changes exactly, by
  every relation the two seats take part in; `placementCost` what placing a
  student adds.
- **`fulfilment.ts`** turns the same terms into the cases the fulfilment and
  the highlights read (see [Fulfilment](#fulfilment)).

What each criterion counts:

| Criterion                                 | Term                                                                                    | Relations              |
| :---------------------------------------- | :-------------------------------------------------------------------------------------- | :--------------------- |
| Wunschpartner                             | reward per directed wish, by its place in the list (1 / 0.85 / 0.7)                     | all                    |
| Distanzwünsche                            | penalty per directed distance wish, twice a wish's weight (1 / 0.9 / 0.8)               | all                    |
| Unruhe, Ablenkbarkeit                     | penalty for two restless or two distractible students, by the larger special weight     | all                    |
| Ablenkbar neben Unruhig                   | penalty when one is distractible and the other restless, either way round               | all                    |
| Wiederholung                              | penalty by the history's weight of the pair; none for a wish pair while wishes count    | partner, table         |
| Geschlechter                              | per table the students by which a gender holds more than half; same gender side by side | partner, beside; table |
| Fördern (heterogen / homogen)             | reward for a strong and a weak student (or two of one level), penalty for the other     | partner, table         |
| Schüchternheit                            | penalty for a shy student with no taken seat close by                                   | partner, table, beside |
| Sprachförderung                           | reward for a student needing support by the closest strong speaker                      | partner, table, beside |
| Soziale Rollen                            | per table: the same role twice, loners and mediators, a leader beside a mediator        | table                  |
| Vordere Plätze, Körpergröße, Fenster, Tür | by the seat's depth (0 at the back, 1 at the front) or distance to window and door      | —                      |

Boys, girls and diverse students are three genders of their own; "not stated"
counts for none. A criterion off costs nothing, and only one performance
criterion applies ([decision 0013](decisions/0013-one-performance-criterion.md)).

## How many students a table takes

Before a student is placed, `seatTargetsFor()`
(`src/utils/algorithm/seatTargets.ts`) decides how many students each table
takes. A seat at or beyond its table's target stays empty: the construction
skips it, and the refinement refuses a swap that would fill it. The
construction also stops at a table that has its count, and so does the
refinement of a mix, by the construction's targets — a student locked to a
back seat leaves the seats before it open to the index check. A refinement run
on its own draws targets of its own and counts only the tables
`tablesHeldByCount` names (every table when filling from the front, otherwise
the tables out of the mix), since holding the rest to its own draw would only
narrow its search. Two properties of the room change the
targets ([decision 0026](decisions/0026-tables-out-of-the-mix.md)):

- **A table out of the mix** (`ClassroomTable.inactive`) takes nobody. A
  student locked to one of its seats stays there and needs no other seat; the
  students needing a front seat only get seats of the mix.
- **Filling from the front** (`ClassroomScene.fillFromFront`) fills the tables
  of the mix to the brim one after the other: row by row away from the board
  (tables less than `FRONT_ROW_TOLERANCE` apart count as one row) and, within a
  row, from the board's middle outwards (`frontToBackTableOrder`). Locked
  students keep their tables first. The order is fixed, so construction and
  refinement agree on which tables stay empty.

Without either, the students spread evenly over all tables from a random one
on (`evenTargetsFor`).

## Front seats

"Vordere Plätze" acts by its level ([decision 0031](decisions/0031-one-criterion-model.md)):

- **"Sehr wichtig"** keeps every student needing a front seat within the front
  pool (`model/frontPool.ts`): row by row away from the board, as "Von vorne
  besetzen" counts rows, the seats the tables take until all of them fit. A
  table set a few pixels forward by hand is no row of its own. Who sits beside
  whom in the pool is up to every other criterion; the refinement may swap
  such students within it, never out of it. A lock wins.
- **"Wichtig" and "Beachten"** make the front seat a weight like any other: a
  seat term by the seat's depth, which a stronger criterion can outweigh.

The recommended weight and the recipes set "Sehr wichtig". Settings stored
before carry no `criteriaVersion`; a level below "Sehr wichtig" is lifted to
it once (`migrateStoredMixSettings`) where stored settings come in, since
until then every level kept the students in the front row.

## Construction

Locked students take their seats first. Without a criterion that is all the
construction knows: the other students are dealt onto the seats the tables
take in a random order, every order equally likely — no hidden order, no
seat preferred.

With criteria, the students needing a front seat "Sehr wichtig" are placed
first, within the pool; then the others, the most bound first (how many of
the active criteria ask something of them), wish partners right after each
other (`reorderByWishPartners`). Each takes the seat with the lowest
`placementCost`, plus what the seat still promises: a student whose wish or
tutoring partner is not seated yet prefers a seat with room beside it. A tie
falls to each tied seat alike — the n-th tie replaces the choice with
probability 1/n.

## Refinement Strategies

The refinement is **simulated annealing** on the score of the criterion model
([decision 0004](decisions/0004-simulated-annealing-default.md)). The greedy
refinement that once stood beside it never ran in the app and is gone, with
its tries, passes and table selection
([decision 0031](decisions/0031-one-criterion-model.md)).

**Concept**: The algorithm explores the solution space by trying random swaps
— a student who may move, picked evenly, and any seat.

- If a swap improves the score, it is **always accepted**.
- If a swap _worsens_ the score, it is **accepted with a probability** that depends on:
  1.  How much worse the new score is (small regressions are accepted more often).
  2.  The current "temperature" (early in the process, chaos is allowed; later, only improvements are accepted).

**Formula**: $P(accept) = e^{(currentScore - newScore) / temperature}$

The difference a swap makes comes from `swapDelta`, exactly: the running score
is what decides which arrangement counts as the best one seen, and the
arrangement handed back is never worse than the one the refinement started
from. A swap keeps the seats beyond a table's target empty, holds every table
of a mix to the construction's count, never moves a locked student and keeps
a student needing a front seat "Sehr wichtig" in the pool.

"Mischen" runs **three starts** of construction and annealing, each from a
random stream of its own, and keeps the best plan by the score — never one
worse than a construction. One annealing comes close to its best; the starts
settle what one leaves to chance
([PERFORMANCE.md](PERFORMANCE.md#algorithm-runtime)).

## Configuration

The **Simulated Annealing** process is controlled by these parameters:

| Parameter           | Default | Description                                                                               |
| :------------------ | :------ | :---------------------------------------------------------------------------------------- |
| `initialTemp`       | `10.0`  | Starting "chaos" level. Higher values allow more bad swaps early on.                      |
| `coolingRate`       | `0.97`  | How fast the system cools down (0-1). closer to 1 = slower cooling, more thorough search. |
| `iterationsPerTemp` | `50`    | Number of swap attempts at each temperature step.                                         |
| `minTemp`           | `0.01`  | When to stop.                                                                             |

## Fulfilment

The percentage beside a criterion and the highlights on the seats come from
`model/fulfilment.ts`, by the same relations and terms the mixing weighs. A
criterion is a set of cases — a student, a wish, a table — and every case gets
a credit from 0 to 1: a restless student with a restless seat partner 0, with
a restless classmate directly behind 0.7, with none close 1. The percentage is
the mean credit, the highlight of a seat the lowest credit of the cases it
takes part in.

The cases are counted against what the room and the class allow, so 100 % is a
plan the mixing could not improve on that criterion:

- A student with wishes counts once, by the wish met best — one seat partner
  cannot meet two wishes — and a wish met as well as the room allows is met:
  at single desks the seat beside.
- Tutoring and same-level pairs count against the pairs the class and the
  tables can hold; at single desks there is none.
- Gender counts against the tables the class's make-up can balance: with 20
  boys and 8 girls at 14 double desks, 8 mixed desks are all there can be.
- A wish the wished classmate answers with a distance wish is the distance
  wish's case while distance wishes count.
- A plan is no repetition of itself: when it is the newest mix, that mix is no
  history, and the mix before it counts as the plan that was on screen.

## Hints

`model/feasibility.ts` names in the plan's inspector what the mixing cannot
meet, while there is something to say: more students needing a front seat
"Sehr wichtig" than the front row holds, a group of students avoiding each
other larger than the tables in the mix, a wish answered with a distance wish,
and a student wished for by more classmates than can sit around anybody in
the room.

---

## Plan Usage Record

`avoidPreviousPairs` reads pair weights from `buildPreviousPairs()`
(`src/utils/pairs.ts`). It once fed on the mix history, which had a known
weakness: teachers shuffle many times before settling, so the mix history is
mostly experiments, and a pair that happened to come up in a dozen consecutive
tries looked exactly like a pair that really sat together for a term. Since
[decision 0032](decisions/0032-repetition-reads-plans-in-use.md) no mix counts
at all.

The plan usage record fixes that. It notes which arrangements were **actually in
use**, derived from actions that only happen for a real plan — no extra step in
the UI:

| Signal      | Raised by                                       | Confidence |
| :---------- | :---------------------------------------------- | ---------: |
| `presented` | `/present` after 30 s of dwell time, table mode |        1.0 |
| `exported`  | print, PDF, PNG or SVG export of a table plan   |        1.0 |
| `saved`     | a plan saved under a name the teacher chose     |        0.8 |
| `edited`    | seats rearranged by hand (debounced 4 s)        |        0.3 |
| `marked`    | "Genutzt" in a plan's inspector, "Bibliothek"   |        1.0 |

A record is rated by its **strongest** signal, never by their sum: presenting a
plan twice is not better evidence than presenting it once.

**Deduplication** is what keeps the record honest. Every signal is reduced to
the sorted pair keys of the arrangement and hashed into a fingerprint
(`computePlanFingerprint`). A signal whose fingerprint already exists extends
that record — `lastSeenAt` moves, the source is added — instead of appending a
second one. Presenting the same plan every week for a term is therefore one
record spanning that term, not twelve records. Experiments never enter at all,
because nobody presents, exports or names them.

`edited` is deliberately weaker than the rest: rearranging seats says the
teacher means this arrangement, not yet that it was used. Such a record is
_provisional_ and is dropped as soon as a different arrangement turns up. If one
of the stronger signals arrives for the same fingerprint first, it is promoted
instead.

**Where it lives:** `src/utils/data/planUsage.ts` (pure merge rules),
`src/repositories/planUsageStore.ts` (storage, one bucket per class),
`src/hooks/plan/usePlanUsageTracking.ts` (the `edited` signal).

**One bucket per class, and it has to stay that way.** Until 2026-09-14
`activeClass` was set optimistically on a class switch, before the new class's
data had loaded, and an effect could see one class's id beside the previous
class's plans. Class id and class data now change in the same update
([ARCHITECTURE.md](ARCHITECTURE.md#switching-classes)); the one-time backfill
from older saved plans still runs inside `applyPersistedState`
(`src/hooks/useSeatingPersistence.ts`), where the id and the plans come from the
same load, and a pending `edited` signal is dropped when the class changes.
`sweepOrphanPlanUsage` is the backstop: on every load it drops records that name
nobody from the class they sit under, which also repairs buckets contaminated by
earlier versions.

**Starting afresh.** "Zurücksetzen" in the neighbourhood view forgets a class's
neighbourhoods in one click — a new school year, a class mixed up anew.
`resetPlanUsage` empties the bucket and stamps the moment; `buildPreviousPairs`
receives it as `since` and from then on leaves out what came before it: saved
plans dated up to the day of the reset (they carry a day, not a moment).
Without that, the empty bucket would make the saved plans the history of
record again. What is presented, exported or saved afterwards counts as usual.
A class that was never
reset produces exactly the plans it did before
([decision 0023](decisions/0023-neighbourhood-reset.md)).

### Confirmation

The signals are cheap because they are read from what the teacher does anyway —
which also means they can be wrong. So the record is written first and a toast
offers to take it back: doing nothing keeps the plan counted, one click marks it
`confirmed: false`. The prompt appears on the **first strong signal** for an
arrangement, never again for the same one, and never for a hand edit. The
projection keeps it until it is left (`usePlanUsagePrompt`'s
`holdUntilLeft`): the wall faces the class, the question is for the teacher.
The
neighbourhoods in "Bibliothek" list every counted plan and let one be
withdrawn or restored later — in the folder's inspector, and for a pair of
students in theirs. Each plan there is named by the saved plan that seats the same people side
by side, the date it was last used and the room it was made in
(`buildUsageOrigins`); one the class no longer holds keeps "Sitzplan vom" and
its date.

### Marking by hand

A teacher who does not want the plans detected switches "Automatisch erkennen"
off in a plan's inspector in "Bibliothek" — for the whole class, since the
neighbourhoods are the class's. From then on no signal is recorded for it, not
even the one-time backfill, and only what is marked as used counts: "Genutzt"
in the same inspector answers the plan's record (`confirmed: true` or `false`)
or, for a plan nobody detected, creates one with the source `marked`, dated the
day the plan was made so that marking an old plan does not make it the most
recent one. The switch works with the detection on as well, where it does what
the toast's correction does, at any time.

The detected records are kept while the class marks by hand.
`usePlanUsageRecords` resolves them for the mode (`resolvePlanUsageMode`): an
unanswered record reads as not counted, so the neighbourhood view and the
algorithm see only the marked plans, and switching the detection back on lets
the detected ones count again. `buildPreviousPairs` receives the mode as
`manual` (carried as `planUsageManual` beside `planUsageSince`, into the worker
too) and then never falls back to the saved plans — a class that marked
nothing has no history of real plans
([decision 0025](decisions/0025-plan-usage-marked-by-hand.md)).

`isCountedUsage()` in `src/utils/data/planUsage.ts` is the single definition of
what counts, shared by the evaluation and the scoring, so the number a teacher
reads and the number the algorithm optimizes cannot drift apart.

### How the weights are built

`buildPreviousPairs()` reads one history, the plans that were really in use
([decision 0032](decisions/0032-repetition-reads-plans-in-use.md)): the
counted usage records, weighted by `entry.confidence` — or, when no record
counts and the class detects its plans, the saved plans the teacher named
(not the auto-save), each at 1. A mix never counts, neither the mix history
nor the arrangement on screen: a plan on screen that was in use is in the
records anyway, and one that was not is an experiment. That two mixes in a
row turn out differently is left to chance and the other criteria.

The plans decay with recency over the window (`5 + ⌈students / 3⌉` plans, at
most 20): the newest counts fully, the last the window holds
`MIN_DECAY_WEIGHT`, and a plan weighs by its rank alone — last week's plan
weighs the same whether three plans or twelve came before it. A pair that sat
together in several plans adds up, to at most `MAX_PAIR_WEIGHT` = 2, twice a
single plan's weight, so the most frequent pairs are parted first
([decision 0031](decisions/0031-one-criterion-model.md)). The saved plans that
stand in when no usage record counts are ranked by their date. The
construction and the refinement charge a pair `avoidPreviousPairs` times its
weight alike, at the seat partner fully and at the rest of a table by the
table's relation weight; the fulfilment counts a pair as repeated up to its
first full weight.

**A plan is no repetition of itself.** The fulfilment and the highlights read
a plan with `buildPreviousPairs`' `plan`: the record with the plan's own
fingerprint, and a saved plan seating the same pairs, are left out. Otherwise
presenting, exporting or saving a plan would turn its own pairs into
repetitions and drop its "Wiederholung" towards 0 %. The mixing passes no
`plan` — the plan on screen, once in use, is the newest plan to part.

### Wish pairs are exempt

A pair the class asked for is not a repetition worth breaking up: while
`considerWishPartners` is active, `avoidPreviousPairs` skips its penalty for a
wish pair — in the one pair term the construction, the refinement and the
fulfilment share (`historyCounts` in `src/utils/algorithm/model/criteria.ts`). A wish in
**either** direction is enough, because the wish belongs to the pair rather than
to whoever wrote it down, and every wish of the list counts, not only the first
one.
