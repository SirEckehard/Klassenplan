// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassDuties, Duty, DutyRound, Student } from '@/types';
import { shuffleArray } from './algorithm/shuffle';
import { MAX_DUTY_ROUNDS } from './constants';

/**
 * Handing out class duties so that they go round (decision 0028).
 *
 * The rotation reads the rounds a class kept: whoever held fewer duties so far
 * comes first, then whoever held this one less often, then whoever's last duty
 * lies further back. Within a tie the draw is random. A student holds at most
 * one duty per round; a duty that finds nobody left stays short, which the
 * page shows as an empty place rather than an error.
 */

type Tally = {
  total: number;
  byDuty: Map<string, number>;
  /** Index of the latest round with a duty; -1 for never. */
  last: number;
};

function tallyRounds(rounds: readonly DutyRound[]): Map<string, Tally> {
  const tallies = new Map<string, Tally>();
  rounds.forEach((round, index) => {
    for (const [dutyId, ids] of Object.entries(round.assignments)) {
      for (const id of ids) {
        const tally = tallies.get(id) ?? {
          total: 0,
          byDuty: new Map<string, number>(),
          last: -1,
        };
        tally.total += 1;
        tally.byDuty.set(dutyId, (tally.byDuty.get(dutyId) ?? 0) + 1);
        tally.last = index;
        tallies.set(id, tally);
      }
    }
  });
  return tallies;
}

const NEVER: Tally = { total: 0, byDuty: new Map(), last: -1 };

/** The pool in the order the rotation asks it: shuffled, then stably sorted. */
function rankFor(
  dutyId: string,
  pool: readonly string[],
  tallies: Map<string, Tally>,
  rng: () => number,
): string[] {
  return shuffleArray(pool, rng).sort((a, b) => {
    const ta = tallies.get(a) ?? NEVER;
    const tb = tallies.get(b) ?? NEVER;
    return (
      ta.total - tb.total ||
      (ta.byDuty.get(dutyId) ?? 0) - (tb.byDuty.get(dutyId) ?? 0) ||
      ta.last - tb.last
    );
  });
}

/** The ids of the students a duty can go to: those with a name. */
function namedIds(students: readonly Student[]): string[] {
  return students
    .filter((student) => student.name.trim().length > 0)
    .map((student) => student.id);
}

/**
 * One round: every duty, in the order the teacher listed them, takes its
 * number from the students not yet holding one.
 *
 * @param rounds Earlier rounds, oldest first
 * @param rng Injectable random source, so a test can assert an exact draw
 * @returns Duty id → student ids; shorter than the duty's count where the
 *   class ran out
 */
export function drawDuties(
  students: readonly Student[],
  duties: readonly Duty[],
  rounds: readonly DutyRound[],
  rng: () => number = Math.random,
): Record<string, string[]> {
  const tallies = tallyRounds(rounds);
  const free = new Set(namedIds(students));
  const assignments: Record<string, string[]> = {};

  for (const duty of duties) {
    const ranked = rankFor(duty.id, [...free], tallies, rng);
    const taken = ranked.slice(0, Math.max(0, duty.count));
    for (const id of taken) free.delete(id);
    assignments[duty.id] = taken;
  }
  return assignments;
}

/**
 * The student who takes one place of a duty — to fill an empty place or to
 * stand in for someone drawn who cannot do it.
 *
 * @param round The round being changed; nobody in it is picked again
 * @param exclude Also left out — the student being replaced
 * @returns The student's id, or null when the class has nobody left
 */
export function pickForDuty(
  dutyId: string,
  round: DutyRound,
  students: readonly Student[],
  rounds: readonly DutyRound[],
  rng: () => number = Math.random,
  exclude?: string,
): string | null {
  const holding = new Set(Object.values(round.assignments).flat());
  const pool = namedIds(students).filter(
    (id) => !holding.has(id) && id !== exclude,
  );
  if (pool.length === 0) return null;
  return rankFor(dutyId, pool, tallyRounds(rounds), rng)[0] ?? null;
}

/**
 * A new round for a class: the round on the wall goes into the history the
 * rotation reads, then every duty is drawn afresh.
 */
export function startDutyRound(
  state: ClassDuties,
  students: readonly Student[],
  options: { rng?: () => number; now?: Date } = {},
): ClassDuties {
  const rounds = (
    state.current ? [...state.rounds, state.current] : state.rounds
  ).slice(-MAX_DUTY_ROUNDS);
  return {
    duties: state.duties,
    rounds,
    current: {
      at: (options.now ?? new Date()).toISOString(),
      assignments: drawDuties(students, state.duties, rounds, options.rng),
    },
  };
}

/**
 * A round as it stands now: students that left the class are gone, a duty that
 * was removed is gone, and a duty whose number was lowered keeps that many.
 * The page shows this, and changes it — a place the teacher cannot see must not
 * keep a student out of the draw.
 */
export function trimRound(
  round: DutyRound,
  duties: readonly Duty[],
  students: readonly Student[],
): DutyRound {
  const known = new Set(students.map((student) => student.id));
  const assignments: Record<string, string[]> = {};
  for (const duty of duties) {
    assignments[duty.id] = (round.assignments[duty.id] ?? [])
      .filter((id) => known.has(id))
      .slice(0, duty.count);
  }
  return { at: round.at, assignments };
}
