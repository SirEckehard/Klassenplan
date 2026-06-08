/**
 * Shared types for persistence hooks.
 * These types define the structure of persist jobs, queues, and payloads.
 */
import type { MutableRefObject } from 'react';
import type {
  Student,
  SavedPlan,
  MixResult,
  SeatingArrangement,
  LockedPositions,
  MixSettings,
  ClassroomScene,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';

/**
 * Keys for all persistable data types.
 */
export type PersistKey =
  | 'students'
  | 'seatingHistory'
  | 'mixHistory'
  | 'currentSeating'
  | 'lockedPositions'
  | 'mixSettings'
  | 'classroomScene'
  | 'circleLayout'
  | 'activePlanId';

/**
 * Mapping from PersistKey to the corresponding payload type.
 */
export type PersistPayloadMap = {
  students: Student[];
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  currentSeating: SeatingArrangement;
  lockedPositions: LockedPositions;
  mixSettings: MixSettings;
  classroomScene: ClassroomScene;
  circleLayout: CircleLayout | null;
  activePlanId: string | null;
};

/**
 * A job in the persist queue.
 */
export type PersistJob<K extends PersistKey = PersistKey> = {
  version: number;
  data: PersistPayloadMap[K];
  context: K;
  classId: string;
};

/**
 * Partial snapshot for batch writes.
 */
export type PersistSnapshot = Partial<{
  [K in PersistKey]: PersistPayloadMap[K];
}>;

/**
 * Map of pending jobs in the queue.
 */
export type PersistJobMap = Partial<{ [K in PersistKey]: PersistJob<K> }>;

/**
 * Refs used by the persist queue.
 */
export interface PersistQueueRefs {
  persistVersionsRef: MutableRefObject<Record<PersistKey, number>>;
  persistQueueRef: MutableRefObject<PersistJobMap>;
  flushScheduledRef: MutableRefObject<boolean>;
  isFlushingRef: MutableRefObject<boolean>;
  lastPersistedSnapshotRef: MutableRefObject<PersistSnapshot>;
}

/**
 * Refs used by error handling.
 */
export interface PersistErrorRefs {
  pendingPersistErrorRef: MutableRefObject<boolean>;
  navigationIntentRef: MutableRefObject<number>;
  lastPersistErrorToastRef: MutableRefObject<number>;
}

/**
 * Human-readable labels for persist context logging.
 */
export const PERSIST_CONTEXT_LABELS: Record<PersistKey, string> = {
  students: 'students',
  seatingHistory: 'seating history',
  mixHistory: 'mix history',
  currentSeating: 'current seating',
  lockedPositions: 'locked positions',
  mixSettings: 'mix settings',
  classroomScene: 'classroom scene',
  circleLayout: 'circle layout',
  activePlanId: 'active plan',
};

/**
 * Initial version values for all persist keys.
 */
export const INITIAL_PERSIST_VERSIONS: Record<PersistKey, number> = {
  students: 0,
  seatingHistory: 0,
  mixHistory: 0,
  currentSeating: 0,
  lockedPositions: 0,
  mixSettings: 0,
  classroomScene: 0,
  circleLayout: 0,
  activePlanId: 0,
};
