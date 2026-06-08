import { describe, expect, it } from 'vitest';
import arrangeTables from '../algorithm/autoArrange';
import {
  getTablePresets,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  BOARD_WIDTH,
} from '../constants';

const MARGIN = 40;

describe('arrangeTables', () => {
  it('creates layout for seven group tables', () => {
    const tables = arrangeTables('group4', 7);
    expect(tables).toHaveLength(7);

    // With new layout: 4 per row, so 7 tables = 4 in first row, 3 in second row
    const yPositions = [...new Set(tables.map((t) => t.y))].sort(
      (a, b) => a - b,
    );
    expect(yPositions).toHaveLength(2); // Should have exactly 2 rows

    const topRowTables = tables.filter((t) => t.y === yPositions[0]);
    const bottomRowTables = tables.filter((t) => t.y === yPositions[1]);

    expect(topRowTables).toHaveLength(4); // 4 tables in first row
    expect(bottomRowTables).toHaveLength(3); // 3 tables in second row

    // All tables should be within canvas bounds
    tables.forEach((table) => {
      expect(table.x).toBeGreaterThanOrEqual(0);
      expect(table.y).toBeGreaterThanOrEqual(0);
      expect(table.x + table.width).toBeLessThanOrEqual(
        CLASSROOM_WIDTH - BOARD_WIDTH,
      );
      expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
    });
  });

  it('arranges single tables with appropriate spacing', () => {
    const tables = arrangeTables('single', 2);
    expect(tables).toHaveLength(2);

    // Check that tables are properly spaced and centered
    const sortedByX = tables.sort((a, b) => b.x - a.x); // sort by x descending (right to left)
    const distanceBetweenTables = sortedByX[0].x - sortedByX[1].x;

    // With dynamic spacing, the distance should be reasonable (not overlapping)
    expect(distanceBetweenTables).toBeGreaterThan(
      getTablePresets().single.width,
    );
    expect(distanceBetweenTables).toBeLessThan(200); // But not too far apart

    // All tables should be within canvas bounds
    tables.forEach((table) => {
      expect(table.x).toBeGreaterThanOrEqual(0);
      expect(table.y).toBeGreaterThanOrEqual(0);
      expect(table.x + table.width).toBeLessThanOrEqual(
        CLASSROOM_WIDTH - BOARD_WIDTH,
      );
      expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
    });
  });

  it('arranges double tables in vertical columns with optimal spacing', () => {
    const tables = arrangeTables('double', 8);
    expect(tables).toHaveLength(8);

    // With new layout: 3 tables per column, so 8 tables = 3 columns (3+3+2)
    const yPositions = Array.from(new Set(tables.map((t) => t.y))).sort(
      (a, b) => a - b,
    );
    expect(yPositions).toHaveLength(3); // Should have 3 unique Y positions (3 tables per column max)

    // Should have 3 unique X positions (3 columns for 8 tables: 3+3+2)
    const xPositions = Array.from(new Set(tables.map((t) => t.x))).sort(
      (a, b) => b - a, // descending (right to left)
    );
    expect(xPositions).toHaveLength(3);

    // All tables should be within canvas bounds
    tables.forEach((table) => {
      expect(table.x).toBeGreaterThanOrEqual(0);
      expect(table.y).toBeGreaterThanOrEqual(0);
      expect(table.x + table.width).toBeLessThanOrEqual(
        CLASSROOM_WIDTH - BOARD_WIDTH,
      );
      expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
    });
  });

  it('arranges multiple double table columns correctly (3 tables per column)', () => {
    const tables = arrangeTables('double', 18);
    expect(tables).toHaveLength(18);

    const xPositions = Array.from(new Set(tables.map((t) => t.x))).sort(
      (a, b) => b - a, // descending (right to left)
    );
    const yPositions = Array.from(new Set(tables.map((t) => t.y))).sort(
      (a, b) => a - b,
    );

    // 18 tables / 3 tables per column = 6 columns
    const expectedColumns = Math.ceil(18 / 3);
    expect(xPositions).toHaveLength(expectedColumns);

    // Should have 3 Y positions (3 tables per column max)
    expect(yPositions).toHaveLength(3);

    // All tables should be within canvas bounds
    tables.forEach((table) => {
      expect(table.x).toBeGreaterThanOrEqual(0);
      expect(table.y).toBeGreaterThanOrEqual(0);
      expect(table.x + table.width).toBeLessThanOrEqual(
        CLASSROOM_WIDTH - BOARD_WIDTH,
      );
      expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
    });
  });

  // Edge Case Tests für neue Template-Dimensionen
  describe('Edge Cases mit neuen Template-Dimensionen', () => {
    it('Single-Tische passen korrekt in kleines Klassenzimmer', () => {
      const tables = arrangeTables('single', 10);
      expect(tables).toHaveLength(10);

      const preset = getTablePresets().single;

      // Alle Tische müssen in Klassenzimmer-Grenzen liegen
      tables.forEach((table) => {
        expect(table.x).toBeGreaterThanOrEqual(0);
        expect(table.y).toBeGreaterThanOrEqual(MARGIN);
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(
          CLASSROOM_HEIGHT - MARGIN,
        );

        // Neue Dimensionen und 0° Rotation
        expect(table.width).toBe(preset.width);
        expect(table.height).toBe(preset.height);
        expect(table.rotation).toBe(0);
      });
    });

    it('Double-Tische mit neuen Dimensionen (55x130) funktionieren korrekt', () => {
      const tables = arrangeTables('double', 8);
      expect(tables).toHaveLength(8);

      const DOUBLE_TABLE_MARGIN = 35;
      tables.forEach((table) => {
        // Neue Double-Dimensionen: 55x130 (optimiert für 0° Rotation)
        expect(table.width).toBe(55);
        expect(table.height).toBe(130);
        expect(table.rotation).toBe(0);
        expect(table.seatCount).toBe(2);

        // Boundary-Check mit korrekten Margins für Double-Tische
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(
          CLASSROOM_HEIGHT - DOUBLE_TABLE_MARGIN,
        );
      });
    });

    it('Group4-Tische haben einheitliche Dimensionen', () => {
      const tables = arrangeTables('group4', 4);
      expect(tables).toHaveLength(4);

      tables.forEach((table) => {
        // Group4: zwei Doubles nebeneinander (110x130)
        expect(table.width).toBe(110);
        expect(table.height).toBe(130);
        expect(table.rotation).toBe(0);
        expect(table.seatCount).toBe(4);
      });
    });

    it('Group6-Tische haben "|=" Layout (165x130)', () => {
      const tables = arrangeTables('group6', 3);
      expect(tables).toHaveLength(3);

      tables.forEach((table) => {
        // Group6: "|=" Layout - drei Doubles breit (165x130)
        expect(table.width).toBe(165);
        expect(table.height).toBe(130);
        expect(table.rotation).toBe(0);
        expect(table.seatCount).toBe(6);
        expect(table.templateType).toBe('group6');

        // Boundary-Check
        expect(table.x).toBeGreaterThanOrEqual(0);
        expect(table.y).toBeGreaterThanOrEqual(MARGIN);
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(
          CLASSROOM_HEIGHT - MARGIN,
        );
      });
    });

    it('Group6-Tische haben korrekte Platzierungslogik (3 pro Reihe)', () => {
      const tables = arrangeTables('group6', 6);
      expect(tables).toHaveLength(6);

      // Should arrange in 2 rows with max 3 tables per row
      const yPositions = [...new Set(tables.map((t) => t.y))].sort(
        (a, b) => a - b,
      );
      expect(yPositions).toHaveLength(2); // Should have exactly 2 rows

      const topRowTables = tables.filter((t) => t.y === yPositions[0]);
      const bottomRowTables = tables.filter((t) => t.y === yPositions[1]);

      expect(topRowTables.length).toBe(3); // First 3 tables on top row
      expect(bottomRowTables.length).toBe(3); // Next 3 tables on bottom row

      // All tables should be within canvas bounds
      tables.forEach((table) => {
        expect(table.x).toBeGreaterThanOrEqual(0);
        expect(table.y).toBeGreaterThanOrEqual(0);
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
      });
    });

    it('verifies right-to-left arrangement for all table types', () => {
      // Test single tables: should arrange from right to left
      const singleTables = arrangeTables('single', 4);
      const singleXPositions = singleTables
        .map((t) => t.x)
        .sort((a, b) => b - a); // sort descending
      expect(singleXPositions[0]).toBeGreaterThan(singleXPositions[1]); // rightmost > second from right
      expect(singleXPositions[1]).toBeGreaterThan(singleXPositions[2]); // second > third
      expect(singleXPositions[2]).toBeGreaterThan(singleXPositions[3]); // third > leftmost

      // Test group4 tables: should arrange from right to left
      const group4Tables = arrangeTables('group4', 3);
      const group4XPositions = group4Tables
        .map((t) => t.x)
        .sort((a, b) => b - a);
      expect(group4XPositions[0]).toBeGreaterThan(group4XPositions[1]);
      expect(group4XPositions[1]).toBeGreaterThan(group4XPositions[2]);

      // Test group6 tables: should arrange from right to left
      const group6Tables = arrangeTables('group6', 3);
      const group6XPositions = group6Tables
        .map((t) => t.x)
        .sort((a, b) => b - a);
      expect(group6XPositions[0]).toBeGreaterThan(group6XPositions[1]);
      expect(group6XPositions[1]).toBeGreaterThan(group6XPositions[2]);

      // Test double tables: should arrange from right to left
      const doubleTables = arrangeTables('double', 4);
      const doubleXPositions = [...new Set(doubleTables.map((t) => t.x))].sort(
        (a, b) => b - a,
      ); // unique X positions only
      expect(doubleXPositions.length).toBeGreaterThanOrEqual(2); // Should have at least 2 different columns
      if (doubleXPositions.length >= 2) {
        expect(doubleXPositions[0]).toBeGreaterThan(doubleXPositions[1]); // rightmost column > leftmost column
      }
    });

    it('centers tables horizontally in available space', () => {
      const singleTables = arrangeTables('single', 1);
      const doubleTables = arrangeTables('double', 1);
      const group4Tables = arrangeTables('group4', 1);
      const group6Tables = arrangeTables('group6', 1);

      // Available width = CLASSROOM_WIDTH - BOARD_WIDTH - 2 * CANVAS_MARGIN
      const CANVAS_MARGIN = 30;
      const availableWidth = CLASSROOM_WIDTH - BOARD_WIDTH - 2 * CANVAS_MARGIN;

      // Calculate center of each table arrangement
      const singleCenter = singleTables[0].x + singleTables[0].width / 2;
      const doubleCenter = doubleTables[0].x + doubleTables[0].width / 2;
      const group4Center = group4Tables[0].x + group4Tables[0].width / 2;
      const group6Center = group6Tables[0].x + group6Tables[0].width / 2;

      // Expected center = CANVAS_MARGIN + availableWidth / 2
      const expectedCenter = CANVAS_MARGIN + availableWidth / 2;

      // All tables should be approximately centered (within grid snap tolerance)
      const tolerance = 10; // Allow for grid snapping
      expect(Math.abs(singleCenter - expectedCenter)).toBeLessThanOrEqual(
        tolerance,
      );
      expect(Math.abs(doubleCenter - expectedCenter)).toBeLessThanOrEqual(
        tolerance,
      );
      expect(Math.abs(group4Center - expectedCenter)).toBeLessThanOrEqual(
        tolerance,
      );
      expect(Math.abs(group6Center - expectedCenter)).toBeLessThanOrEqual(
        tolerance,
      );
    });

    it('Angemessene Anzahl Tische passt in Klassenzimmer', () => {
      // Test mit realistischer Anzahl Tische
      const reasonableTables = arrangeTables('single', 20);

      reasonableTables.forEach((table, index) => {
        expect(table.x).toBeGreaterThanOrEqual(0);
        expect(table.y).toBeGreaterThanOrEqual(MARGIN);
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(
          CLASSROOM_HEIGHT - MARGIN,
        );

        // Keine Überlappungen prüfen
        for (let i = index + 1; i < reasonableTables.length; i++) {
          const otherTable = reasonableTables[i];
          const noOverlap =
            table.x + table.width <= otherTable.x ||
            otherTable.x + otherTable.width <= table.x ||
            table.y + table.height <= otherTable.y ||
            otherTable.y + otherTable.height <= table.y;
          expect(noOverlap).toBe(true);
        }
      });
    });

    it('autoArrange respektiert Klassenzimmer-Grenzen auch bei Überlauf', () => {
      // Test mit mehr Tischen als reinpassen um Boundary-Verhalten zu testen
      const overflowTables = arrangeTables('single', 36);

      // autoArrange sollte versuchen, alle Tische zu platzieren, auch wenn sie überlaufen
      expect(overflowTables).toHaveLength(36);

      // All tables should be within canvas bounds (new centered system uses CANVAS_MARGIN = 30)
      const CANVAS_MARGIN = 30;
      overflowTables.forEach((table) => {
        expect(table.x).toBeGreaterThanOrEqual(0);
        expect(table.y).toBeGreaterThanOrEqual(CANVAS_MARGIN);
        expect(table.x + table.width).toBeLessThanOrEqual(
          CLASSROOM_WIDTH - BOARD_WIDTH,
        );
        expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
      });
    });
  });
});
