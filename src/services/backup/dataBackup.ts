// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  writeValue as idbSet,
  deleteValues as idbDeleteAll,
} from '@/repositories/idbClient';
import type {
  Student,
  SavedPlan,
  ClassroomScene,
  MixSettings,
  LockedPositions,
  ClassroomTemplate,
  ExportBundle,
  SeatingArrangement,
  MixResult,
  ClassCollectionState,
} from '@/types';
import type { CircleLayout, CircleExportData } from '@/types/Circle';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import {
  logError,
  MAX_STUDENTS,
  neutralSettings,
  normalizeMixSettings,
} from '@/utils';
import { clearProjectLocalStorage } from '@/utils/data/storage';
import {
  BackupValidationError,
  BACKUP_ERROR_MESSAGES,
  CURRENT_EXPORT_VERSION,
  parseExportBundle,
} from '@/utils/validation/backupValidation';
import {
  resetApplicationState,
  type ApplicationStateResetHandlers,
} from '@/stores/resetApplicationState';
import {
  createClassCollection,
  createClassRecord,
  mergeClassCollections,
} from '@/utils/data/classCollection';
import {
  getAllPlanUsage,
  getAllPlanUsageResets,
  restorePlanUsage,
} from '@/repositories/planUsageStore';
import { normalizeSeatingHistory } from '@/utils/data/planNormalization';
import {
  getAllPhotos,
  setStudentPhoto,
  clearAllPhotos,
} from '@/repositories/studentPhotoStore';
import {
  clearPhotoCache,
  invalidatePhoto,
} from '@/hooks/student/studentPhotoCache';
import { clearPhotoTrash } from '@/hooks/student/studentPhotoTrash';
import {
  blobToDataUrl,
  dataUrlToBlob,
} from '@/utils/image/processStudentPhoto';

const FALLBACK_CLASS_NAME = 'Importierte Klasse';
const BACKUP_LOG_SOURCE = 'dataBackup';
const BACKUP_LOG_MESSAGE = 'Normalized seating plan IDs during import/export';

const hasOwn = Object.prototype.hasOwnProperty;
const normalizeBackupSeatingHistory = (plans: SavedPlan[]): SavedPlan[] =>
  normalizeSeatingHistory(plans, {
    logSource: BACKUP_LOG_SOURCE,
    logMessage: BACKUP_LOG_MESSAGE,
  });

/**
 * The templates a merge keeps: all that are here, and those of the backup
 * neither the id nor the name of which is taken — template names are unique.
 */
function mergeTemplates(
  existing: ClassroomTemplate[],
  incoming: ClassroomTemplate[],
): ClassroomTemplate[] {
  const ids = new Set(existing.map((template) => template.id));
  const names = new Set(existing.map((template) => template.name));
  const added = incoming.filter((template) => {
    if (ids.has(template.id) || names.has(template.name)) return false;
    ids.add(template.id);
    names.add(template.name);
    return true;
  });
  return added.length > 0 ? [...existing, ...added] : existing;
}

function createLegacyClassCollection(
  data: ExportBundle,
  normalizedMixSettings: MixSettings,
): ClassCollectionState {
  const record = createClassRecord({
    name: FALLBACK_CLASS_NAME,
    students: data.students,
    seatingHistory: data.seatingHistory,
    mixHistory: data.mixHistory,
    currentSeating: [],
    lockedPositions: data.lockedPositions,
    mixSettings: normalizedMixSettings,
    classroomScene: data.classroomScene,
    circleLayout: data.currentCircleLayout ?? null,
  });
  return createClassCollection(record);
}

/**
 * Read every stored student photo and convert to base64 Data URLs for embedding
 * in a backup (export version 2). Returns undefined when there are no photos so
 * v1-style backups stay free of the field. Failures are logged and treated as
 * "no photos" rather than failing the whole export.
 */
async function collectStudentPhotosForExport(): Promise<
  Record<string, string> | undefined
> {
  try {
    const stored = await getAllPhotos();
    if (!stored.success) {
      logError(
        'Failed to collect student photos for export',
        { error: stored.error },
        'dataBackup',
      );
      return undefined;
    }
    if (stored.data.size === 0) {
      return undefined;
    }
    const entries = await Promise.all(
      [...stored.data].map(
        async ([id, blob]) => [id, await blobToDataUrl(blob)] as const,
      ),
    );
    return Object.fromEntries(entries);
  } catch (error) {
    logError(
      'Failed to collect student photos for export',
      { error },
      'dataBackup',
    );
    return undefined;
  }
}

/**
 * Restore embedded student photos from a backup into the photo store.
 *
 * @param allowedIds When provided (merge import), only photos for these student
 *   ids are restored; otherwise every embedded photo is restored.
 */
async function restoreStudentPhotos(
  studentPhotos: Record<string, string> | undefined,
  allowedIds?: Set<string>,
): Promise<void> {
  if (!studentPhotos) return;
  const entries = Object.entries(studentPhotos).filter(
    ([id]) => !allowedIds || allowedIds.has(id),
  );
  await Promise.all(
    entries.map(async ([id, dataUrl]) => {
      try {
        await setStudentPhoto(id, dataUrlToBlob(dataUrl));
        invalidatePhoto(id);
      } catch (error) {
        logError(
          'Failed to restore student photo',
          { error, id },
          'dataBackup',
        );
      }
    }),
  );
}

/**
 * Export all stored data to a JSON string.
 */
export async function exportAllAsJson(
  data: {
    students: Student[];
    seatingHistory: SavedPlan[];
    mixHistory: MixResult[];
    classroomScene: ClassroomScene;
    mixSettings: MixSettings;
    lockedPositions: LockedPositions;
    circleLayouts?: CircleExportData[];
    currentCircleLayout?: CircleLayout | null;
    classCollection?: ClassCollectionState | null;
  },
  loadTemplate: () => Promise<ClassroomTemplate[]>,
): Promise<string> {
  try {
    const normalizedSeatingHistory = normalizeBackupSeatingHistory(
      data.seatingHistory,
    );
    const studentPhotos = await collectStudentPhotosForExport();
    // Records of which plans were really in use. They accumulate over a school
    // year and cannot be rebuilt from anything else, so a backup that skipped
    // them would silently lose the history on a device change.
    const planUsage = await getAllPlanUsage();
    // A reset says what no longer counts; without it a restored device would
    // count the saved plans and mixes from before it again.
    const planUsageResetAt = await getAllPlanUsageResets();
    const bundle: ExportBundle = {
      version: CURRENT_EXPORT_VERSION,
      students: data.students,
      seatingHistory: normalizedSeatingHistory,
      mixHistory: data.mixHistory,
      classroomScene: data.classroomScene,
      mixSettings: normalizeMixSettings(data.mixSettings, neutralSettings),
      lockedPositions: data.lockedPositions,
      classroomTemplates: await loadTemplate(),
      circleLayouts: data.circleLayouts || [],
      currentCircleLayout: data.currentCircleLayout || null,
      classCollection: data.classCollection ?? null,
      ...(studentPhotos ? { studentPhotos } : {}),
      ...(planUsage ? { planUsage } : {}),
      ...(planUsageResetAt ? { planUsageResetAt } : {}),
    };
    return JSON.stringify(bundle, null, 2);
  } catch (e) {
    logError('Export failed', { error: e }, 'dataBackup');
    throw e;
  }
}

/** What an import did, for the message after it. */
export type BackupImportOutcome =
  | { merge: false }
  | { merge: true; addedClasses: number; addedTemplates: number };

/**
 * Import all data from a JSON string.
 *
 * Replacing puts the backup in place of everything stored. Merging adds the
 * backup's classes to the ones here, and its templates where the name is
 * free, and leaves every class that is here as it is — the open one too, so
 * it touches no live state: the stored collection is merged, saved and read
 * back (`setClassCollection`).
 */
export async function importAllFromJson(
  json: string,
  setters: {
    setStudents: (value: Student[] | ((prev: Student[]) => Student[])) => void;
    setSeatingHistory: (
      value: SavedPlan[] | ((prev: SavedPlan[]) => SavedPlan[]),
    ) => void;
    setMixHistory: (
      value: MixResult[] | ((prev: MixResult[]) => MixResult[]),
    ) => void;
    setLockedPositions: (
      value: LockedPositions | ((prev: LockedPositions) => LockedPositions),
    ) => void;
    setMixSettings: (value: MixSettings) => void;
    setClassroomScene: (value: ClassroomScene) => void;
    setCircleLayout?: (value: CircleLayout | null) => void;
    setCurrentSeating?: (value: SeatingArrangement) => void;
    setPlanName?: (value: string) => void;
    setActivePlanId?: (value: string | null) => void;
    setClassCollection?: (value: ClassCollectionState) => void | Promise<void>;
    setCircleLayouts?: (value: CircleExportData[]) => void | Promise<void>;
    setTemplates?: (value: ClassroomTemplate[]) => void | Promise<void>;
    /**
     * The stored collection with every pending edit written, for a merge;
     * `null` when it cannot be read.
     */
    loadClassCollection?: () => Promise<ClassCollectionState | null>;
    /** The stored templates, for a merge; `null` when they cannot be read. */
    loadTemplates?: () => Promise<ClassroomTemplate[] | null>;
  },
  opts?: { merge?: boolean },
): Promise<BackupImportOutcome> {
  const merge = opts?.merge ?? false;
  let data: ExportBundle;
  try {
    data = parseExportBundle(json);
  } catch (error) {
    logError('Import failed: validation error', { error }, 'dataBackup');
    if (error instanceof BackupValidationError) {
      throw error;
    }
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }

  try {
    const seatingHistory = normalizeBackupSeatingHistory(data.seatingHistory);
    const importedStudentCount = data.students.length;
    if (importedStudentCount > MAX_STUDENTS) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyStudents);
    }
    if (data.classroomScene.totalStudents > MAX_STUDENTS) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyStudents);
    }

    const normalizedMixSettings = normalizeMixSettings(
      data.mixSettings,
      neutralSettings,
    );
    const shouldCreateLegacyClassCollection =
      !hasOwn.call(data, 'classCollection') || data.classCollection === null;
    const legacyClassCollection = shouldCreateLegacyClassCollection
      ? createLegacyClassCollection(
          { ...data, seatingHistory },
          normalizedMixSettings,
        )
      : null;
    // Type assertion safe: parseExportBundle validates structure, legacy
    // collection is correctly typed
    const incomingCollection = (data.classCollection ??
      legacyClassCollection) as ClassCollectionState | null;

    if (merge) {
      return await mergeIntoStored(data, incomingCollection, setters);
    }

    setters.setStudents(data.students);
    setters.setSeatingHistory(seatingHistory);
    setters.setMixHistory(data.mixHistory);
    setters.setLockedPositions(data.lockedPositions);
    setters.setMixSettings(normalizedMixSettings);
    setters.setClassroomScene(data.classroomScene);

    // Import circle layout if available and setter provided
    if (setters.setCircleLayout && data.currentCircleLayout) {
      setters.setCircleLayout(data.currentCircleLayout);
    }

    // Reset active seating plan state to prevent stale UI with imported data
    if (setters.setCurrentSeating) {
      setters.setCurrentSeating([]);
    }
    if (setters.setPlanName) {
      setters.setPlanName('');
    }
    if (setters.setActivePlanId) {
      setters.setActivePlanId(null);
    }

    if (setters.setTemplates) {
      await setters.setTemplates(data.classroomTemplates);
    } else {
      await idbSet(DB_KEYS.classroomTemplates, data.classroomTemplates);
    }

    if (setters.setClassCollection && incomingCollection) {
      await setters.setClassCollection(incomingCollection);
    }

    if (setters.setCircleLayouts && data.circleLayouts) {
      await setters.setCircleLayouts(data.circleLayouts);
    }

    // A full import replaces the photo store entirely.
    await clearAllPhotos();
    clearPhotoCache();
    clearPhotoTrash();
    await restoreStudentPhotos(data.studentPhotos);

    // Plan usage records (export version ≥ 2). Absent in older backups, which
    // simply leaves the store as it is.
    await restorePlanUsage(data.planUsage, {
      merge: false,
      resetAtByClass: data.planUsageResetAt,
    });
    return { merge: false };
  } catch (error) {
    logError('Import failed while applying backup', { error }, 'dataBackup');
    if (error instanceof BackupValidationError) {
      throw error;
    }
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.processingFailed);
  }
}

/**
 * The merge half of `importAllFromJson`: the backup's classes and free-named
 * templates join what is stored, with the photos and the plan usage of the
 * classes that came, and the collection is read back. Nothing here goes
 * through the live setters — they belong to the open class, which a merge
 * leaves alone.
 */
async function mergeIntoStored(
  data: ExportBundle,
  incoming: ClassCollectionState | null,
  setters: Parameters<typeof importAllFromJson>[1],
): Promise<BackupImportOutcome> {
  if (!setters.loadClassCollection || !setters.setClassCollection) {
    throw new BackupValidationError(
      BACKUP_ERROR_MESSAGES.mergeStateUnavailable,
    );
  }
  const existing = await setters.loadClassCollection();
  if (!existing) {
    throw new BackupValidationError(
      BACKUP_ERROR_MESSAGES.mergeStateUnavailable,
    );
  }

  let addedTemplates = 0;
  if (setters.loadTemplates && setters.setTemplates) {
    const templates = await setters.loadTemplates();
    if (!templates) {
      throw new BackupValidationError(
        BACKUP_ERROR_MESSAGES.mergeStateUnavailable,
      );
    }
    const merged = mergeTemplates(templates, data.classroomTemplates);
    addedTemplates = merged.length - templates.length;
    if (addedTemplates > 0) {
      await setters.setTemplates(merged);
    }
  }

  const { collection, addedClassIds } = incoming
    ? mergeClassCollections(existing, incoming)
    : { collection: existing, addedClassIds: [] };
  if (addedClassIds.length === 0) {
    return { merge: true, addedClasses: 0, addedTemplates };
  }

  await setters.setClassCollection(collection);

  // Photos belong to students; only those of the classes that came are new
  // here, and a student this device knows keeps the photo it has.
  const added = new Set(addedClassIds);
  const knownStudentIds = new Set(
    existing.classes.flatMap((entry) =>
      entry.students.map((student) => student.id),
    ),
  );
  const newStudentIds = new Set(
    collection.classes
      .filter((entry) => added.has(entry.id))
      .flatMap((entry) => entry.students.map((student) => student.id))
      .filter((id) => !knownStudentIds.has(id)),
  );
  await restoreStudentPhotos(data.studentPhotos, newStudentIds);

  // A merge only adds the records of classes that have none yet.
  await restorePlanUsage(data.planUsage, {
    merge: true,
    resetAtByClass: data.planUsageResetAt,
  });
  return {
    merge: true,
    addedClasses: addedClassIds.length,
    addedTemplates,
  };
}

/**
 * Clear all persisted data and reset local state.
 */
export async function clearAllData(
  handlers: ApplicationStateResetHandlers = {},
  options?: {
    /**
     * Skip deleting the `DB_KEYS` from the key-value store, for callers whose
     * repository has already done that. The photo database is wiped either
     * way: it is a separate database that no repository reaches.
     */
    skipIndexedDBClear?: boolean;
  },
): Promise<void> {
  try {
    if (!options?.skipIndexedDBClear) {
      await idbDeleteAll(Object.values(DB_KEYS));
    }
    if (hasIndexedDB()) {
      const photosCleared = await clearAllPhotos();
      if (!photosCleared.success) {
        // Reporting "all data deleted" while the photos stay on the device
        // would be worse than reporting the failure.
        throw new Error(photosCleared.error.message);
      }
    }
    clearPhotoCache();
    clearPhotoTrash();
    clearProjectLocalStorage();
    resetApplicationState(handlers);
  } catch (e) {
    logError('Clear data failed', { error: e }, 'dataBackup');
    throw e instanceof Error
      ? e
      : new Error('Failed to clear application data');
  }
}
