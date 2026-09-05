// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import type {
  SeatingArrangement,
  MixSettings,
  ClassroomScene,
  Student,
  StatisticHighlightState,
  StatisticHighlightMode,
  SavedPlan,
  MixResult,
  PlanUsage,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';

export type SeatingPlanViewProps = {
  currentSeating: SeatingArrangement;
  generateSeatingPlan: (
    settings: Partial<MixSettings>,
    scene: ClassroomScene,
  ) => Promise<SeatingArrangement>;
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  classroomScene: ClassroomScene;
  students: Student[];
  studentsCount: number;
  planName: string;
  setPlanName: (v: string) => void;
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
  ) => void;
  planNameError: boolean;
  setPlanNameError: (v: boolean) => void;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void;
  moveStudent?: (
    fromTable: number,
    fromSeat: number,
    toTable: number,
    toSeat: number,
  ) => boolean;
  removeTables: (
    indices: number[],
    options?: { skipSeatingUpdate?: boolean },
  ) => void;
  isSeatLocked?: (table: number, seat: number) => boolean;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  onMix?: () => void;
  refineSeatingLocal?: (
    settings: Partial<MixSettings>,
    scene: ClassroomScene,
    options?: { triesPerPass?: number; passes?: number },
    start?: SeatingArrangement,
  ) => Promise<SeatingArrangement>;
  onEditStudents: () => void;
  onEditLayout: () => void;
  onProceedToPlan: () => void;
  step: number;
  seatingMode?: 'table' | 'circle';
  onModeChange?: (mode: 'table' | 'circle') => void;
  showModeToggle?: boolean;
  lastStatistics?: CriterionFulfillment[] | null;
  onCloseStatistics?: () => void;
  onOpenStatistics?: () => void;
  showStatisticsBadge?: boolean;
  hasPendingStudentUpdates?: boolean;
  onAcknowledgeStudentUpdates?: () => void;
  statisticsHighlight?: StatisticHighlightState | null;
  setStatisticsHighlight?: React.Dispatch<
    React.SetStateAction<StatisticHighlightState | null>
  >;
  setStatisticsHighlightMode?: (mode: StatisticHighlightMode | null) => void;
  clearStatisticsHighlight?: () => void;
  seatingHistory?: SavedPlan[];
  mixHistory?: MixResult[];
  /** Records of plans that were really in use; see `buildPreviousPairs`. */
  planUsage?: PlanUsage[];
  autoMixing?: boolean;
  autoMixError?: string | null;
};
