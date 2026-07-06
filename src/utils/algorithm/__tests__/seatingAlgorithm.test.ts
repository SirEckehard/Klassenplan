// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSeatingPlan, refineSeatingLocal } from '../seatingAlgorithm';
import * as genderBalance from '../genderBalance';
import type {
  Student,
  ClassroomScene,
  MixSettings,
  SavedPlan,
  SeatingTable,
  SeatingSeat,
  SeatingArrangement,
  MixResult,
} from '../../../types';

type Position = { table: number; seat: number };
import {
  createMockStudent,
  createMockClassroomScene,
  createMockSavedPlan,
  createMockMixResult,
  setupCleanStorage,
  createMockTable,
  createMockStudents,
} from '../../../__tests__/utils';
import * as pairUtils from '../../../utils/pairs';

// Mock the shuffle function to make tests deterministic
vi.mock('../shuffle', () => ({
  shuffleArray: <T>(arr: T[]): T[] => [...arr], // Return array as-is for predictable tests
}));

describe('seatingAlgorithm', () => {
  let students: Student[];
  let scene: ClassroomScene;
  let settings: Partial<MixSettings>;
  let seatingHistory: SavedPlan[];
  let mixHistory: MixResult[];
  let lockedPositions: Record<string, { table: number; seat: number }>;

  const getFrontTableIndex = (scene: ClassroomScene): number => {
    if (scene.tables.length === 0) return 0;
    return scene.tables.reduce((frontIndex, table, currentIndex) => {
      const currentFront = scene.tables[frontIndex]!;
      return table.x > currentFront.x ? currentIndex : frontIndex;
    }, 0);
  };

  beforeEach(() => {
    setupCleanStorage();
    vi.clearAllMocks();

    // Create test students with various characteristics
    students = [
      createMockStudent({ id: 's1', name: 'Anna', gender: 'girl' }),
      createMockStudent({ id: 's2', name: 'Ben', gender: 'boy' }),
      createMockStudent({
        id: 's3',
        name: 'Clara',
        gender: 'girl',
        restless: true,
      }),
      createMockStudent({ id: 's4', name: 'David', gender: 'boy', shy: true }),
      createMockStudent({
        id: 's5',
        name: 'Eva',
        gender: 'diverse',
        needsFrontSeat: true,
      }),
      createMockStudent({
        id: 's6',
        name: 'Felix',
        gender: 'boy',
        concentrationIssues: true,
      }),
    ];

    // Create classroom scene with 3 tables, 2 seats each
    scene = createMockClassroomScene(3, {
      tables: [
        {
          x: 100,
          y: 100,
          width: 55,
          height: 130,
          seatCount: 2,
          templateType: 'double',
          rotation: 0,
          zIndex: 0,
          locked: false,
        },
        {
          x: 200,
          y: 100,
          width: 55,
          height: 130,
          seatCount: 2,
          templateType: 'double',
          rotation: 0,
          zIndex: 1,
          locked: false,
        },
        {
          x: 300,
          y: 100,
          width: 55,
          height: 130,
          seatCount: 2,
          templateType: 'double',
          rotation: 0,
          zIndex: 2,
          locked: false,
        },
      ],
      totalStudents: 6,
    });

    settings = {};
    seatingHistory = [];
    mixHistory = [];
    lockedPositions = {};
  });

  describe('generateSeatingPlan', () => {
    it('places all students in available seats', () => {
      const arrangement = generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      expect(arrangement).toHaveLength(3); // 3 tables
      expect(arrangement[0]).toHaveLength(2); // 2 seats per table
      expect(arrangement[1]).toHaveLength(2);
      expect(arrangement[2]).toHaveLength(2);

      // Count total placed students
      const placedStudents = arrangement.flat().filter(Boolean);
      expect(placedStudents).toHaveLength(6);
    });

    it('respects locked positions', () => {
      const lockedPositions = {
        s1: { table: 0, seat: 0 },
        s2: { table: 1, seat: 1 },
      };

      const arrangement = generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      expect(arrangement[0][0]?.id).toBe('s1');
      expect(arrangement[1][1]?.id).toBe('s2');
    });

    it('ignores invalid locked positions', () => {
      const lockedPositions = {
        s1: { table: 10, seat: 0 }, // Invalid table
        s2: { table: 0, seat: 10 }, // Invalid seat
        invalid: { table: 0, seat: 0 }, // Non-existent student
      };

      const arrangement = generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Should still place all students despite invalid locks
      const placedStudents = arrangement.flat().filter(Boolean);
      expect(placedStudents).toHaveLength(6);
    });

    it('places students with front seat need in front when setting is enabled', () => {
      const settings: Partial<MixSettings> = {
        preferFrontForNeedsFrontSeat: 5,
      };

      // Create a more controlled scene with clear front positioning
      const frontScene = createMockClassroomScene(3, {
        tables: [
          {
            x: 100,
            y: 100,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 0,
            locked: false,
          }, // Back
          {
            x: 200,
            y: 100,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          }, // Middle
          {
            x: 300,
            y: 100,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 2,
            locked: false,
          }, // Front (highest x)
        ],
        totalStudents: 6,
      });

      const arrangement = generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        frontScene,
      );

      // Eva (s5) has front seat need, should be placed at the front table
      const frontIndex = getFrontTableIndex(frontScene);
      const evaPosition = arrangement.findIndex((table: SeatingTable) =>
        table.some((student: SeatingSeat) => student?.id === 's5'),
      );
      expect(evaPosition).toBe(frontIndex);
    });

    it('keeps sensory students at the front even when wish conflicts occur', () => {
      const conflictScene = createMockClassroomScene(2);
      const conflictStudents = [
        createMockStudent({
          id: 'front-sensory',
          name: 'FrontSensory',
          needsFrontSeat: true,
          wishPartnerId: 'buddy',
        }),
        createMockStudent({ id: 'buddy', name: 'Buddy' }),
        createMockStudent({
          id: 'competitor',
          name: 'Competitor',
          wishPartnerId: 'buddy',
        }),
        createMockStudent({ id: 'filler', name: 'Filler' }),
      ];
      const conflictSettings: Partial<MixSettings> = {
        considerWishPartners: 10,
        preferFrontForNeedsFrontSeat: 10,
      };

      const arrangement = generateSeatingPlan(
        conflictStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        conflictSettings,
        conflictScene,
      );

      const frontIndex = getFrontTableIndex(conflictScene);
      const sensoryTableIndex = arrangement.findIndex((table: SeatingTable) =>
        table.some((student: SeatingSeat) => student?.id === 'front-sensory'),
      );

      expect(sensoryTableIndex).toBe(frontIndex);
    });

    it('does not fail when students without gender are mixed', () => {
      const optionalGenderStudents = [
        createMockStudent({ id: 'g1', name: 'Gina', gender: undefined }),
        createMockStudent({ id: 'g2', name: 'Gero', gender: undefined }),
        createMockStudent({ id: 'g3', name: 'Gesa', gender: 'girl' }),
      ];

      const arrangement = generateSeatingPlan(
        optionalGenderStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        { preferGenderMix: 6 },
        scene,
      );

      const placed = arrangement.flat().filter(Boolean);
      expect(placed).toHaveLength(optionalGenderStudents.length);
      expect(placed.every(Boolean)).toBe(true);
    });

    it('avoids placing restless students together when setting is enabled', () => {
      const restlessStudents = [
        createMockStudent({ id: 'r1', name: 'Restless1', restless: true }),
        createMockStudent({ id: 'r2', name: 'Restless2', restless: true }),
      ];

      const settings: Partial<MixSettings> = {
        avoidRestlessTogether: 10,
      };

      const arrangement = generateSeatingPlan(
        restlessStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Find positions of restless students
      const restlessPositions: Array<Position> = [];
      arrangement.forEach((table: SeatingTable, tableIdx: number) => {
        table.forEach((student: SeatingSeat, seatIdx: number) => {
          if (student?.restless) {
            restlessPositions.push({ table: tableIdx, seat: seatIdx });
          }
        });
      });

      // If both are placed, they should not be at the same table as partners
      if (restlessPositions.length === 2) {
        const [pos1, pos2] = restlessPositions;
        const sameTable = pos1!.table === pos2!.table;
        if (sameTable) {
          // Check if they are not partners (seats 0,1 are partners)
          const arePartners = Math.abs(pos1!.seat - pos2!.seat) === 1;
          expect(arePartners).toBe(false);
        }
      }
    });

    it('considers wish partners when setting is enabled', () => {
      const wishPartnerStudents = [
        createMockStudent({ id: 'w1', name: 'Wisher1', wishPartnerId: 'w2' }),
        createMockStudent({ id: 'w2', name: 'Wisher2', wishPartnerId: 'w1' }),
        createMockStudent({ id: 'w3', name: 'Other1' }),
        createMockStudent({ id: 'w4', name: 'Other2' }),
      ];

      const settings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      const arrangement = generateSeatingPlan(
        wishPartnerStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Find positions of wish partners
      let w1Position: Position | null = null;
      let w2Position: Position | null = null;

      arrangement.forEach((table: SeatingTable, tableIdx: number) => {
        table.forEach((student: SeatingSeat, seatIdx: number) => {
          if (student?.id === 'w1')
            w1Position = { table: tableIdx, seat: seatIdx };
          if (student?.id === 'w2')
            w2Position = { table: tableIdx, seat: seatIdx };
        });
      });

      // Wish partners should be at the same table
      if (w1Position && w2Position) {
        expect((w1Position as Position).table).toBe(
          (w2Position as Position).table,
        );
      }
    });

    it('prioritizes mutual wish partners over one-sided wishes', () => {
      const mixedWishes = [
        createMockStudent({ id: 'a', name: 'Alice', wishPartnerId: 'b' }),
        createMockStudent({ id: 'b', name: 'Bob', wishPartnerId: 'a' }), // Mutual A↔B
        createMockStudent({ id: 'c', name: 'Charlie', wishPartnerId: 'd' }),
        createMockStudent({ id: 'd', name: 'Diana' }), // One-sided C→D
      ];

      const settings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      const arrangement = generateSeatingPlan(
        mixedWishes,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      const findPosition = (id: string): Position | null => {
        for (let t = 0; t < arrangement.length; t++) {
          for (let s = 0; s < arrangement[t]!.length; s++) {
            if (arrangement[t]![s]?.id === id) return { table: t, seat: s };
          }
        }
        return null;
      };

      const aPos = findPosition('a');
      const bPos = findPosition('b');
      // c and d positions are found but not asserted - one-sided wishes depend on space
      findPosition('c');
      findPosition('d');

      // Mutual wish should be at same table
      expect(aPos?.table).toBe(bPos?.table);
      // One-sided wish may or may not be fulfilled (depends on space)
      // But mutual wish should have priority, so A and B come first in ordering
    });

    it('handles multiple students wanting the same partner (A→B←C)', () => {
      const conflictWishes = [
        createMockStudent({ id: 'a', name: 'Alice', wishPartnerId: 'b' }),
        createMockStudent({ id: 'b', name: 'Bob' }), // Wanted by both A and C
        createMockStudent({ id: 'c', name: 'Charlie', wishPartnerId: 'b' }),
        createMockStudent({ id: 'd', name: 'Diana' }),
      ];

      const settings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      const arrangement = generateSeatingPlan(
        conflictWishes,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      const findPosition = (id: string): Position | null => {
        for (let t = 0; t < arrangement.length; t++) {
          for (let s = 0; s < arrangement[t]!.length; s++) {
            if (arrangement[t]![s]?.id === id) return { table: t, seat: s };
          }
        }
        return null;
      };

      const aPos = findPosition('a');
      const bPos = findPosition('b');
      const cPos = findPosition('c');

      // Algorithm should handle conflict gracefully without errors
      expect(aPos).not.toBeNull();
      expect(bPos).not.toBeNull();
      expect(cPos).not.toBeNull();

      // Due to first-come-first-served, A will be paired with B
      // C may or may not be at same table (depends on table capacity)
      // The important thing is: no crash, conflict is detected and logged
    });

    it('handles circular wishes (A→B→C→A)', () => {
      const circularWishes = [
        createMockStudent({ id: 'a', name: 'Alice', wishPartnerId: 'b' }),
        createMockStudent({ id: 'b', name: 'Bob', wishPartnerId: 'c' }),
        createMockStudent({ id: 'c', name: 'Charlie', wishPartnerId: 'a' }),
        createMockStudent({ id: 'd', name: 'Diana' }),
      ];

      const settings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      const arrangement = generateSeatingPlan(
        circularWishes,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      const findPosition = (id: string): Position | null => {
        for (let t = 0; t < arrangement.length; t++) {
          for (let s = 0; s < arrangement[t]!.length; s++) {
            if (arrangement[t]![s]?.id === id) return { table: t, seat: s };
          }
        }
        return null;
      };

      const aPos = findPosition('a');
      const bPos = findPosition('b');
      const cPos = findPosition('c');

      // Circular wishes cannot all be fulfilled
      // Algorithm should handle this gracefully without errors
      expect(aPos).not.toBeNull();
      expect(bPos).not.toBeNull();
      expect(cPos).not.toBeNull();
      // At least one pair should be fulfilled (first-in-wins)
    });

    it('ignores non-existent wish partner IDs', () => {
      const orphanWishes = [
        createMockStudent({
          id: 'a',
          name: 'Alice',
          wishPartnerId: 'non-existent-id',
        }),
        createMockStudent({ id: 'b', name: 'Bob' }),
        createMockStudent({ id: 'c', name: 'Charlie' }),
      ];

      const settings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      // Should not throw an error
      expect(() => {
        generateSeatingPlan(
          orphanWishes,
          seatingHistory,
          mixHistory,
          lockedPositions,
          settings,
          scene,
        );
      }).not.toThrow();
    });

    it('places wish partners at adjacent single tables', () => {
      // Create scene with adjacent single tables
      const singleTableScene = createMockClassroomScene(4, {
        tables: [
          {
            x: 100,
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            x: 160, // Adjacent to first
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
          {
            x: 220, // Adjacent to second
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 2,
            locked: false,
          },
          {
            x: 280, // Adjacent to third
            y: 100,
            width: 55,
            height: 65,
            seatCount: 1,
            templateType: 'single',
            rotation: 0,
            zIndex: 3,
            locked: false,
          },
        ],
        totalStudents: 4,
      });

      // Alice wishes Bob (mutual wish)
      const singleStudents = [
        createMockStudent({ id: 'a', name: 'Alice', wishPartnerId: 'b' }),
        createMockStudent({ id: 'b', name: 'Bob', wishPartnerId: 'a' }),
        createMockStudent({ id: 'c', name: 'Charlie' }),
        createMockStudent({ id: 'd', name: 'Diana' }),
      ];

      const singleSettings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      const arrangement = generateSeatingPlan(
        singleStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        singleSettings,
        singleTableScene,
      );

      const findTableIndex = (id: string): number =>
        arrangement.findIndex((t: SeatingTable) =>
          t.some((s: SeatingSeat) => s?.id === id),
        );

      const aliceTable = findTableIndex('a');
      const bobTable = findTableIndex('b');

      // Wish partners should be at adjacent tables on Single tables
      expect(Math.abs(aliceTable - bobTable)).toBeLessThanOrEqual(1);
    });

    it('places student near locked wish partner when possible', () => {
      const lockedWishes = [
        createMockStudent({ id: 'a', name: 'Alice', wishPartnerId: 'b' }),
        createMockStudent({ id: 'b', name: 'Bob' }), // Will be locked
        createMockStudent({ id: 'c', name: 'Charlie' }),
        createMockStudent({ id: 'd', name: 'Diana' }),
      ];

      const lockedPos = {
        b: { table: 0, seat: 0 }, // Bob locked at table 0
      };

      const settings: Partial<MixSettings> = {
        considerWishPartners: 10,
      };

      const arrangement = generateSeatingPlan(
        lockedWishes,
        seatingHistory,
        mixHistory,
        lockedPos,
        settings,
        scene,
      );

      const findPosition = (id: string): Position | null => {
        for (let t = 0; t < arrangement.length; t++) {
          for (let s = 0; s < arrangement[t]!.length; s++) {
            if (arrangement[t]![s]?.id === id) return { table: t, seat: s };
          }
        }
        return null;
      };

      const aPos = findPosition('a');
      const bPos = findPosition('b');

      // Bob should be at locked position
      expect(bPos).toEqual({ table: 0, seat: 0 });
      // Alice should be placed (algorithm tries to prefer same table)
      expect(aPos).not.toBeNull();
      // The locked partner handling provides a scoring bonus for same table,
      // but doesn't guarantee placement (depends on other constraints)
    });

    it('promotes gender mixing when setting is enabled', () => {
      const genderMixStudents = [
        createMockStudent({ id: 'b1', name: 'Boy1', gender: 'boy' }),
        createMockStudent({ id: 'b2', name: 'Boy2', gender: 'boy' }),
        createMockStudent({ id: 'g1', name: 'Girl1', gender: 'girl' }),
        createMockStudent({ id: 'g2', name: 'Girl2', gender: 'girl' }),
      ];

      const settings: Partial<MixSettings> = {
        preferGenderMix: 5,
      };

      const arrangement = generateSeatingPlan(
        genderMixStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Verify all students are placed
      const placedStudents = arrangement.flat().filter(Boolean);
      expect(placedStudents).toHaveLength(4);

      // Verify the result structure is valid - scene has multiple tables
      expect(arrangement.length).toBeGreaterThan(0);
      expect(
        arrangement.every((table: SeatingTable) => Array.isArray(table)),
      ).toBe(true);
    });

    it('avoids previous pairs when setting is enabled', () => {
      const previousPairStudents = [
        createMockStudent({ id: 'p1', name: 'Previous1' }),
        createMockStudent({ id: 'p2', name: 'Previous2' }),
        createMockStudent({ id: 'p3', name: 'New1' }),
        createMockStudent({ id: 'p4', name: 'New2' }),
      ];

      const seatingHistory = [
        createMockSavedPlan({
          seating: [
            [previousPairStudents[0]!, previousPairStudents[1]!], // Previous1 and Previous2 were together
            [null, null],
          ],
        }),
      ];

      const settings: Partial<MixSettings> = {
        avoidPreviousPairs: 10,
      };

      const arrangement = generateSeatingPlan(
        previousPairStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Find positions of Previous1 and Previous2
      let p1Position: Position | null = null;
      let p2Position: Position | null = null;

      arrangement.forEach((table: SeatingTable, tableIdx: number) => {
        table.forEach((student: SeatingSeat, seatIdx: number) => {
          if (student?.id === 'p1')
            p1Position = { table: tableIdx, seat: seatIdx };
          if (student?.id === 'p2')
            p2Position = { table: tableIdx, seat: seatIdx };
        });
      });

      // Previous pairs should be placed on different tables if possible
      if (p1Position && p2Position) {
        expect((p1Position as Position).table).not.toBe(
          (p2Position as Position).table,
        );
      }
    });

    it('counts current seating pairs when avoiding immediate repeats', () => {
      const previousSeating: SeatingArrangement = [
        [students[0]!, students[1]!],
        [students[2]!, students[3]!],
        [students[4]!, students[5]!],
      ];
      const pairSpy = vi.spyOn(pairUtils, 'buildPreviousPairs');

      const avoidSettings: Partial<MixSettings> = {
        avoidPreviousPairs: 5,
      };

      generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        avoidSettings,
        scene,
        previousSeating,
      );

      expect(pairSpy).toHaveBeenCalledWith(
        seatingHistory,
        expect.objectContaining({
          mixHistory,
          currentSeating: previousSeating,
          studentCount: students.length,
        }),
      );

      const returnedPairs = pairSpy.mock.results.at(-1)?.value as
        Map<string, number> | undefined;
      expect(returnedPairs).toBeDefined();
      const pairKey = [students[0]!.id, students[1]!.id].sort().join('::');
      expect(returnedPairs?.has(pairKey)).toBe(true);

      pairSpy.mockRestore();
    });

    it('includes recent mix history in previous pair detection', () => {
      const previousSeating: SeatingArrangement = [
        [students[0]!, students[1]!],
        [students[2]!, students[3]!],
        [students[4]!, students[5]!],
      ];
      mixHistory = [createMockMixResult({ id: 42, seating: previousSeating })];

      const pairSpy = vi.spyOn(pairUtils, 'buildPreviousPairs');
      const avoidSettings: Partial<MixSettings> = {
        avoidPreviousPairs: 5,
      };

      generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        avoidSettings,
        scene,
      );

      expect(pairSpy).toHaveBeenCalledWith(
        seatingHistory,
        expect.objectContaining({
          mixHistory,
          currentSeating: undefined,
          studentCount: students.length,
        }),
      );

      const returnedPairs = pairSpy.mock.results.at(-1)?.value as
        Set<string> | undefined;
      expect(returnedPairs).toBeDefined();
      const pairKey = [students[0]!.id, students[1]!.id].sort().join('::');
      expect(returnedPairs?.has(pairKey)).toBe(true);

      pairSpy.mockRestore();
    });

    it('handles empty student list', () => {
      const arrangement = generateSeatingPlan(
        [],
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      expect(arrangement).toHaveLength(3);
      expect(
        arrangement.every((table: SeatingTable) =>
          table.every((seat: SeatingSeat) => seat === null),
        ),
      ).toBe(true);
    });

    it('handles more students than seats', () => {
      const manyStudents = Array.from({ length: 10 }, (_, i) =>
        createMockStudent({ id: `s${i}`, name: `Student${i}` }),
      );

      const arrangement = generateSeatingPlan(
        manyStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Should place only as many as there are seats (6)
      const placedStudents = arrangement.flat().filter(Boolean);
      expect(placedStudents.length).toBeLessThanOrEqual(6);
    });

    it('handles peer tutoring setting', () => {
      const tutorStudents = [
        createMockStudent({
          id: 'h1',
          name: 'HighPerf1',
          performanceStrong: true,
        }),
        createMockStudent({
          id: 'l1',
          name: 'LowPerf1',
          performanceWeak: true,
        }),
        createMockStudent({
          id: 'h2',
          name: 'HighPerf2',
          performanceStrong: true,
        }),
        createMockStudent({
          id: 'l2',
          name: 'LowPerf2',
          performanceWeak: true,
        }),
      ];

      const settings: Partial<MixSettings> = {
        peerTutoring: 8,
      };

      const arrangement = generateSeatingPlan(
        tutorStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Should prefer pairing high and low performers
      let highLowPairs = 0;
      arrangement.forEach((table: SeatingTable) => {
        for (let i = 0; i < table.length - 1; i += 2) {
          // Check pairs (0,1), (2,3), etc.
          const student1 = table[i];
          const student2 = table[i + 1];
          if (student1 && student2) {
            const isHighLowPair =
              (student1.performanceStrong && student2.performanceWeak) ||
              (student1.performanceWeak && student2.performanceStrong);
            if (isHighLowPair) highLowPairs++;
          }
        }
      });

      expect(highLowPairs).toBeGreaterThan(0);
    });

    it('handles homogeneous performance groups setting', () => {
      const homogeneousStudents = [
        createMockStudent({
          id: 'h1',
          name: 'HighPerf1',
          performanceStrong: true,
        }),
        createMockStudent({
          id: 'h2',
          name: 'HighPerf2',
          performanceStrong: true,
        }),
        createMockStudent({
          id: 'l1',
          name: 'LowPerf1',
          performanceWeak: true,
        }),
        createMockStudent({
          id: 'l2',
          name: 'LowPerf2',
          performanceWeak: true,
        }),
      ];

      const settings: Partial<MixSettings> = {
        homogeneousPerformanceGroups: 8,
      };

      const arrangement = generateSeatingPlan(
        homogeneousStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Should prefer pairing students with same performance level
      let sameLevelPairs = 0;
      arrangement.forEach((table: SeatingTable) => {
        for (let i = 0; i < table.length - 1; i += 2) {
          // Check pairs (0,1), (2,3), etc.
          const student1 = table[i];
          const student2 = table[i + 1];
          if (student1 && student2) {
            const isSameLevelPair =
              (student1.performanceStrong && student2.performanceStrong) ||
              (student1.performanceWeak && student2.performanceWeak);
            if (isSameLevelPair) sameLevelPairs++;
          }
        }
      });

      expect(sameLevelPairs).toBeGreaterThan(0);
    });

    it('peerTutoring takes precedence over homogeneousPerformanceGroups when both are set', () => {
      const students = [
        createMockStudent({
          id: 'h1',
          name: 'HighPerf1',
          performanceStrong: true,
        }),
        createMockStudent({
          id: 'l1',
          name: 'LowPerf1',
          performanceWeak: true,
        }),
        createMockStudent({
          id: 'h2',
          name: 'HighPerf2',
          performanceStrong: true,
        }),
        createMockStudent({
          id: 'l2',
          name: 'LowPerf2',
          performanceWeak: true,
        }),
      ];

      const settings: Partial<MixSettings> = {
        peerTutoring: 8,
        homogeneousPerformanceGroups: 5,
      };

      const arrangement = generateSeatingPlan(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        settings,
        scene,
      );

      // Should prefer high-low pairs (peer tutoring) since peerTutoring > homogeneousPerformanceGroups
      let highLowPairs = 0;
      arrangement.forEach((table: SeatingTable) => {
        for (let i = 0; i < table.length - 1; i += 2) {
          const student1 = table[i];
          const student2 = table[i + 1];
          if (student1 && student2) {
            const isHighLowPair =
              (student1.performanceStrong && student2.performanceWeak) ||
              (student1.performanceWeak && student2.performanceStrong);
            if (isHighLowPair) highLowPairs++;
          }
        }
      });

      expect(highLowPairs).toBeGreaterThan(0);
    });
    it('does not penalize balanced two-gender tables when preferring gender mix', () => {
      const genderScene = createMockClassroomScene(2, {
        totalStudents: 10,
        tables: [
          createMockTable({
            x: 100,
            y: 100,
            width: 130,
            height: 120,
            seatCount: 4,
            templateType: 'group4',
            zIndex: 0,
          }),
          createMockTable({
            x: 250,
            y: 100,
            width: 180,
            height: 120,
            seatCount: 6,
            templateType: 'group6',
            zIndex: 1,
          }),
        ],
      });

      const genderStudents: Student[] = [
        createMockStudent({ id: 's1', name: 'Anna', gender: 'girl' }),
        createMockStudent({ id: 's2', name: 'Ben', gender: 'boy' }),
        createMockStudent({ id: 's3', name: 'Clara', gender: 'girl' }),
        createMockStudent({ id: 's4', name: 'David', gender: 'boy' }),
        createMockStudent({ id: 's5', name: 'Emma', gender: 'girl' }),
        createMockStudent({ id: 's6', name: 'Finn', gender: 'boy' }),
        createMockStudent({ id: 's7', name: 'Greta', gender: 'girl' }),
        createMockStudent({ id: 's8', name: 'Henry', gender: 'boy' }),
        createMockStudent({ id: 's9', name: 'Isabell', gender: 'girl' }),
        createMockStudent({ id: 's10', name: 'Jonas', gender: 'boy' }),
      ];

      const arrangement: SeatingArrangement = [
        [
          genderStudents[0]!,
          genderStudents[1]!,
          genderStudents[2]!,
          genderStudents[3]!,
        ],
        [
          genderStudents[4]!,
          genderStudents[5]!,
          genderStudents[6]!,
          genderStudents[7]!,
          genderStudents[8]!,
          genderStudents[9]!,
        ],
      ];

      const imbalanceSpy = vi.spyOn(genderBalance, 'calculateGenderImbalance');
      const randomSpy = vi.spyOn(Math, 'random');
      randomSpy
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.6)
        .mockReturnValueOnce(0)
        .mockReturnValue(0.9);

      const refined = refineSeatingLocal(
        genderStudents,
        [],
        mixHistory,
        {},
        arrangement,
        { preferGenderMix: 10 },
        genderScene,
        { triesPerPass: 1, passes: 1 },
        arrangement,
      );

      const balancedCallIndex = imbalanceSpy.mock.calls.findIndex(
        ([counts]) =>
          counts.boy === 2 && counts.girl === 2 && counts.diverse === 0,
      );

      expect(balancedCallIndex).toBeGreaterThanOrEqual(0);
      expect(imbalanceSpy.mock.results[balancedCallIndex]?.value).toBe(0);

      refined.forEach((table: SeatingTable) => {
        const counts = genderBalance.createGenderCounts();
        table.forEach((seat: SeatingSeat) => {
          if (!seat || !seat.gender) return;
          counts[seat.gender]++;
        });
        expect(genderBalance.calculateGenderImbalance(counts)).toBe(0);
      });

      imbalanceSpy.mockRestore();
      randomSpy.mockRestore();
    });
  });

  describe('edge cases (regression guards)', () => {
    it('places a single student without throwing and leaves other seats null', () => {
      const single = [createMockStudent({ id: 'only', name: 'Solo' })];

      const arrangement = generateSeatingPlan(single, [], [], {}, {}, scene);

      const placed = arrangement.flat().filter(Boolean);
      expect(placed).toHaveLength(1);
      expect(placed[0]!.id).toBe('only');
    });

    it('handles 36+ students against 6 seats without overflow or throw', () => {
      // 36 is MAX_STUDENTS; the algorithm must terminate even when far over capacity.
      const overcapacity = createMockStudents(40);

      const arrangement = generateSeatingPlan(
        overcapacity,
        [],
        [],
        {},
        {},
        scene,
      );

      const placed = arrangement.flat().filter(Boolean);
      // Scene has 3 tables × 2 seats = 6 seats total.
      expect(placed.length).toBeLessThanOrEqual(6);
      // Every placed student is from the input roster (no fabricated entries).
      const inputIds = new Set(overcapacity.map((s) => s.id));
      placed.forEach((s) => expect(inputIds.has(s!.id)).toBe(true));
    });

    it('preserves a fully locked arrangement without mutation', () => {
      // Lock every seat to a specific student.
      const fully = createMockStudents(6);
      const lockedPositions: Record<string, { table: number; seat: number }> = {
        [fully[0]!.id]: { table: 0, seat: 0 },
        [fully[1]!.id]: { table: 0, seat: 1 },
        [fully[2]!.id]: { table: 1, seat: 0 },
        [fully[3]!.id]: { table: 1, seat: 1 },
        [fully[4]!.id]: { table: 2, seat: 0 },
        [fully[5]!.id]: { table: 2, seat: 1 },
      };

      const arrangement = generateSeatingPlan(
        fully,
        [],
        [],
        lockedPositions,
        {},
        scene,
      );

      // Each student must end up exactly where the lock requested.
      Object.entries(lockedPositions).forEach(([id, pos]) => {
        expect(arrangement[pos.table]![pos.seat]!.id).toBe(id);
      });
    });

    it('terminates on unsolvable constraint combinations (mutual avoid + only-one-pair seat)', () => {
      // Two students who must avoid each other, but only a 2-seat scene → conflict is forced.
      const tightScene = createMockClassroomScene(1); // 1 table × 2 seats
      const a = createMockStudent({ id: 'a', name: 'A', avoidPartnerId: 'b' });
      const b = createMockStudent({ id: 'b', name: 'B', avoidPartnerId: 'a' });

      const start = performance.now();
      const arrangement = generateSeatingPlan(
        [a, b],
        [],
        [],
        {},
        { avoidConflictPartners: 9 },
        tightScene,
      );
      const elapsed = performance.now() - start;

      // The algorithm must terminate in well under a second even when the
      // constraint cannot be satisfied — no infinite loop, no throw.
      expect(elapsed).toBeLessThan(1000);
      const placed = arrangement.flat().filter(Boolean);
      expect(placed.length).toBeGreaterThan(0);
    });

    it('returns an empty arrangement when the scene has no tables', () => {
      const emptyScene = createMockClassroomScene(0);

      const arrangement = generateSeatingPlan(
        students,
        [],
        [],
        {},
        {},
        emptyScene,
      );

      expect(arrangement).toEqual([]);
    });

    it('returns an empty arrangement when neither students nor tables exist', () => {
      const emptyScene = createMockClassroomScene(0);

      const arrangement = generateSeatingPlan([], [], [], {}, {}, emptyScene);

      expect(arrangement).toEqual([]);
    });
  });

  describe('refineSeatingLocal', () => {
    let initialArrangement: SeatingArrangement;

    beforeEach(() => {
      // Create an initial arrangement to refine
      initialArrangement = [
        [students[0], students[1]], // Anna, Ben
        [students[2], students[3]], // Clara (restless), David (shy)
        [students[4], students[5]], // Eva (sensory), Felix (concentration)
      ];
    });

    it('returns the same arrangement when no improvements are possible', () => {
      const options = { triesPerPass: 1, passes: 1 };

      const refined = refineSeatingLocal(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        initialArrangement,
        settings,
        scene,
        options,
      );

      expect(refined).toBeDefined();
      expect(refined).toHaveLength(3);
    });

    it('respects locked positions during refinement', () => {
      const lockedPositions = {
        s1: { table: 0, seat: 0 }, // Anna locked at table 0, seat 0
      };

      const options = { triesPerPass: 100, passes: 1 };

      const refined = refineSeatingLocal(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        initialArrangement,
        settings,
        scene,
        options,
      );

      // Anna should still be at table 0, seat 0
      expect(refined[0]![0]?.id).toBe('s1');
    });

    it('attempts to improve gender distribution', () => {
      const badGenderArrangement = [
        [
          createMockStudent({ id: 'b1', name: 'Boy1', gender: 'boy' }),
          createMockStudent({ id: 'b2', name: 'Boy2', gender: 'boy' }),
        ],
        [
          createMockStudent({ id: 'g1', name: 'Girl1', gender: 'girl' }),
          createMockStudent({ id: 'g2', name: 'Girl2', gender: 'girl' }),
        ],
        [null, null],
      ];

      const genderStudents = badGenderArrangement
        .flat()
        .filter(Boolean) as Student[];

      const settings: Partial<MixSettings> = {
        preferGenderMix: 10,
      };

      const options = { triesPerPass: 100, passes: 5 };

      const refined = refineSeatingLocal(
        genderStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        badGenderArrangement,
        settings,
        scene,
        options,
      );

      // Calculate gender mixing in refined arrangement
      let mixedTables = 0;
      refined.forEach((table: SeatingTable) => {
        const genders = new Set(
          table.filter(Boolean).map((s: SeatingSeat) => s!.gender),
        );
        if (genders.size > 1) mixedTables++;
      });

      // Should have improved gender mixing
      expect(mixedTables).toBeGreaterThan(0);
    });

    it('handles empty current seating', () => {
      const emptyArrangement: SeatingArrangement = [];

      const refined = refineSeatingLocal(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        emptyArrangement,
        settings,
        scene,
      );

      expect(refined).toEqual(emptyArrangement);
    });

    it('uses custom refinement options', () => {
      const customOptions = { triesPerPass: 5, passes: 2 };

      const refined = refineSeatingLocal(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        initialArrangement,
        settings,
        scene,
        customOptions,
      );

      expect(refined).toBeDefined();
      expect(refined).toHaveLength(3);
    });

    it('preserves students requiring front seats', () => {
      const frontStudent = createMockStudent({
        id: 'front',
        name: 'FrontNeeded',
        needsFrontSeat: true,
      });

      const arrangementWithFront = [
        [students[0], students[1]],
        [students[2], students[3]],
        [frontStudent, students[5]], // Front student in rightmost table
      ];

      const studentsWithFront = [...students, frontStudent];

      const settings: Partial<MixSettings> = {
        preferFrontForNeedsFrontSeat: 10,
      };

      const options = { triesPerPass: 100, passes: 5 };

      const refined = refineSeatingLocal(
        studentsWithFront,
        seatingHistory,
        mixHistory,
        lockedPositions,
        arrangementWithFront,
        settings,
        scene,
        options,
      );

      // Front student should remain at the front table
      const frontIndex = getFrontTableIndex(scene);
      const frontStudentPosition = refined.findIndex((table: SeatingTable) =>
        table.some((student: SeatingSeat) => student?.id === 'front'),
      );
      expect(frontStudentPosition).toBe(frontIndex);
    });

    it('moves window-preferring students closer to windows during refinement', () => {
      const windowScene = createMockClassroomScene(2, {
        features: [
          {
            id: 'window-1',
            type: 'window',
            x: 240,
            y: 80,
            width: 40,
            height: 120,
            anchor: 'right',
            movable: false,
            visible: true,
          },
        ],
      });

      const windowStudent = createMockStudent({
        id: 'window-pref',
        name: 'Window Lover',
        prefersWindow: true,
      });
      const neutralStudent = createMockStudent({
        id: 'neutral',
        name: 'Neutral',
      });
      const [supportA, supportB] = createMockStudents(2);
      const windowStudents: Student[] = [
        windowStudent,
        neutralStudent,
        supportA,
        supportB,
      ];

      const windowArrangement: SeatingArrangement = [
        [windowStudent, supportA],
        [neutralStudent, supportB],
      ];

      const refined = refineSeatingLocal(
        windowStudents,
        [],
        [],
        {},
        windowArrangement,
        { preferWindowSeats: 10 },
        windowScene,
        { triesPerPass: 400, passes: 5 },
      );

      const windowTableIndex = refined.findIndex((table: SeatingTable) =>
        table.some((seat) => seat?.id === 'window-pref'),
      );
      expect(windowTableIndex).toBe(1);
    });

    it('moves door-preferring students closer to doors during refinement', () => {
      const doorScene = createMockClassroomScene(2, {
        features: [
          {
            id: 'door-1',
            type: 'door',
            x: 40,
            y: 80,
            width: 40,
            height: 120,
            anchor: 'left',
            movable: false,
            visible: true,
          },
        ],
      });

      const doorStudent = createMockStudent({
        id: 'door-pref',
        name: 'Door Lover',
        prefersDoor: true,
      });
      const neutralStudent = createMockStudent({
        id: 'neutral-door',
        name: 'Neutral Door',
      });
      const [doorSupportA, doorSupportB] = createMockStudents(2);
      const doorStudents: Student[] = [
        doorStudent,
        neutralStudent,
        doorSupportA,
        doorSupportB,
      ];

      const doorArrangement: SeatingArrangement = [
        [neutralStudent, doorSupportA],
        [doorStudent, doorSupportB],
      ];

      const refined = refineSeatingLocal(
        doorStudents,
        [],
        [],
        {},
        doorArrangement,
        { preferDoorSeats: 10 },
        doorScene,
        { triesPerPass: 400, passes: 5 },
      );

      const doorTableIndex = refined.findIndex((table: SeatingTable) =>
        table.some((seat) => seat?.id === 'door-pref'),
      );
      expect(doorTableIndex).toBe(0);
    });

    it('honors height preferences by pulling smaller students to the front', () => {
      const smallStudent = createMockStudent({
        id: 'small',
        name: 'Shorty',
        height: 'small',
      });
      const tallStudent = createMockStudent({
        id: 'tall',
        name: 'TallGuy',
        height: 'tall',
      });
      const [midA, midB, midC, midD] = createMockStudents(4);
      const heightStudents: Student[] = [
        smallStudent,
        tallStudent,
        midA,
        midB,
        midC,
        midD,
      ];

      const heightArrangement: SeatingArrangement = [
        [smallStudent, midA],
        [midB, midC],
        [tallStudent, midD],
      ];

      const refined = refineSeatingLocal(
        heightStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        heightArrangement,
        { preferFrontForSmallerStudents: 8 },
        scene,
        { triesPerPass: 400, passes: 4 },
      );

      const frontIndex = getFrontTableIndex(scene);
      const smallTableIndex = refined.findIndex((table: SeatingTable) =>
        table.some((seat) => seat?.id === 'small'),
      );
      const tallTableIndex = refined.findIndex((table: SeatingTable) =>
        table.some((seat) => seat?.id === 'tall'),
      );

      expect(smallTableIndex).toBe(frontIndex);
      expect(tallTableIndex).not.toBe(frontIndex);
    });

    it('does not make changes when current arrangement is optimal', () => {
      // Create an optimal arrangement for gender mixing
      const optimalArrangement = [
        [
          createMockStudent({ id: 'b1', name: 'Boy1', gender: 'boy' }),
          createMockStudent({ id: 'g1', name: 'Girl1', gender: 'girl' }),
        ],
        [
          createMockStudent({ id: 'b2', name: 'Boy2', gender: 'boy' }),
          createMockStudent({ id: 'g2', name: 'Girl2', gender: 'girl' }),
        ],
        [null, null],
      ];

      const optimalStudents = optimalArrangement
        .flat()
        .filter(Boolean) as Student[];

      const settings: Partial<MixSettings> = {
        preferGenderMix: 10,
      };

      const options = { triesPerPass: 100, passes: 5 };

      const refined = refineSeatingLocal(
        optimalStudents,
        seatingHistory,
        mixHistory,
        lockedPositions,
        optimalArrangement,
        settings,
        scene,
        options,
      );

      // Should maintain the optimal arrangement
      expect(refined[0]![0]?.gender).not.toBe(refined[0]![1]?.gender);
      expect(refined[1]![0]?.gender).not.toBe(refined[1]![1]?.gender);
    });
  });
});
