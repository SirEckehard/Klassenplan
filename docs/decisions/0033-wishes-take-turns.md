# 0033 – Wishes take turns, friends who wish each other hold longer

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the maintainer's decisions of 2026-10-29 (wishes take turns; a
  mutual wish counts more than a one-sided one; the order of a wish list
  stays; one rule, no switch; the fulfilment leaves friends who stay together
  out of "Wiederholung"),
  [ALGORITHM.md](../ALGORITHM.md#wishes-take-turns),
  `src/utils/algorithm/model/criteria.ts` (`historyFactor`, `wishEachOther`),
  `src/utils/algorithm/model/fulfilment.ts`,
  `src/utils/constants.ts` (`CRITERION_WEIGHTS.mutualWishRepetition`),
  `src/utils/algorithm/__tests__/mixRuns.test.ts`,
  `src/utils/algorithm/__tests__/mixRegressions.test.ts`

## Context

Since 2026-09-19 a pair in which either student wished the other was exempt
from "Wiederholung" while wishes counted: a pair the class asked for was no
repetition to break up, and the wish belonged to the pair rather than to
whoever wrote it down ([decision 0031](0031-one-criterion-model.md) kept the
rule). Measured over a run of six plans, each mixed with the ones before as
the plans in use, the rule turned wishes into fixed pairs:

- a student with two wishes got the same one as last time in 69–79 % of the
  plans, since the first wish (factor 1) always beat the second (0.85);
- a classmate wished one-sidedly, with no wish of their own, sat with the same
  wisher again in up to 35 % of the plans at tables of six, without having
  chosen it;
- "Wiederholung" read close to 100 % while the teacher saw the same couples
  every week.

## Decision

- **A wish does not shield a pair from repetition** (`historyFactor`): every
  pair counts in full, a one-sided wish like any pair, so a student with
  several wishes takes them in turn and the wished classmate is not tied to
  the one who wished.
- **Friends who wish each other count half** while wishes count
  (`CRITERION_WEIGHTS.mutualWishRepetition` = 0.5). Their wish is rewarded in
  both directions already — 16 against at most 12 for a repetition at the
  recommended weights — so with half the penalty they stay together unless
  something weighs more.
- **The order of a wish list stays** (1 / 0.85 / 0.7): the first wish comes
  round more often than the others.
- **One rule, no switch.** A teacher who wants fixed pairs sets
  "Wiederholung" lower or off.
- **The fulfilment leaves friends who stay together out of "Wiederholung"**
  (`wishEachOther`): that they sit together again is what the class asked
  for, not a repetition the plan failed to part, and 100 % still means the
  plan could not do better. The mixing still counts them at half — the one
  place where what is optimised and what is read differ.

## Alternatives considered

- **No exemption at all** (every wish pair counts in full): wishes met in 40 %
  of the plans at double desks instead of 76 %, friends together in 44 % —
  wishes would feel unreliable.
- **Friends at 0.75**: friends together in 72 % of the plans at double desks
  instead of 86 %, for barely more turn-taking among one-sided wishes.
- **A switch "Wunschpaare dürfen zusammenbleiben"**: a setting more for a
  question a lower "Wiederholung" already answers.
- **Counting friends at half in the fulfilment as well**: one model, one
  number, but "Wiederholung" fell from 90 % to 59 % at double desks over a
  run although the plans were the intended ones.

## Consequences

Measured with `MIX_RUNS=1 npx vitest run mixRuns` — six friendships, eight
one-sided first wishes, a second wish for about half of those who wish,
recommended weights, plans 2 to 6, 30 seeds; tables of six / four / double
desks:

| Over a run of plans                       | before           | after          |
| ----------------------------------------- | ---------------- | -------------- |
| Two wishes: the same one twice running    | 79 / 77 / 69 %   | 42 / 30 / 3 %  |
| Friends who wish each other together      | 99 / 100 / 100 % | 99 / 97 / 86 % |
| Wished one-sidedly, with the wisher again | 35 / 17 / 7 %    | 6 / 2 / 0 %    |
| A student with one wish gets it           | 81 / 82 / 77 %   | 67 / 79 / 65 % |
| A wish met at the table                   | 87 / 85 / 76 %   | 74 / 73 / 62 % |
| "Wiederholung" read                       | 93 / 96 / 90 %   | 91 / 93 / 93 % |
| Overall fulfilment read                   | 84 / 83 / 86 %   | 81 / 82 / 85 % |

- **Wishes are met less often over a run**, by 10 to 14 points: a wish not
  met because it was met last time is the turn-taking itself. The fulfilment
  reads one plan and knows nothing of turns, so "Wunschpartner" reads lower
  on the second plan and after, although the plan is the intended one.
- **The first plan of a class mixes as before**: without plans in use there
  is no repetition.
- In `mixQuality`'s room with a history of two random plans, "Fördern
  (heterogen)" fell from 54 to 39 % and "Sprachförderung" rose from 80 to
  92 % over 80 seeds, the whole unchanged: the one-sided wish pairs of the
  random history now cost, and the mixing trades between two light criteria.
  Over a run of mixed plans tutoring holds (96 / 91 / 73 % after against
  86 / 92 / 76 % before).
- Stored data, the worker protocol and the circle, which carries no history,
  are unchanged.
