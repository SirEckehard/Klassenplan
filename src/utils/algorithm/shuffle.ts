/**
 * Create a new array with elements in random order using Fisher-Yates shuffle.
 * @param input Array to shuffle
 * @returns Shuffled array copy
 */
export function shuffleArray<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j]!;
    a[j] = tmp!;
  }
  return a;
}
