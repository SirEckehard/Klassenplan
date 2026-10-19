// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  LockedPositions,
  MixSettings,
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';

export type AlgorithmWorkerOperation =
  'mix:run' | 'circle:optimized' | 'worker:warmup';

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
  'mix:run': {
    payload: {
      students: Student[];
      seatingHistory: SavedPlan[];
      /** Records of plans that were really in use; see `buildPreviousPairs`. */
      planUsage?: PlanUsage[];
      /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
      planUsageSince?: string | null;
      /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
      planUsageManual?: boolean;
      lockedPositions: LockedPositions;
      classroomScene: ClassroomScene;
      mixSettings: Partial<MixSettings>;
      /**
       * Whether the refinement follows the construction — while a criterion
       * is on; without it the construction stands (decision 0027).
       */
      refine?: boolean;
    };
    result: {
      seating: SeatingArrangement;
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
