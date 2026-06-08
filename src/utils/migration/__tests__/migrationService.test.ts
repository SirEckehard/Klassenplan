import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  runMigration,
  resetMigrationVersion,
  getCurrentMigrationVersion,
} from '../migrationService';
import { DB_KEYS } from '../../../utils/data/storageKeys';
import type {
  ClassroomScene,
  ClassroomTemplate,
  SavedPlan,
} from '../../../types';

// Mock IndexedDB
vi.mock('idb-keyval');
vi.mock('@/utils/data/indexedDb', () => ({
  hasIndexedDB: () => true,
}));

const mockIdbGet = vi.mocked(idbGet);
const mockIdbSet = vi.mocked(idbSet);

describe('migrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Migration noch nicht ausgeführt
    mockIdbGet.mockImplementation((key) => {
      if (key === 'spg.migrationVersion') return Promise.resolve(0);
      return Promise.resolve(undefined);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runMigration', () => {
    it('führt keine Migration aus, wenn bereits aktuell', async () => {
      // Migration Version ist bereits 1
      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(1);
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.stats.templates).toBe(0);
      expect(result.stats.savedPlans).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Keine Set-Aufrufe außer der Versions-Prüfung
      expect(mockIdbSet).not.toHaveBeenCalled();
    });

    it('migriert ClassroomScene mit 90° Tischen', async () => {
      const sceneWith90DegreeTable: ClassroomScene = {
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

      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(0);
        if (key === DB_KEYS.classroomScene)
          return Promise.resolve(sceneWith90DegreeTable);
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.stats.classroomScene).toBeDefined();
      expect(result.stats.classroomScene?.migratedTables).toBe(1);

      // Prüfe dass migrierte Scene gespeichert wurde
      expect(mockIdbSet).toHaveBeenCalledWith(
        DB_KEYS.classroomScene,
        expect.objectContaining({
          tables: expect.arrayContaining([
            expect.objectContaining({
              rotation: 0,
              width: 55,
              height: 65,
            }),
          ]),
        }),
      );

      // Migration Version wurde gesetzt
      expect(mockIdbSet).toHaveBeenCalledWith('spg.migrationVersion', 1);
    });

    it('migriert ClassroomTemplates mit 90° Tischen', async () => {
      const templatesWithRotation: ClassroomTemplate[] = [
        {
          id: 1,
          name: 'Test Template',
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
        },
        {
          id: 2,
          name: 'Already Migrated',
          scene: {
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
          },
        },
      ];

      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(0);
        if (key === DB_KEYS.classroomTemplates)
          return Promise.resolve(templatesWithRotation);
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.stats.templates).toBe(1); // Nur 1 Template benötigte Migration

      // Prüfe dass Templates gespeichert wurden
      expect(mockIdbSet).toHaveBeenCalledWith(
        DB_KEYS.classroomTemplates,
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Test Template',
            scene: expect.objectContaining({
              tables: expect.arrayContaining([
                expect.objectContaining({ rotation: 0 }),
              ]),
            }),
          }),
          expect.objectContaining({
            id: 2,
            name: 'Already Migrated',
            // Sollte unverändert bleiben
          }),
        ]),
      );
    });

    it('migriert SeatingHistory mit 90° Tischen', async () => {
      const historyWithRotation: SavedPlan[] = [
        {
          id: '1',
          name: 'Old Plan',
          date: '01.01.2024',
          seating: [],
          scene: {
            totalStudents: 2,
            tables: [
              {
                x: 200,
                y: 200,
                width: 130,
                height: 55,
                rotation: 90,
                seatCount: 2,
                locked: false,
                zIndex: 0,
                templateType: 'double',
              },
            ],
          },
        },
      ];

      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(0);
        if (key === DB_KEYS.seatingHistory)
          return Promise.resolve(historyWithRotation);
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.stats.savedPlans).toBe(1);

      // Prüfe dass History gespeichert wurde
      expect(mockIdbSet).toHaveBeenCalledWith(
        DB_KEYS.seatingHistory,
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Old Plan',
            scene: expect.objectContaining({
              tables: expect.arrayContaining([
                expect.objectContaining({
                  rotation: 0,
                  width: 55,
                  height: 130,
                }),
              ]),
            }),
          }),
        ]),
      );
    });

    it('handhabt Fehler graceful', async () => {
      // Simuliere Fehler beim Laden der ClassroomScene
      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(0);
        if (key === DB_KEYS.classroomScene)
          return Promise.reject(new Error('Storage error'));
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('ClassroomScene');

      // Migration Version sollte nicht gesetzt werden bei Fehlern
      expect(mockIdbSet).not.toHaveBeenCalledWith('spg.migrationVersion', 1);
    });

    it('handhabt leere Datenstrukturen', async () => {
      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(0);
        if (key === DB_KEYS.classroomScene) return Promise.resolve(undefined);
        if (key === DB_KEYS.classroomTemplates) return Promise.resolve([]);
        if (key === DB_KEYS.seatingHistory) return Promise.resolve([]);
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.stats.templates).toBe(0);
      expect(result.stats.savedPlans).toBe(0);
      expect(result.stats.classroomScene).toBeUndefined();

      // Migration Version sollte trotzdem gesetzt werden
      expect(mockIdbSet).toHaveBeenCalledWith('spg.migrationVersion', 1);
    });
  });

  describe('resetMigrationVersion', () => {
    it('setzt Migration Version auf 0 zurück', async () => {
      await resetMigrationVersion();

      expect(mockIdbSet).toHaveBeenCalledWith('spg.migrationVersion', 0);
    });
  });

  describe('getCurrentMigrationVersion', () => {
    it('gibt aktuelle Migration Version zurück', async () => {
      mockIdbGet.mockResolvedValue(1);

      const version = await getCurrentMigrationVersion();

      expect(version).toBe(1);
      expect(mockIdbGet).toHaveBeenCalledWith('spg.migrationVersion');
    });

    it('gibt 0 zurück wenn keine Version gespeichert', async () => {
      mockIdbGet.mockResolvedValue(undefined);

      const version = await getCurrentMigrationVersion();

      expect(version).toBe(0);
    });

    it('handhabt Fehler und gibt 0 zurück', async () => {
      mockIdbGet.mockRejectedValue(new Error('Storage error'));

      const version = await getCurrentMigrationVersion();

      expect(version).toBe(0);
    });
  });
});
