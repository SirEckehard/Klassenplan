// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { set as idbSet, del as idbDel } from 'idb-keyval';
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
import { DB_KEYS } from './storageKeys';
import {
  logError,
  MAX_STUDENTS,
  neutralSettings,
  normalizeMixSettings,
} from '@/utils';
import { clearProjectLocalStorage } from './storage';
import {
  BackupValidationError,
  BACKUP_ERROR_MESSAGES,
  CURRENT_EXPORT_VERSION,
  parseExportBundle,
} from '../validation/backupValidation';
import {
  resetApplicationState,
  type ApplicationStateResetHandlers,
} from '@/utils/state/resetApplicationState';
import { createClassCollection, createClassRecord } from './classCollection';
import { normalizeSeatingHistory } from '@/utils/data/planNormalization';

const FALLBACK_CLASS_NAME = 'Importierte Klasse';
const BACKUP_LOG_SOURCE = 'dataBackup';
const BACKUP_LOG_MESSAGE = 'Normalized seating plan IDs during import/export';

const hasOwn = Object.prototype.hasOwnProperty;
const isValidSeatIndex = (seat: number, seatCount: number) =>
  Number.isInteger(seat) && seat >= 0 && seat < seatCount;
const normalizeBackupSeatingHistory = (plans: SavedPlan[]): SavedPlan[] =>
  normalizeSeatingHistory(plans, {
    logSource: BACKUP_LOG_SOURCE,
    logMessage: BACKUP_LOG_MESSAGE,
  });

function findStudentIdConflicts(
  existing: Student[],
  incoming: Student[],
): string[] {
  const knownIds = new Set(existing.map((student) => student.id));
  const collisions = new Set<string>();
  for (const student of incoming) {
    if (knownIds.has(student.id)) {
      collisions.add(student.id);
    }
  }
  return [...collisions];
}

function mergeLockedPositionsWithValidation(
  existing: LockedPositions,
  incoming: LockedPositions,
  scene: ClassroomScene,
): LockedPositions {
  const merged: LockedPositions = { ...existing, ...incoming };
  const tables = Array.isArray(scene.tables) ? scene.tables : [];
  for (const { table, seat } of Object.values(merged)) {
    const tableConfig = tables[table];
    if (
      !tableConfig ||
      !Number.isInteger(table) ||
      !isValidSeatIndex(seat, tableConfig.seatCount)
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.mergeInvalidLocks);
    }
  }
  return merged;
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
    };
    return JSON.stringify(bundle, null, 2);
  } catch (e) {
    logError('Export failed', { error: e }, 'dataBackup');
    throw e;
  }
}

/**
 * Import all data from a JSON string.
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
    getStudents?: () => Student[];
    getLockedPositions?: () => LockedPositions;
  },
  opts?: { merge?: boolean },
): Promise<void> {
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

    if (merge) {
      if (!setters.getStudents || !setters.getLockedPositions) {
        throw new BackupValidationError(
          BACKUP_ERROR_MESSAGES.mergeStateUnavailable,
        );
      }
      const existingStudents = setters.getStudents();
      const existingLocks = setters.getLockedPositions();
      const nextCount = existingStudents.length + importedStudentCount;
      if (nextCount > MAX_STUDENTS) {
        throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyStudents);
      }
      const collisions = findStudentIdConflicts(
        existingStudents,
        data.students,
      );
      if (collisions.length > 0) {
        throw new BackupValidationError(
          BACKUP_ERROR_MESSAGES.mergeStudentIdConflict,
        );
      }
      const mergedLocks = mergeLockedPositionsWithValidation(
        existingLocks,
        data.lockedPositions,
        data.classroomScene,
      );
      setters.setStudents([...existingStudents, ...data.students]);
      setters.setSeatingHistory((prev) => [...prev, ...seatingHistory]);
      setters.setMixHistory((prev) => [...prev, ...data.mixHistory]);
      setters.setLockedPositions(mergedLocks);
    } else {
      setters.setStudents(data.students);
      setters.setSeatingHistory(seatingHistory);
      setters.setMixHistory(data.mixHistory);
      setters.setLockedPositions(data.lockedPositions);
    }
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

    if (setters.setClassCollection) {
      const collectionToPersist = data.classCollection ?? legacyClassCollection;
      if (collectionToPersist) {
        // Type assertion safe: parseExportBundle validates structure, legacy collection is correctly typed
        await setters.setClassCollection(
          collectionToPersist as ClassCollectionState,
        );
      }
    }

    if (setters.setCircleLayouts && data.circleLayouts) {
      await setters.setCircleLayouts(data.circleLayouts);
    }
  } catch (error) {
    logError('Import failed while applying backup', { error }, 'dataBackup');
    if (error instanceof BackupValidationError) {
      throw error;
    }
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.processingFailed);
  }
}

/**
 * Clear all persisted data and reset local state.
 */
export async function clearAllData(
  handlers: ApplicationStateResetHandlers = {},
  options?: { skipIndexedDBClear?: boolean },
): Promise<void> {
  try {
    if (!options?.skipIndexedDBClear) {
      await Promise.all(Object.values(DB_KEYS).map((k) => idbDel(k)));
    }
    clearProjectLocalStorage();
    resetApplicationState(handlers);
  } catch (e) {
    logError('Clear data failed', { error: e }, 'dataBackup');
    throw e instanceof Error
      ? e
      : new Error('Failed to clear application data');
  }
}
