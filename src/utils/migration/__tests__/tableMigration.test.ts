import { describe, it, expect } from 'vitest';
import {
  migrateClassroomScene,
  migrateClassroomTemplate,
  needsMigration,
  templateNeedsMigration,
  getMigrationStats,
} from '../tableMigration';
import type { ClassroomScene, ClassroomTemplate } from '../../../types';

describe('tableMigration', () => {
  describe('migrateClassroomScene', () => {
    it('migriert 90° rotierte Single-Tische korrekt', () => {
      const originalScene: ClassroomScene = {
        totalStudents: 2,
        tables: [
          {
            x: 100,
            y: 100,
            width: 70, // Original single-Breite
            height: 55, // Original single-Höhe
            rotation: 90,
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(originalScene);

      expect(migratedScene.tables).toHaveLength(1);
      const migratedTable = migratedScene.tables[0];

      // Neue Dimensionen: 55x65 (einheitlich basierend auf Double)
      expect(migratedTable.width).toBe(55);
      expect(migratedTable.height).toBe(65);
      expect(migratedTable.rotation).toBe(0);

      // Position sollte sich ändern, um zentriert zu bleiben
      // Zentrum war: x=135, y=127.5
      // Neue Position: x=135-27.5=107.5, y=127.5-32.5=95
      expect(migratedTable.x).toBeCloseTo(107.5, 1);
      expect(migratedTable.y).toBeCloseTo(95, 1);

      // Andere Properties bleiben gleich
      expect(migratedTable.seatCount).toBe(1);
      expect(migratedTable.templateType).toBe('single');
      expect(migratedTable.locked).toBe(false);
      expect(migratedTable.zIndex).toBe(0);
    });

    it('migriert 90° rotierte Double-Tische korrekt', () => {
      const originalScene: ClassroomScene = {
        totalStudents: 4,
        tables: [
          {
            x: 200,
            y: 200,
            width: 130, // Original double-Breite
            height: 55, // Original double-Höhe
            rotation: 90,
            seatCount: 2,
            locked: false,
            zIndex: 0,
            templateType: 'double',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(originalScene);

      expect(migratedScene.tables).toHaveLength(1);
      const migratedTable = migratedScene.tables[0];

      // Neue Dimensionen: 55x130 (vertauscht und kein Rotation)
      expect(migratedTable.width).toBe(55);
      expect(migratedTable.height).toBe(130);
      expect(migratedTable.rotation).toBe(0);

      // Position sollte sich ändern, um zentriert zu bleiben
      // Zentrum war: x=265, y=227.5
      // Neue Position: x=265-27.5=237.5, y=227.5-65=162.5
      expect(migratedTable.x).toBeCloseTo(237.5, 1);
      expect(migratedTable.y).toBeCloseTo(162.5, 1);
    });

    it('lässt Group4-Tische unverändert', () => {
      const originalScene: ClassroomScene = {
        totalStudents: 4,
        tables: [
          {
            x: 300,
            y: 300,
            width: 130,
            height: 120,
            rotation: 0,
            seatCount: 4,
            locked: false,
            zIndex: 0,
            templateType: 'group4',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(originalScene);
      expect(migratedScene.tables[0]).toEqual(originalScene.tables[0]);
    });

    it('verhindert negative Positionen', () => {
      const originalScene: ClassroomScene = {
        totalStudents: 1,
        tables: [
          {
            x: 10, // Sehr nah am Rand
            y: 10,
            width: 70,
            height: 55,
            rotation: 90,
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(originalScene);
      const migratedTable = migratedScene.tables[0];

      // Position sollte nicht negativ werden
      expect(migratedTable.x).toBeGreaterThanOrEqual(0);
      expect(migratedTable.y).toBeGreaterThanOrEqual(0);
    });

    it('migriert mehrere Tische gleichzeitig', () => {
      const originalScene: ClassroomScene = {
        totalStudents: 7,
        tables: [
          {
            x: 100,
            y: 100,
            width: 70,
            height: 55,
            rotation: 90,
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
          {
            x: 200,
            y: 200,
            width: 130,
            height: 55,
            rotation: 90,
            seatCount: 2,
            locked: false,
            zIndex: 1,
            templateType: 'double',
          },
          {
            x: 300,
            y: 300,
            width: 130,
            height: 120,
            rotation: 0,
            seatCount: 4,
            locked: false,
            zIndex: 2,
            templateType: 'group4',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(originalScene);

      expect(migratedScene.tables).toHaveLength(3);

      // Single-Tisch migriert
      expect(migratedScene.tables[0].rotation).toBe(0);
      expect(migratedScene.tables[0].width).toBe(55);
      expect(migratedScene.tables[0].height).toBe(65);

      // Double-Tisch migriert
      expect(migratedScene.tables[1].rotation).toBe(0);
      expect(migratedScene.tables[1].width).toBe(55);
      expect(migratedScene.tables[1].height).toBe(130);

      // Group4-Tisch unverändert
      expect(migratedScene.tables[2]).toEqual(originalScene.tables[2]);
    });
  });

  describe('migrateClassroomTemplate', () => {
    it('migriert Template mit 90° rotierten Tischen', () => {
      const originalTemplate: ClassroomTemplate = {
        id: 1,
        name: 'Test Template',
        scene: {
          totalStudents: 2,
          tables: [
            {
              x: 100,
              y: 100,
              width: 70,
              height: 55,
              rotation: 90,
              seatCount: 1,
              locked: false,
              zIndex: 0,
              templateType: 'single',
            },
          ],
        },
      };

      const migratedTemplate = migrateClassroomTemplate(originalTemplate);

      expect(migratedTemplate.id).toBe(1);
      expect(migratedTemplate.name).toBe('Test Template');
      expect(migratedTemplate.scene.tables[0].rotation).toBe(0);
      expect(migratedTemplate.scene.tables[0].width).toBe(55);
      expect(migratedTemplate.scene.tables[0].height).toBe(65);
    });
  });

  describe('needsMigration', () => {
    it('erkennt Scene mit 90° Single-Tischen als migrations-bedürftig', () => {
      const scene: ClassroomScene = {
        totalStudents: 1,
        tables: [
          {
            x: 100,
            y: 100,
            width: 70,
            height: 55,
            rotation: 90,
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
        ],
      };

      expect(needsMigration(scene)).toBe(true);
    });

    it('erkennt Scene mit 90° Double-Tischen als migrations-bedürftig', () => {
      const scene: ClassroomScene = {
        totalStudents: 2,
        tables: [
          {
            x: 100,
            y: 100,
            width: 130,
            height: 55,
            rotation: 90,
            seatCount: 2,
            locked: false,
            zIndex: 0,
            templateType: 'double',
          },
        ],
      };

      expect(needsMigration(scene)).toBe(true);
    });

    it('erkennt Scene ohne rotierte Single/Double-Tische als NICHT migrations-bedürftig', () => {
      const scene: ClassroomScene = {
        totalStudents: 5,
        tables: [
          {
            x: 100,
            y: 100,
            width: 55,
            height: 70,
            rotation: 0,
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
          {
            x: 200,
            y: 200,
            width: 130,
            height: 120,
            rotation: 0,
            seatCount: 4,
            locked: false,
            zIndex: 1,
            templateType: 'group4',
          },
        ],
      };

      expect(needsMigration(scene)).toBe(false);
    });

    it('erkennt leere Scene als NICHT migrations-bedürftig', () => {
      const scene: ClassroomScene = {
        totalStudents: 0,
        tables: [],
      };

      expect(needsMigration(scene)).toBe(false);
    });
  });

  describe('templateNeedsMigration', () => {
    it('erkennt Template mit 90° Tischen als migrations-bedürftig', () => {
      const template: ClassroomTemplate = {
        id: 1,
        name: 'Test',
        scene: {
          totalStudents: 1,
          tables: [
            {
              x: 100,
              y: 100,
              width: 70,
              height: 55,
              rotation: 90,
              seatCount: 1,
              locked: false,
              zIndex: 0,
              templateType: 'single',
            },
          ],
        },
      };

      expect(templateNeedsMigration(template)).toBe(true);
    });
  });

  describe('getMigrationStats', () => {
    it('zählt Migrations-Statistiken korrekt', () => {
      const originalScene: ClassroomScene = {
        totalStudents: 7,
        tables: [
          {
            x: 100,
            y: 100,
            width: 70,
            height: 55,
            rotation: 90,
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
          {
            x: 200,
            y: 200,
            width: 130,
            height: 55,
            rotation: 90,
            seatCount: 2,
            locked: false,
            zIndex: 1,
            templateType: 'double',
          },
          {
            x: 300,
            y: 300,
            width: 130,
            height: 120,
            rotation: 0,
            seatCount: 4,
            locked: false,
            zIndex: 2,
            templateType: 'group4',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(originalScene);
      const stats = getMigrationStats(originalScene, migratedScene);

      expect(stats.totalTables).toBe(3);
      expect(stats.migratedTables).toBe(2); // single + double
      expect(stats.singleTables).toBe(1);
      expect(stats.doubleTables).toBe(1);
      expect(stats.group4Tables).toBe(1);
    });

    it('zählt keine Migration bei unveränderten Tischen', () => {
      const scene: ClassroomScene = {
        totalStudents: 4,
        tables: [
          {
            x: 300,
            y: 300,
            width: 130,
            height: 120,
            rotation: 0,
            seatCount: 4,
            locked: false,
            zIndex: 0,
            templateType: 'group4',
          },
        ],
      };

      const migratedScene = migrateClassroomScene(scene);
      const stats = getMigrationStats(scene, migratedScene);

      expect(stats.totalTables).toBe(1);
      expect(stats.migratedTables).toBe(0);
      expect(stats.group4Tables).toBe(1);
    });
  });
});
