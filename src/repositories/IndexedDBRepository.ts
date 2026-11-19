// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  readValue as idbGet,
  writeValue as idbSet,
  updateValue as idbUpdate,
  deleteValue as idbDel,
} from './idbClient';
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
  ClassEditOutcome,
  ISeatingPlanRepository,
  RetiredClasses,
} from './ISeatingPlanRepository';
import type { Result } from './types';
import { ResultHelpers, RepositoryErrorType } from './types';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError, deepClone } from '@/utils';
import i18n from '@/i18n';
import {
  dehydrateClassRecord,
  dehydrateCollection,
  hydrateClassRecord,
  hydrateCollection,
} from '@/utils/data/storedSeating';
import {
  CLASS_COLLECTION_VERSION,
  createClassCollection,
  createClassRecord,
  ensureActiveClass,
  summarizeClass,
} from '@/utils/data/classCollection';
import {
  applyClassEdit,
  classPartsOf,
  ensureClassRooms,
  ensureCollectionRooms,
  type ClassEdit,
} from '@/utils/data/classRooms';
import { normalizeSeatingHistory } from '@/utils/data/planNormalization';
import { noteNewerStoredData } from './newerStoredData';
import {
  CLASS_STORAGE_VERSION,
  changeStored,
  classRecordKey,
  emptyClassIndex,
  isNewerStorage,
  listClassRecordKeys,
  readClassIndex,
  readRetiredCollection,
  readStoredClass,
  removeClassesNotIn,
  retireCollection,
  retiredCollectionExpiry,
  storedClassOf,
  UNCHANGED,
  writeStoredCollection,
  type RetiredCollection,
  type StoredClass,
  type StoredClassIndex,
} from './classStorage';
import { dropMissingPartners } from '@/utils/student/partnerUtils';

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

/** The stored collection as every operation works on it: repaired. */
function repairCollection(stored: ClassCollectionState): ClassCollectionState {
  return ensureCollectionRooms(ensureActiveClass(stored));
}

/**
 * A change that has nothing to write — a class that is not there, a name
 * that is taken. Thrown inside the transaction, so nothing is written, and
 * `answer` is what the operation returns instead.
 */
class NothingToWrite {
  constructor(readonly answer: unknown) {}
}

/**
 * IndexedDB implementation of the seating plan repository
 * Uses idb-keyval for simplified IndexedDB access
 *
 * Every class lies under a key of its own, and an index names them
 * (`classStorage`, decision 0049): saving the open class reads and writes
 * that class alone. Every tab has its own instance. They share what is
 * stored, so a class is read anew for every operation and changed in one
 * transaction (`changeClass`): a copy kept here went stale with the next
 * write of another tab, and written back it put that tab's classes back to
 * what they had been.
 */
export class IndexedDBRepository implements ISeatingPlanRepository {
  /**
   * The class open in this tab; undefined until the first read takes the
   * stored one. The stored `activeClassId` only names the class to open next
   * time, and another tab writes it whenever it opens a class: this tab
   * reloads and writes its own until it opens another one itself.
   */
  private openClassId: string | null | undefined;
  /**
   * The open class's `updatedAt` as this tab last knew all of it: read in
   * full, or written by this tab with nothing written elsewhere in between.
   * Undefined while not known — nothing read yet, another class opening.
   */
  private openClassStamp: string | undefined;
  /** Whether what is stored was brought into version 4 yet (this tab). */
  private storageReady = false;
  /**
   * Whether a newer version wrote the classes: read as well as this build
   * can, and never written back — repaired in this build's understanding,
   * they would lose what the newer one keeps.
   */
  private newerStorage = false;
  private _lock: Promise<void> = Promise.resolve();

  /**
   * Runs `action` after every operation that was asked for before it. The
   * chain is extended before anything awaits: when the lock was set only after
   * an `await`, two calls in the same tick both waited for the same finished
   * lock and ran side by side — at start-up, the collection and the open class
   * were each repaired on their own and handed out different room ids.
   */
  private synchronized<T>(action: () => Promise<T>): Promise<T> {
    const run = this._lock.then(action);
    this._lock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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
      const result = await this.synchronized(() => this.attempt(operation));

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

  /** Runs `operation`; a refusal it throws becomes its answer. */
  private async attempt<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof NothingToWrite) {
        return error.answer as T;
      }
      throw error;
    }
  }

  /** Ends a change with a refusal: nothing is written. */
  private refuse(type: RepositoryErrorType, message: string): never {
    throw new NothingToWrite(ResultHelpers.failure({ type, message }));
  }

  /** Notes data of a newer version; from then on this tab writes nothing. */
  private noteNewer(): void {
    this.newerStorage = true;
    noteNewerStoredData();
  }

  private refuseNewer(): never {
    this.refuse(
      RepositoryErrorType.NEWER_DATA,
      'Stored classes were written by a newer version',
    );
  }

  /**
   * Brings what is stored into version 4, once per tab (decision 0049): the
   * collection of version 3 or before — or the keys from before there were
   * classes — becomes a key per class and the index, and the old value stays
   * as the copy of 30 days. A class or an index another tab wrote first stays.
   * Data from before rooms existed gets them on the way, so the ids it got
   * stay (decision 0024).
   */
  private async ensureStorage(): Promise<void> {
    if (this.storageReady) return;
    const index = await readClassIndex();
    if (index) {
      this.storageReady = true;
      if (isNewerStorage(index)) {
        this.noteNewer();
        return;
      }
      await removeClassesNotIn(index);
      return;
    }

    const stored = await idbGet<ClassCollectionState | RetiredCollection>(
      DB_KEYS.classCollection,
    );
    const isCollection = !!stored && Array.isArray(stored.classes);
    if (isCollection && !('retiredAt' in stored) && isNewerStorage(stored)) {
      // A newer version's collection where this build expects its index:
      // nothing here understands it well enough to write.
      this.storageReady = true;
      this.noteNewer();
      return;
    }
    const collection = isCollection
      ? repairCollection(stored)
      : await this.collectionFromLegacyKeys();
    const written = await writeStoredCollection(
      dehydrateCollection(collection),
      { keepExisting: true },
    );
    if (isNewerStorage(written)) this.noteNewer();
    if (isCollection) await retireCollection();
    this.storageReady = true;
  }

  /** The class of the keys from before there was a class collection. */
  private async collectionFromLegacyKeys(): Promise<ClassCollectionState> {
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

    if (!hasLegacyData) {
      return createClassCollection();
    }
    return createClassCollection(
      createClassRecord({
        name: i18n.t('generator:common.defaultClassName'),
        students: students ?? [],
        seatingHistory: seatingHistory ?? [],
        mixHistory: mixHistory ?? [],
        currentSeating: currentSeating ?? [],
        lockedPositions: lockedPositions ?? {},
        mixSettings: mixSettings ?? null,
        classroomScene: classroomScene ?? null,
        circleLayout: circleLayout ?? null,
      }),
    );
  }

  /** The index, read anew. */
  private async loadIndex(): Promise<StoredClassIndex> {
    await this.ensureStorage();
    const index = await readClassIndex();
    if (isNewerStorage(index)) this.noteNewer();
    return index && Array.isArray(index.order) ? index : emptyClassIndex();
  }

  /**
   * One class as the app works with it: repaired, its students on the
   * seats; null when it is not there. A repair is written back, so the room
   * ids it handed out stay (decision 0024).
   */
  private async loadClass(classId: string): Promise<ClassRecord | null> {
    const stored = await readStoredClass(classId);
    if (!stored?.record) return null;
    if (isNewerStorage(stored)) {
      this.noteNewer();
      return hydrateClassRecord(ensureClassRooms(stored.record));
    }
    const repaired = ensureClassRooms(stored.record);
    if (repaired === stored.record || this.newerStorage) {
      return hydrateClassRecord(repaired);
    }
    let written = repaired;
    await changeStored<StoredClass>(classRecordKey(classId), (current) => {
      if (!current?.record || isNewerStorage(current)) return UNCHANGED;
      written = ensureClassRooms(current.record);
      return storedClassOf(written);
    });
    return hydrateClassRecord(written);
  }

  /** Every class the index names, in its order — read anew every time. */
  private async loadClassCollectionState(): Promise<ClassCollectionState> {
    const index = await this.loadIndex();
    const classes = await Promise.all(
      index.order.map((classId) => this.loadClass(classId)),
    );
    return ensureActiveClass({
      version: CLASS_COLLECTION_VERSION,
      activeClassId: index.activeClassId,
      classes: classes.filter((entry): entry is ClassRecord => !!entry),
    });
  }

  /**
   * The class open in this tab: its own choice while that class exists,
   * otherwise the one stored to open next — on the first read, or once the
   * open class was deleted in another tab.
   */
  private resolveOpenClassId(index: StoredClassIndex): string | null {
    const open = this.openClassId;
    const stillThere =
      open === null
        ? index.order.length === 0
        : open !== undefined && index.order.includes(open);
    if (!stillThere) {
      const stored = index.activeClassId;
      this.openClassId =
        stored !== null && index.order.includes(stored)
          ? stored
          : (index.order[0] ?? null);
    }
    return this.openClassId ?? null;
  }

  /**
   * Change one class in one transaction: read it, let `change` work on it,
   * write it back. Another tab's write lands before or after, never in
   * between, and the change applies to what is stored rather than to a copy
   * read earlier. `change` throws `NothingToWrite` to write nothing, and
   * hands `replace` a record to store in place of the one it was given.
   */
  private async changeClass<T>(
    classId: string,
    change: (record: ClassRecord, replace: (next: ClassRecord) => void) => T,
  ): Promise<T | Result<T>> {
    await this.ensureStorage();
    let outcome: T | undefined;
    let openClassStamp = this.openClassStamp;
    try {
      if (this.newerStorage) this.refuseNewer();
      await idbUpdate<StoredClass>(classRecordKey(classId), (stored) => {
        if (!stored?.record) {
          this.refuse(RepositoryErrorType.NOT_FOUND, 'Class not found');
        }
        if (isNewerStorage(stored)) {
          this.noteNewer();
          this.refuseNewer();
        }
        let record = hydrateClassRecord(ensureClassRooms(stored.record));
        const isOpen = classId === this.openClassId;
        // Only a write onto the open class as this tab knows it keeps the
        // tab in step; one onto another window's changes leaves it behind.
        const inStep =
          isOpen &&
          this.openClassStamp !== undefined &&
          record.updatedAt === this.openClassStamp;
        outcome = change(record, (next) => {
          record = next;
        });
        if (isOpen) {
          openClassStamp = inStep ? record.updatedAt : this.openClassStamp;
        }
        return storedClassOf(dehydrateClassRecord(record));
      });
    } catch (error) {
      if (error instanceof NothingToWrite) {
        return error.answer as Result<T>;
      }
      throw error;
    }
    this.openClassStamp = openClassStamp;
    return outcome as T;
  }

  /** Change the index in one transaction. */
  private async changeIndex(
    change: (index: StoredClassIndex) => void,
  ): Promise<StoredClassIndex> {
    await this.ensureStorage();
    if (this.newerStorage) this.refuseNewer();
    let written = emptyClassIndex();
    await idbUpdate<StoredClassIndex>(DB_KEYS.classIndex, (current) => {
      if (isNewerStorage(current)) {
        this.noteNewer();
        this.refuseNewer();
      }
      const index: StoredClassIndex = {
        version: CLASS_STORAGE_VERSION,
        activeClassId: current?.activeClassId ?? null,
        order: [...(current?.order ?? [])],
      };
      change(index);
      written = index;
      return index;
    });
    return written;
  }

  /** Writes a class nobody else knows yet: one that was just created. */
  private async addClass(record: ClassRecord): Promise<void> {
    await idbSet(
      classRecordKey(record.id),
      storedClassOf(dehydrateClassRecord(record)),
    );
  }

  private touchClass(record: ClassRecord, options?: { lastUsed?: boolean }) {
    const timestamp = new Date().toISOString();
    record.updatedAt = timestamp;
    if (options?.lastUsed) {
      record.lastUsedAt = timestamp;
    }
  }

  /** The open class's id, from the index when this tab knows none yet. */
  private async openClassIdForWrite(): Promise<string | null> {
    if (this.openClassId !== undefined) return this.openClassId;
    return this.resolveOpenClassId(await this.loadIndex());
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
      const index = await this.loadIndex();
      const openClassId = this.resolveOpenClassId(index);
      const record = openClassId ? await this.loadClass(openClassId) : null;
      if (!record) {
        if (hasOwn.call(options, 'fallback')) {
          return cloneValue(options.fallback as T);
        }
        return ResultHelpers.failure({
          type: RepositoryErrorType.NO_ACTIVE_CLASS,
          message: 'No active class selected',
        });
      }
      return cloneValue(selector(record));
    }, options);
  }

  /**
   * Writes onto the open class. Gone — deleted in another tab — it takes
   * nothing: the tab's state belongs to that class, not to the one the tab
   * moves on to with its next read.
   */
  private withActiveClassWrite<T>(
    mutator: (record: ClassRecord) => T,
    options: {
      logMessage: string;
      errorMessage: string;
      fallback?: T;
    },
  ): Promise<Result<T>> {
    return this.withErrorHandling(async () => {
      const openClassId = await this.openClassIdForWrite();
      if (!openClassId) {
        this.refuse(
          RepositoryErrorType.NO_ACTIVE_CLASS,
          'No active class selected',
        );
      }
      const outcome = await this.changeClass(openClassId, (record) => {
        const result = mutator(record);
        this.touchClass(record);
        return result;
      });
      if (
        isRepositoryResult(outcome) &&
        !outcome.success &&
        outcome.error.type === RepositoryErrorType.NOT_FOUND
      ) {
        this.openClassId = undefined;
        this.openClassStamp = undefined;
        this.refuse(
          RepositoryErrorType.NO_ACTIVE_CLASS,
          'No active class selected',
        );
      }
      return outcome;
    }, options);
  }

  private withClassWrite<T>(
    classId: string,
    mutator: (record: ClassRecord) => T,
    options: {
      logMessage: string;
      errorMessage: string;
      fallback?: T;
    },
  ): Promise<Result<T>> {
    return this.withErrorHandling(
      () =>
        this.changeClass(classId, (record) => {
          const result = mutator(record);
          this.touchClass(record);
          return result;
        }),
      options,
    );
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
    // Written as the live state has them, never repaired here: the live state
    // is kept consistent by its own actions, and a repair on a partial write
    // would work against it.
    if (hasOwn.call(snapshot, 'rooms')) {
      record.rooms = cloneValue(snapshot.rooms ?? []);
    }
    if (hasOwn.call(snapshot, 'activeRoomId')) {
      record.activeRoomId = cloneValue(snapshot.activeRoomId ?? null);
    }
  }

  // ===== Class collection operations =====
  async loadClassCollection(): Promise<Result<ClassCollectionState>> {
    return this.withErrorHandling(
      async () => {
        const index = await this.loadIndex();
        const collection = await this.loadClassCollectionState();
        // The class this tab has open, whichever another tab opened since.
        return cloneValue({
          ...collection,
          activeClassId: this.resolveOpenClassId(index),
        });
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

  /**
   * Refuses a name another class has (case-insensitive). Read before the
   * write rather than in its transaction: two tabs naming two classes alike
   * in the same instant could both pass.
   */
  private async refuseTakenName(
    name: string,
    exceptClassId?: string,
  ): Promise<void> {
    const wanted = name.trim().toLowerCase();
    const { classes } = await this.loadClassCollectionState();
    const duplicate = classes.find(
      (entry) =>
        entry.id !== exceptClassId &&
        entry.name.trim().toLowerCase() === wanted,
    );
    if (duplicate) {
      this.refuse(
        RepositoryErrorType.DUPLICATE_KEY,
        'A class with this name already exists',
      );
    }
  }

  async createClass(
    payload: CreateClassPayload,
    options?: { activate?: boolean },
  ): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        await this.ensureStorage();
        if (this.newerStorage) this.refuseNewer();
        await this.refuseTakenName(payload.name);

        const record = createClassRecord({
          ...payload,
          students: payload.students ? cloneValue(payload.students) : [],
          classroomScene: payload.classroomScene
            ? cloneValue(payload.classroomScene)
            : null,
        });
        if (options?.activate) {
          this.touchClass(record, { lastUsed: true });
        }
        // The class first, then the index that makes it one of the classes.
        await this.addClass(record);
        await this.changeIndex((index) => {
          index.order.push(record.id);
          if (options?.activate) index.activeClassId = record.id;
        });
        if (options?.activate) {
          this.openClassId = record.id;
          this.openClassStamp = undefined;
        }
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
        if (patch.name) await this.refuseTakenName(patch.name, classId);
        return this.changeClass(classId, (record) => {
          if (patch.name) {
            record.name = patch.name.trim() || record.name;
          }
          if (patch.label !== undefined) {
            record.label = patch.label;
          }
          if (patch.notes !== undefined) {
            record.notes = patch.notes;
          }
          if (patch.markersReviewedAt !== undefined) {
            record.markersReviewedAt = patch.markersReviewedAt;
          }
          this.touchClass(record);
          return cloneValue(record);
        });
      },
      {
        logMessage: 'Failed to update class metadata in IndexedDB',
        errorMessage: 'Failed to update class metadata',
      },
    );
  }

  async setActiveClass(classId: string): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        // Stored as the class to open next time, whichever tab asks.
        await this.changeIndex((index) => {
          if (!index.order.includes(classId)) {
            this.refuse(RepositoryErrorType.NOT_FOUND, 'Class not found');
          }
          index.activeClassId = classId;
        });
        const opened = await this.changeClass(classId, (record) => {
          this.touchClass(record, { lastUsed: true });
          return cloneValue(record);
        });
        if (!isRepositoryResult(opened)) {
          this.openClassId = classId;
          this.openClassStamp = undefined;
        }
        return opened;
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
        let fallbackId: string | null = null;
        let wasActive = false;
        // Out of the index first: a class it no longer names is gone, and
        // its key goes right after.
        await this.changeIndex((index) => {
          const at = index.order.indexOf(classId);
          if (at === -1) {
            this.refuse(RepositoryErrorType.NOT_FOUND, 'Class not found');
          }
          index.order.splice(at, 1);
          fallbackId = index.order[0] ?? null;
          if (index.activeClassId === classId) {
            index.activeClassId = fallbackId;
            wasActive = true;
          }
        });
        await idbDel(classRecordKey(classId));
        if (wasActive && fallbackId) {
          await this.changeClass(fallbackId, (record) => {
            this.touchClass(record, { lastUsed: true });
          });
        }
        // The tab whose open class went moves on as the stored one did.
        if (this.openClassId === classId) {
          this.openClassId = fallbackId;
          this.openClassStamp = undefined;
        }
        return undefined;
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
        // Replaces what is stored. What was there before version 4 becomes
        // its copy first, as at any other switch.
        await this.ensureStorage();
        if (this.newerStorage) this.refuseNewer();
        const ensured = repairCollection(collection);
        await writeStoredCollection(dehydrateCollection(ensured), {
          guardIndex: (current) => {
            if (isNewerStorage(current)) {
              this.noteNewer();
              this.refuseNewer();
            }
          },
        });
        this.openClassId = ensured.activeClassId;
        this.openClassStamp = undefined;
        return undefined;
      },
      {
        logMessage: 'Failed to save class collection to IndexedDB',
        errorMessage: 'Failed to save class collection',
      },
    );
  }

  async loadRetiredClasses(): Promise<Result<RetiredClasses | null>> {
    return this.withErrorHandling(
      async () => {
        await this.ensureStorage();
        const retired = await readRetiredCollection();
        if (!retired) return null;
        const { retiredAt, retiredFromVersion, ...stored } = retired;
        return {
          collection: cloneValue(
            hydrateCollection(
              repairCollection({
                ...stored,
                version: Math.min(retiredFromVersion, CLASS_COLLECTION_VERSION),
              }),
            ),
          ),
          retiredAt,
          keptUntil: retiredCollectionExpiry(retired).toISOString(),
        };
      },
      {
        logMessage: 'Failed to read the classes from before the update',
        errorMessage: 'Failed to read the classes from before the update',
        fallback: null,
      },
    );
  }

  async markOpenClassOpened(): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const openClassId = await this.openClassIdForWrite();
        if (!openClassId) {
          this.refuse(RepositoryErrorType.NOT_FOUND, 'No class open');
        }
        return this.changeClass(openClassId, (record) => {
          // `lastUsedAt` alone: `updatedAt` is what other windows tell a
          // change of the class by, and opening it changes nothing in it.
          record.lastUsedAt = new Date().toISOString();
        });
      },
      {
        logMessage: 'Failed to mark the open class as opened in IndexedDB',
        errorMessage: 'Failed to mark the open class as opened',
      },
    );
  }

  async loadActiveClassSnapshot(): Promise<Result<ActiveClassSnapshot>> {
    return this.withActiveClassRead(
      (stored) => {
        // What the tab shows from now on, and what another window's changes
        // are told from (`isOpenClassChangedElsewhere`).
        this.openClassStamp = stored.updatedAt;
        // Repaired on the way out as well, not written: whatever the record
        // holds, the live state starts consistent — links to students removed
        // before removals took them along included.
        const record = ensureClassRooms(stored);
        return {
          students: dropMissingPartners(record.students ?? []),
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
          rooms: record.rooms ?? [],
          activeRoomId: record.activeRoomId ?? null,
        };
      },
      {
        logMessage: 'Failed to load active class snapshot from class storage',
        errorMessage: 'Failed to load active class snapshot',
      },
    );
  }

  async isOpenClassChangedElsewhere(): Promise<Result<boolean>> {
    return this.withErrorHandling(
      async () => {
        if (this.openClassStamp === undefined) {
          return false;
        }
        const openClassId = this.resolveOpenClassId(await this.loadIndex());
        const stored = openClassId
          ? await readStoredClass(openClassId)
          : undefined;
        // A class deleted elsewhere counts too: the tab moves on to another.
        return stored?.record?.updatedAt !== this.openClassStamp;
      },
      {
        logMessage: 'Failed to check the open class for changes in IndexedDB',
        errorMessage: 'Failed to check the open class',
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

  async loadClassRecord(classId: string): Promise<Result<ClassRecord>> {
    return this.withErrorHandling(
      async () => {
        const index = await this.loadIndex();
        const record = index.order.includes(classId)
          ? await this.loadClass(classId)
          : null;
        if (!record) {
          return ResultHelpers.failure({
            type: RepositoryErrorType.NOT_FOUND,
            message: 'Class not found',
          });
        }
        return cloneValue(record);
      },
      {
        logMessage: `Failed to load class ${classId} from IndexedDB`,
        errorMessage: 'Failed to load class',
      },
    );
  }

  async editInactiveClass(
    classId: string,
    edit: ClassEdit,
  ): Promise<Result<ClassEditOutcome>> {
    return this.withErrorHandling(
      async () => {
        const index = await this.loadIndex();
        // The open class lives in the live state, which this record lags
        // behind while edits wait in the persist queue; a change here would
        // be overwritten by the next of them.
        if (this.resolveOpenClassId(index) === classId) {
          this.refuse(RepositoryErrorType.VALIDATION_ERROR, 'class-is-open');
        }
        if (!index.order.includes(classId)) {
          this.refuse(RepositoryErrorType.NOT_FOUND, 'Class not found');
        }
        return this.changeClass(classId, (current, replace) => {
          const before = cloneValue(classPartsOf(current));
          const applied = applyClassEdit(current, edit);
          if ('problem' in applied) {
            throw new NothingToWrite({
              ok: false,
              reason: applied.problem,
            } as ClassEditOutcome);
          }
          const next = cloneValue(applied.record);
          this.touchClass(next);
          replace(next);
          return {
            ok: true,
            before,
            after: cloneValue(classPartsOf(next)),
          } as ClassEditOutcome;
        });
      },
      {
        logMessage: `Failed to change class ${classId} in IndexedDB`,
        errorMessage: 'Failed to change class',
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

  async restoreTemplate(
    id: number,
    template: ClassroomTemplate | null,
    index: number,
  ): Promise<Result<void>> {
    return this.withErrorHandling(
      async () => {
        const templates =
          (await idbGet<ClassroomTemplate[]>(DB_KEYS.classroomTemplates)) || [];
        const standing = templates.findIndex((entry) => entry.id === id);
        const others = templates.filter((entry) => entry.id !== id);
        const at = standing === -1 ? index : standing;
        await idbSet(
          DB_KEYS.classroomTemplates,
          template
            ? [...others.slice(0, at), template, ...others.slice(at)]
            : others,
        );
        return undefined;
      },
      {
        logMessage: 'Failed to restore classroom template in IndexedDB',
        errorMessage: 'Failed to restore classroom template',
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
        await Promise.all(
          [...Object.values(DB_KEYS), ...(await listClassRecordKeys())].map(
            (key) => idbDel(key),
          ),
        );
        this.openClassId = undefined;
        this.openClassStamp = undefined;
        this.storageReady = false;
        this.newerStorage = false;
        return undefined;
      },
      {
        logMessage: 'Failed to clear IndexedDB data',
        errorMessage: 'Failed to clear stored data',
      },
    );
  }
}
