// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { layoutStore, resetLayoutStore } from '../layoutStore';
import { DEFAULT_CLASSROOM_SCENE } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { setupLocalStorageMock } from '@/__tests__/utils/mockHandlers';
import type { ClassroomScene } from '@/types';
import type { CircleLayout, CircleGenerationStatus } from '@/types/Circle';

const sceneWithTables = (seatCount: number): ClassroomScene => ({
  totalStudents: 0,
  tables: [
    {
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      rotation: 0,
      seatCount,
      locked: false,
      zIndex: 0,
    },
  ],
  features: [],
});

describe('layoutStore', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    resetLayoutStore();
  });

  describe('setClassroomScene', () => {
    it('updates scene, recalculates seatCount, and flips classroomEdited (happy path)', () => {
      const scene = sceneWithTables(4);

      layoutStore.getState().setClassroomScene(scene);

      const state = layoutStore.getState();
      expect(state.classroomScene).toEqual(scene);
      expect(state.seatCount).toBe(4);
      expect(state.classroomEdited).toBe(true);
    });

    it('is a no-op when the scene is deeply equal (does not toggle classroomEdited)', () => {
      // Reset baseline already has classroomEdited = false; pass an equal scene.
      const before = layoutStore.getState();
      layoutStore
        .getState()
        .setClassroomScene({ ...DEFAULT_CLASSROOM_SCENE });

      // Reference of state may differ but classroomEdited stays false (no-op short-circuit).
      expect(layoutStore.getState().classroomEdited).toBe(false);
      expect(layoutStore.getState().seatCount).toBe(before.seatCount);
    });

    it('accepts a functional updater that derives next scene from previous', () => {
      layoutStore.getState().setClassroomScene(sceneWithTables(2));
      layoutStore.getState().setClassroomScene((prev) => ({
        ...prev,
        tables: prev.tables.map((t) => ({ ...t, seatCount: t.seatCount + 1 })),
      }));

      expect(layoutStore.getState().seatCount).toBe(3);
    });
  });

  describe('resetClassroomScene', () => {
    it('reverts to DEFAULT_CLASSROOM_SCENE and clears classroomEdited', () => {
      layoutStore.getState().setClassroomScene(sceneWithTables(6));
      expect(layoutStore.getState().classroomEdited).toBe(true);

      layoutStore.getState().resetClassroomScene();

      expect(layoutStore.getState().classroomScene).toBe(
        DEFAULT_CLASSROOM_SCENE,
      );
      expect(layoutStore.getState().classroomEdited).toBe(false);
      expect(layoutStore.getState().seatCount).toBe(0);
    });
  });

  describe('setSeatingMode', () => {
    it('persists the new mode to localStorage on change (happy path)', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

      layoutStore.getState().setSeatingMode('circle');

      expect(layoutStore.getState().seatingMode).toBe('circle');
      expect(setItemSpy).toHaveBeenCalledWith(
        LOCAL_STORAGE_KEYS.seatingMode,
        'circle',
      );
    });

    it('survives localStorage.setItem throwing (failure path)', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('quota exceeded');
      });

      expect(() =>
        layoutStore.getState().setSeatingMode('circle'),
      ).not.toThrow();
      // Store-level state still flips even though persistence failed.
      expect(layoutStore.getState().seatingMode).toBe('circle');
    });

    it('is a no-op when mode is unchanged', () => {
      layoutStore.getState().setSeatingMode('circle');
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
      setItemSpy.mockClear();

      layoutStore.getState().setSeatingMode('circle');

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('setCircleLayout', () => {
    const sampleLayout = {
      students: [],
      radius: { horizontal: 200, vertical: 150 },
      center: { x: 0, y: 0 },
      preservedNeighborhoods: 0,
      totalOriginalNeighborhoods: 0,
      newNeighborhoods: 0,
      preservationRate: 0,
      mode: 'preserve-neighbors' as const,
      timestamp: 0,
      neighborhoodPairs: [],
    } satisfies CircleLayout;

    it('sets a layout (happy path) and clears it via null', () => {
      layoutStore.getState().setCircleLayout(sampleLayout);
      expect(layoutStore.getState().circleLayout).toEqual(sampleLayout);

      layoutStore.getState().setCircleLayout(null);
      expect(layoutStore.getState().circleLayout).toBeNull();
    });

    it('is a no-op when layout is deeply equal', () => {
      layoutStore.getState().setCircleLayout(sampleLayout);
      const before = layoutStore.getState().circleLayout;

      layoutStore.getState().setCircleLayout({ ...sampleLayout });

      expect(layoutStore.getState().circleLayout).toBe(before);
    });
  });

  describe('setCircleGenerationStatus', () => {
    const status: CircleGenerationStatus = {
      stage: 'placing',
      progress: 0.5,
    } as CircleGenerationStatus;

    it('updates status (happy path)', () => {
      layoutStore.getState().setCircleGenerationStatus(status);
      expect(layoutStore.getState().circleGenerationStatus).toEqual(status);
    });

    it('is a no-op when reference is identical', () => {
      layoutStore.getState().setCircleGenerationStatus(status);
      const before = layoutStore.getState();

      layoutStore.getState().setCircleGenerationStatus(status);

      expect(layoutStore.getState()).toBe(before);
    });
  });

  describe('setCircleGenerationInProgress', () => {
    it('toggles the flag', () => {
      layoutStore.getState().setCircleGenerationInProgress(true);
      expect(layoutStore.getState().circleGenerationInProgress).toBe(true);

      layoutStore.getState().setCircleGenerationInProgress(false);
      expect(layoutStore.getState().circleGenerationInProgress).toBe(false);
    });

    it('is a no-op when value is unchanged', () => {
      const before = layoutStore.getState();
      layoutStore.getState().setCircleGenerationInProgress(false);
      expect(layoutStore.getState()).toBe(before);
    });
  });
});
