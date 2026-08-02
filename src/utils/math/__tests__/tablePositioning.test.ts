// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  preciseSnap,
  calculateTableGroupBounds,
  positionTablesRelative,
  calculateDragDelta,
  applyDragMovement,
  getRotationAdjustedPosition,
  getRotationAdjustedDimensions,
} from '../tablePositioning';
import type { ClassroomTable } from '@/types';

describe('positioning utilities', () => {
  describe('preciseSnap', () => {
    it('should not snap values that are already close to grid', () => {
      expect(preciseSnap(10.05, 10, 0.1)).toBe(10.05);
      expect(preciseSnap(9.95, 10, 0.1)).toBe(9.95);
    });

    it('should snap values that are far from grid', () => {
      expect(preciseSnap(12.3, 10)).toBe(10);
      expect(preciseSnap(17.8, 10)).toBe(20);
    });

    it('should handle edge cases', () => {
      expect(preciseSnap(0, 10)).toBe(0);
      expect(preciseSnap(5, 10)).toBe(10);
    });
  });

  describe('calculateTableGroupBounds', () => {
    it('should calculate bounds for single table', () => {
      const table: ClassroomTable = {
        x: 10,
        y: 20,
        width: 50,
        height: 60,
        rotation: 0,
        seatCount: 1,
        locked: false,
        zIndex: 0,
        templateType: 'single',
      };

      const bounds = calculateTableGroupBounds([table]);

      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 50,
        height: 60,
      });
    });

    it('should calculate bounds for multiple tables', () => {
      const tables: ClassroomTable[] = [
        {
          x: 10,
          y: 20,
          width: 50,
          height: 60,
          rotation: 0,
          seatCount: 1,
          locked: false,
          zIndex: 0,
          templateType: 'single',
        },
        {
          x: 80,
          y: 100,
          width: 40,
          height: 50,
          rotation: 0,
          seatCount: 1,
          locked: false,
          zIndex: 1,
          templateType: 'single',
        },
      ];

      const bounds = calculateTableGroupBounds(tables);

      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 110, // from x:10 to x:120 (80+40)
        height: 130, // from y:20 to y:150 (100+50)
      });
    });

    it('should respect 90 degree rotations when deriving bounds', () => {
      const table: ClassroomTable = {
        x: 60,
        y: 40,
        width: 40,
        height: 100,
        rotation: 90,
        seatCount: 2,
        locked: false,
        zIndex: 0,
        templateType: 'double',
      };

      const bounds = calculateTableGroupBounds([table]);

      expect(bounds).toEqual({
        x: 30,
        y: 70,
        width: 100,
        height: 40,
      });
    });
  });

  describe('positionTablesRelative', () => {
    it('should maintain relative positions when moving tables', () => {
      const tables: ClassroomTable[] = [
        {
          x: 0,
          y: 0,
          width: 50,
          height: 60,
          rotation: 0,
          seatCount: 1,
          locked: false,
          zIndex: 0,
          templateType: 'single',
        },
        {
          x: 60,
          y: 70,
          width: 50,
          height: 60,
          rotation: 0,
          seatCount: 1,
          locked: false,
          zIndex: 1,
          templateType: 'single',
        },
      ];

      const result = positionTablesRelative(
        tables,
        { x: 100, y: 100 },
        { width: 900, height: 600 },
        false, // no snapping for precise test
        false, // no paste offset for precise test
      );

      // Tables should move together maintaining their relative positions
      // Original bounds: x:0-110, y:0-130, center: (55, 65)
      // Moving center to (100, 100) means translation: (45, 35)
      expect(result[0].x).toBe(45); // 0 + 45
      expect(result[0].y).toBe(35); // 0 + 35
      expect(result[1].x).toBe(105); // 60 + 45
      expect(result[1].y).toBe(105); // 70 + 35

      // Verify relative distance is preserved
      const originalDistance = Math.sqrt((60 - 0) ** 2 + (70 - 0) ** 2);
      const newDistance = Math.sqrt(
        (result[1].x - result[0].x) ** 2 + (result[1].y - result[0].y) ** 2,
      );
      expect(Math.abs(newDistance - originalDistance)).toBeLessThan(0.01);
    });
  });

  describe('calculateDragDelta', () => {
    it('should calculate precise delta without snapping', () => {
      const startMouse = { x: 10.5, y: 20.3 };
      const currentMouse = { x: 15.7, y: 25.9 };

      const delta = calculateDragDelta(startMouse, currentMouse, false);

      expect(delta.x).toBeCloseTo(5.2, 1);
      expect(delta.y).toBeCloseTo(5.6, 1);
    });

    it('should snap delta when grid snapping is enabled', () => {
      const startMouse = { x: 10.5, y: 20.3 };
      const currentMouse = { x: 15.7, y: 25.9 };

      const delta = calculateDragDelta(startMouse, currentMouse, true);

      // Delta should be snapped to grid (GRID_SNAP_SIZE = 5)
      expect(delta.x).toBe(5);
      expect(delta.y).toBe(5);
    });
  });

  describe('applyDragMovement', () => {
    it('should apply movement to specific tables only', () => {
      const tables: ClassroomTable[] = [
        {
          x: 10,
          y: 10,
          width: 50,
          height: 60,
          rotation: 0,
          seatCount: 1,
          locked: false,
          zIndex: 0,
          templateType: 'single',
        },
        {
          x: 100,
          y: 100,
          width: 50,
          height: 60,
          rotation: 0,
          seatCount: 1,
          locked: false,
          zIndex: 1,
          templateType: 'single',
        },
      ];

      const result = applyDragMovement(
        tables,
        [0], // only move first table
        [{ x: 10, y: 10 }], // start position
        { x: 20, y: 30 }, // delta
        { width: 900, height: 600 },
      );

      // First table should move
      expect(result[0].x).toBe(30);
      expect(result[0].y).toBe(40);

      // Second table should stay the same
      expect(result[1].x).toBe(100);
      expect(result[1].y).toBe(100);
    });

    it('should keep rotated tables flush with walls when clamped', () => {
      const tables: ClassroomTable[] = [
        {
          x: 200,
          y: 200,
          width: 55,
          height: 130,
          rotation: 90,
          seatCount: 2,
          locked: false,
          zIndex: 0,
          templateType: 'double',
        },
      ];

      const result = applyDragMovement(
        tables,
        [0],
        [{ x: 200, y: 200 }],
        { x: -400, y: -400 },
        { width: 900, height: 600 },
      );

      const adjustedPosition = getRotationAdjustedPosition(result[0]);
      const adjustedDimensions = getRotationAdjustedDimensions(result[0]);

      expect(adjustedPosition.x).toBe(0);
      expect(adjustedPosition.y).toBe(0);
      expect(adjustedDimensions.width).toBe(130);
      expect(adjustedDimensions.height).toBe(55);
    });
  });
});
