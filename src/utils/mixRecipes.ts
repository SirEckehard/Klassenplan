// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  BuiltinMixRecipeId,
  EditableMixRecipeId,
  MixPresetData,
  MixPresetWeights,
  MixSettings,
  ScalarMixSettingKey,
  Student,
} from '@/types';
import { isCriterionAvailable } from './criteriaValidation';
import { importanceOfWeight, migrateStoredMixSettings } from './mixImportance';
import type { MixImportance } from './mixImportance';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_CRITERIA_VERSION,
  SCALAR_MIX_SETTING_KEYS,
  criterionWeight,
  neutralSettings,
  normalizeMixSettings,
  withoutUnavailableWeights,
} from './mixSettings';

/**
 * A lesson in the form the algorithm understands: eighteen weights at once.
 *
 * Setting eighteen criteria one by one is the part of the plan nobody asks for.
 * A recipe answers the question a teacher actually has — "was ist das hier für
 * eine Stunde?" — and the criteria below it stay exactly as changeable as they
 * were (decision 0018). Besides the shipped ones a teacher keeps presets of
 * their own and changes the shipped ones but "Standard" (decision 0038).
 */
export type MixRecipeId = string;

export interface MixRecipe {
  /** A shipped preset's id, or the id of a teacher's own. */
  id: MixRecipeId;
  /** Which shipped preset this is — its name is a translation — or null. */
  builtin: BuiltinMixRecipeId | null;
  /** An own preset's name, as the teacher gave it. */
  name?: string;
  /** Every criterion the recipe does not name is switched off. */
  weights: Partial<Record<ScalarMixSettingKey, number>>;
  /** A shipped preset the teacher changed. */
  changed?: boolean;
}

/**
 * The recipes in the order they are offered. `standard` comes first: it is
 * what a class starts with, so it is also the way back.
 *
 * The weights stay inside the bands of the named levels (`mixImportance.ts`),
 * so every recipe reads as words in the panel it fills.
 */
export const MIX_RECIPES: readonly MixRecipe[] = [
  {
    id: 'standard',
    builtin: 'standard',
    weights: Object.fromEntries(
      SCALAR_MIX_SETTING_KEYS.map((key) => [key, DEFAULT_MIX_WEIGHTS[key]]),
    ),
  },
  {
    // Everyone works for themselves: what disturbs that is what counts.
    id: 'quietWork',
    builtin: 'quietWork',
    weights: {
      avoidRestlessTogether: 8,
      avoidConcentrationTogether: 8,
      avoidConcentrationNearRestless: 8,
      avoidConflictPartners: 8,
      preferFrontForNeedsFrontSeat: 8,
      keepNeighbourSeatFree: 8,
      seatLeftHandersLeft: 5,
      avoidPreviousPairs: 3,
      considerWishPartners: 3,
      preferFrontForSmallerStudents: 3,
    },
  },
  {
    // Tables that can carry a task together: who helps whom, and who talks.
    id: 'groupWork',
    builtin: 'groupWork',
    weights: {
      considerWishPartners: 8,
      avoidConflictPartners: 7,
      peerTutoring: 8,
      preferLanguageMixing: 6,
      distributeSocialRoles: 6,
      avoidShyAlone: 5,
      avoidPreviousPairs: 5,
      preferGenderMix: 3,
      preferFrontForNeedsFrontSeat: 8,
      keepNeighbourSeatFree: 8,
      seatLeftHandersLeft: 3,
    },
  },
  {
    // Written work: wishes are what you do not want, distance is.
    id: 'exam',
    builtin: 'exam',
    weights: {
      avoidConflictPartners: 9,
      avoidRestlessTogether: 9,
      avoidConcentrationTogether: 8,
      avoidConcentrationNearRestless: 8,
      avoidPreviousPairs: 8,
      preferFrontForNeedsFrontSeat: 8,
      keepNeighbourSeatFree: 8,
      seatLeftHandersLeft: 5,
      preferFrontForSmallerStudents: 3,
    },
  },
  {
    // Nobody knows anybody yet: mix widely and leave nobody sitting alone.
    id: 'newClass',
    builtin: 'newClass',
    weights: {
      avoidPreviousPairs: 8,
      avoidConflictPartners: 7,
      avoidShyAlone: 6,
      preferGenderMix: 6,
      distributeSocialRoles: 6,
      preferLanguageMixing: 5,
      preferFrontForNeedsFrontSeat: 8,
      keepNeighbourSeatFree: 8,
      seatLeftHandersLeft: 3,
      considerWishPartners: 3,
    },
  },
] as const;

export const findMixRecipe = (
  id: MixRecipeId,
  recipes: readonly MixRecipe[] = MIX_RECIPES,
): MixRecipe | undefined => recipes.find((recipe) => recipe.id === id);

/** Whether a shipped preset may be changed: all but "Standard". */
export const isEditableBuiltin = (
  id: BuiltinMixRecipeId | null | undefined,
): id is EditableMixRecipeId => !!id && id !== 'standard';

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

/** Whether the weights are the recipe's, as it would set them in this class. */
export const isRecipeOf = (
  recipe: MixRecipe,
  settings: Readonly<MixSettings>,
  students: Student[],
): boolean => {
  const current = withoutUnavailableWeights(settings as MixSettings, students);
  const candidate = recipeSettings(recipe, settings, students);
  return SCALAR_MIX_SETTING_KEYS.every(
    (key) => candidate[key] === current[key],
  );
};

/**
 * Which recipe the current weights are, or null for a mix of the teacher's
 * own. Compared against what the recipe would set in *this* class, so a class
 * without wish partners still reads as the recipe that asks for them.
 */
export const matchMixRecipe = (
  settings: Readonly<MixSettings>,
  students: Student[],
  recipes: readonly MixRecipe[] = MIX_RECIPES,
): MixRecipeId | null =>
  recipes.find((recipe) => isRecipeOf(recipe, settings, students))?.id ?? null;

/**
 * Every weight a recipe sets, with the two performance criteria resolved as
 * the settings hold them — the form a preset is stored and compared in.
 */
export const fullRecipeWeights = (
  weights: Partial<Record<ScalarMixSettingKey, number>>,
): MixPresetWeights => {
  const scalars = SCALAR_MIX_SETTING_KEYS.reduce((acc, key) => {
    acc[key] = weights[key] ?? 0;
    return acc;
  }, {} as MixPresetWeights);
  const normalized = normalizeMixSettings(scalars, neutralSettings);
  return SCALAR_MIX_SETTING_KEYS.reduce((acc, key) => {
    acc[key] = normalized[key];
    return acc;
  }, {} as MixPresetWeights);
};

const sameWeights = (
  a: Readonly<MixPresetWeights>,
  b: Readonly<MixPresetWeights>,
): boolean => SCALAR_MIX_SETTING_KEYS.every((key) => a[key] === b[key]);

/**
 * The weights to keep as a preset from the class's settings. A criterion this
 * class has no data for is cleared here (decision 0016), which says nothing
 * about the lesson: it keeps what the preset it came from sets, or its basic
 * setting, so saving in a class without language levels does not switch
 * language support off in every other class.
 */
export const presetWeightsFrom = (
  settings: Readonly<MixSettings>,
  students: Student[],
  base?: MixRecipe,
): MixPresetWeights => {
  const fallback = base ? fullRecipeWeights(base.weights) : DEFAULT_MIX_WEIGHTS;
  const weights = SCALAR_MIX_SETTING_KEYS.reduce((acc, key) => {
    acc[key] = isCriterionAvailable(key, students).available
      ? settings[key]
      : fallback[key];
    return acc;
  }, {} as MixPresetWeights);
  return fullRecipeWeights(weights);
};

/**
 * The shipped preset's weights as it ships, for "Original wiederherstellen"
 * and to tell whether a change still differs from it.
 */
const originalWeights = (id: EditableMixRecipeId): MixPresetWeights =>
  fullRecipeWeights(findMixRecipe(id)?.weights ?? {});

/** Whether weights for a shipped preset are just the ones it ships with. */
export const isOriginalWeights = (
  id: EditableMixRecipeId,
  weights: Readonly<MixPresetWeights>,
): boolean => sameWeights(originalWeights(id), fullRecipeWeights(weights));

/**
 * Every preset on offer: the shipped ones, as the teacher changed them, then
 * the teacher's own in the order they were saved.
 */
export const resolveMixRecipes = (
  data: Readonly<MixPresetData> | null | undefined,
): MixRecipe[] => {
  const builtins = MIX_RECIPES.map((recipe) => {
    const override = isEditableBuiltin(recipe.builtin)
      ? data?.overrides[recipe.builtin]
      : undefined;
    return override
      ? { ...recipe, weights: { ...override.weights }, changed: true }
      : recipe;
  });
  const own = (data?.presets ?? []).map((preset): MixRecipe => ({
    id: preset.id,
    builtin: null,
    name: preset.name,
    weights: { ...preset.weights },
  }));
  return [...builtins, ...own];
};

/**
 * The criteria a recipe sets, by level, for a line that says what it does —
 * an own preset's or a changed one's, where no written description can. The
 * two distractibility weights read as the one criterion the panel shows.
 */
export const recipeLevels = (
  weights: Partial<Record<ScalarMixSettingKey, number>>,
): Record<Exclude<MixImportance, 'off'>, ScalarMixSettingKey[]> => {
  const full = { ...neutralSettings, ...fullRecipeWeights(weights) };
  const levels: Record<Exclude<MixImportance, 'off'>, ScalarMixSettingKey[]> = {
    essential: [],
    important: [],
    consider: [],
  };
  for (const key of SCALAR_MIX_SETTING_KEYS) {
    if (key === 'avoidConcentrationNearRestless') continue;
    const level = importanceOfWeight(criterionWeight(full, key));
    if (level !== 'off') levels[level].push(key);
  }
  return levels;
};

/** Weights as stored: every criterion within 0–10, brought up to date. */
const storedWeights = (
  value: unknown,
  criteriaVersion: unknown,
): MixPresetWeights | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const weights = SCALAR_MIX_SETTING_KEYS.reduce((acc, key) => {
    const weight = record[key];
    acc[key] =
      typeof weight === 'number' && Number.isFinite(weight)
        ? Math.min(10, Math.max(0, weight))
        : 0;
    return acc;
  }, {} as MixPresetWeights);
  const migrated = migrateStoredMixSettings({
    ...weights,
    criteriaVersion:
      typeof criteriaVersion === 'number' ? criteriaVersion : undefined,
  });
  return fullRecipeWeights(migrated);
};

/** An empty store: no own presets, every shipped one as it ships. */
export const emptyMixPresetData = (): MixPresetData => ({
  version: 1,
  overrides: {},
  presets: [],
});

/**
 * The stored presets in the shape the app works with: what is not a preset is
 * dropped, missing criteria are off, older weights are brought up to date
 * (decision 0031), and an override that only repeats its original goes.
 */
export const normalizeMixPresetData = (value: unknown): MixPresetData => {
  const data = emptyMixPresetData();
  if (!value || typeof value !== 'object') return data;
  const record = value as Partial<Record<keyof MixPresetData, unknown>>;

  if (record.overrides && typeof record.overrides === 'object') {
    for (const [id, override] of Object.entries(record.overrides)) {
      if (!isEditableBuiltin(id as BuiltinMixRecipeId)) continue;
      if (!override || typeof override !== 'object') continue;
      const entry = override as Record<string, unknown>;
      const weights = storedWeights(entry.weights, entry.criteriaVersion);
      if (!weights || isOriginalWeights(id as EditableMixRecipeId, weights)) {
        continue;
      }
      data.overrides[id as EditableMixRecipeId] = {
        weights,
        criteriaVersion: MIX_CRITERIA_VERSION,
      };
    }
  }

  if (Array.isArray(record.presets)) {
    const ids = new Set<string>();
    for (const preset of record.presets as unknown[]) {
      if (!preset || typeof preset !== 'object') continue;
      const entry = preset as Record<string, unknown>;
      if (typeof entry.id !== 'string' || ids.has(entry.id)) continue;
      if (typeof entry.name !== 'string' || entry.name.trim() === '') continue;
      const weights = storedWeights(entry.weights, entry.criteriaVersion);
      if (!weights) continue;
      ids.add(entry.id);
      data.presets.push({
        id: entry.id,
        name: entry.name.trim(),
        weights,
        criteriaVersion: MIX_CRITERIA_VERSION,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
      });
    }
  }

  return data;
};

/** Whether the store holds anything a backup has to carry. */
export const hasMixPresetData = (data: Readonly<MixPresetData>): boolean =>
  data.presets.length > 0 || Object.keys(data.overrides).length > 0;
