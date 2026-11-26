// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * When the plan layer asks how the last plan in use went (decision 0054):
 * the newest plan that counts, followed by another, in use a week at least,
 * without feedback and not asked about before.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlanUsage } from '@/types';
import {
  noteAskedPlanFeedback,
  planToAskAbout,
  readAskedPlanFeedback,
} from '../planFeedbackPrompt';

const NOW = new Date('2026-11-24T08:00:00.000Z');
const DAY = 24 * 3600 * 1000;
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * DAY).toISOString();

const record = (patch: Partial<PlanUsage> = {}): PlanUsage => ({
  id: 'r1',
  fingerprint: 'fp-1',
  pairs: ['a::b'],
  firstSeenAt: daysAgo(10),
  lastSeenAt: daysAgo(2),
  sources: ['presented'],
  confidence: 1,
  ...patch,
});

describe('planToAskAbout', () => {
  beforeEach(() => localStorage.clear());

  it('asks about the newest plan in use once another is on the stage', () => {
    const older = record({ id: 'r0', lastSeenAt: daysAgo(20) });
    expect(
      planToAskAbout(
        [older, record()],
        { fingerprint: 'fp-new' },
        new Set(),
        NOW,
      )?.id,
    ).toBe('r1');
  });

  it('waits while the plan is still the one on the stage', () => {
    expect(
      planToAskAbout([record()], { fingerprint: 'fp-1' }, new Set(), NOW),
    ).toBeNull();
  });

  it('waits until a plan was in use a week', () => {
    expect(
      planToAskAbout(
        [record({ firstSeenAt: daysAgo(6) })],
        { fingerprint: 'fp-new' },
        new Set(),
        NOW,
      ),
    ).toBeNull();
  });

  it('asks nothing about a plan with feedback, one asked about, or one out of the count', () => {
    const rated = record({ feedback: { rating: 'good', at: daysAgo(1) } });
    expect(
      planToAskAbout([rated], { fingerprint: 'fp-new' }, new Set(), NOW),
    ).toBeNull();
    expect(
      planToAskAbout(
        [record()],
        { fingerprint: 'fp-new' },
        new Set(['r1']),
        NOW,
      ),
    ).toBe(null);
    expect(
      planToAskAbout(
        [record({ confirmed: false })],
        { fingerprint: 'fp-new' },
        new Set(),
        NOW,
      ),
    ).toBeNull();
  });

  it('asks only about the newest one, never an older one without feedback', () => {
    const newest = record({
      id: 'r2',
      lastSeenAt: daysAgo(1),
      feedback: { rating: 'poor', at: daysAgo(1) },
    });
    expect(
      planToAskAbout(
        [record(), newest],
        { fingerprint: 'fp-new' },
        new Set(),
        NOW,
      ),
    ).toBe(null);
  });

  it('remembers what it asked about on this device', () => {
    noteAskedPlanFeedback('r1');
    noteAskedPlanFeedback('r1');
    noteAskedPlanFeedback('r2');
    expect([...readAskedPlanFeedback()]).toEqual(['r1', 'r2']);
  });
});
