// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  buildQuizRound,
  quizTargetWeight,
  QUIZ_ROUND_LENGTH,
} from '../quiz/quizEngine';
import { createMockStudent } from '@/__tests__/utils';
import type { NameGameStatsMap, Student } from '@/types';

/** Deterministic rng: cycles through the given values. */
const seededRng = (values: number[] = [0.42]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

const makeClass = (count: number): Student[] =>
  Array.from({ length: count }, (_, i) =>
    createMockStudent({ id: `s${i + 1}`, name: `Name ${i + 1}` }),
  );

describe('quizTargetWeight', () => {
  it('gives unseen students the highest weight', () => {
    expect(quizTargetWeight({}, 'x')).toBe(3);
    expect(quizTargetWeight({ x: { asked: 0, correct: 0 } }, 'x')).toBe(3);
  });

  it('weights uncertain students higher than mastered ones', () => {
    const stats: NameGameStatsMap = {
      mastered: { asked: 4, correct: 4 },
      shaky: { asked: 4, correct: 1 },
    };
    expect(quizTargetWeight(stats, 'mastered')).toBe(1);
    expect(quizTargetWeight(stats, 'shaky')).toBeGreaterThan(
      quizTargetWeight(stats, 'mastered'),
    );
  });
});

describe('buildQuizRound', () => {
  it('caps the round at the default length and at the class size', () => {
    expect(
      buildQuizRound(makeClass(20), {}, { rng: seededRng() }),
    ).toHaveLength(QUIZ_ROUND_LENGTH);
    expect(buildQuizRound(makeClass(6), {}, { rng: seededRng() })).toHaveLength(
      6,
    );
  });

  it('never repeats a target within a round', () => {
    const questions = buildQuizRound(makeClass(12), {}, { rng: seededRng() });
    const targets = questions.map((q) => q.targetId);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('builds 4 distinct options that include the target', () => {
    const questions = buildQuizRound(makeClass(10), {}, { rng: seededRng() });
    for (const q of questions) {
      expect(q.optionIds).toHaveLength(4);
      expect(new Set(q.optionIds).size).toBe(4);
      expect(q.optionIds).toContain(q.targetId);
    }
  });

  it('prefers unseen students over well-known ones', () => {
    const students = makeClass(12);
    // Everyone except s1/s2 has been answered correctly many times.
    const stats: NameGameStatsMap = Object.fromEntries(
      students.slice(2).map((s) => [s.id, { asked: 10, correct: 10 } as const]),
    );
    const targetCounts = new Map<string, number>();
    for (let run = 0; run < 50; run++) {
      const rng = seededRng([((run * 37) % 100) / 100, 0.13, 0.77, 0.51]);
      for (const q of buildQuizRound(students, stats, { length: 4, rng })) {
        targetCounts.set(q.targetId, (targetCounts.get(q.targetId) ?? 0) + 1);
      }
    }
    const unseenHits =
      (targetCounts.get('s1') ?? 0) + (targetCounts.get('s2') ?? 0);
    // 2 of 12 students hold 6 of 16 total weight; with 4 picks per round the
    // two unseen students should be picked far more often than the 2/12 base
    // rate (50 rounds × 4 picks = 200 targets → expect well above 33).
    expect(unseenHits).toBeGreaterThan(60);
  });

  it('avoids duplicate display names among the options', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Alex' }),
      createMockStudent({ id: 'b', name: 'Alex' }),
      createMockStudent({ id: 'c', name: 'Cem' }),
      createMockStudent({ id: 'd', name: 'Dana' }),
      createMockStudent({ id: 'e', name: 'Cem' }),
    ];
    const questions = buildQuizRound(students, {}, { rng: seededRng() });
    for (const q of questions) {
      const names = q.optionIds.map(
        (id) => students.find((s) => s.id === id)!.name,
      );
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('skips targets that have no distinct-name distractor', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Alex' }),
      createMockStudent({ id: 'b', name: 'Alex' }),
    ];
    expect(buildQuizRound(students, {}, { rng: seededRng() })).toHaveLength(0);
  });
});
