# 0038 – Presets of one's own, and the shipped ones changeable

- **Status:** accepted
- **In place since:** unreleased
- **Sources:** the maintainer's decisions of 2026-11-02 (presets kept for
  every class, managed in the criteria panel and in "Bibliothek", the shipped
  presets but "Standard" changeable with "Original wiederherstellen",
  "Empfohlene Mischung" renamed "Standard", applying a preset from
  "Bibliothek" without mixing), `src/utils/mixRecipes.ts`,
  `src/repositories/mixPresetStore.ts`, `src/hooks/ui/useMixRecipes.ts`,
  `src/components/ui/controls/MixRecipes.tsx`,
  `src/components/library/inspectors/PresetPanel.tsx`,
  [data-model.md](../data-model.md#mixing-presets),
  [backup-format.md](../backup-format.md), [UI.md](../UI.md)

## Context

[Decision 0018](0018-criteria-in-words-with-recipes.md) gave the criteria five
named presets that set all of them at once. They were fixed in the code: a
teacher whose written tests want wishes kept apart a little more, or who mixes
a reading lesson the same way every week, set the criteria by hand each time,
in every class — and "Empfohlene Mischung" read as the best mix rather than
the starting point it is.

## Decision

1. **"Standard"** is the shipped preset's new name. It is the way back to the
   basic settings and the one preset that cannot be changed.
2. **Presets of one's own, for every class.** The criteria panel keeps the
   class's weights as a preset ("Als Voreinstellung speichern …"); they are
   stored once for all classes (`spg.mixPresets`, `mixPresetStore.ts`), go with
   the backup, and are listed under a rule below the shipped ones. A pencil
   renames one, a bin deletes it after asking — in the menu and in
   "Bibliothek", whose folder "Voreinstellungen" lists every preset and whose
   "Übernehmen" sets the open class's criteria to one. Nothing is mixed then:
   a plan arranged by hand is not mixed over unasked.
3. **Changed weights say where they came from.** Moving a criterion after
   choosing a preset reads "Klassenarbeit · geändert" instead of "Eigene
   Mischung", and the panel offers to keep the change in that preset — not in
   "Standard" — or as a new one. Which preset was chosen is remembered per
   class while the page is open, never stored, as 0018 decided.
4. **Shipped presets can be changed** (`overrides`). A changed one keeps its
   name, is marked "angepasst" and offers "Original wiederherstellen"; an
   override equal to the shipped weights is not kept.
5. **What a class has no data for stays the preset's.** The panel clears
   those criteria (decision 0016); saving keeps the value of the preset the
   weights came from, or the basic setting, so saving in a class without
   language levels does not switch language support off everywhere
   (`presetWeightsFrom`).
6. **An own or changed preset describes itself** from its weights, by level
   ("Sehr wichtig: Unruhe, Distanzwünsche · Beachten: Körpergröße"); only an
   unchanged shipped preset keeps its written line, which would no longer be
   true of changed weights.

## Alternatives considered

- **Presets per class.** One field in the class record and no new store, but
  the same preset would have to be made again in every class — the work a
  preset is meant to save.
- **Changing a shipped preset makes a copy.** Safer, but the menu would fill
  with "Klassenarbeit" and "Klassenarbeit (2)".
- **Store the chosen preset with the settings.** Rejected again for the reasons
  of 0018; after a reload a changed mix reads "Eigene Mischung", which is
  still true.
- **Mix at once when "Bibliothek" applies a preset.** One step less, but it
  would replace a plan the teacher may have arranged by hand.

## Consequences

- A new stored value, `spg.mixPresets` (`MixPresetData`, version 1), wiped
  with all data and carried by the backup as an optional `mixPresets`; the
  export version stays 3, and an older build ignores the field.
- A changed shipped preset does not take up a later change of the shipped
  weights until it is restored; an own preset never does. Both are brought up
  to date when the meaning of the weights changes (`criteriaVersion`).
- The plans the algorithm produces are unchanged: a preset only sets the
  weights a teacher could set by hand.
- A new shipped preset needs an id in `BuiltinMixRecipeId`, its weights in
  `MIX_RECIPES` and its texts; whether it is changeable follows from
  `isEditableBuiltin`.
