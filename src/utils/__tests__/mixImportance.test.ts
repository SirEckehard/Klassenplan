// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { MixSettings } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_IMPORTANCE_LEVELS,
  MIX_IMPORTANCE_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  criterionImportance,
  importanceOfWeight,
  migrateStoredMixSettings,
  neutralSettings,
  normalizeMixSettings,
  weightForImportance,
} from '@/utils';
import { MIX_CRITERIA_VERSION } from '../mixSettings';

describe('mix importance', () => {
  it('reads every weight of the scale as one of the four levels', () => {
    const levels = Array.from({ length: 11 }, (_, weight) =>
      importanceOfWeight(weight),
    );

    expect(levels).toEqual([
      'off',
      'consider',
      'consider',
      'consider',
      'important',
      'important',
      'important',
      'essential',
      'essential',
      'essential',
      'essential',
    ]);
  });

  it('sets the level a weight stands for and finds it again', () => {
    for (const level of MIX_IMPORTANCE_LEVELS) {
      expect(importanceOfWeight(weightForImportance(level))).toBe(level);
    }
  });

  it('keeps a fine-tuned weight inside the level it already reads as', () => {
    // A teacher who set 6 by hand keeps 6, not the level's own 5.
    expect(weightForImportance('important', 6)).toBe(6);
    expect(weightForImportance('essential', 10)).toBe(10);
    // Another level is a decision, so it takes that level's weight.
    expect(weightForImportance('consider', 6)).toBe(
      MIX_IMPORTANCE_WEIGHTS.consider,
    );
    expect(weightForImportance('off', 6)).toBe(0);
  });

  it('shows the weight that acts for distractibility', () => {
    const settings = {
      ...neutralSettings,
      avoidConcentrationTogether: 0,
      avoidConcentrationNearRestless: 8,
    };

    expect(criterionImportance(settings, 'avoidConcentrationTogether')).toBe(
      'essential',
    );
  });

  it('leaves every recommended weight switched on', () => {
    for (const key of SCALAR_MIX_SETTING_KEYS) {
      expect(criterionImportance(DEFAULT_MIX_WEIGHTS, key)).not.toBe('off');
    }
  });

  // Decision 0031: only "Sehr wichtig" keeps students needing a front seat in
  // the front rows; until then every level did.
  describe('stored front seat weights', () => {
    const stored = (weight: number, version?: number): MixSettings => {
      const settings = {
        ...neutralSettings,
        preferFrontForNeedsFrontSeat: weight,
      };
      return version === undefined
        ? settings
        : { ...settings, criteriaVersion: version };
    };

    it('lifts a level below "Sehr wichtig" once, so a class keeps its plans', () => {
      for (const weight of [1, 3, 5, 6]) {
        const migrated = migrateStoredMixSettings(stored(weight));
        expect(migrated.preferFrontForNeedsFrontSeat).toBe(8);
        expect(migrated.criteriaVersion).toBe(MIX_CRITERIA_VERSION);
      }
    });

    it('keeps "Aus" and a weight that already guarantees', () => {
      expect(
        migrateStoredMixSettings(stored(0)).preferFrontForNeedsFrontSeat,
      ).toBe(0);
      expect(
        migrateStoredMixSettings(stored(9)).preferFrontForNeedsFrontSeat,
      ).toBe(9);
    });

    it('leaves settings stored since alone: a teacher may lower the level', () => {
      const current = stored(5, MIX_CRITERIA_VERSION);
      expect(migrateStoredMixSettings(current)).toBe(current);
    });

    it('marks every normalized setting with the version', () => {
      expect(normalizeMixSettings({}).criteriaVersion).toBe(
        MIX_CRITERIA_VERSION,
      );
    });

    it('recommends "Sehr wichtig" for front seats', () => {
      expect(
        importanceOfWeight(DEFAULT_MIX_WEIGHTS.preferFrontForNeedsFrontSeat),
      ).toBe('essential');
    });
  });
});
