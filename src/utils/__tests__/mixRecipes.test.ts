// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_RECIPES,
  areMixSettingsEqual,
  normalizeMixSettings,
  SCALAR_MIX_SETTING_KEYS,
  findMixRecipe,
  fullRecipeWeights,
  hasActiveWeights,
  importanceOfWeight,
  isOriginalWeights,
  matchMixRecipe,
  neutralSettings,
  normalizeMixPresetData,
  presetWeightsFrom,
  recipeLevels,
  recipeSettings,
  resolveMixRecipes,
} from '@/utils';
import { createMockStudent } from '@/__tests__/utils';

/** A class with data for every criterion, so no recipe is cut short. */
const students: Student[] = [
  createMockStudent({
    id: '1',
    name: 'Ada',
    gender: 'girl',
    height: 'small',
    restless: true,
    shy: true,
    concentrationIssues: true,
    needsFrontSeat: true,
    performanceStrong: true,
    wishPartnerId: '2',
    avoidPartnerId: '3',
    prefersWindow: true,
    languageSkill: 'fluent',
    socialRole: 'mediator',
  }),
  createMockStudent({
    id: '2',
    name: 'Ben',
    gender: 'boy',
    height: 'tall',
    restless: true,
    concentrationIssues: true,
    performanceWeak: true,
    prefersDoor: true,
    languageSkill: 'beginner',
    socialRole: 'leader',
  }),
  createMockStudent({ id: '3', name: 'Cem', gender: 'boy' }),
];

const applied = (id: (typeof MIX_RECIPES)[number]['id']) =>
  recipeSettings(findMixRecipe(id)!, neutralSettings, students);

describe('mix recipes', () => {
  it('sets weights that the named levels can show', () => {
    for (const recipe of MIX_RECIPES) {
      const settings = applied(recipe.id);
      expect(hasActiveWeights(settings)).toBe(true);
      for (const key of SCALAR_MIX_SETTING_KEYS) {
        expect(settings[key]).toBeGreaterThanOrEqual(0);
        expect(settings[key]).toBeLessThanOrEqual(10);
        // Every weight has a word for it, or the panel could not name it.
        expect(importanceOfWeight(settings[key])).toBeDefined();
      }
    }
  });

  it('is the recommended weights under its own name', () => {
    const settings = applied('standard');

    for (const key of SCALAR_MIX_SETTING_KEYS) {
      // Only the losing performance criterion differs; decision 0013 clears it.
      if (key === 'homogeneousPerformanceGroups') continue;
      expect(settings[key]).toBe(DEFAULT_MIX_WEIGHTS[key]);
    }
    expect(settings.homogeneousPerformanceGroups).toBe(0);
  });

  it('switches wish partners off for a written test', () => {
    const settings = applied('exam');

    expect(settings.considerWishPartners).toBe(0);
    expect(settings.avoidConflictPartners).toBeGreaterThan(0);
    expect(settings.avoidPreviousPairs).toBeGreaterThan(0);
  });

  it('moves both distractibility weights together', () => {
    const settings = applied('quietWork');

    expect(settings.avoidConcentrationTogether).toBe(8);
    expect(settings.avoidConcentrationNearRestless).toBe(8);
  });

  it('keeps the neighbour weights of the class', () => {
    const neighborWeights = {
      behavioral: { direct: 1, side: 0.2, front: 0.3, back: 0.4 },
      gender: { direct: 1, side: 0.5, front: 0.6, back: 0.7 },
    };

    const settings = recipeSettings(
      findMixRecipe('groupWork')!,
      { ...neutralSettings, neighborWeights },
      students,
    );

    expect(settings.neighborWeights).toEqual(neighborWeights);
  });

  it('leaves out what the class has no data for', () => {
    const plain = [createMockStudent({ id: '1', name: 'Ada' })];

    const settings = recipeSettings(
      findMixRecipe('groupWork')!,
      neutralSettings,
      plain,
    );

    expect(settings.considerWishPartners).toBe(0);
    expect(settings.avoidShyAlone).toBe(0);
    // History-based, so it applies to every class.
    expect(settings.avoidPreviousPairs).toBe(5);
  });

  it('recognises its own settings and lets go of them on a change', () => {
    const settings = applied('quietWork');
    expect(matchMixRecipe(settings, students)).toBe('quietWork');

    expect(
      matchMixRecipe({ ...settings, avoidRestlessTogether: 4 }, students),
    ).toBeNull();
  });

  it("calls a mix of the teacher's own no recipe", () => {
    expect(matchMixRecipe(neutralSettings, students)).toBeNull();
  });
});

describe("presets of the teacher's own (decision 0038)", () => {
  const exam = fullRecipeWeights(findMixRecipe('exam')!.weights);

  it('offers the shipped presets first, as the teacher changed them', () => {
    const recipes = resolveMixRecipes({
      version: 1,
      overrides: {
        exam: { weights: { ...exam, preferGenderMix: 5 }, criteriaVersion: 2 },
      },
      presets: [
        {
          id: 'own-1',
          name: 'Stillarbeit',
          weights: { ...exam, avoidShyAlone: 8 },
          criteriaVersion: 2,
          createdAt: '',
        },
      ],
    });

    expect(recipes.map((recipe) => recipe.id)).toEqual([
      'standard',
      'quietWork',
      'groupWork',
      'exam',
      'newClass',
      'own-1',
    ]);
    const changed = findMixRecipe('exam', recipes)!;
    expect(changed.changed).toBe(true);
    expect(changed.weights.preferGenderMix).toBe(5);
    expect(findMixRecipe('own-1', recipes)).toMatchObject({
      builtin: null,
      name: 'Stillarbeit',
    });
  });

  it('recognises an own preset as the active one', () => {
    const weights = { ...exam, avoidShyAlone: 8 };
    const recipes = resolveMixRecipes({
      version: 1,
      overrides: {},
      presets: [
        {
          id: 'own-1',
          name: 'Stillarbeit',
          weights,
          criteriaVersion: 2,
          createdAt: '',
        },
      ],
    });
    const settings = recipeSettings(
      findMixRecipe('own-1', recipes)!,
      neutralSettings,
      students,
    );

    expect(matchMixRecipe(settings, students, recipes)).toBe('own-1');
  });

  it('keeps what a class has no data for from the preset it came from', () => {
    const plain = [createMockStudent({ id: '1', name: 'Ada' })];
    const groupWork = findMixRecipe('groupWork')!;
    const settings = recipeSettings(groupWork, neutralSettings, plain);

    const weights = presetWeightsFrom(
      { ...settings, avoidPreviousPairs: 9 },
      plain,
      groupWork,
    );

    // Changed here, so kept as changed.
    expect(weights.avoidPreviousPairs).toBe(9);
    // Cleared only because this class has no wishes or languages.
    expect(weights.considerWishPartners).toBe(8);
    expect(weights.preferLanguageMixing).toBe(6);
  });

  it('falls back to the basic settings without a preset to come from', () => {
    const plain = [createMockStudent({ id: '1', name: 'Ada' })];

    const weights = presetWeightsFrom(neutralSettings, plain);

    expect(weights.considerWishPartners).toBe(
      DEFAULT_MIX_WEIGHTS.considerWishPartners,
    );
    expect(weights.avoidPreviousPairs).toBe(0);
  });

  it('tells a change from the original', () => {
    expect(isOriginalWeights('exam', exam)).toBe(true);
    expect(isOriginalWeights('exam', { ...exam, preferGenderMix: 3 })).toBe(
      false,
    );
  });

  it('names the criteria of a preset by level, distractibility once', () => {
    const levels = recipeLevels(findMixRecipe('exam')!.weights);

    expect(levels.essential).toContain('avoidRestlessTogether');
    expect(levels.essential).toContain('avoidConcentrationTogether');
    expect(levels.essential).not.toContain('avoidConcentrationNearRestless');
    expect(levels.consider).toEqual(['preferFrontForSmallerStudents']);
    expect(levels.important).toEqual([]);
  });

  it('drops what is not a preset and brings older weights up to date', () => {
    const data = normalizeMixPresetData({
      version: 1,
      overrides: {
        standard: { weights: exam, criteriaVersion: 2 },
        exam: { weights: exam, criteriaVersion: 2 },
        quietWork: {
          weights: {
            avoidRestlessTogether: 12,
            preferFrontForNeedsFrontSeat: 4,
          },
        },
      },
      presets: [
        { id: 'a', name: '  Eins ', weights: { avoidShyAlone: 5 } },
        { id: 'a', name: 'Doppelt', weights: {} },
        { id: 'b', name: '', weights: {} },
        { id: 'c', name: 'Ohne Gewichte' },
      ],
    });

    // "Standard" cannot be changed, and an override that is the original
    // is none.
    expect(Object.keys(data.overrides)).toEqual(['quietWork']);
    const quiet = data.overrides.quietWork!.weights;
    expect(quiet.avoidRestlessTogether).toBe(10);
    // Stored before decision 0031's front rows: lifted to "Sehr wichtig".
    expect(quiet.preferFrontForNeedsFrontSeat).toBe(
      DEFAULT_MIX_WEIGHTS.preferFrontForNeedsFrontSeat,
    );
    expect(data.presets.map((preset) => preset.name)).toEqual(['Eins']);
    expect(data.presets[0]!.weights.avoidShyAlone).toBe(5);
    expect(data.presets[0]!.weights.considerWishPartners).toBe(0);
  });
});

describe('the preset the weights came from (decision 0038)', () => {
  it('is kept through normalising and let go of on purpose', () => {
    const settings = normalizeMixSettings(
      { presetId: 'exam' },
      neutralSettings,
    );
    expect(settings.presetId).toBe('exam');

    // Normalised again, as the store does on every change.
    expect(normalizeMixSettings(settings, neutralSettings).presetId).toBe(
      'exam',
    );
    expect(
      normalizeMixSettings({ presetId: undefined }, settings).presetId,
    ).toBeUndefined();
  });

  it('makes two settings differ', () => {
    const settings = normalizeMixSettings({}, neutralSettings);
    expect(
      areMixSettingsEqual(settings, { ...settings, presetId: 'exam' }),
    ).toBe(false);
  });
});
