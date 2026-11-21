// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How a plan went, kept on its usage record (decision 0054), as properties:
 * what is kept is normalised once and for all, giving it twice is giving it
 * once, taking it back leaves the plan used, and no later signal loses it.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { PlanUsage, Student } from '@/types';
import {
  isCountedUsage,
  markPlanUsage,
  mergePlanUsageSignal,
  normalizePlanFeedback,
  resolvePlanUsageMode,
  withPlanFeedback,
} from '@/utils/data/planUsage';
import { seatPairKey } from '@/utils/pairs';
import {
  planUsageArb,
  rawPlanFeedbackArb,
  studentsArb,
} from '@/__tests__/utils/arbitraries';

const RUNS = { numRuns: 200 };

/** A record's pairs, fingerprint and date as `withPlanFeedback` takes them. */
const signalOf = (record: PlanUsage, id: string) => ({
  pairs: record.pairs,
  fingerprint: record.fingerprint,
  at: record.firstSeenAt,
  id,
});

/**
 * A class's records, each arrangement once, and a plan to give feedback on:
 * one of them or one without a record yet.
 */
const caseArb = studentsArb({ minLength: 2, maxLength: 12 }).chain(
  (students: Student[]) =>
    fc
      .uniqueArray(planUsageArb(students), {
        maxLength: 6,
        selector: (record) => record.fingerprint,
      })
      .chain((entries) =>
        fc.record({
          entries: fc.constant(entries),
          target:
            entries.length > 0
              ? fc.oneof(fc.constantFrom(...entries), planUsageArb(students))
              : planUsageArb(students),
          feedback: rawPlanFeedbackArb(students),
          later: fc.array(planUsageArb(students), { maxLength: 5 }),
        }),
      ),
);

describe('feedback on a plan in use', () => {
  it('is normalised once and for all, its tables of students who sat together', () => {
    fc.assert(
      fc.property(caseArb, ({ target, feedback }) => {
        const kept = normalizePlanFeedback(feedback, target.pairs);

        expect(normalizePlanFeedback(kept, target.pairs)).toEqual(kept);
        if (kept.rating === 'good') expect(kept.poorTables).toBeUndefined();
        const pairs = new Set(target.pairs);
        for (const table of kept.poorTables ?? []) {
          expect(table.length).toBeGreaterThanOrEqual(2);
          expect([...table].sort()).toEqual(table);
          table.forEach((id, i) =>
            table
              .slice(i + 1)
              .forEach((other) =>
                expect(pairs.has(seatPairKey(id, other))).toBe(true),
              ),
          );
        }
      }),
      RUNS,
    );
  });

  it('given twice is given once', () => {
    fc.assert(
      fc.property(caseArb, ({ entries, target, feedback }) => {
        const signal = signalOf(target, 'new');
        const once = withPlanFeedback(entries, signal, feedback);

        expect(withPlanFeedback(once, signal, feedback)).toEqual(once);
      }),
      RUNS,
    );
  });

  it('taken back leaves the plan marked as used and nothing else changed', () => {
    fc.assert(
      fc.property(caseArb, ({ entries, target, feedback }) => {
        const signal = signalOf(target, 'new');
        const back = withPlanFeedback(
          withPlanFeedback(entries, signal, feedback),
          signal,
          null,
        );

        expect(back).toEqual(
          markPlanUsage(withPlanFeedback(entries, signal, null), signal, true),
        );
      }),
      RUNS,
    );
  });

  it('counts, also for a class that marks its plans by hand', () => {
    fc.assert(
      fc.property(caseArb, ({ entries, target, feedback }) => {
        const rated = withPlanFeedback(
          entries,
          signalOf(target, 'new'),
          feedback,
        );
        for (const manual of [false, true]) {
          const record = resolvePlanUsageMode(rated, manual).find(
            (entry) => entry.fingerprint === target.fingerprint,
          );
          expect(record && isCountedUsage(record)).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it('outlasts every later signal', () => {
    fc.assert(
      fc.property(caseArb, ({ entries, target, feedback, later }) => {
        const rated = withPlanFeedback(
          entries,
          signalOf(target, 'new'),
          feedback,
        );
        const kept = rated.find(
          (entry) => entry.fingerprint === target.fingerprint,
        )!.feedback;

        const after = later.reduce(
          (current, record, index) =>
            mergePlanUsageSignal(current, {
              pairs: record.pairs,
              fingerprint: record.fingerprint,
              source: record.sources[0]!,
              at: record.firstSeenAt,
              id: `later-${index}`,
            }),
          rated,
        );

        expect(
          after.find((entry) => entry.fingerprint === target.fingerprint)
            ?.feedback,
        ).toEqual(kept);
      }),
      RUNS,
    );
  });
});
