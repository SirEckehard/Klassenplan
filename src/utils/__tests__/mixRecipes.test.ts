// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_RECIPES,
  SCALAR_MIX_SETTING_KEYS,
  findMixRecipe,
  hasActiveWeights,
  importanceOfWeight,
  matchMixRecipe,
  neutralSettings,
  recipeSettings,
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
    const settings = applied('recommended');

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
