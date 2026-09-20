// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { MixSettings, Student } from '@/types';
import {
  SCALAR_MIX_SETTING_KEYS,
  findMixRecipe,
  matchMixRecipe,
  recipeSettings,
  withWeightsFrom,
  withoutUnavailableWeights,
  type MixRecipeId,
} from '@/utils';

type UseMixRecipesOptions = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
};

/**
 * Which recipe the weights currently are, and how to set another one.
 *
 * The chosen recipe is remembered for as long as the weights still match it:
 * in a class with little data several recipes can come out the same, and the
 * panel should keep naming the one the teacher pressed rather than the first
 * that happens to fit. Moving any weight afterwards makes it "eigene Mischung"
 * — the recipe is a starting point, never a lock.
 */
export function useMixRecipes({
  settings,
  setMixSettings,
  students,
}: UseMixRecipesOptions) {
  const [chosenId, setChosenId] = React.useState<MixRecipeId | null>(null);

  const activeId = React.useMemo(() => {
    const chosen = chosenId ? findMixRecipe(chosenId) : undefined;
    if (chosen) {
      const candidate = recipeSettings(chosen, settings, students);
      const current = withoutUnavailableWeights(settings, students);
      const stillMatches = SCALAR_MIX_SETTING_KEYS.every(
        (key) => candidate[key] === current[key],
      );
      if (stillMatches) {
        return chosen.id;
      }
    }
    return matchMixRecipe(settings, students);
  }, [chosenId, settings, students]);

  const apply = React.useCallback(
    (id: MixRecipeId) => {
      const recipe = findMixRecipe(id);
      if (!recipe) return;
      setChosenId(id);
      setMixSettings((prev) =>
        withWeightsFrom(prev, recipeSettings(recipe, prev, students)),
      );
    },
    [setMixSettings, students],
  );

  return { activeId, apply };
}
