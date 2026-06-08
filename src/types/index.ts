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
  ClassroomTemplate as ClassroomTemplateT,
  ExportBundleV1 as ExportBundleV1T,
  ExportBundle as ExportBundleT,
  ScalarMixSettingKey as ScalarMixSettingKeyT,
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
export type ClassroomTemplate = ClassroomTemplateT;
export type ExportBundleV1 = ExportBundleV1T;
export type ExportBundle = ExportBundleT;
export type { ClassroomScene, ClassroomTable, TableTemplateType };
export type { ClassroomFeature, ClassroomFeatureType, ClassroomFeatureAnchor };
export type ScalarMixSettingKey = ScalarMixSettingKeyT;
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
