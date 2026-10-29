// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomTable,
  ClassroomScene,
  ClassroomTemplate,
} from '@/types';
import { TABLE_PRESETS } from '@/utils';

/**
 * Migrates one table stored turned by 90° to the upright dimensions of its
 * template.
 */
function migrateTable(table: ClassroomTable): ClassroomTable {
  // Only single and double tables were stored turned
  if (table.templateType !== 'single' && table.templateType !== 'double') {
    return table; // Group tables stay as they are
  }

  // Only tables turned by 90° need it
  if (table.rotation !== 90) {
    return table; // Already migrated or upright
  }

  const newPreset = TABLE_PRESETS[table.templateType];

  // The old table's centre
  const centerX = table.x + table.width / 2;
  const centerY = table.y + table.height / 2;

  // The new dimensions, centred on the old centre
  const newX = centerX - newPreset.width / 2;
  const newY = centerY - newPreset.height / 2;

  return {
    ...table,
    x: Math.max(0, newX), // Never left of or above the room
    y: Math.max(0, newY),
    width: newPreset.width,
    height: newPreset.height,
    rotation: 0, // Templates stand upright
  };
}

/** Migrates every table of a scene. */
export function migrateClassroomScene(scene: ClassroomScene): ClassroomScene {
  return {
    ...scene,
    tables: scene.tables.map(migrateTable),
  };
}

/** Migrates the scene of a room template. */
export function migrateClassroomTemplate(
  template: ClassroomTemplate,
): ClassroomTemplate {
  return {
    ...template,
    scene: migrateClassroomScene(template.scene),
  };
}

/** Whether a scene holds a table the migration turns. */
export function needsMigration(scene: ClassroomScene): boolean {
  return scene.tables.some(
    (table) =>
      (table.templateType === 'single' || table.templateType === 'double') &&
      table.rotation === 90,
  );
}

/** Whether a room template holds a table the migration turns. */
export function templateNeedsMigration(template: ClassroomTemplate): boolean {
  return needsMigration(template.scene);
}

/** What a migration changed, for the log. */
export interface MigrationStats {
  totalTables: number;
  migratedTables: number;
  singleTables: number;
  doubleTables: number;
  group4Tables: number;
}

/** Counts the tables a migration saw and changed. */
export function getMigrationStats(
  originalScene: ClassroomScene,
  migratedScene: ClassroomScene,
): MigrationStats {
  const originalTables = originalScene.tables;
  const migratedTables = migratedScene.tables;

  let migratedCount = 0;
  let singleCount = 0;
  let doubleCount = 0;
  let group4Count = 0;

  for (let i = 0; i < originalTables.length; i++) {
    const original = originalTables[i];
    const migrated = migratedTables[i];

    // Count by template
    if (original.templateType === 'single') singleCount++;
    else if (original.templateType === 'double') doubleCount++;
    else if (original.templateType === 'group4') group4Count++;

    // Migrated: turned from 90° to upright
    if (original.rotation === 90 && migrated.rotation === 0) {
      migratedCount++;
    }
  }

  return {
    totalTables: originalTables.length,
    migratedTables: migratedCount,
    singleTables: singleCount,
    doubleTables: doubleCount,
    group4Tables: group4Count,
  };
}
