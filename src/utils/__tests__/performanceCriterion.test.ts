// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Peer tutoring and homogeneous groups pull in opposite directions, so only
 * one of them may ever apply (decision 0013).
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MIX_WEIGHTS,
  neutralSettings,
  normalizeMixSettings,
  resolvePerformanceCriterion,
} from '../mixSettings';

describe('resolvePerformanceCriterion', () => {
  it('returns null while both weights are 0', () => {
    expect(
      resolvePerformanceCriterion({
        peerTutoring: 0,
        homogeneousPerformanceGroups: 0,
      }),
    ).toBeNull();
  });

  it('picks the criterion with the higher weight', () => {
    expect(
      resolvePerformanceCriterion({
        peerTutoring: 2,
        homogeneousPerformanceGroups: 5,
      }),
    ).toBe('homogeneousPerformanceGroups');
    expect(
      resolvePerformanceCriterion({
        peerTutoring: 5,
        homogeneousPerformanceGroups: 2,
      }),
    ).toBe('peerTutoring');
  });

  it('picks peer tutoring on a tie', () => {
    expect(
      resolvePerformanceCriterion({
        peerTutoring: 3,
        homogeneousPerformanceGroups: 3,
      }),
    ).toBe('peerTutoring');
  });
});

describe('normalizeMixSettings keeps one performance criterion', () => {
  it('keeps peer tutoring when both come from the recommended weights', () => {
    const normalized = normalizeMixSettings(undefined);

    expect(normalized.peerTutoring).toBe(DEFAULT_MIX_WEIGHTS.peerTutoring);
    expect(normalized.homogeneousPerformanceGroups).toBe(0);
  });

  it('zeroes the lower weight of settings that carry both', () => {
    const normalized = normalizeMixSettings(
      { peerTutoring: 2, homogeneousPerformanceGroups: 6 },
      neutralSettings,
    );

    expect(normalized.peerTutoring).toBe(0);
    expect(normalized.homogeneousPerformanceGroups).toBe(6);
  });

  it('leaves a single criterion as it is', () => {
    const normalized = normalizeMixSettings(
      { homogeneousPerformanceGroups: 4 },
      neutralSettings,
    );

    expect(normalized.homogeneousPerformanceGroups).toBe(4);
    expect(normalized.peerTutoring).toBe(0);
  });
});
