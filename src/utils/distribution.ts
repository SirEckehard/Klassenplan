// src/utils/distribution.ts
/**
 * Compute how many seats per table should be filled, distributing as evenly as possible
 * and never exceeding the individual capacity of each table. Remainder is given to the
 * first tables, which leads to top tables being fuller (for UIs where lower seats should
 * stay empty).
 *
 * @param total - Total number of students to distribute
 * @param seatCounts - Array of seat capacities for each table
 * @returns Array of target seat counts per table
 *
 * @example
 * ```typescript
 * evenTargetsFor(27, [6,6,6,6,6,6]) // Returns [5,5,5,4,4,4]
 * evenTargetsFor(14, [4,4,4,4]) // Returns [4,4,3,3]
 * ```
 */
export function evenTargetsFor(total: number, seatCounts: number[]): number[] {
  const counts = seatCounts.map((c) => Math.max(0, c));
  if (counts.length === 0) return [];
  const capacity = counts.reduce((sum, c) => sum + c, 0);
  let remaining = Math.max(0, Math.min(total, capacity));
  const out = counts.map(() => 0);

  // Randomize starting point to avoid systematic bias toward first tables
  let idx = Math.floor(Math.random() * counts.length);
  while (remaining > 0) {
    if (out[idx] < counts[idx]) {
      out[idx]++;
      remaining--;
    }
    idx = (idx + 1) % counts.length;
  }

  return out;
}
