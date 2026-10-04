// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from './ClassroomScene';
import type { CircleLayout } from './Circle';
import type {
  Student,
  SeatingArrangement,
  ClassCollectionState as BaseClassCollectionState,
} from './base';
import type {
  MixSettings,
  SavedPlan,
  LockedPositions,
  MixResult,
} from './SeatingPlan';

/**
 * How a room was left: the working state of a class while another of its rooms
 * is open (decision 0024). Opening the room again puts it back as it was.
 */
export interface RoomWorkingState {
  /** `null` stands for the default room, as `ClassRecord.classroomScene`. */
  scene: ClassroomScene | null;
  seating: SeatingArrangement;
  lockedPositions: LockedPositions;
  circleLayout: CircleLayout | null;
  activePlanId: string | null;
}

/**
 * A room of a class — its classroom, a lab — where its plans and mixes were
 * made (decision 0024). The room is a name and an identity; its tables are
 * the class's working scene while it is open, `parked.scene` while not.
 */
export interface RoomRecord {
  id: string;
  /** Unique within the class, case ignored (`isSameName`). */
  name: string;
  /** ISO 8601 */
  createdAt: string;
  /** How the room was left. Only while another room of the class is open. */
  parked?: RoomWorkingState;
}

export interface ClassRecord {
  id: string;
  name: string;
  label?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  students: Student[];
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  currentSeating: SeatingArrangement;
  lockedPositions: LockedPositions;
  mixSettings: MixSettings | null;
  classroomScene: ClassroomScene | null;
  circleLayout: CircleLayout | null;
  activePlanId?: string | null;
  /**
   * The class's rooms. Absent in data written before rooms existed; reading
   * gives such a class one room that holds every plan (`ensureClassRooms`).
   */
  rooms?: RoomRecord[];
  /** The open room: the one whose state the working fields above hold. */
  activeRoomId?: string | null;
}

// Re-export with proper ClassRecord[] typing
export interface ClassCollectionState extends Omit<
  BaseClassCollectionState,
  'classes'
> {
  classes: ClassRecord[];
}

export type ClassSummary = Pick<
  ClassRecord,
  'id' | 'name' | 'label' | 'notes' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
> & {
  studentCount: number;
};

export type CreateClassPayload = {
  name: string;
  label?: string;
  notes?: string;
  students?: Student[];
  classroomScene?: ClassroomScene | null;
};

export type UpdateClassMetadataPayload = {
  name?: string;
  label?: string;
  notes?: string;
};

export type ActiveClassState = {
  id: string | null;
  name: string;
  label?: string;
  notes?: string;
  lastUsedAt?: string;
};

export const DEFAULT_ACTIVE_CLASS: ActiveClassState = {
  id: null,
  name: '',
};
