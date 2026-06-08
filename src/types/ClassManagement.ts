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
