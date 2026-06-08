import type {
  Student,
  SavedPlan,
  ClassroomScene,
  LockedPositions,
  MixSettings,
  MixResult,
  SeatingArrangement,
  ClassroomTemplate,
  ClassCollectionState,
  ClassSummary,
  ClassRecord,
  CreateClassPayload,
  UpdateClassMetadataPayload,
} from '@/types';
import type { CircleLayout, CircleExportData } from '@/types/Circle';
import type { Result } from './types';

export type ActiveClassSnapshot = {
  students?: Student[];
  seatingHistory?: SavedPlan[];
  mixHistory?: MixResult[];
  currentSeating?: SeatingArrangement;
  lockedPositions?: LockedPositions;
  mixSettings?: MixSettings | null;
  classroomScene?: ClassroomScene | null;
  circleLayout?: CircleLayout | null;
  activePlanId?: string | null;
};

/**
 * Repository interface for seating plan persistence
 * Provides abstraction over storage implementation
 */
export interface ISeatingPlanRepository {
  // Class collection operations
  loadClassCollection(): Promise<Result<ClassCollectionState>>;
  listClasses(): Promise<Result<ClassSummary[]>>;
  createClass(
    payload: CreateClassPayload,
    options?: { activate?: boolean },
  ): Promise<Result<ClassRecord>>;
  updateClassMetadata(
    classId: string,
    patch: UpdateClassMetadataPayload,
  ): Promise<Result<ClassRecord>>;
  duplicateClass(
    classId: string,
    overrides?: UpdateClassMetadataPayload & { name?: string },
  ): Promise<Result<ClassRecord>>;
  setActiveClass(classId: string): Promise<Result<ClassRecord>>;
  deleteClass(classId: string): Promise<Result<void>>;
  saveClassCollection(collection: ClassCollectionState): Promise<Result<void>>;
  loadActiveClassSnapshot(): Promise<Result<ActiveClassSnapshot>>;
  saveActiveClassSnapshot(snapshot: ActiveClassSnapshot): Promise<Result<void>>;
  saveClassSnapshot(
    classId: string,
    snapshot: ActiveClassSnapshot,
  ): Promise<Result<void>>;

  // Student operations
  loadStudents(): Promise<Result<Student[]>>;
  saveStudents(students: Student[]): Promise<Result<void>>;

  // Seating history operations
  loadSeatingHistory(): Promise<Result<SavedPlan[]>>;
  saveSeatingHistory(history: SavedPlan[]): Promise<Result<void>>;

  // Mix history operations
  loadMixHistory(): Promise<Result<MixResult[]>>;
  saveMixHistory(history: MixResult[]): Promise<Result<void>>;

  // Current seating operations
  loadCurrentSeating(): Promise<Result<SeatingArrangement>>;
  saveCurrentSeating(seating: SeatingArrangement): Promise<Result<void>>;

  // Classroom scene operations
  loadClassroomScene(): Promise<Result<ClassroomScene | null>>;
  saveClassroomScene(scene: ClassroomScene): Promise<Result<void>>;

  // Locked positions operations
  loadLockedPositions(): Promise<Result<LockedPositions>>;
  saveLockedPositions(positions: LockedPositions): Promise<Result<void>>;

  // Mix settings operations
  loadMixSettings(): Promise<Result<MixSettings | null>>;
  saveMixSettings(settings: MixSettings): Promise<Result<void>>;

  // Circle layout operations
  loadCurrentCircleLayout(): Promise<Result<CircleLayout | null>>;
  saveCurrentCircleLayout(layout: CircleLayout | null): Promise<Result<void>>;

  loadCircleLayouts(): Promise<Result<CircleExportData[]>>;
  saveCircleLayouts(layouts: CircleExportData[]): Promise<Result<void>>;

  // Template operations
  loadTemplates(): Promise<Result<ClassroomTemplate[]>>;
  saveTemplate(template: ClassroomTemplate): Promise<Result<ClassroomTemplate>>;
  saveTemplates(templates: ClassroomTemplate[]): Promise<Result<void>>;
  updateTemplate(id: number, scene: ClassroomScene): Promise<Result<void>>;
  deleteTemplate(id: number): Promise<Result<void>>;
  renameTemplate(id: number, newName: string): Promise<Result<void>>;

  // Bulk operations
  clearAll(): Promise<Result<void>>;
}
