// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  getPhotoRadius,
  computePhotoCircles,
  getPhotoCollisions,
} from '../photoOverlap';
import type { ClassroomTable, TableTemplateType } from '../../../types';

const createTable = (
  overrides: Partial<ClassroomTable> & { templateType?: TableTemplateType },
): ClassroomTable => ({
  x: 100,
  y: 100,
  width: 60,
  height: 40,
  rotation: 0,
  seatCount: 1,
  locked: false,
  zIndex: 0,
  templateType: 'single',
  ...overrides,
});

describe('photoOverlap', () => {
  describe('getPhotoRadius', () => {
    it('scales with the smaller seat dimension', () => {
      expect(getPhotoRadius(60, 40)).toBe(14);
    });

    it('clamps small seats to the minimum radius', () => {
      expect(getPhotoRadius(20, 20)).toBe(9);
    });

    it('clamps large seats to the maximum radius', () => {
      expect(getPhotoRadius(80, 80)).toBe(18);
    });
  });

  describe('computePhotoCircles', () => {
    it('places double-table photos outside the left edge', () => {
      const table = createTable({
        templateType: 'double',
        seatCount: 2,
        width: 60,
        height: 80,
      });

      const circles = computePhotoCircles([table]);

      // seatWidth 60, seatHeight 40 -> radius 14, offset 14.5 left of x=100
      expect(circles).toEqual([
        { tableIndex: 0, seatIndex: 0, x: 85.5, y: 120, radius: 14 },
        { tableIndex: 0, seatIndex: 1, x: 85.5, y: 160, radius: 14 },
      ]);
    });

    it('rotates photo positions around the table center', () => {
      const table = createTable({ rotation: 180 });

      const [circle] = computePhotoCircles([table]);

      // Left-docked photo (x = 85.5) flips to the right side of the table.
      expect(circle!.x).toBeCloseTo(174.5);
      expect(circle!.y).toBeCloseTo(120);
      expect(circle!.radius).toBe(14);
    });
  });

  describe('getPhotoCollisions', () => {
    it('returns no collisions for tables far apart', () => {
      const tables = [
        createTable({ x: 200, y: 200 }),
        createTable({ x: 600, y: 400 }),
      ];

      expect(getPhotoCollisions(tables)).toEqual([]);
    });

    it('flags photos of adjacent tables that would overlap', () => {
      const tables = [
        createTable({ x: 300, y: 200 }),
        createTable({ x: 320, y: 200 }),
      ];

      const collisions = getPhotoCollisions(tables);

      expect(collisions).toHaveLength(2);
      expect(collisions.map((c) => c.tableIndex)).toEqual([0, 1]);
    });

    it('detects overlap caused by table rotation', () => {
      const tables = [
        createTable({ x: 300, y: 200 }),
        // Rotated 180°, so its photo flips to the right and lands exactly on
        // the neighbour's left-docked photo.
        createTable({ x: 211, y: 200, rotation: 180 }),
      ];

      expect(getPhotoCollisions(tables)).toHaveLength(2);
    });

    it('does not flag exactly touching photos', () => {
      // Photo centers end up exactly 2 × radius apart (tangent circles).
      const tables = [
        createTable({ x: 300, y: 200 }),
        createTable({ x: 328, y: 200 }),
      ];

      expect(getPhotoCollisions(tables)).toEqual([]);
    });

    it('flags photos crossing the left classroom wall', () => {
      const collisions = getPhotoCollisions([createTable({ x: 10, y: 200 })]);

      expect(collisions).toHaveLength(1);
      expect(collisions[0]!.tableIndex).toBe(0);
    });

    it('flags photos crossing the right wall after rotation', () => {
      const tables = [createTable({ x: 830, y: 200, rotation: 180 })];

      expect(getPhotoCollisions(tables)).toHaveLength(1);
    });

    it('does not flag photos just inside the wall', () => {
      // Photo left edge sits at x = 0.5, within the collision tolerance.
      expect(getPhotoCollisions([createTable({ x: 29, y: 200 })])).toEqual([]);
    });

    it('never flags a standard group table against itself', () => {
      const table = createTable({
        templateType: 'group4',
        seatCount: 4,
        width: 80,
        height: 80,
        x: 400,
        y: 300,
      });

      expect(getPhotoCollisions([table])).toEqual([]);
    });
  });
});
