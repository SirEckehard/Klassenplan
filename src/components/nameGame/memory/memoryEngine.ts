// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Pure pairing and board-state logic for the memory mode. No React, no I/O —
 * fully deterministic with an injected rng for tests.
 */
import { shuffleArray } from '@/utils/algorithm/shuffle';
import type { Student } from '@/types';

export const MEMORY_PAIRS_PER_ROUND = 8;
const MIN_LAST_ROUND_PAIRS = 3;

/**
 * Shuffle the playable students and chunk them into rounds of at most
 * `pairsPerRound` pairs. A trailing mini-chunk (< 3 pairs) is merged into the
 * previous round so no round feels pointless.
 */
export function buildMemoryRounds(
  students: readonly Student[],
  pairsPerRound: number = MEMORY_PAIRS_PER_ROUND,
  rng: () => number = Math.random,
): Student[][] {
  const shuffled = shuffleArray(students, rng);
  const rounds: Student[][] = [];
  for (let i = 0; i < shuffled.length; i += pairsPerRound) {
    rounds.push(shuffled.slice(i, i + pairsPerRound));
  }
  const last = rounds[rounds.length - 1];
  if (rounds.length > 1 && last && last.length < MIN_LAST_ROUND_PAIRS) {
    rounds.pop();
    rounds[rounds.length - 1] = [...rounds[rounds.length - 1]!, ...last];
  }
  return rounds;
}

export interface MemoryCard {
  /** Unique board key: `${studentId}:${face}`. */
  key: string;
  studentId: string;
  face: 'photo' | 'name';
}

export interface MemoryState {
  cards: MemoryCard[];
  /** Student ids whose pair has been found. */
  matchedIds: ReadonlySet<string>;
  /** Board keys of the currently face-up, unresolved cards (0–2). */
  flipped: string[];
  /** Revealed pairs so far. */
  moves: number;
  phase: 'playing' | 'checking' | 'roundDone';
  /** Epoch ms when the round started (for the elapsed-time score). */
  startedAt: number;
}

export type MemoryAction =
  | { type: 'FLIP'; cardKey: string }
  | { type: 'RESOLVE' }
  | { type: 'RESET'; students: readonly Student[]; now?: number };

export function createMemoryState(
  students: readonly Student[],
  rng: () => number = Math.random,
  now: number = Date.now(),
): MemoryState {
  const cards: MemoryCard[] = students.flatMap((student) => [
    { key: `${student.id}:photo`, studentId: student.id, face: 'photo' },
    { key: `${student.id}:name`, studentId: student.id, face: 'name' },
  ]);
  return {
    cards: shuffleArray(cards, rng),
    matchedIds: new Set(),
    flipped: [],
    moves: 0,
    phase: 'playing',
    startedAt: now,
  };
}

/** Whether the two currently flipped cards are a photo/name pair. */
export function flippedCardsMatch(state: MemoryState): boolean {
  if (state.flipped.length !== 2) return false;
  const [a, b] = state.flipped.map((key) =>
    state.cards.find((card) => card.key === key)!,
  );
  return a!.studentId === b!.studentId && a!.face !== b!.face;
}

export function memoryReducer(
  state: MemoryState,
  action: MemoryAction,
): MemoryState {
  switch (action.type) {
    case 'FLIP': {
      if (state.phase !== 'playing') return state;
      const card = state.cards.find((c) => c.key === action.cardKey);
      if (
        !card ||
        state.matchedIds.has(card.studentId) ||
        state.flipped.includes(action.cardKey)
      ) {
        return state;
      }
      const flipped = [...state.flipped, action.cardKey];
      if (flipped.length < 2) return { ...state, flipped };
      return { ...state, flipped, moves: state.moves + 1, phase: 'checking' };
    }
    case 'RESOLVE': {
      if (state.phase !== 'checking') return state;
      if (!flippedCardsMatch(state)) {
        return { ...state, flipped: [], phase: 'playing' };
      }
      const card = state.cards.find((c) => c.key === state.flipped[0])!;
      const matchedIds = new Set(state.matchedIds).add(card.studentId);
      const done = matchedIds.size * 2 === state.cards.length;
      return {
        ...state,
        matchedIds,
        flipped: [],
        phase: done ? 'roundDone' : 'playing',
      };
    }
    case 'RESET':
      return createMemoryState(action.students, Math.random, action.now);
    default:
      return state;
  }
}
