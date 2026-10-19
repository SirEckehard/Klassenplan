// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  acceptanceProbability,
  countCoolingSteps,
  runSimulatedAnnealing,
  DEFAULT_ANNEALING_CONFIG,
  type AnnealingProblem,
  type AnnealingConfig,
} from '../simulatedAnnealing';
import { createRng } from '../rng';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';

describe('simulatedAnnealing', () => {
  /**
   * Four students on four seats, reversed: student `i` belongs on seat `i`,
   * and every step away costs its square. The optimum is 0.
   */
  const createMockProblem = (
    start: number[] = [3, 2, 1, 0],
    overrides: Partial<AnnealingProblem> = {},
  ): AnnealingProblem => {
    const occupants = Int32Array.from(start);
    const cost = (student: number, seat: number) =>
      student < 0 ? 0 : (student - seat) ** 2;
    return {
      occupants,
      movers: [0, 1, 2, 3],
      canSwap: (a, b) => a !== b,
      delta: (a, b) =>
        cost(occupants[b]!, a) +
        cost(occupants[a]!, b) -
        cost(occupants[a]!, a) -
        cost(occupants[b]!, b),
      score: () =>
        Array.from(occupants).reduce(
          (sum, student, seat) => sum + cost(student, seat),
          0,
        ),
      rng: createRng(7),
      ...overrides,
    };
  };

  describe('acceptanceProbability', () => {
    it('always accepts better (lower) scores', () => {
      expect(acceptanceProbability(10, 5, 1.0)).toBe(1.0);
      expect(acceptanceProbability(10, 9.99, 0.01)).toBe(1.0);
      expect(acceptanceProbability(100, 0, 0.001)).toBe(1.0);
    });

    it('accepts worse scores with decreasing probability as delta increases', () => {
      const temp = 5.0;
      const probSmallDelta = acceptanceProbability(10, 11, temp); // delta = 1
      const probLargeDelta = acceptanceProbability(10, 15, temp); // delta = 5

      expect(probSmallDelta).toBeGreaterThan(probLargeDelta);
      expect(probSmallDelta).toBeLessThan(1.0);
      expect(probLargeDelta).toBeGreaterThan(0);
    });

    it('accepts worse scores with higher probability at higher temperatures', () => {
      const delta = 5; // new - current
      const probHighTemp = acceptanceProbability(10, 10 + delta, 10.0);
      const probLowTemp = acceptanceProbability(10, 10 + delta, 1.0);

      expect(probHighTemp).toBeGreaterThan(probLowTemp);
    });

    it('returns very low probability for large deltas at low temperature', () => {
      const prob = acceptanceProbability(0, 100, 0.1);
      expect(prob).toBeLessThan(0.001);
    });
  });

  describe('runSimulatedAnnealing', () => {
    it('returns an arrangement of the same seats', () => {
      const problem = createMockProblem();
      const result = runSimulatedAnnealing(problem);

      expect(result.occupants).toHaveLength(4);
      expect([...result.occupants].sort()).toEqual([0, 1, 2, 3]);
    });

    it('returns statistics about the run', () => {
      const result = runSimulatedAnnealing(createMockProblem());

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.acceptedSwaps).toBeGreaterThanOrEqual(0);
      expect(result.improvements).toBeGreaterThanOrEqual(0);
      expect(result.finalTemp).toBeLessThan(
        DEFAULT_ANNEALING_CONFIG.initialTemp,
      );
    });

    it('respects custom configuration', () => {
      const fastConfig: AnnealingConfig = {
        initialTemp: 5.0,
        coolingRate: 0.9,
        minTemp: 1.0,
        iterationsPerTemp: 10,
      };

      const result = runSimulatedAnnealing(createMockProblem(), fastConfig);

      // Should complete with fewer iterations due to fast cooling
      expect(result.finalTemp).toBeGreaterThanOrEqual(
        fastConfig.minTemp * fastConfig.coolingRate,
      );
    });

    it('finds the optimum of a small problem, and its score is exact', () => {
      const problem = createMockProblem();
      const result = runSimulatedAnnealing(problem);

      expect(Array.from(result.occupants)).toEqual([0, 1, 2, 3]);
      expect(result.score).toBe(0);
      expect(problem.score()).toBe(result.score);
    });

    it('never hands back a worse arrangement than it started from', () => {
      // Every swap the problem allows makes it worse: the start stays.
      const problem = createMockProblem([0, 1, 2, 3]);
      const start = Array.from(problem.occupants);
      const result = runSimulatedAnnealing(problem);

      expect(Array.from(result.occupants)).toEqual(start);
      expect(result.score).toBe(0);
    });

    it('tries no swap the problem refuses', () => {
      const problem = createMockProblem();
      const refused = (a: number, b: number) => a === 0 || b === 0;
      problem.canSwap = (a, b) => a !== b && !refused(a, b);
      const result = runSimulatedAnnealing(problem);

      // Seat 0 keeps its student; the others take the seats that cost least.
      expect(result.occupants[0]).toBe(3);
      expect(Array.from(result.occupants.slice(1))).toEqual([0, 1, 2]);
    });
  });

  describe('integration with refineSeatingLocal', () => {
    it('refines an arrangement on its own', async () => {
      // Import dynamically to avoid circular dependencies
      const { refineSeatingLocal } = await import('../seatingAlgorithm');

      const scene = createMockClassroomScene(4, { totalStudents: 4 });
      const students = [
        createMockStudent({ id: '1', name: 'Alice' }),
        createMockStudent({ id: '2', name: 'Bob' }),
        createMockStudent({ id: '3', name: 'Charlie' }),
        createMockStudent({ id: '4', name: 'Diana' }),
      ];

      const initialArrangement = scene.tables.map((_, idx) => [
        students[idx] ?? null,
      ]);

      const result = refineSeatingLocal(
        students,
        [],
        {},
        initialArrangement,
        {},
        scene,
        { rng: createRng(3) },
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(scene.tables.length);
    });
  });

  describe('progress reporting', () => {
    it('counts the cooling steps the schedule will take', () => {
      // temp *= 0.9 from 1.0 stops below 0.5 after ceil(log(0.5)/log(0.9)) = 7.
      expect(
        countCoolingSteps({
          initialTemp: 1,
          coolingRate: 0.9,
          minTemp: 0.5,
          iterationsPerTemp: 1,
        }),
      ).toBe(7);
    });

    it('never reports zero steps for a degenerate config', () => {
      // A config that cannot cool would otherwise divide the progress by zero.
      expect(
        countCoolingSteps({
          initialTemp: 0.01,
          coolingRate: 0.9,
          minTemp: 1,
          iterationsPerTemp: 1,
        }),
      ).toBe(1);
    });

    it('advances monotonically and finishes at 1', () => {
      const problem = createMockProblem();
      const config: AnnealingConfig = {
        initialTemp: 2,
        coolingRate: 0.8,
        minTemp: 0.5,
        iterationsPerTemp: 2,
      };
      const fractions: number[] = [];

      runSimulatedAnnealing(problem, config, (fraction) =>
        fractions.push(fraction),
      );

      expect(fractions.length).toBe(countCoolingSteps(config));
      expect(fractions).toEqual([...fractions].sort((a, b) => a - b));
      expect(fractions.at(-1)).toBe(1);
      fractions.forEach((fraction) => {
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThanOrEqual(1);
      });
    });

    it('runs unchanged without a reporter', () => {
      expect(() => runSimulatedAnnealing(createMockProblem())).not.toThrow();
    });
  });
});
