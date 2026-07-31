// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  LockedPositions,
  MixResult,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';

export type AlgorithmWorkerOperation =
  | 'mix:generate'
  | 'mix:refine'
  | 'circle:generate'
  | 'circle:optimized'
  | 'worker:warmup';

export interface WorkerErrorPayload {
  name?: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

export interface WorkerProgressPayload {
  progress: number;
  message?: string;
  stage?: string;
}

export type AlgorithmWorkerRequestMap = {
  'mix:generate': {
    payload: {
      students: Student[];
      seatingHistory: SavedPlan[];
      mixHistory: MixResult[];
      lockedPositions: LockedPositions;
      classroomScene: ClassroomScene;
      mixSettings: Partial<MixSettings>;
      forceNew?: boolean;
      lastSeating?: SeatingArrangement | null;
    };
    result: {
      seating: SeatingArrangement;
    };
  };
  'mix:refine': {
    payload: {
      students: Student[];
      classroomScene: ClassroomScene;
      currentSeating: SeatingArrangement;
      mixSettings: Partial<MixSettings>;
      mixHistory: MixResult[];
      seatingHistory: SavedPlan[];
      lockedPositions: LockedPositions;
      options?: { triesPerPass?: number; passes?: number };
      start?: SeatingArrangement | null;
    };
    result: {
      seating: SeatingArrangement;
    };
  };
  'circle:generate': {
    payload: {
      students: Student[];
      classroomScene: ClassroomScene;
      currentSeating?: SeatingArrangement;
    };
    result: {
      layout: CircleLayout;
    };
  };
  'circle:optimized': {
    payload: {
      students: Student[];
      classroomScene: ClassroomScene;
      mixSettings: Partial<MixSettings>;
      seatingHistory: SavedPlan[];
      currentSeating?: SeatingArrangement;
    };
    result: {
      layout: CircleLayout;
    };
  };
  'worker:warmup': {
    payload: Record<string, never>;
    result: {
      ready: true;
    };
  };
};

export interface AlgorithmWorkerRequest<
  TOperation extends AlgorithmWorkerOperation = AlgorithmWorkerOperation,
> {
  requestId: string;
  operation: TOperation;
  payload: AlgorithmWorkerRequestMap[TOperation]['payload'];
}

export interface AlgorithmWorkerSuccessResponse<
  TOperation extends AlgorithmWorkerOperation,
> {
  requestId: string;
  operation: TOperation;
  status: 'success';
  result: AlgorithmWorkerRequestMap[TOperation]['result'];
}

export interface AlgorithmWorkerErrorResponse<
  TOperation extends AlgorithmWorkerOperation,
> {
  requestId: string;
  operation: TOperation;
  status: 'error';
  error: WorkerErrorPayload;
}

export interface AlgorithmWorkerProgressResponse<
  TOperation extends AlgorithmWorkerOperation,
> {
  requestId: string;
  operation: TOperation;
  status: 'progress';
  progress: WorkerProgressPayload;
}

export type AlgorithmWorkerResponse<
  TOperation extends AlgorithmWorkerOperation = AlgorithmWorkerOperation,
> =
  | AlgorithmWorkerSuccessResponse<TOperation>
  | AlgorithmWorkerErrorResponse<TOperation>
  | AlgorithmWorkerProgressResponse<TOperation>;

export const isAlgorithmWorkerRequest = (
  message: unknown,
): message is AlgorithmWorkerRequest => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const candidate = message as Partial<AlgorithmWorkerRequest>;
  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.operation === 'string' &&
    'payload' in candidate
  );
};

export const createWorkerErrorPayload = (
  error: unknown,
): WorkerErrorPayload => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown worker error',
    details:
      error && typeof error === 'object'
        ? (Object.fromEntries(
            Object.entries(error as Record<string, unknown>).slice(0, 8),
          ) as Record<string, unknown>)
        : undefined,
  };
};
