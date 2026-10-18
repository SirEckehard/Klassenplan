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
 *
 * It works on whatever `AnnealingProblem` it is handed — a plan as one
 * student index per seat, which swaps it may try and what each would change.
 * The change must be exact (`swapDelta` of the criterion model, decision
 * 0031): the running score is what decides which arrangement counts as the
 * best one seen, and a running score that drifts hands back a worse plan.
 */

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
 * What the annealing refines: a plan as one student index per seat (-1 for an
 * empty seat), mutated in place, and the three questions it asks about it.
 */
export interface AnnealingProblem {
  occupants: Int32Array;
  /** The students that may move; a locked student is not among them */
  movers: readonly number[];
  /** Whether the occupants of two seats may trade places */
  canSwap: (a: number, b: number) => boolean;
  /** Exactly what trading the occupants of two seats changes in the score */
  delta: (a: number, b: number) => number;
  /** Called after a swap was kept, so the problem can count its tables */
  onSwap?: (a: number, b: number) => void;
  /** The score of the plan as it stands */
  score: () => number;
  rng: RandomSource;
}

/**
 * Result of Simulated Annealing run.
 */
export interface AnnealingResult {
  /** Best arrangement found, as one student index per seat */
  occupants: Int32Array;
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

/** How often one iteration looks for a swap it may try before giving up. */
const SWAP_ATTEMPTS = 10;

/**
 * Run Simulated Annealing optimization on a seating arrangement.
 *
 * This is the main entry point for the SA algorithm. It:
 * 1. Starts with a high temperature (more exploration)
 * 2. Gradually cools (more exploitation)
 * 3. At each temperature, tries multiple random swaps: a student who may move,
 *    picked evenly, and any seat — a student at a large table is asked as
 *    often as one at a single desk
 * 4. Accepts improving swaps always, worse ones with decreasing probability
 * 5. Tracks and returns the best arrangement found, never a worse one than
 *    it started from
 *
 * @param problem - The plan and what may be done with it
 * @param config - Algorithm configuration (optional, uses defaults)
 * @returns Result containing best arrangement and statistics
 */
export const runSimulatedAnnealing = (
  problem: AnnealingProblem,
  config: AnnealingConfig = DEFAULT_ANNEALING_CONFIG,
  onProgress?: RefinementProgressReporter,
): AnnealingResult => {
  const { occupants, movers, rng } = problem;
  const size = occupants.length;
  const startTime = performance.now();

  const seatOf = new Int32Array(
    occupants.reduce((max, student) => Math.max(max, student + 1), 0),
  ).fill(-1);
  occupants.forEach((student, seat) => {
    if (student >= 0) seatOf[student] = seat;
  });

  let temp = config.initialTemp;
  // The cooling schedule is deterministic, so the number of temperature steps
  // is known up front — which is what makes a truthful percentage possible.
  const totalCoolingSteps = countCoolingSteps(config);
  let completedCoolingSteps = 0;
  let currentScore = problem.score();
  const best = occupants.slice();
  let bestScore = currentScore;

  let iterations = 0;
  let acceptedSwaps = 0;
  let improvements = 0;

  logDebug(
    'Starting Simulated Annealing',
    { initialScore: currentScore, initialTemp: temp },
    'simulatedAnnealing',
  );

  const pickSwap = (): [number, number] | null => {
    if (movers.length === 0 || size === 0) return null;
    for (let attempt = 0; attempt < SWAP_ATTEMPTS; attempt++) {
      const a = seatOf[movers[randomInt(rng, movers.length)]!]!;
      const b = randomInt(rng, size);
      if (a >= 0 && problem.canSwap(a, b)) return [a, b];
    }
    return null;
  };

  // Temperature cooling loop
  while (temp > config.minTemp) {
    // Iterations at current temperature
    for (let i = 0; i < config.iterationsPerTemp; i++) {
      iterations++;

      const swap = pickSwap();
      if (!swap) continue;
      const [a, b] = swap;

      // Calculate delta (negative = improvement)
      const delta = problem.delta(a, b);
      const accept =
        delta <= 0 ||
        rng() < acceptanceProbability(currentScore, currentScore + delta, temp);
      if (!accept) continue;

      const A = occupants[a]!;
      const B = occupants[b]!;
      occupants[a] = B;
      occupants[b] = A;
      if (A >= 0) seatOf[A] = b;
      if (B >= 0) seatOf[B] = a;
      problem.onSwap?.(a, b);

      acceptedSwaps++;
      currentScore += delta;
      if (delta < 0) improvements++;

      // Check if this is the best we've seen
      if (currentScore < bestScore - 1e-9) {
        best.set(occupants);
        bestScore = currentScore;
      }
    }

    // Cool down
    temp *= config.coolingRate;
    completedCoolingSteps++;
    onProgress?.(Math.min(completedCoolingSteps / totalCoolingSteps, 1));
  }

  // Restore best arrangement to the problem
  occupants.set(best);

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
    occupants: best,
    score: bestScore,
    iterations,
    acceptedSwaps,
    improvements,
    finalTemp: temp,
  };
};
