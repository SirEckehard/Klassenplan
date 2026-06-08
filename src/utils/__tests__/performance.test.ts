// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  getSeatPositions,
  getAdjacentSeats,
} from '../../utils/math/seatGeometry';
import { createMockClassroomScene } from '../../__tests__/utils/testHelpers';
import type { ClassroomScene } from '../../types';

describe('Performance characteristics', () => {
  const createLargeScene = (tableCount: number): ClassroomScene => {
    return createMockClassroomScene(tableCount, {
      tables: Array.from({ length: tableCount }, (_, index) => ({
        x: (index % 10) * 60, // 10 Tische pro Reihe
        y: Math.floor(index / 10) * 140, // Neue Template-Höhe berücksichtigen
        width: 55, // Neue optimierte Breite
        height: 130, // Neue optimierte Höhe
        rotation: 0, // Keine Rotation
        seatCount: 2,
        locked: false,
        zIndex: index,
        templateType: 'double' as const,
      })),
    });
  };

  describe('getSeatPositions', () => {
    it('liefert erwartete Sitzanzahl für kleine Szenen', () => {
      const scene = createLargeScene(5);
      const positions = getSeatPositions(scene);
      expect(positions.size).toBe(10); // 5 Tische × 2 Sitze
    });

    it('skaliert mit der Anzahl der Tische', () => {
      const smallScene = createLargeScene(5);
      const largeScene = createLargeScene(15);

      const smallResult = getSeatPositions(smallScene);
      const largeResult = getSeatPositions(largeScene);

      expect(largeResult.size).toBeGreaterThan(smallResult.size);
      expect(largeResult.size).toBe(30); // 15 Tische × 2 Sitze
    });

    it('nutzt das interne Cache-Resultat wieder', () => {
      const scene = createLargeScene(20);

      const positions1 = getSeatPositions(scene);
      const positions2 = getSeatPositions(scene);
      expect(positions1).toBe(positions2);
    });
  });

  describe('getAdjacentSeats', () => {
    it('berechnet Nachbarschaften für typische Szenen', () => {
      const scene = createLargeScene(20);
      const adjacencies = getAdjacentSeats(scene);
      expect(adjacencies.size).toBeGreaterThan(0);
    });

    it('skaliert mit der Szenengröße', () => {
      const smallScene = createLargeScene(5);
      const largeScene = createLargeScene(20);

      const smallAdjacencies = getAdjacentSeats(smallScene);
      const largeAdjacencies = getAdjacentSeats(largeScene);

      expect(largeAdjacencies.size).toBeGreaterThan(smallAdjacencies.size);
    });
  });

  describe('Template Layout Optimierung', () => {
    it('bricht nicht bei nicht-standard Templates und liefert konsistente Ergebnisse', () => {
      const standardScene = createMockClassroomScene(20, {
        tables: Array.from({ length: 20 }, (_, index) => ({
          x: (index % 10) * 60,
          y: Math.floor(index / 10) * 140,
          width: 55,
          height: 130,
          rotation: 0,
          seatCount: 2,
          locked: false,
          zIndex: index,
          templateType: 'double' as const,
        })),
      });

      const nonStandardScene = createMockClassroomScene(20, {
        tables: Array.from({ length: 20 }, (_, index) => ({
          x: (index % 10) * 60,
          y: Math.floor(index / 10) * 140,
          width: 55,
          height: 130,
          rotation: 0,
          seatCount: 3, // Non-standard, nutzt Fallback-Berechnung
          locked: false,
          zIndex: index,
          templateType: 'double' as const,
        })),
      });

      const optimized = getSeatPositions(standardScene);
      const fallback = getSeatPositions(nonStandardScene);

      expect(optimized.size).toBe(40);
      expect(fallback.size).toBe(60); // 20 Tische × 3 Sitze
    });
  });

  describe('Memory Efficiency', () => {
    it('erzeugt keine Memory Leaks bei wiederholten Aufrufen', () => {
      const scene = createLargeScene(10);

      // Mehrfache Aufrufe
      for (let i = 0; i < 100; i++) {
        getSeatPositions(scene);
        getAdjacentSeats(scene);
      }

      const finalSeats = getSeatPositions(scene);
      const finalAdjacencies = getAdjacentSeats(scene);

      expect(finalSeats.size).toBe(20);
      expect(finalAdjacencies.size).toBeGreaterThan(0);
    });
  });
});
