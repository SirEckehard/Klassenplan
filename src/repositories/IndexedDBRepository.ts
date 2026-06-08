import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
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
  ClassRecord,
  ClassSummary,
  CreateClassPayload,
  UpdateClassMetadataPayload,
} from '@/types';
import type { CircleLayout, CircleExportData } from '@/types/Circle';
import type {
  ActiveClassSnapshot,
  ISeatingPlanRepository,
} from './ISeatingPlanRepository';
import type { Result } from './types';
import { ResultHelpers, RepositoryErrorType } from './types';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError, deepClone } from '@/utils';
import i18n from '@/i18n';
import {
  CLASS_COLLECTION_VERSION,
  createClassCollection,
  createClassRecord,
  ensureActiveClass,
  summarizeClass,
} from '@/utils/data/classCollection';
import { normalizeSeatingHistory } from '@/utils/data/planNormalization';

const REPOSITORY_LOG_SOURCE = 'IndexedDBRepository';

const hasOwn = Object.prototype.hasOwnProperty;

function normalizeRepositorySeatingHistory(plans: SavedPlan[]): SavedPlan[] {
  return normalizeSeatingHistory(plans, { logSource: REPOSITORY_LOG_SOURCE });
}

function isRepositoryResult<T>(value: unknown): value is Result<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'success' in value &&
    typeof (value as { success?: unknown }).success === 'boolean'
  );
}

function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  return deepClone(value);
}

/**
 * IndexedDB implementation of the seating plan repository
 * Uses idb-keyval for simplified IndexedDB access
 */
export class IndexedDBRepository implements ISeatingPlanRepository {
  private classCollectionCache: ClassCollectionState | null = null;
  private _lock: Promise<void> = Promise.resolve();

  private async synchronized<T>(action: () => Promise<T>): Promise<T> {
    // Wait for the previous operation to complete (success or failure)
    await this._lock.catch(() => {});

    // Create a new promise for the current operation
    const promise = action();

    // Update the lock to wait for the current operation
    this._lock = promise.then(() => {}).catch(() => {});

    return promise;
  }

  private checkAvailability(): Result<void> {
    if (!hasIndexedDB()) {
      return ResultHelpers.failure({
        type: RepositoryErrorType.STORAGE_ERROR,
        message: 'IndexedDB is not available in this browser',
      });
    }
    return ResultHelpers.success(undefined);
  }

  private async withErrorHandling<T>(
    operation: () => Promise<T | undefined | Result<T>>,
    options: {
      logMessage: string;
      errorMessage: string;
      fallback?: T;
      errorType?: RepositoryErrorType;
    },
  ): Promise<Result<T>> {
    const availability = this.checkAvailability();
    if (!availability.success) {
      return ResultHelpers.failure(availability.error);
    }

    try {
      const result = await this.synchronized(operation);

      if (isRepositoryResult<T>(result)) {
        return result;
      }

      if (result === undefined) {
        if (hasOwn.call(options, 'fallback')) {
          return ResultHelpers.success(options.fallback as T);
        }
        return ResultHelpers.success(result as T);
      }
      return ResultHelpers.success(result);
    } catch (error) {
      logError(options.logMessage, { error }, REPOSITORY_LOG_SOURCE);
      return ResultHelpers.fromError(
        error,
        options.errorType ?? RepositoryErrorType.STORAGE_ERROR,
        options.errorMessage,
      );
    }
  }

  private async loadClassCollectionState(): Promise<ClassCollectionState> {
    if (this.classCollectionCache) {
      return this.classCollectionCache;
    }

    const stored = await idbGet<ClassCollectionState>(DB_KEYS.classCollection);
    if (stored) {
      const ensured = ensureActiveClass(stored);
      if (ensured.activeClassId !== stored.activeClassId) {
        await idbSet(DB_KEYS.classCollection, ensured);
      }
      this.classCollectionCache = ensured;
      return ensured;
    }

    const migrated = await this.migrateLegacyStorage();
    this.classCollectionCache = migrated;
    return migrated;
  }

  private async migrateLegacyStorage(): Promise<ClassCollectionState> {
    const [
      students,
      seatingHistory,
      mixHistory,
      currentSeating,
      lockedPositions,
      mixSettings,
      classroomScene,
      circleLayout,
    ] = await Promise.all([
      idbGet<Student[]>(DB_KEYS.students),
      idbGet<SavedPlan[]>(DB_KEYS.seatingHistory),
      idbGet<MixResult[]>(DB_KEYS.mixHistory),
      idbGet<SeatingArrangement>(DB_KEYS.currentSeating),
      idbGet<LockedPositions>(DB_KEYS.lockedPositions),
      idbGet<MixSettings>(DB_KEYS.mixSettings),
      idbGet<ClassroomScene>(DB_KEYS.classroomScene),
      idbGet<CircleLayout | null>(DB_KEYS.currentCircleLayout),
    ]);

    const hasLegacyData =
      (students && students.length > 0) ||
      (seatingHistory && seatingHistory.length > 0) ||
      (mixHistory && mixHistory.length > 0) ||
      (currentSeating && currentSeating.length > 0) ||
      (lockedPositions && Object.keys(lockedPositions).length > 0) ||
      mixSettings ||
      classroomScene ||
      circleLayout;

    let collection: ClassCollectionState;
    if (hasLegacyData) {
      const defaultClass = createClassRecord({
        name: i18n.t('generator:common.defaultClassName'),
        students: students ?? [],
        seatingHistory: seatingHistory ?? [],
        mixHistory: mixHistory ?? [],
        currentSeating: currentSeating ?? [],
        lockedPositions: lockedPositions ?? {},
        mixSettings: mixSettings ?? null,
        classroomScene: classroomScene ?? null,
        circleLayout: circleLayout ?? null,
      });
      collection = createClassCollection(defaultClass);
    } else {
      collection = createClassCollection();
    }
    await idbSet(DB_KEYS.classCollection, collection);
    return collection;
  }

  private getActiveClassRecord(
    collection: ClassCollectionState,
  ): ClassRecord | null {
    const ensured = ensureActiveClass(collection);
    if (!ensured.activeClassId) {
      return null;
    }
    return (
      ensured.classes.find((entry) => entry.id === ensured.activeClassId) ??
      null
    );
  }

  private async persistCollection(collection: ClassCollectionState) {
    collection.version = CLASS_COLLECTION_VERSION;
    await idbSet(DB_KEYS.classCollection, collection);
    this.classCollectionCache = collection;
  }

  private touchClass(record: ClassRecord, options?: { lastUsed?: boolean }) {
    const timestamp = new Date().toISOString();
    record.updatedAt = timestamp;
    if (options?.lastUsed) {
      record.lastUsedAt = timestamp;
    }
  }

  private withActiveClassRead<T>(
    selector: (record: ClassRecord) => T,
    options: {
      logMessage: string;
      errorMessage: string;
      fallback?: T;
    },
  ): Promise<Result<T>> {
    return this.withErrorHandling(async () => {
      const collection = await this.loadClassCollectionState();
      const record = this.getActiveClassRecord(collection);
      if (!record) {
        if (hasOwn.call(options, 'fallback')) {
          return cloneValue(options.fallback as T);
        }
        return ResultHelpers.failure({
          type: RepositoryErrorType.VALIDATION_ERROR,
          message: 'No active class selected',
        });
      }
      return cloneValue(selector(record));
    }, options);
  }

  private withActiveClassWrite<T>(
    mutator: (record: ClassRecord, collection: ClassCollectionState) => T,
    options: {
      logMessage: string;
      errorMessage: string;
      fallback?: T;
    },
  ): Promise<Result<T>> {
    return this.withErrorHandling(async () => {
      const collection = await this.loadClassCollectionState();
      const record = this.getActiveClassRecord(collection);
      if (!record) {
        return ResultHelpers.failure({
          type: RepositoryErrorType.VALIDATION_ERROR,
          message: 'No active class selected',
        });
      }
      const result = mutator(record, collection);
      this.touchClass(record);
      await this.persistCollection(collection);
      return result;
    }, options);
  }

  private withClassWrite<T>(
    classId: string,
    mutator: (record: ClassRecord, collection: ClassCollectionState) => T,
    options: {
      logMessage: string;
      errorMessage: string;
      fallback?: T;
    },
  ): Promise<Result<T>> {
    return this.withErrorHandling(async () => {
      const collection = await this.loadClassCollectionState();
      const record = collection.classes.find((entry) => entry.id === classId);
      if (!record) {
        return ResultHelpers.failure({
          type: RepositoryErrorType.NOT_FOUND,
          message: 'Class not found',
        });
      }
      const result = mutator(record, collection);
      this.touchClass(record);
      await this.persistCollection(collection);
      return result;
    }, options);
  }

  /**
   * Apply snapshot fields to a class record.
   * Shared logic used by both saveActiveClassSnapshot and saveClassSnapshot.
   */
  private applySnapshotToRecord(
    record: ClassRecord,
    snapshot: ActiveClassSnapshot,
  ): void {
    if (hasOwn.call(snapshot, 'students')) {
      record.students = cloneValue(snapshot.students ?? []);
    }
    if (hasOwn.call(snapshot, 'seatingHistory')) {
      const normalizedHistory = normalizeRepositorySeatingHistory(
        snapshot.seatingHistory ?? [],
      );
      record.seatingHistory = cloneValue(normalizedHistory);
    }
    if (hasOwn.call(snapshot, 'mixHistory')) {
      record.mixHistory = cloneValue(snapshot.mixHistory ?? []);
    }
    if (hasOwn.call(snapshot, 'currentSeating')) {
      record.currentSeating = cloneValue(snapshot.currentSeating ?? []);
    }
    if (hasOwn.call(snapshot, 'lockedPositions')) {
      record.lockedPositions = cloneValue(snapshot.lockedPositions ?? {});
    }
    if (hasOwn.call(snapshot, 'mixSettings')) {
      record.mixSettings = cloneValue(snapshot.mixSettings ?? null);
    }
    if (hasOwn.call(snapshot, 'classroomScene')) {
      record.classroomScene = cloneValue(snapshot.classroomScene ?? null);
    }
    if (hasOwn.call(snapshot, 'circleLayout')) {
      record.circleLayout = cloneValue(snapshot.circleLayout ?? null);
    }
    if (hasOwn.call(snapshot, 'activePlanId')) {
      record.activePlanId = cloneValue(snapshot.activePlanId ?? null);
    }
  }

  // ===== Class collection operations =====
  async loadClassCollection(): Promise<Result<ClassCollectionState>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();
        return cloneValue(collection);
      },
      {
        logMessage: 'Failed to load class collection from IndexedDB',
        errorMessage: 'Failed to load class collection',
      },
    );
  }

  async listClasses(): Promise<Result<ClassSummary[]>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();
        return collection.classes.map((entry) => summarizeClass(entry));
      },
      {
        logMessage: 'Failed to list classes from IndexedDB',
        errorMessage: 'Failed to list classes',
        fallback: [],
      },
    );
  }

  async createClass(
    payload: CreateClassPayload,
    options?: { activate?: boolean },
  ): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();

        // Check for duplicate class name (case-insensitive)
        const trimmedName = payload.name.trim().toLowerCase();
        const duplicate = collection.classes.find(
          (entry) => entry.name.trim().toLowerCase() === trimmedName,
        );
        if (duplicate) {
          return ResultHelpers.failure({
            type: RepositoryErrorType.DUPLICATE_KEY,
            message: 'A class with this name already exists',
          });
        }

        const record = createClassRecord({
          ...payload,
          students: payload.students ? cloneValue(payload.students) : [],
          classroomScene: payload.classroomScene
            ? cloneValue(payload.classroomScene)
            : null,
        });
        collection.classes.push(record);
        if (options?.activate) {
          collection.activeClassId = record.id;
          this.touchClass(record, { lastUsed: true });
        }
        await this.persistCollection(collection);
        return cloneValue(record);
      },
      {
        logMessage: 'Failed to create class in IndexedDB',
        errorMessage: 'Failed to create class',
      },
    );
  }

  async updateClassMetadata(
    classId: string,
    patch: UpdateClassMetadataPayload,
  ): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();
        const record = collection.classes.find((entry) => entry.id === classId);
        if (!record) {
          return ResultHelpers.failure({
            type: RepositoryErrorType.NOT_FOUND,
            message: 'Class not found',
          });
        }

        // Check for duplicate class name if name is being changed (case-insensitive)
        if (patch.name) {
          const trimmedName = patch.name.trim().toLowerCase();
          const duplicate = collection.classes.find(
            (entry) =>
              entry.id !== classId &&
              entry.name.trim().toLowerCase() === trimmedName,
          );
          if (duplicate) {
            return ResultHelpers.failure({
              type: RepositoryErrorType.DUPLICATE_KEY,
              message: 'A class with this name already exists',
            });
          }
          record.name = patch.name.trim() || record.name;
        }
        if (patch.label !== undefined) {
          record.label = patch.label;
        }
        if (patch.notes !== undefined) {
          record.notes = patch.notes;
        }
        this.touchClass(record);
        await this.persistCollection(collection);
        return cloneValue(record);
      },
      {
        logMessage: 'Failed to update class metadata in IndexedDB',
        errorMessage: 'Failed to update class metadata',
      },
    );
  }

  async duplicateClass(
    classId: string,
    overrides?: UpdateClassMetadataPayload & { name?: string },
  ): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();
        const source = collection.classes.find((entry) => entry.id === classId);
        if (!source) {
          return ResultHelpers.failure({
            type: RepositoryErrorType.NOT_FOUND,
            message: 'Class not found',
          });
        }
        const duplicated = createClassRecord({
          ...source,
          id: undefined,
          name: overrides?.name?.trim() || `${source.name} Kopie`,
          label: overrides?.label ?? source.label,
          notes: overrides?.notes ?? source.notes,
          students: cloneValue(source.students),
          seatingHistory: cloneValue(source.seatingHistory),
          mixHistory: cloneValue(source.mixHistory),
          currentSeating: cloneValue(source.currentSeating),
          lockedPositions: cloneValue(source.lockedPositions),
          mixSettings: cloneValue(source.mixSettings),
          classroomScene: cloneValue(source.classroomScene),
          circleLayout: cloneValue(source.circleLayout),
        });
        collection.classes.push(duplicated);
        await this.persistCollection(collection);
        return cloneValue(duplicated);
      },
      {
        logMessage: 'Failed to duplicate class in IndexedDB',
        errorMessage: 'Failed to duplicate class',
      },
    );
  }

  async setActiveClass(classId: string): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();
        const record = collection.classes.find((entry) => entry.id === classId);
        if (!record) {
          return ResultHelpers.failure({
            type: RepositoryErrorType.NOT_FOUND,
            message: 'Class not found',
          });
        }
        collection.activeClassId = classId;
        this.touchClass(record, { lastUsed: true });
        await this.persistCollection(collection);
        return cloneValue(record);
      },
      {
        logMessage: 'Failed to set active class in IndexedDB',
        errorMessage: 'Failed to set active class',
      },
    );
  }

  async deleteClass(classId: string): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const collection = await this.loadClassCollectionState();
        const index = collection.classes.findIndex(
          (entry) => entry.id === classId,
        );
        if (index === -1) {
          return ResultHelpers.failure({
            type: RepositoryErrorType.NOT_FOUND,
            message: 'Class not found',
          });
        }
        const [removed] = collection.classes.splice(index, 1);
        if (collection.activeClassId === removed.id) {
          const fallback = collection.classes[0];
          collection.activeClassId = fallback ? fallback.id : null;
          if (fallback) {
            this.touchClass(fallback, { lastUsed: true });
          }
        }
        await this.persistCollection(collection);
        return ResultHelpers.success(undefined);
      },
      {
        logMessage: 'Failed to delete class in IndexedDB',
        errorMessage: 'Failed to delete class',
      },
    );
  }

  async saveClassCollection(
    collection: ClassCollectionState,
  ): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const ensured = ensureActiveClass(collection);
        await this.persistCollection(ensured);
        return undefined;
      },
      {
        logMessage: 'Failed to save class collection to IndexedDB',
        errorMessage: 'Failed to save class collection',
      },
    );
  }

  async loadActiveClassSnapshot(): Promise<Result<ActiveClassSnapshot>> {
    return this.withActiveClassRead(
      (record) => ({
        students: record.students ?? [],
        seatingHistory: normalizeRepositorySeatingHistory(
          record.seatingHistory ?? [],
        ),
        mixHistory: record.mixHistory ?? [],
        currentSeating: record.currentSeating ?? [],
        lockedPositions: record.lockedPositions ?? {},
        mixSettings: record.mixSettings ?? null,
        classroomScene: record.classroomScene ?? null,
        circleLayout: record.circleLayout ?? null,
        activePlanId: record.activePlanId ?? null,
      }),
      {
        logMessage: 'Failed to load active class snapshot from class storage',
        errorMessage: 'Failed to load active class snapshot',
      },
    );
  }

  async saveActiveClassSnapshot(
    snapshot: ActiveClassSnapshot,
  ): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        this.applySnapshotToRecord(record, snapshot);
      },
      {
        logMessage: 'Failed to save active class snapshot in IndexedDB',
        errorMessage: 'Failed to save active class snapshot',
      },
    );
  }

  async saveClassSnapshot(
    classId: string,
    snapshot: ActiveClassSnapshot,
  ): Promise<Result<void>> {
    return this.withClassWrite(
      classId,
      (record) => {
        this.applySnapshotToRecord(record, snapshot);
      },
      {
        logMessage: `Failed to save snapshot for class ${classId} in IndexedDB`,
        errorMessage: 'Failed to save class snapshot',
      },
    );
  }

  // ===== Student & seating operations (per class) =====
  async loadStudents(): Promise<Result<Student[]>> {
    return this.withActiveClassRead((record) => record.students, {
      logMessage: 'Failed to load students from class storage',
      errorMessage: 'Failed to load students',
      fallback: [],
    });
  }

  async saveStudents(students: Student[]): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.students = cloneValue(students);
      },
      {
        logMessage: 'Failed to save students to class storage',
        errorMessage: 'Failed to save students',
      },
    );
  }

  async loadSeatingHistory(): Promise<Result<SavedPlan[]>> {
    return this.withActiveClassRead(
      (record) =>
        normalizeRepositorySeatingHistory(record.seatingHistory ?? []),
      {
        logMessage: 'Failed to load seating history from class storage',
        errorMessage: 'Failed to load seating history',
        fallback: [],
      },
    );
  }

  async saveSeatingHistory(history: SavedPlan[]): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        const normalizedHistory = normalizeRepositorySeatingHistory(history);
        record.seatingHistory = cloneValue(normalizedHistory);
      },
      {
        logMessage: 'Failed to save seating history to class storage',
        errorMessage: 'Failed to save seating history',
      },
    );
  }

  async loadMixHistory(): Promise<Result<MixResult[]>> {
    return this.withActiveClassRead((record) => record.mixHistory, {
      logMessage: 'Failed to load mix history from class storage',
      errorMessage: 'Failed to load mix history',
      fallback: [],
    });
  }

  async saveMixHistory(history: MixResult[]): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.mixHistory = cloneValue(history);
      },
      {
        logMessage: 'Failed to save mix history to class storage',
        errorMessage: 'Failed to save mix history',
      },
    );
  }

  async loadCurrentSeating(): Promise<Result<SeatingArrangement>> {
    return this.withActiveClassRead((record) => record.currentSeating, {
      logMessage: 'Failed to load current seating from class storage',
      errorMessage: 'Failed to load current seating',
      fallback: [],
    });
  }

  async saveCurrentSeating(seating: SeatingArrangement): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.currentSeating = cloneValue(seating);
      },
      {
        logMessage: 'Failed to save current seating to class storage',
        errorMessage: 'Failed to save current seating',
      },
    );
  }

  async loadClassroomScene(): Promise<Result<ClassroomScene | null>> {
    return this.withActiveClassRead((record) => record.classroomScene, {
      logMessage: 'Failed to load classroom scene from class storage',
      errorMessage: 'Failed to load classroom scene',
      fallback: null,
    });
  }

  async saveClassroomScene(scene: ClassroomScene): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.classroomScene = cloneValue(scene);
      },
      {
        logMessage: 'Failed to save classroom scene to class storage',
        errorMessage: 'Failed to save classroom scene',
      },
    );
  }

  async loadLockedPositions(): Promise<Result<LockedPositions>> {
    return this.withActiveClassRead((record) => record.lockedPositions, {
      logMessage: 'Failed to load locked positions from class storage',
      errorMessage: 'Failed to load locked positions',
      fallback: {},
    });
  }

  async saveLockedPositions(positions: LockedPositions): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.lockedPositions = cloneValue(positions);
      },
      {
        logMessage: 'Failed to save locked positions to class storage',
        errorMessage: 'Failed to save locked positions',
      },
    );
  }

  async loadMixSettings(): Promise<Result<MixSettings | null>> {
    return this.withActiveClassRead((record) => record.mixSettings, {
      logMessage: 'Failed to load mix settings from class storage',
      errorMessage: 'Failed to load mix settings',
      fallback: null,
    });
  }

  async saveMixSettings(settings: MixSettings): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.mixSettings = cloneValue(settings);
      },
      {
        logMessage: 'Failed to save mix settings to class storage',
        errorMessage: 'Failed to save mix settings',
      },
    );
  }

  async loadCurrentCircleLayout(): Promise<Result<CircleLayout | null>> {
    return this.withActiveClassRead((record) => record.circleLayout, {
      logMessage: 'Failed to load circle layout from class storage',
      errorMessage: 'Failed to load circle layout',
      fallback: null,
    });
  }

  async saveCurrentCircleLayout(
    layout: CircleLayout | null,
  ): Promise<Result<void>> {
    return this.withActiveClassWrite(
      (record) => {
        record.circleLayout = cloneValue(layout);
      },
      {
        logMessage: 'Failed to save circle layout to class storage',
        errorMessage: 'Failed to save circle layout',
      },
    );
  }

  // ===== Circle layout exports (global) =====
  async loadCircleLayouts(): Promise<Result<CircleExportData[]>> {
    return this.withErrorHandling(
      () => idbGet<CircleExportData[]>(DB_KEYS.circleLayouts),
      {
        logMessage: 'Failed to load circle layouts from IndexedDB',
        errorMessage: 'Failed to load circle layouts',
        fallback: [],
      },
    );
  }

  async saveCircleLayouts(layouts: CircleExportData[]): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        await idbSet(DB_KEYS.circleLayouts, layouts);
        return undefined;
      },
      {
        logMessage: 'Failed to save circle layouts to IndexedDB',
        errorMessage: 'Failed to save circle layouts',
      },
    );
  }

  // ===== Template operations (global) =====
  async loadTemplates(): Promise<Result<ClassroomTemplate[]>> {
    return this.withErrorHandling(
      () => idbGet<ClassroomTemplate[]>(DB_KEYS.classroomTemplates),
      {
        logMessage: 'Failed to load classroom templates from IndexedDB',
        errorMessage: 'Failed to load classroom templates',
        fallback: [],
      },
    );
  }

  async saveTemplate(
    template: ClassroomTemplate,
  ): Promise<Result<ClassroomTemplate>> {
    return this.withErrorHandling(
      async () => {
        const existing =
          (await idbGet<ClassroomTemplate[]>(DB_KEYS.classroomTemplates)) || [];
        const updated = [...existing, template];
        await idbSet(DB_KEYS.classroomTemplates, updated);
        return template;
      },
      {
        logMessage: 'Failed to save classroom template to IndexedDB',
        errorMessage: 'Failed to save classroom template',
      },
    );
  }

  async saveTemplates(templates: ClassroomTemplate[]): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        await idbSet(DB_KEYS.classroomTemplates, templates);
        return undefined;
      },
      {
        logMessage: 'Failed to save classroom templates to IndexedDB',
        errorMessage: 'Failed to save classroom templates',
      },
    );
  }

  async updateTemplate(
    id: number,
    scene: ClassroomScene,
  ): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const templates =
          (await idbGet<ClassroomTemplate[]>(DB_KEYS.classroomTemplates)) || [];
        const next = templates.map((entry) =>
          entry.id === id ? { ...entry, scene } : entry,
        );
        await idbSet(DB_KEYS.classroomTemplates, next);
        return undefined;
      },
      {
        logMessage: 'Failed to update classroom template in IndexedDB',
        errorMessage: 'Failed to update classroom template',
      },
    );
  }

  async deleteTemplate(id: number): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const templates =
          (await idbGet<ClassroomTemplate[]>(DB_KEYS.classroomTemplates)) || [];
        const filtered = templates.filter((entry) => entry.id !== id);
        await idbSet(DB_KEYS.classroomTemplates, filtered);
        return undefined;
      },
      {
        logMessage: 'Failed to delete classroom template in IndexedDB',
        errorMessage: 'Failed to delete classroom template',
      },
    );
  }

  async renameTemplate(id: number, newName: string): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const templates =
          (await idbGet<ClassroomTemplate[]>(DB_KEYS.classroomTemplates)) || [];
        const updated = templates.map((entry) =>
          entry.id === id ? { ...entry, name: newName } : entry,
        );
        await idbSet(DB_KEYS.classroomTemplates, updated);
        return undefined;
      },
      {
        logMessage: 'Failed to rename classroom template in IndexedDB',
        errorMessage: 'Failed to rename classroom template',
      },
    );
  }

  // ===== Bulk operations =====
  async clearAll(): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        await Promise.all(Object.values(DB_KEYS).map((key) => idbDel(key)));
        this.classCollectionCache = null;
        return undefined;
      },
      {
        logMessage: 'Failed to clear IndexedDB data',
        errorMessage: 'Failed to clear stored data',
      },
    );
  }
}
