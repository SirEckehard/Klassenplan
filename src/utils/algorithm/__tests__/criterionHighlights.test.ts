// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Criterion highlights are the app's explanation of its own seating: click a
 * criterion in the statistics badge and every seat is marked with how well it
 * satisfies that one rule.
 *
 * A wrong highlight does not look like a bug to a teacher — it looks like the
 * algorithm made a bad call. These tests pin each criterion to a hand-built
 * arrangement where the right answer is obvious by inspection.
 */
import { describe, it, expect } from 'vitest';
import { buildCriterionHighlightEntries } from '../criterionHighlights';
import {
  createMockClassroomScene,
  createMockStudent,
  createMockSavedPlan,
} from '@/__tests__/utils';
import type {
  ClassroomScene,
  SeatingArrangement,
  Student,
  MixSettings,
} from '@/types';
import type { StatisticHighlightEntry } from '@/types/StatisticsHighlight';

/** Two double tables side by side; seats 0 and 1 of a table are neighbours. */
const twoDoubleTables = (): ClassroomScene => createMockClassroomScene(2);

const entryFor = (
  entries: StatisticHighlightEntry[],
  studentId: string,
): StatisticHighlightEntry | undefined =>
  entries.find((entry) => entry.target.studentId === studentId);

type HighlightExtras = Pick<
  Parameters<typeof buildCriterionHighlightEntries>[0],
  'seatingHistory' | 'mixHistory'
>;

const build = (
  criterionKey: keyof MixSettings,
  arrangement: SeatingArrangement,
  extras: HighlightExtras = {},
) =>
  buildCriterionHighlightEntries({
    criterionKey,
    arrangement,
    scene: twoDoubleTables(),
    ...extras,
  });

describe('buildCriterionHighlightEntries', () => {
  describe('considerWishPartners', () => {
    it('marks a fulfilled wish on both seats', () => {
      const ada = createMockStudent({ id: 'ada', wishPartnerIds: ['grace'] });
      const grace = createMockStudent({ id: 'grace' });

      const entries = build('considerWishPartners', [[ada, grace], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
      expect(entryFor(entries, 'grace')?.percentage).toBe(100);
    });

    it('marks a wish seated next to the wrong person as unfulfilled', () => {
      const ada = createMockStudent({ id: 'ada', wishPartnerIds: ['grace'] });
      const alan = createMockStudent({ id: 'alan' });

      const entries = build('considerWishPartners', [[ada, alan], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
    });

    it('counts a second-choice wish, not just the first', () => {
      // The UI allows up to MAX_PARTNER_WISHES entries and mirrors only the
      // first one into the legacy `wishPartnerId`. Reading that field alone
      // made this seat look unfulfilled while the score counted it.
      const ada = createMockStudent({
        id: 'ada',
        wishPartnerIds: ['grace', 'alan'],
        wishPartnerId: 'grace',
      });
      const alan = createMockStudent({ id: 'alan' });

      const entries = build('considerWishPartners', [[ada, alan], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
    });

    it('still understands the legacy single-partner field', () => {
      const ada = createMockStudent({ id: 'ada', wishPartnerId: 'grace' });
      const grace = createMockStudent({ id: 'grace' });

      const entries = build('considerWishPartners', [[ada, grace], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
    });

    it('leaves a student without wishes unmarked', () => {
      const ada = createMockStudent({ id: 'ada' });
      const grace = createMockStudent({ id: 'grace' });

      const entries = build('considerWishPartners', [[ada, grace], []]);

      expect(entries).toEqual([]);
    });

    it('gives a partial score to a wish with no seat neighbour at all', () => {
      const ada = createMockStudent({ id: 'ada', wishPartnerIds: ['grace'] });

      const entries = build('considerWishPartners', [[ada, null], []]);

      // Not a failure: nobody was placed next to them, so the wish was neither
      // honoured nor broken.
      expect(entryFor(entries, 'ada')?.percentage).toBe(60);
    });
  });

  describe('avoidConflictPartners', () => {
    it('flags the seat when the avoided person is the neighbour', () => {
      const ada = createMockStudent({ id: 'ada', avoidPartnerIds: ['alan'] });
      const alan = createMockStudent({ id: 'alan' });

      const entries = build('avoidConflictPartners', [[ada, alan], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
      expect(entryFor(entries, 'alan')?.percentage).toBe(0);
    });

    it('counts a second avoid entry, not just the first', () => {
      const ada = createMockStudent({
        id: 'ada',
        avoidPartnerIds: ['grace', 'alan'],
        avoidPartnerId: 'grace',
      });
      const alan = createMockStudent({ id: 'alan' });

      const entries = build('avoidConflictPartners', [[ada, alan], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
    });

    it('rewards a seat away from everyone on the avoid list', () => {
      const ada = createMockStudent({ id: 'ada', avoidPartnerIds: ['alan'] });
      const grace = createMockStudent({ id: 'grace' });

      const entries = build('avoidConflictPartners', [[ada, grace], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
    });
  });

  describe('avoidRestlessTogether', () => {
    it('flags two restless students sharing a table', () => {
      const a = createMockStudent({ id: 'a', restless: true });
      const b = createMockStudent({ id: 'b', restless: true });

      const entries = build('avoidRestlessTogether', [[a, b], []]);

      expect(entryFor(entries, 'a')?.percentage).toBe(0);
      expect(entryFor(entries, 'b')?.percentage).toBe(0);
    });

    it('rewards a restless student next to a calm one', () => {
      const a = createMockStudent({ id: 'a', restless: true });
      const b = createMockStudent({ id: 'b' });

      const entries = build('avoidRestlessTogether', [[a, b], []]);

      expect(entryFor(entries, 'a')?.percentage).toBe(100);
      // The calm student is not the subject of this criterion.
      expect(entryFor(entries, 'b')).toBeUndefined();
    });
  });

  describe('avoidConcentrationNearRestless', () => {
    it('flags a distractible student seated next to a restless one', () => {
      const a = createMockStudent({ id: 'a', concentrationIssues: true });
      const b = createMockStudent({ id: 'b', restless: true });

      const entries = build('avoidConcentrationNearRestless', [[a, b], []]);

      expect(entryFor(entries, 'a')?.percentage).toBe(0);
    });

    it('rewards the same student away from restless neighbours', () => {
      const a = createMockStudent({ id: 'a', concentrationIssues: true });
      const b = createMockStudent({ id: 'b' });

      const entries = build('avoidConcentrationNearRestless', [[a, b], []]);

      expect(entryFor(entries, 'a')?.percentage).toBe(100);
    });
  });

  describe('avoidPreviousPairs', () => {
    const pairPlan = (first: Student, second: Student) =>
      createMockSavedPlan({ seating: [[first, second], []] });

    it('flags a pair that already sat together', () => {
      const a = createMockStudent({ id: 'a' });
      const b = createMockStudent({ id: 'b' });

      const entries = build('avoidPreviousPairs', [[a, b], []], {
        seatingHistory: [pairPlan(a, b)],
      });

      expect(entryFor(entries, 'a')?.percentage).toBe(0);
      expect(entryFor(entries, 'b')?.percentage).toBe(0);
    });

    it('rewards a pair that is new', () => {
      const a = createMockStudent({ id: 'a' });
      const b = createMockStudent({ id: 'b' });
      const c = createMockStudent({ id: 'c' });

      const entries = build('avoidPreviousPairs', [[a, b], []], {
        seatingHistory: [pairPlan(a, c)],
      });

      expect(entryFor(entries, 'a')?.percentage).toBe(100);
      expect(entryFor(entries, 'b')?.percentage).toBe(100);
    });

    it('returns nothing without a history to compare against', () => {
      const a = createMockStudent({ id: 'a' });
      const b = createMockStudent({ id: 'b' });

      expect(build('avoidPreviousPairs', [[a, b], []])).toEqual([]);
    });
  });

  describe('robustness', () => {
    it('handles an empty arrangement', () => {
      expect(build('considerWishPartners', [])).toEqual([]);
    });

    it('handles a table of empty seats', () => {
      expect(build('avoidRestlessTogether', [[null, null], []])).toEqual([]);
    });

    it('produces a status alongside every percentage', () => {
      const a = createMockStudent({ id: 'a', restless: true });
      const b = createMockStudent({ id: 'b', restless: true });

      const entries = build('avoidRestlessTogether', [[a, b], []]);

      expect(entries.length).toBeGreaterThan(0);
      entries.forEach((entry) => {
        expect(entry.status).toBeTruthy();
        expect(entry.target.type).toBe('seat');
        expect(entry.percentage).toBeGreaterThanOrEqual(0);
        expect(entry.percentage).toBeLessThanOrEqual(100);
      });
    });
  });
});
