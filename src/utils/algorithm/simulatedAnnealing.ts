// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Simulated Annealing for seating arrangement optimization.
 *
 * Unlike greedy local search, Simulated Annealing can escape local optima
 * by occasionally accepting worse solutions. The probability of accepting
 * worse solutions decreases over time (temperature cooling).
 *
 * Key concepts:
 * - Temperature: Controls probability of accepting worse solutions
 * - Cooling Rate: How fast temperature decreases (0.95-0.99 typical)
 * - Acceptance Probability: exp((current - new) / temperature)
 */

import type { SeatingArrangement, MixSettings, ClassroomScene } from '@/types';
import { logDebug } from '@/utils';
import { randomInt, type RandomSource } from './rng';

/**
 * Configuration for Simulated Annealing algorithm.
 */
export interface AnnealingConfig {
  /** Starting temperature. Higher = more exploration. Default: 10.0 */
  initialTemp: number;
  /** Cooling rate per iteration (0.95-0.99). Default: 0.97 */
  coolingRate: number;
  /** Stop when temperature falls below this. Default: 0.01 */
  minTemp: number;
  /** Number of swap attempts per temperature level. Default: 50 */
  iterationsPerTemp: number;
}

/**
 * Default configuration tuned for typical classroom sizes (20-36 students).
 * - initialTemp: 10.0 - Score differences usually range 0-20
 * - coolingRate: 0.97 - Slow enough for convergence
 * - minTemp: 0.01 - Stop when mostly greedy
 * - iterationsPerTemp: 50 - Balance exploration vs speed
 */
export const DEFAULT_ANNEALING_CONFIG: AnnealingConfig = {
  initialTemp: 10.0,
  coolingRate: 0.97,
  minTemp: 0.01,
  iterationsPerTemp: 50,
};

/**
 * Reports how far a refinement has progressed, as a fraction between 0 and 1.
 * Called from inside the worker, never on the main thread.
 */
export type RefinementProgressReporter = (fraction: number) => void;

/**
 * How many temperature steps the cooling loop will take for a given config.
 *
 * `temp` is multiplied by `coolingRate` until it drops below `minTemp`, so the
 * count follows from the logarithms rather than needing a dry run.
 */
export const countCoolingSteps = (config: AnnealingConfig): number => {
  if (
    config.initialTemp <= config.minTemp ||
    config.coolingRate <= 0 ||
    config.coolingRate >= 1
  ) {
    return 1;
  }
  return Math.max(
    1,
    Math.ceil(
      Math.log(config.minTemp / config.initialTemp) /
        Math.log(config.coolingRate),
    ),
  );
};

/**
 * Calculate acceptance probability for a potentially worse solution.
 *
 * Uses the Metropolis criterion:
 * - If new solution is better (lower score), always accept (return 1.0)
 * - If worse, accept with probability exp((current - new) / temperature)
 *
 * @param currentScore - Score of current arrangement
 * @param newScore - Score of proposed arrangement (lower is better)
 * @param temperature - Current temperature (higher = more accepting)
 * @returns Probability [0, 1] of accepting the new solution
 */
export const acceptanceProbability = (
  currentScore: number,
  newScore: number,
  temperature: number,
): number => {
  // Always accept better (lower) scores
  if (newScore < currentScore) {
    return 1.0;
  }

  // For worse scores, probability decreases with score difference
  // and increases with temperature
  const delta = currentScore - newScore; // Negative for worse solutions
  return Math.exp(delta / temperature);
};

/**
 * Context for annealing operations - passed to swap functions.
 */
export interface AnnealingContext {
  arrangement: SeatingArrangement;
  seatCounts: number[];
  tableCount: number;
  targets: number[];
  settings: Partial<MixSettings>;
  scene: ClassroomScene;
  lockedPositions: Record<string, { table: number; seat: number }>;
  /** Function to calculate score for a single table */
  scoreTable: (tableIndex: number) => number;
  /** Function to check if a seat is locked */
  isLocked: (table: number, seat: number) => boolean;
  /** Random source of the run; defaults to `Math.random` when omitted */
  rng?: RandomSource;
}

/**
 * Generate a random swap between two seats.
 *
 * @param ctx - Annealing context
 * @returns Tuple [t1, s1, t2, s2] or null if no valid swap found
 */
export const generateRandomSwap = (
  ctx: AnnealingContext,
): [number, number, number, number] | null => {
  const { tableCount, seatCounts, arrangement, targets, isLocked } = ctx;
  const rng = ctx.rng ?? Math.random;

  // Try up to 10 times to find a valid swap
  for (let attempt = 0; attempt < 10; attempt++) {
    const t1 = randomInt(rng, tableCount);
    const s1 = randomInt(rng, seatCounts[t1]!);
    const t2 = randomInt(rng, tableCount);
    const s2 = randomInt(rng, seatCounts[t2]!);

    // Skip same seat
    if (t1 === t2 && s1 === s2) continue;

    // Check locked seats
    if (isLocked(t1, s1) || isLocked(t2, s2)) continue;

    // Get students at positions
    const A = arrangement[t1]?.[s1];
    const B = arrangement[t2]?.[s2];

    // Skip if both empty
    if (!A && !B) continue;

    // Check target constraints
    if ((B && s1 >= targets[t1]!) || (A && s2 >= targets[t2]!)) {
      continue;
    }

    return [t1, s1, t2, s2];
  }

  return null;
};

/**
 * Perform a swap between two seats.
 *
 * @param arr - Arrangement to modify (mutated in place)
 * @param t1 - First table index
 * @param s1 - First seat index
 * @param t2 - Second table index
 * @param s2 - Second seat index
 */
export const performSwap = (
  arr: SeatingArrangement,
  t1: number,
  s1: number,
  t2: number,
  s2: number,
): void => {
  const temp = arr[t1]![s1];
  arr[t1]![s1] = arr[t2]![s2];
  arr[t2]![s2] = temp;
};

/**
 * Calculate total score for arrangement by summing all table scores.
 *
 * @param ctx - Annealing context with scoreTable function
 * @returns Total score (lower is better)
 */
export const calculateTotalScore = (ctx: AnnealingContext): number => {
  let total = 0;
  for (let t = 0; t < ctx.tableCount; t++) {
    total += ctx.scoreTable(t);
  }
  return total;
};

/**
 * Deep clone an arrangement for saving best state.
 */
export const cloneArrangement = (
  arr: SeatingArrangement,
): SeatingArrangement => {
  return arr.map((table) => [...table]);
};

/**
 * Result of Simulated Annealing run.
 */
export interface AnnealingResult {
  /** Best arrangement found */
  arrangement: SeatingArrangement;
  /** Score of best arrangement */
  score: number;
  /** Number of iterations performed */
  iterations: number;
  /** Number of accepted swaps */
  acceptedSwaps: number;
  /** Number of improvements found */
  improvements: number;
  /** Final temperature when stopped */
  finalTemp: number;
}

/**
 * Run Simulated Annealing optimization on a seating arrangement.
 *
 * This is the main entry point for the SA algorithm. It:
 * 1. Starts with a high temperature (more exploration)
 * 2. Gradually cools (more exploitation)
 * 3. At each temperature, tries multiple random swaps
 * 4. Accepts improving swaps always, worse ones with decreasing probability
 * 5. Tracks and returns the best arrangement found
 *
 * @param ctx - Annealing context with arrangement and scoring functions
 * @param config - Algorithm configuration (optional, uses defaults)
 * @returns Result containing best arrangement and statistics
 */
export const runSimulatedAnnealing = (
  ctx: AnnealingContext,
  config: AnnealingConfig = DEFAULT_ANNEALING_CONFIG,
  onProgress?: RefinementProgressReporter,
): AnnealingResult => {
  const startTime = performance.now();

  let temp = config.initialTemp;
  // The cooling schedule is deterministic, so the number of temperature steps
  // is known up front — which is what makes a truthful percentage possible.
  const totalCoolingSteps = countCoolingSteps(config);
  let completedCoolingSteps = 0;
  let currentScore = calculateTotalScore(ctx);
  let bestArrangement = cloneArrangement(ctx.arrangement);
  let bestScore = currentScore;

  let iterations = 0;
  let acceptedSwaps = 0;
  let improvements = 0;

  logDebug(
    'Starting Simulated Annealing',
    { initialScore: currentScore, initialTemp: temp },
    'simulatedAnnealing',
  );

  // Temperature cooling loop
  while (temp > config.minTemp) {
    // Iterations at current temperature
    for (let i = 0; i < config.iterationsPerTemp; i++) {
      iterations++;

      // Generate random swap
      const swap = generateRandomSwap(ctx);
      if (!swap) continue;

      const [t1, s1, t2, s2] = swap;

      // Calculate score before swap (only affected tables)
      const scoreBefore =
        ctx.scoreTable(t1) + (t1 === t2 ? 0 : ctx.scoreTable(t2));

      // Perform swap
      performSwap(ctx.arrangement, t1, s1, t2, s2);

      // Calculate score after swap
      const scoreAfter =
        ctx.scoreTable(t1) + (t1 === t2 ? 0 : ctx.scoreTable(t2));

      // Calculate delta (negative = improvement)
      const delta = scoreAfter - scoreBefore;

      // Decide whether to accept
      const acceptProb = acceptanceProbability(scoreBefore, scoreAfter, temp);
      const accept = (ctx.rng ?? Math.random)() < acceptProb;

      if (accept) {
        acceptedSwaps++;
        currentScore += delta;

        // Track improvements
        if (delta < 0) {
          improvements++;
        }

        // Check if this is the best we've seen
        if (currentScore < bestScore) {
          bestArrangement = cloneArrangement(ctx.arrangement);
          bestScore = currentScore;
        }
      } else {
        // Revert swap
        performSwap(ctx.arrangement, t1, s1, t2, s2);
      }
    }

    // Cool down
    temp *= config.coolingRate;
    completedCoolingSteps++;
    onProgress?.(Math.min(completedCoolingSteps / totalCoolingSteps, 1));
  }

  // Restore best arrangement to context
  for (let t = 0; t < ctx.tableCount; t++) {
    for (let s = 0; s < ctx.seatCounts[t]!; s++) {
      ctx.arrangement[t]![s] = bestArrangement[t]![s];
    }
  }

  const duration = performance.now() - startTime;
  logDebug(
    'Simulated Annealing completed',
    {
      duration: `${duration.toFixed(1)}ms`,
      iterations,
      acceptedSwaps,
      improvements,
      finalScore: bestScore,
      finalTemp: temp,
    },
    'simulatedAnnealing',
  );

  return {
    arrangement: bestArrangement,
    score: bestScore,
    iterations,
    acceptedSwaps,
    improvements,
    finalTemp: temp,
  };
};
