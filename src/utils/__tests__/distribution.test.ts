import { describe, it, expect } from 'vitest';
import { evenTargetsFor } from '../distribution';

describe('evenTargetsFor', () => {
  it('verteilt 27 Schüler auf 6 Tische à 6 Plätze (3x5, 3x4)', () => {
    const seatCounts = Array(6).fill(6);
    const result = evenTargetsFor(27, seatCounts);
    // Check total is correct
    expect(result.reduce((sum, n) => sum + n, 0)).toBe(27);
    // Check distribution: should have 3 tables with 5 and 3 tables with 4
    const sorted = [...result].sort((a, b) => b - a);
    expect(sorted).toEqual([5, 5, 5, 4, 4, 4]);
  });

  it('füllt alle Plätze, wenn genug Schüler vorhanden sind', () => {
    const seatCounts = Array(5).fill(6);
    expect(evenTargetsFor(30, seatCounts)).toEqual([6, 6, 6, 6, 6]);
  });

  it('verteilt gleichmäßig, wenn weniger Schüler als Plätze (2x3, 2x2)', () => {
    const seatCounts = Array(4).fill(6);
    const result = evenTargetsFor(10, seatCounts);
    // Check total is correct
    expect(result.reduce((sum, n) => sum + n, 0)).toBe(10);
    // Check distribution: should have 2 tables with 3 and 2 tables with 2
    const sorted = [...result].sort((a, b) => b - a);
    expect(sorted).toEqual([3, 3, 2, 2]);
  });

  it('geht korrekt mit 1 Tisch um', () => {
    expect(evenTargetsFor(5, [6])).toEqual([5]);
  });

  it('gibt ein Array voller Nullen zurück, wenn keine Schüler vorhanden sind', () => {
    const seatCounts = [2, 3];
    expect(evenTargetsFor(0, seatCounts)).toEqual([0, 0]);
  });

  it('gibt ein leeres Array zurück, wenn keine Tische vorhanden sind', () => {
    expect(evenTargetsFor(10, [])).toEqual([]);
  });

  it('überschreitet die Kapazität bei unterschiedlichen seatCounts nicht', () => {
    const seatCounts = [1, 2, 4];
    expect(evenTargetsFor(10, seatCounts)).toEqual([1, 2, 4]);
    expect(evenTargetsFor(6, seatCounts)).toEqual([1, 2, 3]);
    const result = evenTargetsFor(5, seatCounts);
    result.forEach((r, idx) => expect(r).toBeLessThanOrEqual(seatCounts[idx]!));
  });
});
