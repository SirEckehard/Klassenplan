import type { Gender } from '@/types';

export type GenderCounts = Record<Gender, number>;

export const createGenderCounts = (): GenderCounts => ({
  boy: 0,
  girl: 0,
  diverse: 0,
});

export const calculateGenderImbalance = (counts: GenderCounts): number => {
  const presentCounts = Object.values(counts).filter((count) => count > 0);
  if (presentCounts.length === 0) {
    return 0;
  }

  if (presentCounts.length === 1) {
    return presentCounts[0]!;
  }

  return Math.max(...presentCounts) - Math.min(...presentCounts);
};
