// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { getSeatPositions } from '../../utils/math/seatGeometry';
import { getTablePresets } from '../../utils/constants';
import arrangeTables from '../../utils/algorithm/autoArrange';
import type { ClassroomScene, ClassroomTable } from '../../types';

describe('Integration Tests - Template System', () => {
  describe('Seat Positioning mit neuen Template-Dimensionen', () => {
    it('Single-Tische haben korrekte Sitzplatz-Positionen', () => {
      const preset = getTablePresets().single;
      const table: ClassroomTable = {
        x: 100,
        y: 100,
        width: preset.width, // 55
        height: preset.height, // 65
        rotation: 0,
        seatCount: preset.seatCount, // 1
        locked: false,
        zIndex: 0,
        templateType: 'single',
      };

      const scene: ClassroomScene = {
        totalStudents: 1,
        tables: [table],
      };

      const positions = getSeatPositions(scene);
      const seatPosition = positions.get('0-0');

      // Sitzplatz sollte in der Mitte des Tisches sein
      expect(seatPosition?.x).toBeCloseTo(127.5, 1); // 100 + 55/2
      expect(seatPosition?.y).toBeCloseTo(132.5, 1); // 100 + 65/2
    });

    it('Double-Tische haben korrekte vertikale Sitzplatz-Anordnung', () => {
      const preset = getTablePresets().double;
      const table: ClassroomTable = {
        x: 0,
        y: 0,
        width: preset.width, // 55
        height: preset.height, // 130
        rotation: 0,
        seatCount: preset.seatCount, // 2
        locked: false,
        zIndex: 0,
        templateType: 'double',
      };

      const scene: ClassroomScene = {
        totalStudents: 2,
        tables: [table],
      };

      const positions = getSeatPositions(scene);
      const seat1 = positions.get('0-0');
      const seat2 = positions.get('0-1');

      // Sitze sollten vertikal übereinander angeordnet sein (55x130 Template)
      expect(seat1?.x).toBeCloseTo(27.5, 1); // 0 + (55/2) - Mitte der Breite
      expect(seat1?.y).toBeCloseTo(32.5, 1); // 0 + (65/2) - Mitte der oberen Hälfte
      expect(seat2?.x).toBeCloseTo(27.5, 1); // Gleiche X-Position
      expect(seat2?.y).toBeCloseTo(97.5, 1); // 0 + 65 + (65/2) - Mitte der unteren Hälfte
    });

    it('Group4-Tische haben korrekte 2x2-Anordnung', () => {
      const preset = getTablePresets().group4;
      const table: ClassroomTable = {
        x: 0,
        y: 0,
        width: preset.width, // 110
        height: preset.height, // 130
        rotation: 0,
        seatCount: preset.seatCount, // 4
        locked: false,
        zIndex: 0,
        templateType: 'group4',
      };

      const scene: ClassroomScene = {
        totalStudents: 4,
        tables: [table],
      };

      const positions = getSeatPositions(scene);
      const seats = [
        positions.get('0-0'), // Oben links
        positions.get('0-1'), // Oben rechts
        positions.get('0-2'), // Unten links
        positions.get('0-3'), // Unten rechts
      ];

      // 2x2 Grid-Anordnung prüfen (110x130)
      expect(seats[0]?.x).toBeCloseTo(27.5, 1); // Erste Spalte (110/4)
      expect(seats[0]?.y).toBeCloseTo(32.5, 1); // Erste Reihe (130/4)
      expect(seats[1]?.x).toBeCloseTo(82.5, 1); // Zweite Spalte (110*3/4)
      expect(seats[1]?.y).toBeCloseTo(32.5, 1); // Erste Reihe
      expect(seats[2]?.x).toBeCloseTo(27.5, 1); // Erste Spalte
      expect(seats[2]?.y).toBeCloseTo(97.5, 1); // Zweite Reihe (130*3/4)
      expect(seats[3]?.x).toBeCloseTo(82.5, 1); // Zweite Spalte
      expect(seats[3]?.y).toBeCloseTo(97.5, 1); // Zweite Reihe
    });
  });

  describe('Auto-Arrange mit neuen Dimensionen', () => {
    it('Single-Tische werden optimal angeordnet', () => {
      const tables = arrangeTables('single', 6);
      const preset = getTablePresets().single;

      expect(tables).toHaveLength(6);

      tables.forEach((table) => {
        // Alle Tische haben korrekte neue Dimensionen
        expect(table.width).toBe(preset.width); // 55
        expect(table.height).toBe(preset.height); // 70
        expect(table.rotation).toBe(0);
        expect(table.seatCount).toBe(1);
        expect(table.templateType).toBe('single');
      });

      // Keine Überlappungen
      for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
          const t1 = tables[i];
          const t2 = tables[j];
          const noOverlap =
            t1.x + t1.width <= t2.x ||
            t2.x + t2.width <= t1.x ||
            t1.y + t1.height <= t2.y ||
            t2.y + t2.height <= t1.y;
          expect(noOverlap).toBe(true);
        }
      }
    });

    it('Double-Tische nutzen neue Dimensionen effizient', () => {
      const tables = arrangeTables('double', 8);
      const preset = getTablePresets().double;

      expect(tables).toHaveLength(8);

      tables.forEach((table) => {
        // Alle Tische haben korrekte neue Dimensionen
        expect(table.width).toBe(preset.width); // 55
        expect(table.height).toBe(preset.height); // 130
        expect(table.rotation).toBe(0);
        expect(table.seatCount).toBe(2);
        expect(table.templateType).toBe('double');
      });

      // Tische sollten in Klassenzimmer passen
      const CLASSROOM_WIDTH = 900;
      const CLASSROOM_HEIGHT = 600;
      const BOARD_WIDTH = 24; // Must match actual constants.ts value
      const CANVAS_MARGIN = 30; // Updated to match new centered arrangement system

      tables.forEach((table) => {
        expect(table.x).toBeGreaterThanOrEqual(0);
        expect(table.y).toBeGreaterThanOrEqual(CANVAS_MARGIN);
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(
          CLASSROOM_HEIGHT - CANVAS_MARGIN,
        );
      });
    });
  });

  describe('Grid-Snapping mit neuen Dimensionen', () => {
    it('Tische werden systematisch angeordnet', () => {
      const tables = arrangeTables('single', 6);

      // Tische sollten systematisch angeordnet werden (nicht alle zufällig)
      const xPositions = Array.from(new Set(tables.map((t) => t.x))).sort(
        (a, b) => a - b,
      );
      const yPositions = Array.from(new Set(tables.map((t) => t.y))).sort(
        (a, b) => a - b,
      );

      // Sollte mehrere Spalten/Reihen geben für 6 Tische
      expect(xPositions.length).toBeGreaterThan(1);
      expect(yPositions.length).toBeGreaterThan(0);

      // Abstände zwischen Positionen sollten konsistent sein
      if (xPositions.length > 1) {
        const spacing = xPositions[1] - xPositions[0];
        expect(spacing).toBeGreaterThan(55); // Mindestens Tisch-Breite + Abstand
      }
    });

    it('neue Template-Dimensionen sind Grid-kompatibel', () => {
      const GRID_SIZE = 20;
      const presets = getTablePresets();

      Object.entries(presets).forEach(([_type, preset]) => {
        // Dimensionen sollten Grid-freundlich sein oder akzeptable Abweichungen haben
        const widthRemainder = preset.width % GRID_SIZE;
        const heightRemainder = preset.height % GRID_SIZE;

        // Einheitliche Dimensionen basierend auf Double (55x130):
        // Widths: 55 % 20 = 15 (single/double), 110 % 20 = 10 (group4), 165 % 20 = 5 (group6)
        // Heights: 65 % 20 = 5 (single), 130 % 20 = 10 (double/group4/group6)
        const acceptableWidths = [5, 10, 15]; // Unified dimension remainders
        const acceptableHeights = [5, 10]; // Unified dimension remainders

        expect(acceptableWidths.includes(widthRemainder)).toBe(true);
        expect(acceptableHeights.includes(heightRemainder)).toBe(true);
      });
    });
  });

  describe('Backwards-Kompatibilität', () => {
    it('Legacy-Szenen können geladen werden', () => {
      // Simuliere alte Szene mit 90° rotierten Tischen
      const legacyScene: ClassroomScene = {
        totalStudents: 2,
        tables: [
          {
            x: 100,
            y: 100,
            width: 70, // Alte Single-Dimensionen
            height: 55,
            rotation: 90, // Alte Rotation
            seatCount: 1,
            locked: false,
            zIndex: 0,
            templateType: 'single',
          },
        ],
      };

      // System sollte mit Legacy-Daten umgehen können
      expect(() => getSeatPositions(legacyScene)).not.toThrow();
      const positions = getSeatPositions(legacyScene);
      expect(positions.size).toBe(1);
    });
  });

  describe('Performance mit neuen Templates', () => {
    it('große Szenen werden schnell verarbeitet', () => {
      const tables = arrangeTables('double', 20);
      const scene: ClassroomScene = {
        totalStudents: 40,
        tables,
      };

      const startTime = performance.now();
      const positions = getSeatPositions(scene);
      const endTime = performance.now();

      expect(positions.size).toBe(40); // 20 Tische × 2 Sitze
      expect(endTime - startTime).toBeLessThan(10); // Unter 10ms
    });
  });
});
