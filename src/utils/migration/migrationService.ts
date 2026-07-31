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
} from './tableMigration';
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

/**
 * Prüft ob eine Migration nötig ist
 */
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
      'Konnte Migrations-Version nicht prüfen',
      { error },
      'migrationService',
    );
    return true; // Bei Fehlern Migration ausführen
  }
}

/**
 * Migriert die hauptsächliche ClassroomScene
 */
async function migrateMainClassroomScene(): Promise<MigrationStats | null> {
  try {
    const scene = (await idbGet(DB_KEYS.classroomScene)) as
      ClassroomScene | undefined;

    if (!scene || !needsMigration(scene)) {
      return null; // Keine Migration nötig
    }

    const migratedScene = migrateClassroomScene(scene);
    const stats = getMigrationStats(scene, migratedScene);

    await idbSet(DB_KEYS.classroomScene, migratedScene);

    logInfo('ClassroomScene migriert', { stats }, 'migrationService');
    return stats;
  } catch (error) {
    logError(
      'Fehler bei ClassroomScene Migration',
      { error },
      'migrationService',
    );
    throw new Error('ClassroomScene Migration fehlgeschlagen', {
      cause: error,
    });
  }
}

/**
 * Migriert alle gespeicherten Templates
 */
async function migrateClassroomTemplates(): Promise<number> {
  try {
    const templates = (await idbGet(DB_KEYS.classroomTemplates)) as
      ClassroomTemplate[] | undefined;

    if (!templates || templates.length === 0) {
      return 0; // Keine Templates vorhanden
    }

    let migratedCount = 0;
    const migratedTemplates = templates.map((template) => {
      if (templateNeedsMigration(template)) {
        migratedCount++;
        logInfo(
          `Template '${template.name}' wird migriert`,
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
        `${migratedCount} Templates migriert`,
        { count: migratedCount },
        'migrationService',
      );
    }

    return migratedCount;
  } catch (error) {
    logError('Fehler bei Template Migration', { error }, 'migrationService');
    throw new Error('Template Migration fehlgeschlagen', { cause: error });
  }
}

/**
 * Migriert alle gespeicherten Pläne in der Seating History
 */
async function migrateSeatingHistory(): Promise<number> {
  try {
    const seatingHistory = (await idbGet(DB_KEYS.seatingHistory)) as
      SavedPlan[] | undefined;

    if (!seatingHistory || seatingHistory.length === 0) {
      return 0; // Keine gespeicherten Pläne
    }

    let migratedCount = 0;
    const migratedHistory = seatingHistory.map((plan) => {
      if (needsMigration(plan.scene)) {
        migratedCount++;
        logInfo(
          `Gespeicherter Plan '${plan.name}' wird migriert`,
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
        `${migratedCount} gespeicherte Pläne migriert`,
        { count: migratedCount },
        'migrationService',
      );
    }

    return migratedCount;
  } catch (error) {
    logError(
      'Fehler bei Seating History Migration',
      { error },
      'migrationService',
    );
    throw new Error('Seating History Migration fehlgeschlagen', {
      cause: error,
    });
  }
}

/**
 * Markiert die Migration als abgeschlossen
 */
async function markMigrationComplete(): Promise<void> {
  try {
    await idbSet(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION);
    writeMirroredMigrationVersion(CURRENT_MIGRATION_VERSION);
  } catch (error) {
    logError(
      'Konnte Migrations-Version nicht setzen',
      { error },
      'migrationService',
    );
    throw new Error('Migrations-Version speichern fehlgeschlagen', {
      cause: error,
    });
  }
}

/**
 * Führt die komplette Migration durch
 */
export async function runMigration(): Promise<MigrationResult> {
  logInfo('🔄 Starte Table Template Migration...');

  const result: MigrationResult = {
    success: false,
    stats: {
      templates: 0,
      savedPlans: 0,
    },
    errors: [],
  };

  try {
    // Prüfe ob Migration nötig ist
    const migrationNeeded = await checkMigrationNeeded();
    if (!migrationNeeded) {
      logInfo('✅ Keine Migration erforderlich');
      result.success = true;
      return result;
    }

    logInfo('📋 Migration wird ausgeführt...');

    // 1. ClassroomScene migrieren
    try {
      const sceneStats = await migrateMainClassroomScene();
      if (sceneStats) {
        result.stats.classroomScene = sceneStats;
      }
    } catch (error) {
      result.errors.push(`ClassroomScene: ${error}`);
    }

    // 2. Templates migrieren
    try {
      result.stats.templates = await migrateClassroomTemplates();
    } catch (error) {
      result.errors.push(`Templates: ${error}`);
    }

    // 3. Seating History migrieren
    try {
      result.stats.savedPlans = await migrateSeatingHistory();
    } catch (error) {
      result.errors.push(`Seating History: ${error}`);
    }

    // Migration als abgeschlossen markieren
    if (result.errors.length === 0) {
      await markMigrationComplete();
      result.success = true;
      logInfo(
        '✅ Migration erfolgreich abgeschlossen',
        { stats: result.stats },
        'migrationService',
      );
    } else {
      logError(
        '❌ Migration mit Fehlern abgeschlossen',
        { errors: result.errors },
        'migrationService',
      );
    }
  } catch (error) {
    result.errors.push(`Allgemeiner Fehler: ${error}`);
    logError('❌ Migration fehlgeschlagen', { error }, 'migrationService');
  }

  return result;
}

/**
 * Zurücksetzen der Migration (für Tests)
 */
export async function resetMigrationVersion(): Promise<void> {
  if (!hasIndexedDB()) return;

  try {
    await idbSet(MIGRATION_VERSION_KEY, 0);
    writeMirroredMigrationVersion(0);
    logInfo('Migration Version zurückgesetzt');
  } catch (error) {
    logError(
      'Konnte Migration Version nicht zurücksetzen',
      { error },
      'migrationService',
    );
  }
}

/**
 * Aktuelle Migration Version abrufen
 */
export async function getCurrentMigrationVersion(): Promise<number> {
  if (!hasIndexedDB()) return 0;

  try {
    return (await idbGet<number>(MIGRATION_VERSION_KEY)) || 0;
  } catch (error) {
    logError(
      'Konnte Migration Version nicht abrufen',
      { error },
      'migrationService',
    );
    return 0;
  }
}
