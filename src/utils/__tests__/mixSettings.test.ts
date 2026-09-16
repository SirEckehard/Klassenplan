// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  hasActiveWeights,
  neutralSettings,
  normalizeMixSettings,
  withCriterionWeight,
  withDefaultWeights,
  withWeightsFrom,
  withoutWeights,
} from '../mixSettings';
import type { MixSettings } from '../../types';
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
