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

/**
 * The recipe each class last had chosen, for as long as the page is open.
 * Not stored (decision 0018): it only tells which preset weights that no
 * longer match came from, so the panel can say "· geändert" and offer to keep
 * the change — through a switch of the inspector, and when "Bibliothek" set it.
 */
const chosenByClass = new Map<string, MixRecipeId>();

/** Note the recipe a class's weights were just set from. */
function rememberChosenRecipe(classId: string, id: MixRecipeId): void {
  chosenByClass.set(classId, id);
}

type UseMixRecipesOptions = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  /** Every preset on offer, the teacher's own included. */
  recipes: readonly MixRecipe[];
  /** The open class; without one the choice is kept here alone. */
  classId?: string | null;
};

/**
 * Which recipe the weights currently are, which one they were set from and
 * left, and how to set another one.
 *
 * The chosen recipe is remembered for as long as the weights still match it:
 * in a class with little data several recipes can come out the same, and the
 * panel should keep naming the one the teacher pressed rather than the first
 * that happens to fit. Moving any weight afterwards makes the recipe the
 * `base` of a changed mix — a starting point, never a lock.
 */
export function useMixRecipes({
  settings,
  setMixSettings,
  students,
  recipes,
  classId,
}: UseMixRecipesOptions) {
  const key = classId ?? null;
  const [chosen, setChosen] = React.useState<{
    key: string | null;
    id: MixRecipeId | null;
  }>(() => ({ key, id: key ? (chosenByClass.get(key) ?? null) : null }));
  // Another class opened: its own choice, as it was left.
  const chosenId =
    chosen.key === key
      ? chosen.id
      : key
        ? (chosenByClass.get(key) ?? null)
        : null;

  const choose = React.useCallback(
    (id: MixRecipeId) => {
      if (key) rememberChosenRecipe(key, id);
      setChosen({ key, id });
    },
    [key],
  );

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
      choose(id);
      setMixSettings((prev) =>
        withWeightsFrom(prev, recipeSettings(recipe, prev, students)),
      );
    },
    [choose, recipes, setMixSettings, students],
  );

  return {
    activeId,
    /** The recipe the weights were set from and have since left. */
    baseId,
    active: activeId ? findMixRecipe(activeId, recipes) : undefined,
    base: baseId ? findMixRecipe(baseId, recipes) : undefined,
    apply,
    /** Take a recipe as the chosen one without setting its weights. */
    choose,
  };
}
