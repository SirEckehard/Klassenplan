// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  acceptanceProbability,
  runSimulatedAnnealing,
  DEFAULT_ANNEALING_CONFIG,
  type AnnealingContext,
  type AnnealingConfig,
} from '../simulatedAnnealing';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';

describe('simulatedAnnealing', () => {
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
    const createMockContext = (): AnnealingContext => {
      const scene = createMockClassroomScene(4, { totalStudents: 4 });
      const students = [
        createMockStudent({ id: '1', name: 'Alice' }),
        createMockStudent({ id: '2', name: 'Bob' }),
        createMockStudent({ id: '3', name: 'Charlie' }),
        createMockStudent({ id: '4', name: 'Diana' }),
      ];

      const arrangement = scene.tables.map((_, idx) => [students[idx] ?? null]);

      return {
        arrangement,
        seatCounts: scene.tables.map((t) => t.seatCount),
        tableCount: scene.tables.length,
        targets: [1, 1, 1, 1],
        settings: {},
        scene,
        lockedPositions: {},
        scoreTable: () => Math.random() * 10, // Random scores for testing
        isLocked: () => false,
      };
    };

    it('returns a valid arrangement', () => {
      const ctx = createMockContext();
      const result = runSimulatedAnnealing(ctx);

      expect(result.arrangement).toBeDefined();
      expect(result.arrangement.length).toBe(ctx.tableCount);
    });

    it('returns statistics about the run', () => {
      const ctx = createMockContext();
      const result = runSimulatedAnnealing(ctx);

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.acceptedSwaps).toBeGreaterThanOrEqual(0);
      expect(result.improvements).toBeGreaterThanOrEqual(0);
      expect(result.finalTemp).toBeLessThan(
        DEFAULT_ANNEALING_CONFIG.initialTemp,
      );
    });

    it('respects custom configuration', () => {
      const ctx = createMockContext();
      const fastConfig: AnnealingConfig = {
        initialTemp: 5.0,
        coolingRate: 0.9,
        minTemp: 1.0,
        iterationsPerTemp: 10,
      };

      const result = runSimulatedAnnealing(ctx, fastConfig);

      // Should complete with fewer iterations due to fast cooling
      expect(result.finalTemp).toBeGreaterThanOrEqual(
        fastConfig.minTemp * fastConfig.coolingRate,
      );
    });

    it('finds a solution with non-negative score', () => {
      const ctx = createMockContext();
      // Use a consistent scoring function
      ctx.scoreTable = (idx) => idx * 2; // Simple deterministic score

      const result = runSimulatedAnnealing(ctx);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration with refineSeatingLocal', () => {
    it('can be used via useAnnealing option', async () => {
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
        [],
        {},
        initialArrangement,
        {},
        scene,
        { useAnnealing: true },
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(scene.tables.length);
    });
  });
});
