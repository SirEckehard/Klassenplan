// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Create a new array with elements in random order using Fisher-Yates shuffle.
 * @param input Array to shuffle
 * @param rng Random source in [0, 1); injectable for deterministic tests
 * @returns Shuffled array copy
 */
export function shuffleArray<T>(
  input: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j]!;
    a[j] = tmp!;
  }
  return a;
}
