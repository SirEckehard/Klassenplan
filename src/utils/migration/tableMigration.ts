// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomTable,
  ClassroomScene,
  ClassroomTemplate,
} from '@/types';
import { TABLE_PRESETS } from '@/utils';

/**
 * Migriert einen einzelnen Tisch von 90° Rotation zu den neuen Dimensionen
 */
function migrateTable(table: ClassroomTable): ClassroomTable {
  // Nur single und double Tische sind betroffen
  if (table.templateType !== 'single' && table.templateType !== 'double') {
    return table; // group4 Tische bleiben unverändert
  }

  // Nur 90° rotierte Tische migrieren
  if (table.rotation !== 90) {
    return table; // Bereits migrierte oder 0° Tische
  }

  const newPreset = TABLE_PRESETS[table.templateType];

  // Berechne das Zentrum des alten Tisches
  const centerX = table.x + table.width / 2;
  const centerY = table.y + table.height / 2;

  // Neue Position mit neuen Dimensionen (zentriert um das alte Zentrum)
  const newX = centerX - newPreset.width / 2;
  const newY = centerY - newPreset.height / 2;

  return {
    ...table,
    x: Math.max(0, newX), // Verhindere negative Positionen
    y: Math.max(0, newY),
    width: newPreset.width,
    height: newPreset.height,
    rotation: 0, // Neue Tische haben 0° Rotation
  };
}

/**
 * Migriert eine komplette ClassroomScene
 */
export function migrateClassroomScene(scene: ClassroomScene): ClassroomScene {
  return {
    ...scene,
    tables: scene.tables.map(migrateTable),
  };
}

/**
 * Migriert ein ClassroomTemplate
 */
export function migrateClassroomTemplate(
  template: ClassroomTemplate,
): ClassroomTemplate {
  return {
    ...template,
    scene: migrateClassroomScene(template.scene),
  };
}

/**
 * Prüft, ob eine Scene Migration benötigt
 */
export function needsMigration(scene: ClassroomScene): boolean {
  return scene.tables.some(
    (table) =>
      (table.templateType === 'single' || table.templateType === 'double') &&
      table.rotation === 90,
  );
}

/**
 * Prüft, ob ein Template Migration benötigt
 */
export function templateNeedsMigration(template: ClassroomTemplate): boolean {
  return needsMigration(template.scene);
}

/**
 * Migrations-Statistiken für Debugging
 */
export interface MigrationStats {
  totalTables: number;
  migratedTables: number;
  singleTables: number;
  doubleTables: number;
  group4Tables: number;
}

/**
 * Sammelt Statistiken über eine Migration
 */
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

    // Zähle nach Template-Typ
    if (original.templateType === 'single') singleCount++;
    else if (original.templateType === 'double') doubleCount++;
    else if (original.templateType === 'group4') group4Count++;

    // Prüfe ob migriert wurde (Rotation von 90° auf 0° geändert)
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
