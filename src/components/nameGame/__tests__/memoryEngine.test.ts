// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  buildMemoryRounds,
  createMemoryState,
  flippedCardsMatch,
  memoryReducer,
  type MemoryState,
} from '../memory/memoryEngine';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';

const rng = () => 0.42;

const makeClass = (count: number): Student[] =>
  Array.from({ length: count }, (_, i) =>
    createMockStudent({ id: `s${i + 1}`, name: `Name ${i + 1}` }),
  );

describe('buildMemoryRounds', () => {
  it('chunks into rounds of at most 8 pairs', () => {
    const rounds = buildMemoryRounds(makeClass(24), 8, rng);
    expect(rounds.map((r) => r.length)).toEqual([8, 8, 8]);
  });

  it('merges a trailing mini-chunk (<3 pairs) into the previous round', () => {
    const rounds = buildMemoryRounds(makeClass(9), 8, rng);
    expect(rounds.map((r) => r.length)).toEqual([9]);

    const rounds18 = buildMemoryRounds(makeClass(18), 8, rng);
    expect(rounds18.map((r) => r.length)).toEqual([8, 10]);
  });

  it('keeps a trailing chunk of 3+ pairs as its own round', () => {
    const rounds = buildMemoryRounds(makeClass(11), 8, rng);
    expect(rounds.map((r) => r.length)).toEqual([8, 3]);
  });

  it('spreads every student across the rounds exactly once', () => {
    const students = makeClass(20);
    const rounds = buildMemoryRounds(students, 8, rng);
    const ids = rounds.flat().map((s) => s.id);
    expect(new Set(ids).size).toBe(20);
  });
});

describe('createMemoryState', () => {
  it('creates a photo and a name card per student', () => {
    const state = createMemoryState(makeClass(4), rng, 1000);
    expect(state.cards).toHaveLength(8);
    expect(state.cards.filter((c) => c.face === 'photo')).toHaveLength(4);
    expect(state.startedAt).toBe(1000);
    expect(state.phase).toBe('playing');
  });
});

describe('memoryReducer', () => {
  const setup = () => createMemoryState(makeClass(3), rng, 0);

  const flip = (state: MemoryState, key: string) =>
    memoryReducer(state, { type: 'FLIP', cardKey: key });

  it('flips up to two cards, then blocks until RESOLVE', () => {
    let state = setup();
    const [a, b, c] = state.cards;
    state = flip(state, a!.key);
    expect(state.flipped).toEqual([a!.key]);
    expect(state.moves).toBe(0);

    state = flip(state, b!.key);
    expect(state.phase).toBe('checking');
    expect(state.moves).toBe(1);

    const blocked = flip(state, c!.key);
    expect(blocked).toBe(state);
  });

  it('ignores flipping the same card twice', () => {
    let state = setup();
    const first = state.cards[0]!;
    state = flip(state, first.key);
    expect(flip(state, first.key)).toBe(state);
  });

  it('resolves a match into matchedIds and keeps playing', () => {
    let state = setup();
    state = flip(state, 's1:photo');
    state = flip(state, 's1:name');
    expect(flippedCardsMatch(state)).toBe(true);

    state = memoryReducer(state, { type: 'RESOLVE' });
    expect(state.matchedIds.has('s1')).toBe(true);
    expect(state.flipped).toEqual([]);
    expect(state.phase).toBe('playing');
  });

  it('ignores flips on already matched cards', () => {
    let state = setup();
    state = flip(state, 's1:photo');
    state = flip(state, 's1:name');
    state = memoryReducer(state, { type: 'RESOLVE' });
    expect(flip(state, 's1:photo')).toBe(state);
  });

  it('resolves a mismatch by flipping both back', () => {
    let state = setup();
    state = flip(state, 's1:photo');
    state = flip(state, 's2:name');
    expect(flippedCardsMatch(state)).toBe(false);

    state = memoryReducer(state, { type: 'RESOLVE' });
    expect(state.matchedIds.size).toBe(0);
    expect(state.flipped).toEqual([]);
    expect(state.phase).toBe('playing');
    expect(state.moves).toBe(1);
  });

  it('two same-face cards are not a match', () => {
    let state = setup();
    state = flip(state, 's1:photo');
    state = flip(state, 's2:photo');
    expect(flippedCardsMatch(state)).toBe(false);
  });

  it('completes the round when every pair is found', () => {
    let state = setup();
    for (const id of ['s1', 's2', 's3']) {
      state = flip(state, `${id}:photo`);
      state = flip(state, `${id}:name`);
      state = memoryReducer(state, { type: 'RESOLVE' });
    }
    expect(state.phase).toBe('roundDone');
    expect(state.moves).toBe(3);
    expect(flip(state, 's1:photo')).toBe(state);
  });

  it('RESET builds a fresh board', () => {
    let state = setup();
    state = flip(state, 's1:photo');
    state = memoryReducer(state, {
      type: 'RESET',
      students: makeClass(2),
      now: 5,
    });
    expect(state.cards).toHaveLength(4);
    expect(state.flipped).toEqual([]);
    expect(state.startedAt).toBe(5);
  });
});
