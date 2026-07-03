// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from './ClassroomScene';
import type { CircleLayout, CircleExportData } from './Circle';
import type { Student, SeatingArrangement, ClassCollectionState } from './base';

export type NeighborWeightDirection = 'direct' | 'side' | 'front' | 'back';

/**
 * Controls how student photos are shown on the seating plan's seat markers
 * (the dots at the table edges grow into circular avatars):
 * - `all`: every seat with a photo shows it permanently.
 * - `hover`: only the hovered seat's dot grows to reveal its photo (editor only).
 * - `off`: photos hidden, only the small default dots are drawn.
 */
export type PhotoDisplayMode = 'all' | 'hover' | 'off';

export interface NeighborWeightConfig {
  direct: number;
  side: number;
  front: number;
  back: number;
}

export interface NeighborWeightSettings {
  behavioral: NeighborWeightConfig;
  gender: NeighborWeightConfig;
}

export interface MixSettings {
  avoidPreviousPairs: number;
  avoidRestlessTogether: number;
  avoidConcentrationTogether: number;
  avoidConcentrationNearRestless: number;
  avoidShyAlone: number;
  preferGenderMix: number;
  considerWishPartners: number;
  avoidConflictPartners: number;
  peerTutoring: number;
  homogeneousPerformanceGroups: number;
  preferFrontForNeedsFrontSeat: number;
  preferFrontForSmallerStudents: number;
  preferWindowSeats: number;
  preferDoorSeats: number;
  /** Pair language-strong with language-weak students (0-100) */
  preferLanguageMixing: number;
  /** Distribute social roles evenly across tables (0-100) */
  distributeSocialRoles: number;
  neighborWeights: NeighborWeightSettings;
}

export interface MixResult {
  id: number;
  timestamp: string;
  seating: SeatingArrangement;
  mixSettings: MixSettings;
}

// Map of studentId -> fixed position
export type LockedPositions = Record<string, { table: number; seat: number }>;

export interface SavedPlan {
  id: string;
  name: string;
  date: string; // Date formatted with de-DE locale
  seating: SeatingArrangement;
  scene: ClassroomScene;
  locks?: LockedPositions; // Optional persisted locks
  circleLayout?: CircleLayout; // Optional circle layout
}

export interface ClassroomTemplate {
  id: number;
  name: string;
  description?: string;
  scene: ClassroomScene;
}

// Bundle used for full export/import of app state (versioned)
export interface ExportBundleV1 {
  version: number;
  students: Student[];
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  classroomScene: ClassroomScene;
  mixSettings: MixSettings;
  lockedPositions: LockedPositions;
  classroomTemplates: ClassroomTemplate[];
  circleLayouts?: CircleExportData[]; // Optional circle layouts
  currentCircleLayout?: CircleLayout | null; // Current active circle layout
  classCollection?: ClassCollectionState | null;
  /**
   * Optional student photos embedded in the backup (export version ≥ 2).
   * Maps `student.id` to a base64 image Data URL. Absent for v1 backups.
   */
  studentPhotos?: Record<string, string>;
}

export type ExportBundle = ExportBundleV1; // Alias for the current version

export type ScalarMixSettingKey = Exclude<keyof MixSettings, 'neighborWeights'>;
