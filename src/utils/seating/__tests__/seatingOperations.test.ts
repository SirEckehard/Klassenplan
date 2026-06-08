// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { addSeatingForTables } from '../seatingOperations';
import type { SeatingArrangement } from '../../../types';

describe('seatingOperations', () => {
  describe('addSeatingForTables', () => {
    it('should add seat arrays for new tables to empty seating', () => {
      const currentSeating: SeatingArrangement = [];
      const tables = [{ seatCount: 2 }, { seatCount: 4 }];

      const result = addSeatingForTables(currentSeating, tables);

      expect(result).toEqual([
        [null, null], // 2 seats
        [null, null, null, null], // 4 seats
      ]);
    });

    it('should append seat arrays to existing seating arrangement', () => {
      const student1 = {
        id: 's1',
        name: 'Alice',
        gender: 'girl' as const,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      };
      const student2 = {
        id: 's2',
        name: 'Bob',
        gender: 'boy' as const,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      };

      const currentSeating: SeatingArrangement = [
        [student1, student2],
        [null, null, null],
      ];
      const tables = [{ seatCount: 4 }, { seatCount: 1 }];

      const result = addSeatingForTables(currentSeating, tables);

      expect(result).toEqual([
        [student1, student2], // Existing table 1
        [null, null, null], // Existing table 2
        [null, null, null, null], // New table 1 (4 seats)
        [null], // New table 2 (1 seat)
      ]);
    });

    it('should not mutate the original seating array', () => {
      const currentSeating: SeatingArrangement = [[null, null]];
      const tables = [{ seatCount: 2 }];

      const result = addSeatingForTables(currentSeating, tables);

      // Original should be unchanged
      expect(currentSeating).toEqual([[null, null]]);
      // Result should be different reference
      expect(result).not.toBe(currentSeating);
      // Result should have new seats
      expect(result.length).toBe(2);
    });

    it('should handle single table addition', () => {
      const currentSeating: SeatingArrangement = [[null]];
      const tables = [{ seatCount: 6 }];

      const result = addSeatingForTables(currentSeating, tables);

      expect(result).toEqual([
        [null], // Existing
        [null, null, null, null, null, null], // New 6-seat table
      ]);
    });

    it('should handle empty tables array', () => {
      const currentSeating: SeatingArrangement = [[null, null]];
      const tables: Array<{ seatCount: number }> = [];

      const result = addSeatingForTables(currentSeating, tables);

      expect(result).toEqual([[null, null]]);
      expect(result).not.toBe(currentSeating); // Still returns new array
    });

    it('should handle zero-seat table (edge case)', () => {
      const currentSeating: SeatingArrangement = [[null]];
      const tables = [{ seatCount: 0 }];

      const result = addSeatingForTables(currentSeating, tables);

      expect(result).toEqual([
        [null], // Existing
        [], // Empty array for zero-seat table
      ]);
    });

    it('should preserve immutability with multiple tables', () => {
      const currentSeating: SeatingArrangement = [];
      const tables = [
        { seatCount: 1 },
        { seatCount: 2 },
        { seatCount: 4 },
        { seatCount: 6 },
      ];

      const result = addSeatingForTables(currentSeating, tables);

      expect(result.length).toBe(4);
      expect(result[0].length).toBe(1);
      expect(result[1].length).toBe(2);
      expect(result[2].length).toBe(4);
      expect(result[3].length).toBe(6);
      expect(currentSeating).toEqual([]); // Original unchanged
    });
  });
});
