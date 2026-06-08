// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  neutralSettings,
  normalizeMixSettings,
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
