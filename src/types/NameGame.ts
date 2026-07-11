// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Types for the name-learning game ("Namensspiel").
 *
 * Learning stats are kept globally per `student.id` (like student photos), so
 * they survive class switches and are swept together with deleted students.
 */

/** Per-student quiz learning stats. */
export interface NameGameStudentStat {
  /** Total questions where this student was the correct answer. */
  asked: number;
  /** Questions answered correctly on the first pick. */
  correct: number;
  /** ISO timestamp of the last question featuring this student. */
  lastAskedAt?: string;
}

export type NameGameStatsMap = Record<string, NameGameStudentStat>;

/** Best memory result, kept per pair-count bucket so scores stay comparable. */
export interface MemoryBestScore {
  moves: number;
  timeMs: number;
  /** ISO timestamp. */
  achievedAt: string;
}

/** Single persisted record holding all name-game data. */
export interface NameGameData {
  version: 1;
  stats: NameGameStatsMap;
  /** Keyed by the number of pairs in the round (e.g. 8). */
  memoryBest: Record<number, MemoryBestScore>;
}
