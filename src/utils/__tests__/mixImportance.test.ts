// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_IMPORTANCE_LEVELS,
  MIX_IMPORTANCE_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  criterionImportance,
  importanceOfWeight,
  neutralSettings,
  weightForImportance,
} from '@/utils';

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
});
