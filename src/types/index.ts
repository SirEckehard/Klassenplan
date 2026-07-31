// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  ClassroomTable,
  TableTemplateType,
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomFeatureAnchor,
} from './ClassroomScene';
import type {
  NeighborWeightDirection as NeighborWeightDirectionT,
  NeighborWeightConfig as NeighborWeightConfigT,
  NeighborWeightSettings as NeighborWeightSettingsT,
  MixSettings as MixSettingsT,
  MixResult as MixResultT,
  LockedPositions as LockedPositionsT,
  SavedPlan as SavedPlanT,
  SaveSeatingPlanOptions as SaveSeatingPlanOptionsT,
  ClassroomTemplate as ClassroomTemplateT,
  SaveTemplateError as SaveTemplateErrorT,
  SaveTemplateResult as SaveTemplateResultT,
  ExportBundleV1 as ExportBundleV1T,
  ExportBundle as ExportBundleT,
  ScalarMixSettingKey as ScalarMixSettingKeyT,
  PhotoDisplayMode as PhotoDisplayModeT,
} from './SeatingPlan';

// Re-export base types for backward compatibility
export type {
  Gender,
  HeightCategory,
  LanguageSkillLevel,
  SocialRole,
  Student,
  SeatingSeat,
  SeatingTable,
  SeatingArrangement,
} from './base';

export type { SeatingStatistics } from '@/utils/algorithm/seatingStatistics';

// Import for internal use

export type NeighborWeightDirection = NeighborWeightDirectionT;
export type NeighborWeightConfig = NeighborWeightConfigT;
export type NeighborWeightSettings = NeighborWeightSettingsT;
export type MixSettings = MixSettingsT;
export type MixResult = MixResultT;
export type LockedPositions = LockedPositionsT;
export type SavedPlan = SavedPlanT;
export type SaveSeatingPlanOptions = SaveSeatingPlanOptionsT;
export type ClassroomTemplate = ClassroomTemplateT;
export type SaveTemplateError = SaveTemplateErrorT;
export type SaveTemplateResult = SaveTemplateResultT;
export type ExportBundleV1 = ExportBundleV1T;
export type ExportBundle = ExportBundleT;
export type { ClassroomScene, ClassroomTable, TableTemplateType };
export type { ClassroomFeature, ClassroomFeatureType, ClassroomFeatureAnchor };
export type ScalarMixSettingKey = ScalarMixSettingKeyT;
export type PhotoDisplayMode = PhotoDisplayModeT;
export type {
  ClassRecord,
  ClassCollectionState,
  ClassSummary,
  CreateClassPayload,
  UpdateClassMetadataPayload,
  ActiveClassState,
} from './ClassManagement';
export { DEFAULT_ACTIVE_CLASS } from './ClassManagement';
export type {
  StatisticHighlightEntry,
  StatisticHighlightMode,
  StatisticHighlightState,
  StatisticHighlightTarget,
} from './StatisticsHighlight';
export type { StatisticStatus } from '@/utils/ui/statisticsStatus';
export type {
  NameGameStudentStat,
  NameGameStatsMap,
  MemoryBestScore,
  NameGameData,
} from './NameGame';
