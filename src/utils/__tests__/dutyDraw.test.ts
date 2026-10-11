// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/algorithm/rng';
import {
  drawDuties,
  pickForDuty,
  startDutyRound,
  trimRound,
} from '../dutyDraw';
import type { ClassDuties, Duty, DutyRound, Student } from '@/types';

const student = (id: string, name = id): Student =>
  ({ id, name }) as unknown as Student;

const classOf = (count: number) =>
  Array.from({ length: count }, (_, index) => student(`s${index + 1}`));

const board: Duty = { id: 'board', name: 'Tafeldienst', count: 2 };
const sweeping: Duty = { id: 'sweep', name: 'Fegedienst', count: 2 };

const round = (assignments: Record<string, string[]>): DutyRound => ({
  at: '2026-10-01T08:00:00.000Z',
  assignments,
});

describe('drawDuties', () => {
  it('gives every duty its number and nobody two duties', () => {
    const assignments = drawDuties(
      classOf(10),
      [board, sweeping],
      [],
      createRng(1),
    );

    expect(assignments.board).toHaveLength(2);
    expect(assignments.sweep).toHaveLength(2);
    const all = [...assignments.board!, ...assignments.sweep!];
    expect(new Set(all).size).toBe(4);
  });

  it('leaves out students without a name', () => {
    const students = [student('a', 'Ada'), student('b', '  ')];
    const assignments = drawDuties(students, [board], [], createRng(1));
    expect(assignments.board).toEqual(['a']);
  });

  it('stays short where the class runs out', () => {
    const assignments = drawDuties(
      classOf(3),
      [board, sweeping],
      [],
      createRng(2),
    );
    expect(assignments.board!.length + assignments.sweep!.length).toBe(3);
  });

  it('goes round: nobody holds a second duty before everybody held one', () => {
    const students = classOf(8);
    const duties = [board, sweeping];
    const rounds: DutyRound[] = [];
    const rng = createRng(7);
    const seen = new Map<string, number>();

    // Two rounds of four places take all eight students once.
    for (let index = 0; index < 2; index++) {
      const assignments = drawDuties(students, duties, rounds, rng);
      rounds.push(round(assignments));
      for (const id of Object.values(assignments).flat()) {
        seen.set(id, (seen.get(id) ?? 0) + 1);
      }
    }

    expect(seen.size).toBe(8);
    expect([...seen.values()].every((count) => count === 1)).toBe(true);
  });

  it('prefers whoever had this duty less often among equal totals', () => {
    const students = [student('a'), student('b')];
    const one: Duty = { id: 'board', name: 'Tafel', count: 1 };
    const history = [round({ board: ['a'] }), round({ other: ['b'] })];

    for (let seed = 1; seed <= 5; seed++) {
      expect(drawDuties(students, [one], history, createRng(seed))).toEqual({
        board: ['b'],
      });
    }
  });

  it('is the same draw for the same seed', () => {
    const first = drawDuties(classOf(12), [board, sweeping], [], createRng(3));
    const second = drawDuties(classOf(12), [board, sweeping], [], createRng(3));
    expect(first).toEqual(second);
  });
});

describe('pickForDuty', () => {
  it('stands in someone who holds no duty in the round', () => {
    const current = round({ board: ['s1', 's2'], sweep: ['s3', 's4'] });
    const id = pickForDuty(
      'board',
      current,
      classOf(5),
      [],
      createRng(1),
      's1',
    );
    expect(id).toBe('s5');
  });

  it('finds nobody when everyone already has a duty', () => {
    const current = round({ board: ['s1', 's2'] });
    expect(
      pickForDuty('board', current, classOf(2), [], createRng(1), 's1'),
    ).toBeNull();
  });
});

describe('startDutyRound', () => {
  it('keeps the round on the wall for the rotation and draws anew', () => {
    const state: ClassDuties = {
      duties: [board],
      current: round({ board: ['s1', 's2'] }),
      rounds: [],
    };
    const next = startDutyRound(state, classOf(4), {
      rng: createRng(1),
      now: new Date('2026-10-11T08:00:00.000Z'),
    });

    expect(next.rounds).toEqual([state.current]);
    expect(next.current?.at).toBe('2026-10-11T08:00:00.000Z');
    expect([...next.current!.assignments.board!].sort()).toEqual(['s3', 's4']);
  });

  it('remembers at most twenty rounds', () => {
    const state: ClassDuties = {
      duties: [board],
      current: round({ board: ['s1'] }),
      rounds: Array.from({ length: 20 }, () => round({ board: ['s2'] })),
    };
    const next = startDutyRound(state, classOf(4), { rng: createRng(1) });
    expect(next.rounds).toHaveLength(20);
    expect(next.rounds.at(-1)).toEqual(state.current);
  });
});

describe('trimRound', () => {
  it('drops students who left, removed duties and places over the number', () => {
    const trimmed = trimRound(
      round({ board: ['s1', 'gone', 's2', 's3'], removed: ['s4'] }),
      [board],
      classOf(4),
    );
    expect(trimmed.assignments).toEqual({ board: ['s1', 's2'] });
  });
});
