// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomScene, Student } from '@/types';

const algorithmMocks = vi.hoisted(() => ({
  runMixSession: vi.fn(() => [[null]]),
  generateCircleLayout: vi.fn(() => ({ students: [] })),
  generateOptimizedCircleLayout: vi.fn(() => ({ students: [] })),
}));

vi.mock('@/utils/algorithm/seatingAlgorithm', () => ({
  runMixSession: algorithmMocks.runMixSession,
}));
vi.mock('@/utils/algorithm/circleArrangement', () => ({
  generateCircleLayout: algorithmMocks.generateCircleLayout,
}));
vi.mock('@/utils/algorithm/CircleSeatingAlgorithm', () => ({
  generateOptimizedCircleLayout: algorithmMocks.generateOptimizedCircleLayout,
}));

import {
  executeAlgorithmOperation,
  DEFAULT_REFINE_OPTIONS,
  type AlgorithmProgressStage,
} from '../algorithmOperations';

const scene = { totalStudents: 0, tables: [], features: [] } as ClassroomScene;
const students: Student[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('executeAlgorithmOperation', () => {
  it('answers a warmup without loading an algorithm module', async () => {
    const result = await executeAlgorithmOperation('worker:warmup', {});

    expect(result).toEqual({ ready: true });
    expect(algorithmMocks.runMixSession).not.toHaveBeenCalled();
  });

  it('forwards mix:run arguments in the documented order', async () => {
    await executeAlgorithmOperation('mix:run', {
      students,
      seatingHistory: [],
      mixHistory: [],
      lockedPositions: {},
      classroomScene: scene,
      mixSettings: { preferGenderMix: 3 },
      lastSeating: null,
      refine: null,
    });

    expect(algorithmMocks.runMixSession).toHaveBeenCalledWith(
      students,
      [],
      [],
      {},
      { preferGenderMix: 3 },
      scene,
      undefined,
      // `onProgress` is injected here rather than carried in the payload.
      { refine: null, onProgress: expect.any(Function) },
    );
  });

  it('refines with simulated annealing by default', async () => {
    await executeAlgorithmOperation('mix:run', {
      students,
      seatingHistory: [],
      mixHistory: [],
      lockedPositions: {},
      classroomScene: scene,
      mixSettings: {},
      refine: {},
    });

    const call = algorithmMocks.runMixSession.mock.calls[0] as
      unknown[] | undefined;
    expect(call?.[7]).toMatchObject({ refine: DEFAULT_REFINE_OPTIONS });
  });

  it('lets explicit refine options override the defaults', async () => {
    await executeAlgorithmOperation('mix:run', {
      students,
      seatingHistory: [],
      mixHistory: [],
      lockedPositions: {},
      classroomScene: scene,
      mixSettings: {},
      refine: { triesPerPass: 42, passes: 7 },
    });

    const call = algorithmMocks.runMixSession.mock.calls[0] as
      unknown[] | undefined;
    expect(call?.[7]).toMatchObject({
      refine: { useAnnealing: true, triesPerPass: 42, passes: 7 },
    });
  });

  it('reports progress stages for a mix', async () => {
    const stages: AlgorithmProgressStage[] = [];

    await executeAlgorithmOperation(
      'mix:run',
      {
        students,
        seatingHistory: [],
        mixHistory: [],
        lockedPositions: {},
        classroomScene: scene,
        mixSettings: {},
        lastSeating: null,
      },
      (_progress, stage) => stages.push(stage),
    );

    // The mocked session never calls its own reporter, so this pins the
    // stages the operation layer itself emits around the call.
    expect(stages).toEqual(['initializing', 'arranging', 'arranging']);
  });

  it('reports progress stages for circle generation', async () => {
    const stages: AlgorithmProgressStage[] = [];

    await executeAlgorithmOperation(
      'circle:generate',
      { students, classroomScene: scene },
      (_progress, stage) => stages.push(stage),
    );

    expect(stages).toEqual(['initializing', 'arranging']);
  });

  it('reports progress stages for the optimized circle', async () => {
    const stages: AlgorithmProgressStage[] = [];

    await executeAlgorithmOperation(
      'circle:optimized',
      {
        students,
        classroomScene: scene,
        mixSettings: {},
        seatingHistory: [],
      },
      (_progress, stage) => stages.push(stage),
    );

    expect(stages).toEqual(['initializing', 'analyzing', 'arranging']);
    expect(algorithmMocks.generateOptimizedCircleLayout).toHaveBeenCalled();
  });

  it('rejects an unknown operation', async () => {
    await expect(
      executeAlgorithmOperation('mix:unknown' as 'mix:run', {} as never),
    ).rejects.toThrow(/Unsupported operation/);
  });
});
