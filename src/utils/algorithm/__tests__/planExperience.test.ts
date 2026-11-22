// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What a mix makes of how a plan in use went (decision 0054), seed by seed:
 * a table that did not work stays apart even where wishes pull it together,
 * and the pairs of a plan that went well come back where repetition alone
 * would part them.
 */
import { describe, expect, it } from 'vitest';
import type {
  MixSettings,
  PlanUsage,
  SeatingArrangement,
  Student,
} from '@/types';
import { neutralSettings } from '../../mixSettings';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '../../data/planUsage';
import arrangeTables from '../autoArrange';
import { createRng } from '../rng';
import { runMixSession } from '../seatingAlgorithm';

const SEEDS = [1, 2, 3, 4, 5];
const room = {
  totalStudents: 0,
  tables: arrangeTables('double', 12),
  features: [],
};

const classOf = (wishes: (index: number) => string[]): Student[] =>
  Array.from({ length: 24 }, (_, index): Student => ({
    id: `s${index}`,
    name: `Student ${index}`,
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    wishPartnerIds: wishes(index),
  }));

/** Every student beside the next one: s0 with s1, s2 with s3 … */
const inPairs = (students: Student[]): SeatingArrangement =>
  room.tables.map((_, desk) => [students[2 * desk]!, students[2 * desk + 1]!]);

const usageOf = (
  seating: SeatingArrangement,
  feedback?: PlanUsage['feedback'],
): PlanUsage => {
  const pairs = collectSeatingPairKeys(seating);
  return {
    id: 'u1',
    fingerprint: computePlanFingerprint(pairs),
    pairs,
    firstSeenAt: '2026-10-01T08:00:00.000Z',
    lastSeenAt: '2026-10-01T08:00:00.000Z',
    sources: ['presented'],
    confidence: 1,
    ...(feedback ? { confirmed: true, feedback } : {}),
  };
};

/** How many of `pairs` sit at one desk in each seeded mix. */
const together = (
  students: Student[],
  settings: Partial<MixSettings>,
  planUsage: PlanUsage[],
  pairs: readonly string[],
): number[] =>
  SEEDS.map((seed) => {
    const seating = runMixSession(
      students,
      [],
      {},
      { ...neutralSettings, ...settings },
      room,
      { rng: createRng(seed), refine: true, planUsage },
    );
    const now = new Set(collectSeatingPairKeys(seating));
    return pairs.filter((key) => now.has(key)).length;
  });

describe('a mix after feedback on a plan in use', () => {
  it('keeps two friends apart whose desk did not work', () => {
    // s0 and s1 wish each other: the wish outweighs their repetition.
    const students = classOf((index) =>
      index === 0 ? ['s1'] : index === 1 ? ['s0'] : [],
    );
    const plan = inPairs(students);
    const settings = {
      avoidPreviousPairs: 6,
      considerWishPartners: 5,
      considerPlanFeedback: 6,
    };

    expect(together(students, settings, [usageOf(plan)], ['s0::s1'])).toEqual([
      1, 1, 1, 1, 1,
    ]);
    expect(
      together(
        students,
        settings,
        [
          usageOf(plan, {
            rating: 'poor',
            poorTables: [['s0', 's1']],
            at: '2026-10-20',
          }),
        ],
        ['s0::s1'],
      ),
    ).toEqual([0, 0, 0, 0, 0]);
  });

  it('lets the pairs of a plan that went well come back where a wish asks', () => {
    // Every even student wishes the next one: one-sided, weaker than a
    // repetition in full, stronger than one at half.
    const students = classOf((index) =>
      index % 2 === 0 ? [`s${index + 1}`] : [],
    );
    const plan = inPairs(students);
    const pairs = collectSeatingPairKeys(plan);
    const settings = {
      avoidPreviousPairs: 6,
      considerWishPartners: 5,
      considerPlanFeedback: 6,
    };

    const without = together(students, settings, [usageOf(plan)], pairs);
    const wentWell = together(
      students,
      settings,
      [usageOf(plan, { rating: 'good', at: '2026-10-20' })],
      pairs,
    );

    expect(without).toEqual([0, 0, 0, 0, 0]);
    expect(wentWell).toEqual([12, 12, 12, 12, 12]);
  });

  it('follows no feedback while "Erfahrung" is off', () => {
    const students = classOf((index) =>
      index === 0 ? ['s1'] : index === 1 ? ['s0'] : [],
    );
    const plan = inPairs(students);

    expect(
      together(
        students,
        { avoidPreviousPairs: 6, considerWishPartners: 5 },
        [
          usageOf(plan, {
            rating: 'poor',
            poorTables: [['s0', 's1']],
            at: '2026-10-20',
          }),
        ],
        ['s0::s1'],
      ),
    ).toEqual([1, 1, 1, 1, 1]);
  });
});
