// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Stored settings are read through `migrateStoredMixSettings` and
 * `normalizeMixSettings` on every load. Both have to be safe to run again on
 * their own result, or settings would drift a little with every visit.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { MixSettings } from '@/types';
import {
  MIX_CRITERIA_VERSION,
  migrateStoredMixSettings,
  normalizeMixSettings,
  SCALAR_MIX_SETTING_KEYS,
} from '@/utils';

const RUNS = { numRuns: 200 };

const weight = fc.oneof(
  fc.integer({ min: 0, max: 10 }),
  fc.double({ min: -5, max: 20, noNaN: true }),
);

/** Settings as a store may hold them: some keys, any version, a preset. */
const storedArb: fc.Arbitrary<Partial<MixSettings>> = fc
  .record(
    {
      ...Object.fromEntries(
        SCALAR_MIX_SETTING_KEYS.map((key) => [key, weight]),
      ),
      criteriaVersion: fc.constantFrom(1, 2),
      presetId: fc.constantFrom('standard', 'exam', 'own-1'),
    },
    { requiredKeys: [] },
  )
  .map((settings) => settings as Partial<MixSettings>);

describe('stored mix settings', () => {
  it('normalise to the same settings a second time', () => {
    fc.assert(
      fc.property(storedArb, (stored) => {
        const once = normalizeMixSettings(stored);
        expect(normalizeMixSettings(once)).toEqual(once);
      }),
      RUNS,
    );
  });

  it('migrate once, and a migrated one stays as it is', () => {
    fc.assert(
      fc.property(storedArb, (stored) => {
        const once = migrateStoredMixSettings(stored);
        expect(migrateStoredMixSettings(once)).toBe(once);
        expect(once.criteriaVersion).toBe(MIX_CRITERIA_VERSION);
      }),
      RUNS,
    );
  });

  it('keep one performance criterion at most (decision 0013)', () => {
    fc.assert(
      fc.property(storedArb, (stored) => {
        const settings = normalizeMixSettings(stored);
        expect(
          settings.peerTutoring > 0 &&
            settings.homogeneousPerformanceGroups > 0,
        ).toBe(false);
      }),
      RUNS,
    );
  });
});
