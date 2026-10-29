// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  readValue as idbGet,
  writeValue as idbSet,
} from '@/repositories/idbClient';
import { DB_KEYS, LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import {
  migrateClassroomScene,
  migrateClassroomTemplate,
  needsMigration,
  templateNeedsMigration,
  getMigrationStats,
  type MigrationStats,
} from '@/utils/migration/tableMigration';
import type { ClassroomScene, ClassroomTemplate, SavedPlan } from '@/types';
import { logWarn, logInfo, logError } from '@/utils';

const MIGRATION_VERSION_KEY = 'spg.migrationVersion';
const CURRENT_MIGRATION_VERSION = 1;

/**
 * localStorage mirror of the migration version. Reading it is synchronous,
 * whereas the IndexedDB lookup below has to open the database first — a cost
 * paid on every boot, before the first paint. The mirror lets the common case
 * (already migrated) skip IndexedDB entirely. It is only ever a cache: if it is
 * missing or unreadable we fall back to the authoritative IndexedDB value.
 */
function readMirroredMigrationVersion(): number | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.migrationVersion);
    if (raw === null) return null;

    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function writeMirroredMigrationVersion(version: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.migrationVersion, String(version));
  } catch {
    // Private mode or a full quota: the IndexedDB value stays authoritative.
  }
}

export interface MigrationResult {
  success: boolean;
  stats: {
    classroomScene?: MigrationStats;
    templates: number;
    savedPlans: number;
  };
  errors: string[];
}

/** Whether the stored data still needs the migration. */
async function checkMigrationNeeded(): Promise<boolean> {
  if (!hasIndexedDB()) return false;

  const mirroredVersion = readMirroredMigrationVersion();
  if (
    mirroredVersion !== null &&
    mirroredVersion >= CURRENT_MIGRATION_VERSION
  ) {
    return false;
  }

  try {
    const currentVersion = (await idbGet<number>(MIGRATION_VERSION_KEY)) || 0;

    if (currentVersion >= CURRENT_MIGRATION_VERSION) {
      // Already migrated by an earlier app version that had no mirror yet.
      writeMirroredMigrationVersion(currentVersion);
      return false;
    }

    return true;
  } catch (error) {
    logWarn(
      'Could not read the migration version',
      { error },
      'migrationService',
    );
    return true; // When in doubt, migrate
  }
}

/** Migrates the stored classroom scene. */
async function migrateMainClassroomScene(): Promise<MigrationStats | null> {
  try {
    const scene = (await idbGet(DB_KEYS.classroomScene)) as
      ClassroomScene | undefined;

    if (!scene || !needsMigration(scene)) {
      return null; // Nothing to migrate
    }

    const migratedScene = migrateClassroomScene(scene);
    const stats = getMigrationStats(scene, migratedScene);

    await idbSet(DB_KEYS.classroomScene, migratedScene);

    logInfo('Classroom scene migrated', { stats }, 'migrationService');
    return stats;
  } catch (error) {
    logError('Classroom scene migration failed', { error }, 'migrationService');
    throw new Error('ClassroomScene migration failed', {
      cause: error,
    });
  }
}

/** Migrates every stored room template. */
async function migrateClassroomTemplates(): Promise<number> {
  try {
    const templates = (await idbGet(DB_KEYS.classroomTemplates)) as
      ClassroomTemplate[] | undefined;

    if (!templates || templates.length === 0) {
      return 0; // No templates stored
    }

    let migratedCount = 0;
    const migratedTemplates = templates.map((template) => {
      if (templateNeedsMigration(template)) {
        migratedCount++;
        logInfo(
          'Migrating template',
          { templateId: template.id },
          'migrationService',
        );
        return migrateClassroomTemplate(template);
      }
      return template;
    });

    if (migratedCount > 0) {
      await idbSet(DB_KEYS.classroomTemplates, migratedTemplates);
      logInfo(
        `${migratedCount} templates migrated`,
        { count: migratedCount },
        'migrationService',
      );
    }

    return migratedCount;
  } catch (error) {
    logError('Template migration failed', { error }, 'migrationService');
    throw new Error('Template migration failed', { cause: error });
  }
}

/** Migrates every saved plan of the seating history. */
async function migrateSeatingHistory(): Promise<number> {
  try {
    const seatingHistory = (await idbGet(DB_KEYS.seatingHistory)) as
      SavedPlan[] | undefined;

    if (!seatingHistory || seatingHistory.length === 0) {
      return 0; // No saved plans
    }

    let migratedCount = 0;
    const migratedHistory = seatingHistory.map((plan) => {
      if (needsMigration(plan.scene)) {
        migratedCount++;
        logInfo(
          'Migrating saved plan',
          { planId: plan.id },
          'migrationService',
        );
        return {
          ...plan,
          scene: migrateClassroomScene(plan.scene),
        };
      }
      return plan;
    });

    if (migratedCount > 0) {
      await idbSet(DB_KEYS.seatingHistory, migratedHistory);
      logInfo(
        `${migratedCount} saved plans migrated`,
        { count: migratedCount },
        'migrationService',
      );
    }

    return migratedCount;
  } catch (error) {
    logError('Seating history migration failed', { error }, 'migrationService');
    throw new Error('Seating history migration failed', {
      cause: error,
    });
  }
}

/** Records the migration as done, in IndexedDB and in its mirror. */
async function markMigrationComplete(): Promise<void> {
  try {
    await idbSet(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION);
    writeMirroredMigrationVersion(CURRENT_MIGRATION_VERSION);
  } catch (error) {
    logError(
      'Could not store the migration version',
      { error },
      'migrationService',
    );
    throw new Error('Storing the migration version failed', {
      cause: error,
    });
  }
}

/** Runs the whole migration once per installation. */
export async function runMigration(): Promise<MigrationResult> {
  logInfo('Starting the table template migration');

  const result: MigrationResult = {
    success: false,
    stats: {
      templates: 0,
      savedPlans: 0,
    },
    errors: [],
  };

  try {
    // Check whether there is anything to do
    const migrationNeeded = await checkMigrationNeeded();
    if (!migrationNeeded) {
      logInfo('No migration needed');
      result.success = true;
      return result;
    }

    logInfo('Running the migration');

    // 1. The classroom scene
    try {
      const sceneStats = await migrateMainClassroomScene();
      if (sceneStats) {
        result.stats.classroomScene = sceneStats;
      }
    } catch (error) {
      result.errors.push(`ClassroomScene: ${error}`);
    }

    // 2. The room templates
    try {
      result.stats.templates = await migrateClassroomTemplates();
    } catch (error) {
      result.errors.push(`Templates: ${error}`);
    }

    // 3. The seating history
    try {
      result.stats.savedPlans = await migrateSeatingHistory();
    } catch (error) {
      result.errors.push(`Seating History: ${error}`);
    }

    // Record the migration as done
    if (result.errors.length === 0) {
      await markMigrationComplete();
      result.success = true;
      logInfo(
        'Migration completed',
        { stats: result.stats },
        'migrationService',
      );
    } else {
      logError(
        'Migration completed with errors',
        { errors: result.errors },
        'migrationService',
      );
    }
  } catch (error) {
    result.errors.push(`General error: ${error}`);
    logError('Migration failed', { error }, 'migrationService');
  }

  return result;
}

/** Resets the migration version (for tests). */
export async function resetMigrationVersion(): Promise<void> {
  if (!hasIndexedDB()) return;

  try {
    await idbSet(MIGRATION_VERSION_KEY, 0);
    writeMirroredMigrationVersion(0);
    logInfo('Migration version reset');
  } catch (error) {
    logError(
      'Could not reset the migration version',
      { error },
      'migrationService',
    );
  }
}

/** The stored migration version. */
export async function getCurrentMigrationVersion(): Promise<number> {
  if (!hasIndexedDB()) return 0;

  try {
    return (await idbGet<number>(MIGRATION_VERSION_KEY)) || 0;
  } catch (error) {
    logError(
      'Could not read the migration version',
      { error },
      'migrationService',
    );
    return 0;
  }
}
