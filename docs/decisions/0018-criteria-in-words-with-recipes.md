# 0018 – The criteria are set in words, and a recipe sets them all

- **Status:** accepted
- **In place since:** unreleased (2026-09-20)
- **Sources:** maintainer decision of 2026-09-20, the redesign concept
  "Papier & Werkzeug" (stage 4, "Rezepte & Gründe"), `src/utils/mixImportance.ts`,
  `src/utils/mixRecipes.ts`, `src/utils/algorithm/planReasons.ts`; revised by
  the maintainer's review of 2026-09-21 (fine tuning removed, fulfilment in per
  cent)

## Context

Mixing a seating plan asked for sixteen numbers. Every criterion carried a
slider from 0 to 10, the panel called them "Gewichtung", and the recommended
values (8 for wish partners, 5 for restlessness, 2 for shyness) were the only
thing standing between a teacher and sixteen arbitrary decisions.

The numbers are real — the algorithm multiplies them into its placement and
table scores (`PLACEMENT_SCORE_WEIGHTS` / `TABLE_SCORE_WEIGHTS`) — but they are
not a question anybody can answer. "Wie wichtig ist dir Unruhe?" has an answer.
"Wie viel von zehn ist dir Unruhe wert?" has not, and the difference between 6
and 7 is not something a teacher can see in a plan.

The same panel then reported the result as a percentage per criterion, which
has the opposite problem: "78 %" of four restless students is not a number
anyone can picture, and nothing anywhere said what the plan had actually done.

## Decision

Three changes, all in the layer above the algorithm — the weights, the scoring
and the plans the algorithm produces are untouched.

1. **Four named levels instead of eleven numbers.** `mixImportance.ts` maps the
   weights into `off` (0), `consider` (1–3), `important` (4–6) and `essential`
   (7–10), and back: pressing a level writes that band's weight (0, 3, 5, 8).
   A weight already inside the band survives — pressing the level a recipe or
   an earlier fine tuning already set cannot change the plan it produces. The
   slider first stayed one press away behind "Feinjustierung"; the review of
   2026-09-21 removed it, because the panel above the criteria had grown
   cluttered, so the four words are the whole scale now. `spg.mixFineTuning`
   is no longer written.
2. **Recipes.** `mixRecipes.ts` holds five named mixes — Empfohlene Mischung,
   Ruhige Arbeitsphase, Gruppenarbeit, Klassenarbeit, Neue Klasse — that set all
   sixteen weights at once, above the criteria they set. Criteria the class has
   no data for stay off (decision 0016), and a recipe is a starting point, not a
   lock: moving any criterion afterwards makes the mix the teacher's own again.
3. **"Warum dieser Plan".** `planReasons.ts` builds up to three sentences from
   the plan that was actually mixed, using the same per-seat data the criterion
   highlights are drawn from. It always keeps the criterion that came off worst.

The fulfilment beside each criterion is a bar and its percentage. For a day it
showed the plain counting where there was one ("3/4"); the review of 2026-09-21
brought the percentage back, so every criterion and the plan's total above them
read on one scale. The counts still feed the sentences of "Warum dieser Plan".

## Alternatives considered

- **Leave the numbers and only rename the panel.** Cheapest, and it keeps the
  precision. But it leaves the question unanswerable, which is the actual
  problem; the concept's own note on this stage says the fine tuning has to stay
  good, not that the numbers have to stay in front.
- **Three levels instead of four.** "Egal / wichtig / sehr wichtig" reads even
  faster, but the recommended weights fall into four groups, and folding 2 and 5
  into one level would have changed existing plans on first use.
- **Store the chosen recipe with the settings.** It would survive a reload and
  remove the guessing in `matchMixRecipe`. It also adds a field to a stored
  format for a label, and would have to answer what happens when a stored recipe
  no longer matches its own weights. The recipe is derived instead, and the
  chosen one is remembered for as long as the weights still match it.
- **Sentences from templates.** Three encouraging lines per criterion would have
  been a tenth of the work. A teacher who checks one against the seats and finds
  it wrong has no reason to believe any of them, so a reason that cannot be
  backed by seats is not produced at all.

## Consequences

- Stored settings are unchanged: `MixSettings` still holds sixteen numbers from
  0 to 10, and plans mixed before this change come out exactly as before.
- A teacher who set 7 by hand sees "Sehr wichtig" and keeps the 7. One who then
  presses "Wichtig" gets 5 — the level is a decision, and it overwrites.
- The recommended weights now also have a name ("Empfohlene Mischung"), so
  `withDefaultWeights` has a second way in through the recipe list.
- The sentences need names, so they read the class's student names. They stay in
  the browser like everything else (decision 0001) and follow the same
  shortening the seats use.
- Adding a criterion now means three things instead of one: its level chips come
  for free, but it needs a `met` and an `open` sentence in both languages, and a
  decision whether names say anything about it
  (`NAMED_CRITERIA` in `planReasons.ts`). A test holds both languages to that.
