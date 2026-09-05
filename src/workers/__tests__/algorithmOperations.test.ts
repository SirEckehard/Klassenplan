// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomScene, Student } from '@/types';

const algorithmMocks = vi.hoisted(() => ({
  generateSeatingPlan: vi.fn(() => [[null]]),
  refineSeatingLocal: vi.fn(() => [[null]]),
  generateCircleLayout: vi.fn(() => ({ students: [] })),
  generateOptimizedCircleLayout: vi.fn(() => ({ students: [] })),
}));

vi.mock('@/utils/algorithm/seatingAlgorithm', () => ({
  generateSeatingPlan: algorithmMocks.generateSeatingPlan,
  refineSeatingLocal: algorithmMocks.refineSeatingLocal,
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
    expect(algorithmMocks.generateSeatingPlan).not.toHaveBeenCalled();
  });

  it('forwards mix:generate arguments in the documented order', async () => {
    await executeAlgorithmOperation('mix:generate', {
      students,
      seatingHistory: [],
      mixHistory: [],
      lockedPositions: {},
      classroomScene: scene,
      mixSettings: { preferGenderMix: 3 },
      lastSeating: null,
    });

    expect(algorithmMocks.generateSeatingPlan).toHaveBeenCalledWith(
      students,
      [],
      [],
      {},
      { preferGenderMix: 3 },
      scene,
      undefined,
      { planUsage: undefined },
    );
  });

  it('enables simulated annealing by default for mix:refine', async () => {
    await executeAlgorithmOperation('mix:refine', {
      students,
      seatingHistory: [],
      mixHistory: [],
      lockedPositions: {},
      classroomScene: scene,
      currentSeating: [],
      mixSettings: {},
      start: null,
    });

    expect(algorithmMocks.refineSeatingLocal).toHaveBeenCalledWith(
      students,
      [],
      [],
      {},
      [],
      {},
      scene,
      // `onProgress` is injected here rather than carried in the payload, so it
      // rides along with the defaults.
      { ...DEFAULT_REFINE_OPTIONS, onProgress: expect.any(Function) },
      undefined,
    );
  });

  it('lets explicit refine options override the defaults', async () => {
    await executeAlgorithmOperation('mix:refine', {
      students,
      seatingHistory: [],
      mixHistory: [],
      lockedPositions: {},
      classroomScene: scene,
      currentSeating: [],
      mixSettings: {},
      options: { triesPerPass: 42, passes: 7 },
      start: null,
    });

    const call = algorithmMocks.refineSeatingLocal.mock.calls[0] as
      unknown[] | undefined;
    const options = call?.[7];
    expect(options).toEqual({
      useAnnealing: true,
      triesPerPass: 42,
      passes: 7,
      onProgress: expect.any(Function),
    });
  });

  it('reports progress stages for a mix', async () => {
    const stages: AlgorithmProgressStage[] = [];

    await executeAlgorithmOperation(
      'mix:generate',
      {
        students,
        seatingHistory: [],
        mixHistory: [],
        lockedPositions: {},
        classroomScene: scene,
        mixSettings: {},
        lastSeating: null,
        forceNew: true,
      },
      (_progress, stage) => stages.push(stage),
    );

    expect(stages).toEqual(['initializing', 'arranging', 'arranging']);
  });

  it('reports progress stages for a refinement', async () => {
    const stages: AlgorithmProgressStage[] = [];

    await executeAlgorithmOperation(
      'mix:refine',
      {
        students,
        seatingHistory: [],
        mixHistory: [],
        lockedPositions: {},
        classroomScene: scene,
        currentSeating: [],
        mixSettings: {},
        start: null,
      },
      (_progress, stage) => stages.push(stage),
    );

    // The mocked refine never calls its own reporter, so this pins the stages
    // the operation layer itself emits around the call.
    expect(stages).toEqual(['initializing', 'arranging']);
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
      executeAlgorithmOperation('mix:unknown' as 'mix:generate', {} as never),
    ).rejects.toThrow(/Unsupported operation/);
  });
});
