// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { MixSettings, Student } from '@/types';
import {
  findMixRecipe,
  isRecipeOf,
  matchMixRecipe,
  recipeSettings,
  withWeightsFrom,
  type MixRecipe,
  type MixRecipeId,
} from '@/utils';

type UseMixRecipesOptions = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  /** Every preset on offer, the teacher's own included. */
  recipes: readonly MixRecipe[];
};

/**
 * The settings with a preset's weights, noted as set from it.
 * "Bibliothek" applies a preset the same way.
 */
export const withRecipe = (
  settings: MixSettings,
  recipe: MixRecipe,
  students: Student[],
): MixSettings => ({
  ...withWeightsFrom(settings, recipeSettings(recipe, settings, students)),
  presetId: recipe.id,
});

/**
 * Which recipe the weights currently are, which one they were set from and
 * left, and how to set another one.
 *
 * The settings note the recipe they were set from (`presetId`, decision
 * 0038), so it survives a reload: in a class with little data several recipes
 * can come out the same, and the panel keeps naming the one the teacher
 * pressed rather than the first that happens to fit. Moving any weight
 * afterwards makes that recipe the `base` of a changed mix — a starting
 * point, never a lock.
 */
export function useMixRecipes({
  settings,
  setMixSettings,
  students,
  recipes,
}: UseMixRecipesOptions) {
  const chosenId = settings.presetId ?? null;

  const { activeId, baseId } = React.useMemo(() => {
    const recipe = chosenId ? findMixRecipe(chosenId, recipes) : undefined;
    if (recipe && isRecipeOf(recipe, settings, students)) {
      return { activeId: recipe.id, baseId: null };
    }
    const matched = matchMixRecipe(settings, students, recipes);
    return {
      activeId: matched,
      baseId: matched ? null : (recipe?.id ?? null),
    };
  }, [chosenId, recipes, settings, students]);

  const apply = React.useCallback(
    (id: MixRecipeId, recipe = findMixRecipe(id, recipes)) => {
      if (!recipe) return;
      setMixSettings((prev) => withRecipe(prev, recipe, students));
    },
    [recipes, setMixSettings, students],
  );

  /** Take a recipe as the one the weights came from, leaving them as they are. */
  const choose = React.useCallback(
    (id: MixRecipeId) => {
      setMixSettings((prev) => ({ ...prev, presetId: id }));
    },
    [setMixSettings],
  );

  return {
    activeId,
    /** The recipe the weights were set from and have since left. */
    baseId,
    active: activeId ? findMixRecipe(activeId, recipes) : undefined,
    base: baseId ? findMixRecipe(baseId, recipes) : undefined,
    apply,
    choose,
  };
}
