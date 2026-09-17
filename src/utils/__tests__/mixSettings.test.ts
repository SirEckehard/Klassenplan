// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  areMixSettingsEqual,
  criterionWeight,
  hasActiveWeights,
  neutralSettings,
  normalizeMixSettings,
  withCriterionWeight,
  withDefaultWeights,
  withWeightsFrom,
  withoutUnavailableWeights,
  withoutWeights,
} from '../mixSettings';
import type { MixSettings, Student } from '../../types';
import { createMockStudent } from '@/__tests__/utils';
import { expect, test } from 'vitest';

test('DEFAULT_MIX_WEIGHTS should use numeric defaults', () => {
  const { neighborWeights, ...scalarWeights } = DEFAULT_MIX_WEIGHTS;

  // All values should be numbers >npm 0
  expect(
    Object.values(scalarWeights).every(
      (value) => typeof value === 'number' && value > 0,
    ),
  ).toBe(true);

  const neighborValues = [
    ...Object.values(neighborWeights.behavioral),
    ...Object.values(neighborWeights.gender),
  ];

  expect(
    neighborValues.every((value) => typeof value === 'number' && value > 0),
  ).toBe(true);
});

test('neutralSettings should disable all mix options', () => {
  const { neighborWeights, ...scalarWeights } = neutralSettings;

  expect(Object.values(scalarWeights).every((value) => value === 0)).toBe(true);
  expect(neighborWeights).toEqual(DEFAULT_NEIGHBOR_WEIGHTS);
});

test('normalizeMixSettings merges overrides with base values', () => {
  const normalized = normalizeMixSettings(
    {
      avoidRestlessTogether: 4,
      neighborWeights: {
        behavioral: { side: 0.5 },
      } as MixSettings['neighborWeights'],
    },
    neutralSettings,
  );

  expect(normalized.avoidRestlessTogether).toBe(4);
  expect(normalized.avoidPreviousPairs).toBe(0);
  expect(normalized.neighborWeights.behavioral.side).toBe(0.5);
  expect(normalized.neighborWeights.behavioral.direct).toBe(1);
  expect(normalized.neighborWeights.gender.front).toBe(0.5);
});

test('withCriterionWeight moves both distractibility weights together', () => {
  const next = withCriterionWeight(
    neutralSettings,
    'avoidConcentrationTogether',
    7,
  );

  expect(next.avoidConcentrationTogether).toBe(7);
  expect(next.avoidConcentrationNearRestless).toBe(7);
});

test('withCriterionWeight switches the other performance criterion off', () => {
  const homogeneous = withCriterionWeight(
    neutralSettings,
    'homogeneousPerformanceGroups',
    4,
  );
  const peer = withCriterionWeight(homogeneous, 'peerTutoring', 6);

  expect(peer.peerTutoring).toBe(6);
  expect(peer.homogeneousPerformanceGroups).toBe(0);
  // Switching one off leaves the other as it is.
  expect(
    withCriterionWeight(peer, 'homogeneousPerformanceGroups', 0).peerTutoring,
  ).toBe(6);
});

test('withDefaultWeights keeps the performance criterion weighted higher before', () => {
  const fromHomogeneous = withDefaultWeights({
    ...neutralSettings,
    homogeneousPerformanceGroups: 5,
  });
  expect(fromHomogeneous.homogeneousPerformanceGroups).toBe(
    DEFAULT_MIX_WEIGHTS.homogeneousPerformanceGroups,
  );
  expect(fromHomogeneous.peerTutoring).toBe(0);

  const fromTie = withDefaultWeights(neutralSettings);
  expect(fromTie.peerTutoring).toBe(DEFAULT_MIX_WEIGHTS.peerTutoring);
  expect(fromTie.homogeneousPerformanceGroups).toBe(0);
  expect(fromTie.considerWishPartners).toBe(
    DEFAULT_MIX_WEIGHTS.considerWishPartners,
  );
});

test('withoutWeights and withWeightsFrom change only the criterion weights', () => {
  const neighborWeights: MixSettings['neighborWeights'] = {
    behavioral: { direct: 2, side: 1, front: 1, back: 1 },
    gender: { direct: 2, side: 1, front: 1, back: 1 },
  };
  const custom: MixSettings = { ...DEFAULT_MIX_WEIGHTS, neighborWeights };

  const off = withoutWeights(custom);
  expect(hasActiveWeights(off)).toBe(false);
  expect(off.neighborWeights).toBe(neighborWeights);

  const restored = withWeightsFrom(off, {
    ...neutralSettings,
    avoidShyAlone: 9,
  });
  expect(restored.avoidShyAlone).toBe(9);
  expect(hasActiveWeights(restored)).toBe(true);
  expect(restored.neighborWeights).toBe(neighborWeights);
});

test('withoutUnavailableWeights clears the weights of criteria without data', () => {
  const students: Student[] = [
    createMockStudent({ restless: true, languageSkill: 'daz' }),
    createMockStudent({ restless: true, languageSkill: 'daz' }),
  ];

  const cleared = withoutUnavailableWeights(DEFAULT_MIX_WEIGHTS, students);

  // Data in the class: kept, and the history criterion always is.
  expect(cleared.avoidRestlessTogether).toBe(
    DEFAULT_MIX_WEIGHTS.avoidRestlessTogether,
  );
  expect(cleared.avoidPreviousPairs).toBe(
    DEFAULT_MIX_WEIGHTS.avoidPreviousPairs,
  );
  // No data, or a single language level: cleared.
  expect(cleared.considerWishPartners).toBe(0);
  expect(cleared.preferLanguageMixing).toBe(0);
  expect(cleared.neighborWeights).toBe(DEFAULT_MIX_WEIGHTS.neighborWeights);
});

test('withoutUnavailableWeights keeps distractibility for one student next to restless classmates', () => {
  const alone = [createMockStudent({ concentrationIssues: true })];
  const withRestless = [...alone, createMockStudent({ restless: true })];

  const cleared = withoutUnavailableWeights(DEFAULT_MIX_WEIGHTS, alone);
  expect(cleared.avoidConcentrationTogether).toBe(0);
  expect(cleared.avoidConcentrationNearRestless).toBe(0);

  const kept = withoutUnavailableWeights(DEFAULT_MIX_WEIGHTS, withRestless);
  expect(kept.avoidConcentrationNearRestless).toBe(
    DEFAULT_MIX_WEIGHTS.avoidConcentrationNearRestless,
  );
});

test('criterionWeight shows the higher of the two distractibility weights', () => {
  const settings: MixSettings = {
    ...neutralSettings,
    avoidConcentrationTogether: 0,
    avoidConcentrationNearRestless: 6,
    avoidShyAlone: 2,
  };

  expect(criterionWeight(settings, 'avoidConcentrationTogether')).toBe(6);
  expect(criterionWeight(settings, 'avoidShyAlone')).toBe(2);
});

test('withoutUnavailableWeights returns the same settings when nothing is hidden', () => {
  const settings: MixSettings = {
    ...neutralSettings,
    avoidPreviousPairs: 4,
  };

  expect(withoutUnavailableWeights(settings, [])).toBe(settings);
});

test('areMixSettingsEqual compares the weights, not the objects', () => {
  const copy: MixSettings = {
    ...DEFAULT_MIX_WEIGHTS,
    neighborWeights: normalizeMixSettings(DEFAULT_MIX_WEIGHTS).neighborWeights,
  };
  expect(areMixSettingsEqual(DEFAULT_MIX_WEIGHTS, copy)).toBe(true);

  expect(
    areMixSettingsEqual(DEFAULT_MIX_WEIGHTS, { ...copy, avoidShyAlone: 9 }),
  ).toBe(false);
  expect(
    areMixSettingsEqual(DEFAULT_MIX_WEIGHTS, {
      ...copy,
      neighborWeights: {
        ...copy.neighborWeights,
        gender: { ...copy.neighborWeights.gender, back: 0.1 },
      },
    }),
  ).toBe(false);
});
