// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
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
    // The service mirrors the migration version into localStorage so later
    // boots can skip the IndexedDB lookup. jsdom shares localStorage across
    // tests, so the mirror has to be dropped or it short-circuits every run.
    localStorage.clear();
    // By default the migration has not run yet
    mockIdbGet.mockImplementation((key) => {
      if (key === 'spg.migrationVersion') return Promise.resolve(0);
      return Promise.resolve(undefined);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runMigration', () => {
    it('does nothing when already up to date', async () => {
      // The migration version is 1 already
      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(1);
        return Promise.resolve(undefined);
      });

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(result.stats.templates).toBe(0);
      expect(result.stats.savedPlans).toBe(0);
      expect(result.errors).toHaveLength(0);

      // No writes besides the version check
      expect(mockIdbSet).not.toHaveBeenCalled();
    });

    it('mirrors the version to localStorage when IndexedDB is already up to date', async () => {
      mockIdbGet.mockImplementation((key) => {
        if (key === 'spg.migrationVersion') return Promise.resolve(1);
        return Promise.resolve(undefined);
      });

      await runMigration();

      expect(localStorage.getItem('spg.migrationVersion')).toBe('1');
    });

    it('skips IndexedDB when the localStorage mirror is up to date', async () => {
      localStorage.setItem('spg.migrationVersion', '1');

      const result = await runMigration();

      expect(result.success).toBe(true);
      expect(mockIdbGet).not.toHaveBeenCalled();
      expect(mockIdbSet).not.toHaveBeenCalled();
    });

    it('reads IndexedDB when the localStorage mirror is behind', async () => {
      localStorage.setItem('spg.migrationVersion', '0');

      await runMigration();

      expect(mockIdbGet).toHaveBeenCalledWith('spg.migrationVersion');
    });

    it('migrates the classroom scene with tables at 90°', async () => {
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

      // The migrated scene was stored
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

      // The migration version was set
      expect(mockIdbSet).toHaveBeenCalledWith('spg.migrationVersion', 1);
    });

    it('migrates the room templates with tables at 90°', async () => {
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

      // The templates were stored
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
            // Stays as it is
          }),
        ]),
      );
    });

    it('migrates the saved plans with tables at 90°', async () => {
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

      // The history was stored
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

    it('reports an error and keeps the version unset', async () => {
      // Reading the classroom scene fails
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

      // After an error the migration version stays unset
      expect(mockIdbSet).not.toHaveBeenCalledWith('spg.migrationVersion', 1);
    });

    it('handles empty stores', async () => {
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

      // The migration version is set all the same
      expect(mockIdbSet).toHaveBeenCalledWith('spg.migrationVersion', 1);
    });
  });

  describe('resetMigrationVersion', () => {
    it('resets the version to 0', async () => {
      await resetMigrationVersion();

      expect(mockIdbSet).toHaveBeenCalledWith('spg.migrationVersion', 0);
    });
  });

  describe('getCurrentMigrationVersion', () => {
    it('returns the stored version', async () => {
      mockIdbGet.mockResolvedValue(1);

      const version = await getCurrentMigrationVersion();

      expect(version).toBe(1);
      expect(mockIdbGet).toHaveBeenCalledWith('spg.migrationVersion');
    });

    it('returns 0 when no version is stored', async () => {
      mockIdbGet.mockResolvedValue(undefined);

      const version = await getCurrentMigrationVersion();

      expect(version).toBe(0);
    });

    it('returns 0 when reading fails', async () => {
      mockIdbGet.mockRejectedValue(new Error('Storage error'));

      const version = await getCurrentMigrationVersion();

      expect(version).toBe(0);
    });
  });
});
