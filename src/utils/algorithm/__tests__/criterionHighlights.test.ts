// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Criterion highlights are the app's explanation of its own seating: click a
 * criterion in the statistics badge and every seat is marked with how well it
 * satisfies that one rule.
 *
 * A wrong highlight does not look like a bug to a teacher — it looks like the
 * algorithm made a bad call. The marks come from the cases the fulfilment
 * counts (decision 0031); these tests pin each criterion to a hand-built
 * arrangement where the right answer is obvious by inspection.
 */
import { describe, it, expect } from 'vitest';
import { buildCriterionHighlightEntries } from '../criterionHighlights';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  PlanUsage,
  SeatingArrangement,
  Student,
} from '@/types';
import type { StatisticHighlightEntry } from '@/types/StatisticsHighlight';
import { neutralSettings } from '../../mixSettings';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '../../data/planUsage';

const boardRight: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};

const desk = (x: number, y: number): ClassroomTable => ({
  x,
  y,
  width: 55,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

/** Two double desks along the board's wall with an aisle between them. */
const twoDesks: ClassroomScene = {
  totalStudents: 0,
  tables: [desk(600, 100), desk(600, 290)],
  features: [boardRight],
};

const student = (id: string, extra: Partial<Student> = {}): Student =>
  ({
    id,
    name: id,
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    ...extra,
  }) as Student;

const entryFor = (
  entries: StatisticHighlightEntry[],
  studentId: string,
): StatisticHighlightEntry | undefined =>
  entries.find((entry) => entry.target.studentId === studentId);

const build = (
  criterionKey: keyof MixSettings,
  arrangement: SeatingArrangement,
  weights: Partial<MixSettings> = { [criterionKey]: 5 },
  planUsage: PlanUsage[] = [],
) =>
  buildCriterionHighlightEntries({
    criterionKey,
    arrangement,
    scene: twoDesks,
    students: arrangement
      .flat()
      .filter((seat): seat is Student => Boolean(seat)),
    settings: { ...neutralSettings, ...weights },
    planUsage,
  });

describe('buildCriterionHighlightEntries', () => {
  describe('considerWishPartners', () => {
    it('marks a fulfilled wish on both seats', () => {
      const ada = student('ada', { wishPartnerIds: ['grace'] });
      const grace = student('grace');

      const entries = build('considerWishPartners', [[ada, grace], []]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
      expect(entryFor(entries, 'grace')?.percentage).toBe(100);
    });

    it('marks a wish seated next to the wrong person as unfulfilled', () => {
      const ada = student('ada', { wishPartnerIds: ['grace'] });

      const entries = build('considerWishPartners', [
        [ada, student('alan')],
        [student('grace'), null],
      ]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
      // The wished classmate is not the one marked: the wish is not theirs.
      expect(entryFor(entries, 'grace')).toBeUndefined();
    });

    it('counts a second-choice wish, not just the first', () => {
      const ada = student('ada', { wishPartnerIds: ['grace', 'alan'] });

      const entries = build('considerWishPartners', [
        [ada, student('alan')],
        [student('grace'), null],
      ]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
    });

    it('still understands the legacy single-partner field', () => {
      const ada = student('ada', { wishPartnerId: 'grace' });

      const entries = build('considerWishPartners', [
        [ada, student('grace')],
        [],
      ]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
    });

    it('leaves a student without wishes unmarked', () => {
      const entries = build('considerWishPartners', [
        [student('alan'), student('grace')],
        [],
      ]);

      expect(entries).toEqual([]);
    });
  });

  describe('avoidConflictPartners', () => {
    it('flags both seats when the avoided person is the seat partner', () => {
      const ada = student('ada', { avoidPartnerIds: ['alan'] });

      const entries = build('avoidConflictPartners', [
        [ada, student('alan')],
        [],
      ]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
      expect(entryFor(entries, 'alan')?.percentage).toBe(0);
    });

    it('counts a second avoid entry, not just the first', () => {
      const ada = student('ada', { avoidPartnerIds: ['grace', 'alan'] });

      const entries = build('avoidConflictPartners', [
        [ada, student('alan')],
        [student('grace'), null],
      ]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
    });

    it('rewards a seat away from everyone on the avoid list', () => {
      const ada = student('ada', { avoidPartnerIds: ['alan'] });

      const entries = build('avoidConflictPartners', [
        [ada, null],
        [student('alan'), null],
      ]);

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
    });
  });

  describe('avoidRestlessTogether', () => {
    it('flags two restless students sharing a desk', () => {
      const entries = build('avoidRestlessTogether', [
        [student('r1', { restless: true }), student('r2', { restless: true })],
        [],
      ]);

      expect(entryFor(entries, 'r1')?.percentage).toBe(0);
      expect(entryFor(entries, 'r2')?.percentage).toBe(0);
    });

    it('rewards a restless student next to a calm one', () => {
      const entries = build('avoidRestlessTogether', [
        [student('r1', { restless: true }), student('calm')],
        [student('r2', { restless: true }), null],
      ]);

      expect(entryFor(entries, 'r1')?.percentage).toBe(100);
      expect(entryFor(entries, 'calm')).toBeUndefined();
    });
  });

  describe('avoidConcentrationTogether', () => {
    it('marks both of its cases, beside each other and beside the restless', () => {
      const distractible = student('c', { concentrationIssues: true });

      const entries = build(
        'avoidConcentrationTogether',
        [
          [distractible, student('r', { restless: true })],
          [student('c2', { concentrationIssues: true }), null],
        ],
        { avoidConcentrationTogether: 5, avoidConcentrationNearRestless: 5 },
      );

      expect(entryFor(entries, 'c')?.percentage).toBe(0);
      expect(entryFor(entries, 'c2')?.percentage).toBe(100);
    });
  });

  describe('avoidPreviousPairs', () => {
    const ada = student('ada');
    const alan = student('alan');
    const used = (seating: SeatingArrangement, day: number): PlanUsage => {
      const pairs = collectSeatingPairKeys(seating);
      return {
        id: `u${day}`,
        fingerprint: computePlanFingerprint(pairs),
        pairs,
        firstSeenAt: `2026-10-0${day}T08:00:00.000Z`,
        lastSeenAt: `2026-10-0${day}T08:00:00.000Z`,
        sources: ['presented'],
        confidence: 1,
      };
    };

    it('flags a pair of a plan in use', () => {
      // Another pair in it: a plan with exactly the same pairs is this plan.
      const grace = student('grace');
      const before: SeatingArrangement = [
        [ada, alan],
        [grace, student('hedy')],
      ];
      const plan: SeatingArrangement = [
        [alan, ada],
        [grace, null],
      ];

      const entries = build(
        'avoidPreviousPairs',
        plan,
        { avoidPreviousPairs: 6 },
        [used(before, 1)],
      );

      expect(entryFor(entries, 'ada')?.percentage).toBe(0);
    });

    it('does not flag a plan in use as a repetition of itself', () => {
      const plan: SeatingArrangement = [[ada, alan], []];

      const entries = build(
        'avoidPreviousPairs',
        plan,
        {
          avoidPreviousPairs: 6,
        },
        [used(plan, 1)],
      );

      expect(entryFor(entries, 'ada')?.percentage).toBe(100);
      expect(entryFor(entries, 'alan')?.percentage).toBe(100);
    });
  });

  describe('robustness', () => {
    it('handles an empty arrangement', () => {
      expect(build('avoidRestlessTogether', [])).toEqual([]);
    });

    it('handles a desk of empty seats', () => {
      expect(build('avoidRestlessTogether', [[null, null], []])).toEqual([]);
    });

    it('produces a status alongside every percentage', () => {
      const entries = build('avoidRestlessTogether', [
        [student('r1', { restless: true }), student('r2', { restless: true })],
        [student('r3', { restless: true }), null],
      ]);

      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(['ok', 'warn', 'alert']).toContain(entry.status);
      }
    });
  });
});
