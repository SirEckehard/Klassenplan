// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// src/utils/distribution.ts
/**
 * How many students each table takes when the class spreads evenly: one at a
 * time round the tables, never past a table's capacity, starting at a random
 * table. What is left after the last full round goes to the tables from that
 * start on, so the fuller tables are not always the same ones.
 *
 * @param total - Total number of students to distribute
 * @param seatCounts - Array of seat capacities for each table
 * @param rng - Random source for the starting table; injectable for deterministic tests
 * @returns Array of target seat counts per table
 *
 * @example
 * ```typescript
 * // Three tables get a fifth student — from the start on, wherever it falls:
 * // [5,5,5,4,4,4], [4,5,5,5,4,4], …, [5,5,4,4,4,5]
 * evenTargetsFor(27, [6, 6, 6, 6, 6, 6]);
 * ```
 */
export function evenTargetsFor(
  total: number,
  seatCounts: number[],
  rng: () => number = Math.random,
): number[] {
  const counts = seatCounts.map((c) => Math.max(0, c));
  if (counts.length === 0) return [];
  const capacity = counts.reduce((sum, c) => sum + c, 0);
  let remaining = Math.max(0, Math.min(total, capacity));
  const out = counts.map(() => 0);

  // Randomize starting point to avoid systematic bias toward first tables
  let idx = Math.floor(rng() * counts.length);
  while (remaining > 0) {
    if (out[idx] < counts[idx]) {
      out[idx]++;
      remaining--;
    }
    idx = (idx + 1) % counts.length;
  }

  return out;
}
