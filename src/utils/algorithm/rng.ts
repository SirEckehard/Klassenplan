// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * A source of random numbers in `[0, 1)` — the same contract as `Math.random`.
 *
 * Every randomised step of the algorithm takes one of these instead of calling
 * `Math.random` directly, so a test can hand in a seeded generator and get the
 * exact same plan on every run. Production code passes nothing and keeps the
 * `Math.random` default.
 */
export type RandomSource = () => number;

/**
 * Creates a deterministic random source from a seed (mulberry32).
 *
 * The same seed always yields the same sequence, which makes an algorithm run
 * reproducible: identical input plus identical seed produces an identical
 * seating plan. Fast and small — quality is far beyond what seat shuffling
 * needs, but it is not cryptographically secure and must never be used for
 * anything security-relevant.
 *
 * @example
 * const rng = createRng(42);
 * generateSeatingPlan(students, …, { rng }); // same plan every time
 */
export const createRng = (seed: number): RandomSource => {
  // Keep the state in the unsigned 32-bit range regardless of the seed given.
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Random integer in `[0, maxExclusive)`. Returns 0 for empty ranges. */
export const randomInt = (rng: RandomSource, maxExclusive: number): number => {
  if (maxExclusive <= 0) return 0;
  return Math.floor(rng() * maxExclusive);
};

/** Picks a random element, or `undefined` when the list is empty. */
export const randomPick = <T>(
  rng: RandomSource,
  items: readonly T[],
): T | undefined => {
  if (items.length === 0) return undefined;
  return items[randomInt(rng, items.length)];
};
