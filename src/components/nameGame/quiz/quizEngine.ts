// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Pure question-generation logic for the name quiz. No React, no I/O —
 * fully deterministic with an injected rng for tests.
 */
import { shuffleArray } from '@/utils/algorithm/shuffle';
import type { NameGameStatsMap, Student } from '@/types';

export type QuizQuestionType = 'photoToName' | 'nameToPhoto';

export interface QuizQuestionSpec {
  type: QuizQuestionType;
  /** Student whose name/photo is asked for. */
  targetId: string;
  /** Option student ids including the target, shuffled. */
  optionIds: string[];
}

export interface QuizRoundOptions {
  /** Maximum questions per round (capped by the number of students). */
  length?: number;
  /** Random source in [0, 1); injectable for deterministic tests. */
  rng?: () => number;
}

export const QUIZ_ROUND_LENGTH = 10;
const OPTION_COUNT = 4;

/**
 * Selection weight for a student: unseen students are strongly preferred,
 * otherwise uncertainty (low accuracy) raises the weight.
 */
export function quizTargetWeight(
  stats: NameGameStatsMap,
  studentId: string,
): number {
  const stat = stats[studentId];
  if (!stat || stat.asked === 0) return 3;
  return 1 + 2 * (1 - stat.correct / stat.asked);
}

/** Weighted sampling without replacement over student ids. */
function pickTargets(
  students: readonly Student[],
  stats: NameGameStatsMap,
  count: number,
  rng: () => number,
): Student[] {
  const pool = [...students];
  const picked: Student[] = [];
  while (picked.length < count && pool.length > 0) {
    const weights = pool.map((s) => quizTargetWeight(stats, s.id));
    const total = weights.reduce((sum, w) => sum + w, 0);
    let ticket = rng() * total;
    let index = 0;
    while (index < pool.length - 1 && ticket >= weights[index]!) {
      ticket -= weights[index]!;
      index += 1;
    }
    picked.push(pool[index]!);
    pool.splice(index, 1);
  }
  return picked;
}

/**
 * Distractors must have a display name distinct from the target and from each
 * other — otherwise two options would be indistinguishable in photo→name mode.
 */
function pickDistractors(
  target: Student,
  students: readonly Student[],
  rng: () => number,
): Student[] {
  const targetName = target.name.trim();
  const seenNames = new Set([targetName]);
  const candidates: Student[] = [];
  for (const student of shuffleArray(students, rng)) {
    if (student.id === target.id) continue;
    const name = student.name.trim();
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    candidates.push(student);
    if (candidates.length === OPTION_COUNT - 1) break;
  }
  return candidates;
}

/**
 * Build one quiz round: distinct weighted targets, each with up to 3
 * distinct-name distractors. Targets with no possible distractor are skipped.
 */
export function buildQuizRound(
  students: readonly Student[],
  stats: NameGameStatsMap,
  options: QuizRoundOptions = {},
): QuizQuestionSpec[] {
  const rng = options.rng ?? Math.random;
  const length = Math.min(options.length ?? QUIZ_ROUND_LENGTH, students.length);
  const targets = pickTargets(students, stats, length, rng);

  const questions: QuizQuestionSpec[] = [];
  for (const target of targets) {
    const distractors = pickDistractors(target, students, rng);
    if (distractors.length === 0) continue;
    questions.push({
      type: rng() < 0.5 ? 'photoToName' : 'nameToPhoto',
      targetId: target.id,
      optionIds: shuffleArray(
        [target.id, ...distractors.map((s) => s.id)],
        rng,
      ),
    });
  }
  return questions;
}
