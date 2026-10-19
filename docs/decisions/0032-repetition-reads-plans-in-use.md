# 0032 – Repetition counts the plans in use, never a mix

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the maintainer's report and decisions of 2026-10-19 (the
  "Wiederholung" bar falls while mixing again and again; only plans in use
  count, and chance with the other criteria is enough to vary the next mix),
  [ALGORITHM.md](../ALGORITHM.md#how-the-weights-are-built),
  `src/utils/pairs.ts` (`buildPreviousPairs`),
  `src/utils/algorithm/model/readPlan.ts`,
  `src/utils/algorithm/seatingAlgorithm.ts` (`runMixSession`),
  `src/workers/algorithmOperations.ts` (`mix:run`),
  `src/hooks/useSeatingAlgorithm.ts`

## Context

"Wiederholung" read two histories: the plans in use (the usage records, or the
saved plans) and the mixes of the mix history at half weight. The mixing also
counted the plan on screen as the newest plan in use, which after a mix is
the mix before — an experiment. Four things followed:

- **The bar fell while the teacher mixed.** Every mix added its pairs to the
  history, and the fulfilment read them
  ([decision 0031](0031-one-criterion-model.md) had it read what the mixing
  weighed). Measured over 15 mixes in a row, 26 students and two plans in use:
  at double desks 100 % for ten mixes, then down to 85 %; at tables of four
  100 → 70 %. Against the plans in use alone the same plans stood at
  100 % and 95–100 %.
- **A plan in use counted against itself.** Presenting, exporting or saving a
  plan gives it a usage record, and the fulfilment read the plan against that
  record: at tables of four 100 % before presenting, 27 % after.
- **Experiments could outweigh plans in use.** Since decision 0031 a pair's
  weights add up to `MAX_PAIR_WEIGHT`; three recent mixes gave a pair about
  1.4, more than a plan the class sat in (1.0). The mix before also counted
  twice — at 1 as the plan on screen and at 0.5 in the mix history.
- **The auto-save counted** when the saved plans stood in for the records,
  although the backfill into the records had always left it out.

## Decision

- **Only plans in use count**, for the mixing, the fulfilment and the
  highlights alike: the counted usage records, or — while none counts and the
  class detects its plans — the saved plans the teacher named.
  `buildPreviousPairs` takes no mix history and no arrangement on screen any
  more, and `MIX_HISTORY_CONTRIBUTION` is gone. A plan on screen that was in
  use is in the records; one that was not is an experiment.
- **That the next mix differs is left to chance and the other criteria.**
  "Mischen" has three random starts; nothing keeps it from the pairs of the
  mix before.
- **A plan is no repetition of itself.** The fulfilment and the highlights
  pass the plan they read (`buildPreviousPairs`' `plan`), and the record with
  its fingerprint, or a saved plan seating the same pairs, is left out. The
  mixing passes none: the plan on screen, once in use, is the newest plan to
  part.
- **The auto-save never counts** as a plan in use.
- `mix:run` loses `mixHistory` and `lastSeating`, `generateSeatingPlan`,
  `runMixSession` and `refineSeatingLocal` their `mixHistory` (and the first
  two the plan on screen), and the statistics and highlights their
  `mixHistory`. The mix history itself stays — for "Bibliothek" and to open
  an earlier mix.

This replaces the part of [decision 0027](0027-one-mix-session.md) that had
both phases weigh "the plan on screen, the plans in use, the earlier mixes".
The rule of [decision 0031](0031-one-criterion-model.md) holds: what the bar
shows is what was optimised — both read the plans in use alone.

## Alternatives considered

- **The bar on the plans in use, the mixing on the mixes as well, capped
  below a plan in use.** Shown to the maintainer on 2026-10-19: it would keep
  more variety from one mix to the next, but the bar would no longer read
  what was optimised. Declined — the bar only makes sense on the plans in
  use, and chance with the criteria varies a mix enough.
- **Leaving it.** The bar would keep falling for a plan that repeats nothing
  the class sat in, and a plan in use would read as repeating itself.

## Consequences

- Mixing again and again leaves "Wiederholung" where it is; presenting,
  exporting or saving a plan leaves it too.
- Two mixes in a row share more pairs. Measured over 20 mixes, 26 students
  with many attributes, the default weights: at double desks 43 → 63 % of a
  mix's pairs were those of the mix before (35 instead of 63 different pairs
  in all), at tables of four 18 → 46 % (165 instead of 271). No mix repeated
  the one before entirely. Where many criteria leave few good plans, the
  mixing returns to them.
- Plans change for classes that mix with "Wiederholung" on and have mixed
  before. By the quality harness (`MIX_QUALITY=1 npx vitest run mixQuality`,
  which no longer seeds a mix history) the room with history and locks reads
  85.0 % (84.9 % before); the rooms without history are unchanged.
- A class that marks its plans by hand and marked none has no repetition to
  avoid ([decision 0025](0025-plan-usage-marked-by-hand.md) said the plan on
  screen and the recent mixes would push pairs apart then).
- The worker protocol changes. The worker ships with the app, so no stored
  data and no older client is affected.
- The FAQ says so ("Wie funktioniert die Wiederholungsvermeidung?").
