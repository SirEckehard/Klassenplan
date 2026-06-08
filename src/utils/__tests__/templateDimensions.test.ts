// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { getTablePresets, TABLE_PRESETS } from '../../utils/constants';

describe('Template Dimensions System', () => {
  describe('getTablePresets', () => {
    it('returns current unified template presets', () => {
      const presets = getTablePresets();

      // Single: Half of double height (55x65)
      expect(presets.single).toEqual({
        seatCount: 1,
        width: 55,
        height: 65,
      });

      // Double: Base unit (55x130)
      expect(presets.double).toEqual({
        seatCount: 2,
        width: 55,
        height: 130,
      });

      // Group4: Two doubles side by side (110x130)
      expect(presets.group4).toEqual({
        seatCount: 4,
        width: 110,
        height: 130,
      });

      // Group6: "|=" layout - three doubles wide (165x130)
      expect(presets.group6).toEqual({
        seatCount: 6,
        width: 165,
        height: 130,
      });
    });

    it('behält Konsistenz zu TABLE_PRESETS', () => {
      const functionPresets = getTablePresets();

      expect(functionPresets).toEqual(TABLE_PRESETS);
    });
  });

  describe('Template Optimizations', () => {
    it('Single-Tische sind halb so hoch wie Double', () => {
      const single = getTablePresets().single;
      const double = getTablePresets().double;

      expect(single.width).toBe(double.width); // Same width
      expect(single.height).toBe(double.height / 2); // Half height
      expect(single.seatCount).toBe(1);
    });

    it('Double-Tische sind die Grundeinheit', () => {
      const preset = getTablePresets().double;

      expect(preset.width).toBe(55);
      expect(preset.height).toBe(130);
      expect(preset.seatCount).toBe(2);
    });

    it('Group4-Tische sind zwei Doubles nebeneinander', () => {
      const double = getTablePresets().double;
      const group4 = getTablePresets().group4;

      expect(group4.width).toBe(double.width * 2); // 110
      expect(group4.height).toBe(double.height); // 130
      expect(group4.seatCount).toBe(4);
    });

    it('Group6-Tische haben "|=" Layout (3 Doubles breit)', () => {
      const double = getTablePresets().double;
      const group6 = getTablePresets().group6;

      expect(group6.width).toBe(double.width * 3); // 165
      expect(group6.height).toBe(double.height); // 130
      expect(group6.seatCount).toBe(6);
    });
  });

  describe('Boundary Tests für Template-Größen', () => {
    it('alle Templates passen in Standard-Klassenzimmer', () => {
      const CLASSROOM_WIDTH = 900;
      const CLASSROOM_HEIGHT = 600;
      const BOARD_WIDTH = 24;
      const MARGIN = 40;

      const availableWidth = CLASSROOM_WIDTH - BOARD_WIDTH - 2 * MARGIN;
      const availableHeight = CLASSROOM_HEIGHT - 2 * MARGIN;

      const presets = getTablePresets();

      Object.entries(presets).forEach(([_type, preset]) => {
        expect(preset.width).toBeLessThanOrEqual(availableWidth);
        expect(preset.height).toBeLessThanOrEqual(availableHeight);
      });
    });

    it('einheitliche Dimensionen erlauben konsistente Anordnung', () => {
      const presets = getTablePresets();

      // All table types have the same height (based on double)
      expect(presets.single.height).toBe(presets.double.height / 2);
      expect(presets.group4.height).toBe(presets.double.height);
      expect(presets.group6.height).toBe(presets.double.height);

      // Widths are multiples of single/double width
      expect(presets.group4.width).toBe(presets.double.width * 2);
      expect(presets.group6.width).toBe(presets.double.width * 3);
    });
  });

  describe('Sitzplatz-Effizienz', () => {
    it('Single-Template ist platzsparend für Einzelarbeitsplätze', () => {
      const preset = getTablePresets().single;
      const flaeche = preset.width * preset.height;
      const flaecheProSitzplatz = flaeche / preset.seatCount;

      // Single: 55 * 65 = 3575
      expect(flaecheProSitzplatz).toBe(3575);
    });

    it('Double-Template ist optimal für Paararbeit', () => {
      const preset = getTablePresets().double;
      const flaeche = preset.width * preset.height;
      const flaecheProSitzplatz = flaeche / preset.seatCount;

      // Double: (55 * 130) / 2 = 3575
      expect(flaecheProSitzplatz).toBe(3575);
    });

    it('Group4-Template ist optimal für Gruppenarbeit', () => {
      const preset = getTablePresets().group4;
      const flaeche = preset.width * preset.height;
      const flaecheProSitzplatz = flaeche / preset.seatCount;

      // Group4: (110 * 130) / 4 = 3575
      expect(flaecheProSitzplatz).toBe(3575);
    });

    it('alle Templates haben gleiche Effizienz pro Sitzplatz', () => {
      const presets = getTablePresets();

      const efficiencies = Object.values(presets).map((preset) => {
        return (preset.width * preset.height) / preset.seatCount;
      });

      // All efficiencies should be equal (3575)
      expect(new Set(efficiencies).size).toBe(1);
      expect(efficiencies[0]).toBe(3575);
    });
  });
});
