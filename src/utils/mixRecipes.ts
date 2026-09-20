// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  neutralSettings,
  normalizeMixSettings,
  withoutUnavailableWeights,
} from './mixSettings';

/**
 * A lesson in the form the algorithm understands: sixteen weights at once.
 *
 * Setting sixteen criteria one by one is the part of the plan nobody asks for.
 * A recipe answers the question a teacher actually has — "was ist das hier für
 * eine Stunde?" — and the criteria below it stay exactly as changeable as they
 * were (decision 0018).
 */
export type MixRecipeId =
  'recommended' | 'quietWork' | 'groupWork' | 'exam' | 'newClass';

export interface MixRecipe {
  id: MixRecipeId;
  /** Every criterion the recipe does not name is switched off. */
  weights: Partial<Record<ScalarMixSettingKey, number>>;
}

/**
 * The recipes in the order they are offered. `recommended` comes first: it is
 * what a class starts with, so it is also the way back.
 *
 * The weights stay inside the bands of the named levels (`mixImportance.ts`),
 * so every recipe reads as words in the panel it fills.
 */
export const MIX_RECIPES: readonly MixRecipe[] = [
  {
    id: 'recommended',
    weights: Object.fromEntries(
      SCALAR_MIX_SETTING_KEYS.map((key) => [key, DEFAULT_MIX_WEIGHTS[key]]),
    ),
  },
  {
    // Everyone works for themselves: what disturbs that is what counts.
    id: 'quietWork',
    weights: {
      avoidRestlessTogether: 8,
      avoidConcentrationTogether: 8,
      avoidConcentrationNearRestless: 8,
      avoidConflictPartners: 8,
      preferFrontForNeedsFrontSeat: 8,
      avoidPreviousPairs: 3,
      considerWishPartners: 3,
      preferFrontForSmallerStudents: 3,
    },
  },
  {
    // Tables that can carry a task together: who helps whom, and who talks.
    id: 'groupWork',
    weights: {
      considerWishPartners: 8,
      avoidConflictPartners: 7,
      peerTutoring: 8,
      preferLanguageMixing: 6,
      distributeSocialRoles: 6,
      avoidShyAlone: 5,
      avoidPreviousPairs: 5,
      preferGenderMix: 3,
      preferFrontForNeedsFrontSeat: 5,
    },
  },
  {
    // Written work: wishes are what you do not want, distance is.
    id: 'exam',
    weights: {
      avoidConflictPartners: 9,
      avoidRestlessTogether: 9,
      avoidConcentrationTogether: 8,
      avoidConcentrationNearRestless: 8,
      avoidPreviousPairs: 8,
      preferFrontForNeedsFrontSeat: 6,
      preferFrontForSmallerStudents: 3,
    },
  },
  {
    // Nobody knows anybody yet: mix widely and leave nobody sitting alone.
    id: 'newClass',
    weights: {
      avoidPreviousPairs: 8,
      avoidConflictPartners: 7,
      avoidShyAlone: 6,
      preferGenderMix: 6,
      distributeSocialRoles: 6,
      preferLanguageMixing: 5,
      preferFrontForNeedsFrontSeat: 5,
      considerWishPartners: 3,
    },
  },
] as const;

export const findMixRecipe = (id: MixRecipeId): MixRecipe | undefined =>
  MIX_RECIPES.find((recipe) => recipe.id === id);

/**
 * The settings a recipe stands for in this class: its weights, with the
 * criteria the class has no data for cleared (decision 0016) and the two
 * exclusive performance criteria resolved.
 */
export const recipeSettings = (
  recipe: MixRecipe,
  settings: Readonly<MixSettings>,
  students: Student[],
): MixSettings => {
  const weights = SCALAR_MIX_SETTING_KEYS.reduce(
    (acc, key) => {
      acc[key] = recipe.weights[key] ?? 0;
      return acc;
    },
    {} as Record<ScalarMixSettingKey, number>,
  );

  // The neighbour weights belong to the class, not to the lesson.
  const next = normalizeMixSettings(weights, {
    ...neutralSettings,
    neighborWeights: settings.neighborWeights,
  });
  return withoutUnavailableWeights(next, students);
};

/**
 * Which recipe the current weights are, or null for a mix of the teacher's
 * own. Compared against what the recipe would set in *this* class, so a class
 * without wish partners still reads as the recipe that asks for them.
 */
export const matchMixRecipe = (
  settings: Readonly<MixSettings>,
  students: Student[],
): MixRecipeId | null => {
  const current = withoutUnavailableWeights(settings as MixSettings, students);
  const match = MIX_RECIPES.find((recipe) => {
    const candidate = recipeSettings(recipe, settings, students);
    return SCALAR_MIX_SETTING_KEYS.every(
      (key) => candidate[key] === current[key],
    );
  });
  return match?.id ?? null;
};
