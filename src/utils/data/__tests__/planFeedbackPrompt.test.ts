// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * When "Mischen" asks how the plan on the stage went (decision 0054,
 * addendum of 2026-11-27): a plan that counts, in use before today, without
 * feedback and not asked about before.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlanUsage } from '@/types';
import {
  inUseBeforeToday,
  noteAskedPlanFeedback,
  planToAskBeforeMix,
  readAskedPlanFeedback,
} from '../planFeedbackPrompt';

// Local times, so the day boundary is this machine's as it is the teacher's.
const NOW = new Date(2026, 10, 24, 8, 0);
const at = (day: number, hour: number) =>
  new Date(2026, 10, day, hour).toISOString();

const record = (patch: Partial<PlanUsage> = {}): PlanUsage => ({
  id: 'r1',
  fingerprint: 'fp-1',
  pairs: ['a::b'],
  firstSeenAt: at(14, 9),
  lastSeenAt: at(22, 9),
  sources: ['presented'],
  confidence: 1,
  ...patch,
});

describe('inUseBeforeToday', () => {
  it('counts a plan from the day after its first use', () => {
    expect(inUseBeforeToday(at(23, 23), NOW)).toBe(true);
    expect(inUseBeforeToday(at(24, 0), NOW)).toBe(false);
    expect(inUseBeforeToday(at(24, 7), NOW)).toBe(false);
  });

  it('says no where the day is unknown', () => {
    expect(inUseBeforeToday(undefined, NOW)).toBe(false);
    expect(inUseBeforeToday('not a date', NOW)).toBe(false);
  });
});

describe('planToAskBeforeMix', () => {
  beforeEach(() => localStorage.clear());

  it('asks about the plan on the stage once it was in use before today', () => {
    expect(planToAskBeforeMix(record(), new Set(), NOW)?.id).toBe('r1');
  });

  it('asks nothing about a plan first used today', () => {
    expect(
      planToAskBeforeMix(record({ firstSeenAt: at(24, 7) }), new Set(), NOW),
    ).toBeNull();
  });

  it('asks nothing without a record, about one with feedback, one asked about, or one out of the count', () => {
    expect(planToAskBeforeMix(undefined, new Set(), NOW)).toBeNull();
    expect(
      planToAskBeforeMix(
        record({ feedback: { rating: 'good', at: at(20, 9) } }),
        new Set(),
        NOW,
      ),
    ).toBeNull();
    expect(planToAskBeforeMix(record(), new Set(['r1']), NOW)).toBeNull();
    expect(
      planToAskBeforeMix(record({ confirmed: false }), new Set(), NOW),
    ).toBeNull();
  });

  it('remembers what it asked about on this device', () => {
    noteAskedPlanFeedback('r1');
    noteAskedPlanFeedback('r1');
    noteAskedPlanFeedback('r2');
    expect([...readAskedPlanFeedback()]).toEqual(['r1', 'r2']);
  });
});
