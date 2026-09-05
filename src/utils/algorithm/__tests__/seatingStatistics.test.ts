// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateSeatingStatistics,
  getTopFulfilledCriteria,
} from '../seatingStatistics';
import type {
  Student,
  ClassroomScene,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  MixResult,
  SeatingStatistics,
} from '../../../types';
import {
  createMockStudent,
  createMockClassroomScene,
  createMockSavedPlan,
  createMockMixResult,
  createMockTable,
} from '../../../__tests__/utils';

describe('seatingStatistics', () => {
  let scene: ClassroomScene;
  let settings: Partial<MixSettings>;
  let seatingHistory: SavedPlan[];
  let mixHistory: MixResult[];

  beforeEach(() => {
    // 3 tables with 2 seats each
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

    settings = {
      avoidPreviousPairs: 5,
      avoidRestlessTogether: 5,
      avoidConcentrationTogether: 5,
      avoidConcentrationNearRestless: 5,
      avoidShyAlone: 5,
      preferGenderMix: 5,
      considerWishPartners: 5,
      peerTutoring: 5,
      preferFrontForNeedsFrontSeat: 5,
    };

    seatingHistory = [];
    mixHistory = [];
  });

  describe('calculateSeatingStatistics', () => {
    describe('Wish Partners', () => {
      it('should calculate 100% when all wish partners are fulfilled', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', wishPartnerId: 's2' }),
          createMockStudent({ id: 's2', name: 'Ben', wishPartnerId: 's1' }),
          createMockStudent({ id: 's3', name: 'Clara', wishPartnerId: 's4' }),
          createMockStudent({ id: 's4', name: 'David', wishPartnerId: 's3' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Table 0: Anna + Ben (mutual wish ✓)
          [students[2]!, students[3]!], // Table 1: Clara + David (mutual wish ✓)
          [null, null], // Table 2: empty
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.wishPartnersTotal).toBe(4);
        expect(stats.wishPartnersFulfilled).toBe(4);
        expect(stats.wishPartnersPercentage).toBe(100);
      });

      it('should partially fulfill when wish partners at adjacent tables', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', wishPartnerId: 's2' }),
          createMockStudent({ id: 's2', name: 'Ben', wishPartnerId: 's1' }),
          createMockStudent({ id: 's3', name: 'Clara', wishPartnerId: 's4' }),
          createMockStudent({ id: 's4', name: 'David', wishPartnerId: 's3' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna + Ben (mutual wish ✓ = 2)
          [students[2]!, null], // Clara alone (wish partner at adjacent table = 0.5)
          [students[3]!, null], // David alone (wish partner at adjacent table = 0.5)
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.wishPartnersTotal).toBe(4);
        // Anna+Ben = 2 (direct partners), Clara+David = 1 (0.5 each as neighbors)
        expect(stats.wishPartnersFulfilled).toBe(3);
        expect(stats.wishPartnersPercentage).toBe(75);
      });

      it('should return 100% when no students have wish partners', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna' }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [null, null],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.wishPartnersTotal).toBe(0);
        expect(stats.wishPartnersFulfilled).toBe(0);
        expect(stats.wishPartnersPercentage).toBe(100);
      });
    });

    describe('Previous Pairs Avoidance', () => {
      it('should calculate 100% when all previous pairs are avoided', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna' }),
          createMockStudent({ id: 's2', name: 'Ben' }),
          createMockStudent({ id: 's3', name: 'Clara' }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        // Previous plan: Anna + Ben, Clara + David
        const previousArrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [students[2]!, students[3]!],
          [null, null],
        ];
        seatingHistory = [
          createMockSavedPlan({
            name: 'Plan 1',
            seating: previousArrangement,
            scene,
          }),
        ];

        // New plan: Anna + Clara, Ben + David (all new pairs!)
        const arrangement: SeatingArrangement = [
          [students[0]!, students[2]!], // Anna + Clara (new ✓)
          [students[1]!, students[3]!], // Ben + David (new ✓)
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.previousPairsAvoided).toBe(2);
        expect(stats.previousPairsTotal).toBe(0);
        expect(stats.previousPairsPercentage).toBe(100);
      });

      it('detects repeats based on recent mix history', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna' }),
          createMockStudent({ id: 's2', name: 'Ben' }),
          createMockStudent({ id: 's3', name: 'Clara' }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        const previousArrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [students[2]!, students[3]!],
          [null, null],
        ];

        mixHistory = [
          createMockMixResult({ id: 77, seating: previousArrangement }),
          createMockMixResult({ id: 78, seating: previousArrangement }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [students[2]!, students[3]!],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
          { mixHistory },
        );

        // Both pairs repeat, but a mix from the running session weighs half of
        // a plan that was really in use (MIX_HISTORY_CONTRIBUTION): 2 × 0.5.
        expect(stats.previousPairsTotal).toBe(1);
        expect(stats.previousPairsAvoided).toBe(1);
        expect(stats.previousPairsPercentage).toBe(50);
      });

      it('should calculate 0% when all pairs are repeated', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna' }),
          createMockStudent({ id: 's2', name: 'Ben' }),
          createMockStudent({ id: 's3', name: 'Clara' }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        // Previous plan: Anna + Ben, Clara + David
        const previousArrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [students[2]!, students[3]!],
          [null, null],
        ];
        seatingHistory = [
          createMockSavedPlan({
            name: 'Plan 1',
            seating: previousArrangement,
            scene,
          }),
        ];

        // New plan: Same pairs!
        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna + Ben (repeat ✗)
          [students[2]!, students[3]!], // Clara + David (repeat ✗)
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          { ...settings, avoidPreviousPairs: 5 },
          seatingHistory,
          scene,
        );

        expect(stats.previousPairsTotal).toBe(2);
        expect(stats.previousPairsAvoided).toBe(0);
        expect(stats.previousPairsPercentage).toBe(0);
      });

      it('weights older repeated pairs by default (decayed history)', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna' }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        // Most recent mix: no pair together
        const recentArrangement: SeatingArrangement = [
          [students[0]!, null],
          [students[1]!, null],
          [null, null],
        ];

        // Older mix: pair together once (decayed weight)
        const olderArrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [null, null],
          [null, null],
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [null, null],
          [null, null],
        ];

        mixHistory = [
          createMockMixResult({ id: 1, seating: olderArrangement }),
          createMockMixResult({ id: 2, seating: recentArrangement }),
          createMockMixResult({ id: 3, seating: arrangement }), // current (excluded)
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
          { mixHistory },
        );

        // Decayed to 0.25 by age, then halved because it is a mix rather than
        // a plan that was in use.
        expect(stats.previousPairsTotal).toBeCloseTo(0.125, 5);
        expect(stats.previousPairsAvoided).toBeCloseTo(0.875, 5);
        expect(Math.round(stats.previousPairsPercentage)).toBe(88);
      });
    });

    describe('Restless Students', () => {
      it('should calculate 100% when restless students are separated', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', restless: true }),
          createMockStudent({ id: 's2', name: 'Ben' }),
          createMockStudent({ id: 's3', name: 'Clara', restless: true }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        const wideScene = createMockClassroomScene(0, {
          totalStudents: 6,
          tables: [
            createMockTable({ x: 100, y: 100, seatCount: 2, zIndex: 0 }),
            createMockTable({ x: 420, y: 100, seatCount: 2, zIndex: 1 }),
            createMockTable({ x: 740, y: 100, seatCount: 2, zIndex: 2 }),
          ],
        });

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna (restless) + Ben (calm)
          [students[2]!, students[3]!], // Clara (restless) + David (calm)
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          wideScene,
        );

        expect(stats.restlessTotalCount).toBe(2);
        expect(stats.restlessPairCount).toBe(0);
        expect(stats.restlessAvoidedPercentage).toBe(100);
      });

      it('should calculate 0% when all restless students are paired together', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', restless: true }),
          createMockStudent({ id: 's2', name: 'Ben', restless: true }),
          createMockStudent({ id: 's3', name: 'Clara' }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna + Ben (both restless ✗)
          [students[2]!, students[3]!],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.restlessTotalCount).toBe(2);
        expect(stats.restlessPairCount).toBe(1);
        expect(stats.restlessAvoidedPercentage).toBe(0);
      });

      it('should detect restless neighbors placed front-to-back across tables', () => {
        const stackedScene = createMockClassroomScene(0, {
          totalStudents: 2,
          tables: [
            createMockTable({ x: 160, y: 100, seatCount: 2, zIndex: 0 }),
            createMockTable({ x: 160, y: 250, seatCount: 2, zIndex: 1 }),
          ],
        });

        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', restless: true }),
          createMockStudent({ id: 's2', name: 'Ben', restless: true }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, null],
          [students[1]!, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          stackedScene,
        );

        expect(stats.restlessTotalCount).toBe(2);
        expect(stats.restlessPairCount).toBe(1);
        expect(stats.restlessAvoidedPercentage).toBe(0);
      });

      it('should return 100% when only one restless student exists', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', restless: true }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [null, null],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.restlessTotalCount).toBe(1);
        expect(stats.restlessPairCount).toBe(0);
        expect(stats.restlessAvoidedPercentage).toBe(100);
      });
    });

    describe('Concentration Issues', () => {
      it('should calculate 100% when concentration students are separated', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            concentrationIssues: true,
          }),
          createMockStudent({ id: 's2', name: 'Ben' }),
          createMockStudent({
            id: 's3',
            name: 'Clara',
            concentrationIssues: true,
          }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        const wideScene = createMockClassroomScene(0, {
          totalStudents: 6,
          tables: [
            createMockTable({ x: 100, y: 100, seatCount: 2, zIndex: 0 }),
            createMockTable({ x: 420, y: 100, seatCount: 2, zIndex: 1 }),
            createMockTable({ x: 740, y: 100, seatCount: 2, zIndex: 2 }),
          ],
        });

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna (concentration) + Ben
          [students[2]!, students[3]!], // Clara (concentration) + David
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          wideScene,
        );

        expect(stats.concentrationTotalCount).toBe(2);
        expect(stats.concentrationPairCount).toBe(0);
        expect(stats.concentrationAvoidedPercentage).toBe(100);
      });

      it('should calculate 0% when concentration students are paired together', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            concentrationIssues: true,
          }),
          createMockStudent({
            id: 's2',
            name: 'Ben',
            concentrationIssues: true,
          }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Both have concentration issues
          [null, null],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.concentrationTotalCount).toBe(2);
        expect(stats.concentrationPairCount).toBe(1);
        expect(stats.concentrationAvoidedPercentage).toBe(0);
      });

      it('should detect concentration neighbors placed front-to-back across tables', () => {
        const stackedScene = createMockClassroomScene(0, {
          totalStudents: 2,
          tables: [
            createMockTable({ x: 180, y: 100, seatCount: 2, zIndex: 0 }),
            createMockTable({ x: 180, y: 250, seatCount: 2, zIndex: 1 }),
          ],
        });

        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            concentrationIssues: true,
          }),
          createMockStudent({
            id: 's2',
            name: 'Ben',
            concentrationIssues: true,
          }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, null],
          [students[1]!, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          stackedScene,
        );

        expect(stats.concentrationTotalCount).toBe(2);
        expect(stats.concentrationPairCount).toBe(1);
        expect(stats.concentrationAvoidedPercentage).toBe(0);
      });

      it('should track concentration students near restless students', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            concentrationIssues: true,
          }),
          createMockStudent({ id: 's2', name: 'Ben', restless: true }),
          createMockStudent({ id: 's3', name: 'Clara' }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna (concentration) next to Ben (restless)
          [students[2]!, students[3]!],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.concentrationTotalCount).toBe(1);
        expect(stats.concentrationNearRestlessCount).toBeGreaterThan(0);
        expect(stats.concentrationNearRestlessPercentage).toBeLessThan(100);
      });
    });

    describe('Shy Students', () => {
      it('should calculate 100% when no shy students are alone', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', shy: true }),
          createMockStudent({ id: 's2', name: 'Ben' }),
          createMockStudent({ id: 's3', name: 'Clara', shy: true }),
          createMockStudent({ id: 's4', name: 'David' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Anna (shy) + partner
          [students[2]!, students[3]!], // Clara (shy) + partner
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.shyTotalCount).toBe(2);
        expect(stats.shyAloneCount).toBe(0);
        expect(stats.shyAlonePercentage).toBe(100);
      });

      it('should calculate 0% when all shy students are alone', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', shy: true }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, null], // Anna (shy) alone
          [students[1]!, null],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.shyTotalCount).toBe(1);
        expect(stats.shyAloneCount).toBe(1);
        expect(stats.shyAlonePercentage).toBe(0);
      });
    });

    describe('Peer Tutoring', () => {
      it('should calculate 100% when all pairs are strong/weak combinations', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            performanceStrong: true,
          }),
          createMockStudent({ id: 's2', name: 'Ben', performanceWeak: true }),
          createMockStudent({
            id: 's3',
            name: 'Clara',
            performanceStrong: true,
          }),
          createMockStudent({ id: 's4', name: 'David', performanceWeak: true }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Strong + Weak (tutoring ✓)
          [students[2]!, students[3]!], // Strong + Weak (tutoring ✓)
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.peerTutoringPairs).toBe(2);
        expect(stats.sameLevelPairs).toBe(0);
        expect(stats.peerTutoringPercentage).toBe(100);
      });

      it('should calculate 0% when all pairs are same level', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            performanceStrong: true,
          }),
          createMockStudent({
            id: 's2',
            name: 'Ben',
            performanceStrong: true,
          }),
          createMockStudent({ id: 's3', name: 'Clara', performanceWeak: true }),
          createMockStudent({ id: 's4', name: 'David', performanceWeak: true }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // Strong + Strong (same level ✗)
          [students[2]!, students[3]!], // Weak + Weak (same level ✗)
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.peerTutoringPairs).toBe(0);
        expect(stats.sameLevelPairs).toBe(2);
        expect(stats.peerTutoringPercentage).toBe(0);
      });

      it('should return 0% when no performance students exist', () => {
        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna' }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!],
          [null, null],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.peerTutoringPairs).toBe(0);
        expect(stats.sameLevelPairs).toBe(0);
        expect(stats.peerTutoringPercentage).toBe(0);
      });
    });

    describe('Front Seat Need Front Placement', () => {
      it('should calculate 100% when all sensory students are in front', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            needsFrontSeat: true,
          }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        // Table at x=300 is rightmost = "front"
        const arrangement: SeatingArrangement = [
          [null, null], // x=100
          [null, null], // x=200
          [students[0]!, students[1]!], // x=300 (front)
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.frontSeatTotalCount).toBe(1);
        expect(stats.frontSeatInFrontCount).toBe(1);
        expect(stats.frontSeatFrontPercentage).toBe(100);
      });

      it('should calculate 0% when sensory students are in back', () => {
        const students: Student[] = [
          createMockStudent({
            id: 's1',
            name: 'Anna',
            needsFrontSeat: true,
          }),
          createMockStudent({ id: 's2', name: 'Ben' }),
        ];

        // Table at x=100 is leftmost = "back"
        const arrangement: SeatingArrangement = [
          [students[0]!, students[1]!], // x=100 (back)
          [null, null],
          [null, null],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.frontSeatTotalCount).toBe(1);
        expect(stats.frontSeatInFrontCount).toBe(0);
        expect(stats.frontSeatFrontPercentage).toBe(0);
      });
    });
    describe('Gender mix', () => {
      it('recognizes balanced gender mix on group tables without diverse students', () => {
        scene = createMockClassroomScene(2, {
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

        const students: Student[] = [
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
          [students[0]!, students[1]!, students[2]!, students[3]!],
          [
            students[4]!,
            students[5]!,
            students[6]!,
            students[7]!,
            students[8]!,
            students[9]!,
          ],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.genderBalancedTables).toBe(2);
        expect(stats.genderMixScore).toBe(100);
      });

      it('treats single-seat tables as neutral for gender mix statistics', () => {
        scene = createMockClassroomScene(3, {
          totalStudents: 3,
          tables: [
            createMockTable({
              x: 100,
              y: 100,
              width: 55,
              height: 70,
              seatCount: 1,
              templateType: 'single',
            }),
            createMockTable({
              x: 200,
              y: 100,
              width: 55,
              height: 70,
              seatCount: 1,
              templateType: 'single',
            }),
            createMockTable({
              x: 300,
              y: 100,
              width: 55,
              height: 70,
              seatCount: 1,
              templateType: 'single',
            }),
          ],
        });

        const students: Student[] = [
          createMockStudent({ id: 's1', name: 'Anna', gender: 'girl' }),
          createMockStudent({ id: 's2', name: 'Ben', gender: 'boy' }),
          createMockStudent({ id: 's3', name: 'Clara', gender: 'girl' }),
        ];

        const arrangement: SeatingArrangement = [
          [students[0]!],
          [students[1]!],
          [students[2]!],
        ];

        const stats = calculateSeatingStatistics(
          arrangement,
          students,
          settings,
          seatingHistory,
          scene,
        );

        expect(stats.genderBalancedTables).toBe(0);
        expect(stats.genderTotalTables).toBe(0);
        expect(stats.genderMixScore).toBe(100);
      });
    });
  });

  describe('getTopFulfilledCriteria', () => {
    it('should return only active criteria', () => {
      const students: Student[] = [
        createMockStudent({ id: 's1', name: 'Anna', wishPartnerId: 's2' }),
        createMockStudent({ id: 's2', name: 'Ben', wishPartnerId: 's1' }),
      ];

      const arrangement: SeatingArrangement = [
        [students[0]!, students[1]!],
        [null, null],
        [null, null],
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        { considerWishPartners: 5, avoidRestlessTogether: 0 }, // Only wish partners active
        seatingHistory,
        scene,
      );

      const criteria = getTopFulfilledCriteria(
        stats,
        { considerWishPartners: 5, avoidRestlessTogether: 0 },
        10,
      );

      expect(criteria.length).toBeGreaterThan(0);
      expect(criteria.every((c) => c.active)).toBe(true);
      expect(criteria.some((c) => c.key === 'avoidRestlessTogether')).toBe(
        false,
      );
    });

    it('should sort by weight then percentage', () => {
      const students: Student[] = [
        createMockStudent({ id: 's1', name: 'Anna', wishPartnerId: 's2' }),
        createMockStudent({ id: 's2', name: 'Ben', wishPartnerId: 's1' }),
        createMockStudent({ id: 's3', name: 'Clara', restless: true }),
        createMockStudent({ id: 's4', name: 'David', restless: true }),
      ];

      const arrangement: SeatingArrangement = [
        [students[0]!, students[1]!], // Wish partners fulfilled (100%)
        [students[2]!, students[3]!], // Restless together (0%)
        [null, null],
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        {
          considerWishPartners: 5, // Weight 5, 100%
          avoidRestlessTogether: 10, // Weight 10, 0%
        },
        seatingHistory,
        scene,
      );

      const criteria = getTopFulfilledCriteria(
        stats,
        {
          considerWishPartners: 5,
          avoidRestlessTogether: 10,
        },
        10,
      );

      // First criterion should be highest weight (10)
      expect(criteria[0]!.key).toBe('avoidRestlessTogether');
      expect(criteria[0]!.weight).toBe(10);
    });

    it('should limit results to specified count', () => {
      const students: Student[] = [
        createMockStudent({ id: 's1', name: 'Anna' }),
        createMockStudent({ id: 's2', name: 'Ben' }),
      ];

      const arrangement: SeatingArrangement = [
        [students[0]!, students[1]!],
        [null, null],
        [null, null],
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        settings,
        seatingHistory,
        scene,
      );

      const criteria = getTopFulfilledCriteria(stats, settings, 3);

      expect(criteria.length).toBeLessThanOrEqual(3);
    });

    it('combines concentration metrics into a single criterion', () => {
      const stats: SeatingStatistics = {
        totalStudents: 4,
        totalSeats: 4,
        wishPartnersFulfilled: 0,
        wishPartnersTotal: 0,
        wishPartnersPercentage: 0,
        avoidPartnersFulfilled: 0,
        avoidPartnersTotal: 0,
        avoidPartnersPercentage: 100,
        previousPairsAvoided: 0,
        previousPairsTotal: 0,
        previousPairsPercentage: 100,
        restlessPairCount: 0,
        restlessTotalCount: 2,
        restlessAvoidedPercentage: 100,
        concentrationPairCount: 1,
        concentrationTotalCount: 2,
        concentrationAvoidedPercentage: 20,
        concentrationNearRestlessCount: 1,
        concentrationNearRestlessPercentage: 60,
        genderMixScore: 0,
        genderBalancedTables: 0,
        genderTotalTables: 0,
        shyAloneCount: 0,
        shyTotalCount: 0,
        shyAlonePercentage: 100,
        peerTutoringPairs: 0,
        sameLevelPairs: 0,
        peerTutoringPercentage: 0,
        homogeneousPerformancePercentage: 0,
        frontSeatInFrontCount: 0,
        frontSeatTotalCount: 0,
        frontSeatFrontPercentage: 100,
        windowPreferenceFulfilled: 0,
        windowPreferenceTotal: 0,
        windowPreferencePercentage: 100,
        doorPreferenceFulfilled: 0,
        doorPreferenceTotal: 0,
        doorPreferencePercentage: 100,
        heightPlacementScore: 0,
        smallInFrontCount: 0,
        smallTotalCount: 0,
        tallInBackCount: 0,
        tallTotalCount: 0,
        heightPlacementPercentage: 100,
        languageMixingScore: 0,
        languageMixedTables: 0,
        languageTotalRelevantTables: 0,
        languageMixingPercentage: 0,
        socialRoleDistributionScore: 0,
        socialRoleBalancedTables: 0,
        socialRoleTotalRelevantTables: 0,
        socialRoleDistributionPercentage: 0,
      };

      const criteria = getTopFulfilledCriteria(stats, {
        avoidConcentrationTogether: 8,
        avoidConcentrationNearRestless: 8,
      });

      expect(criteria).toHaveLength(1);
      expect(criteria[0]!.key).toBe('avoidConcentrationTogether');
      expect(criteria[0]!.label).toBe('Ablenkbarkeit');
      expect(criteria[0]!.percentage).toBeCloseTo(40);
      expect(criteria[0]!.weight).toBe(8);
    });

    it('includes window and door preferences when active', () => {
      const sceneWithFeatures = createMockClassroomScene(2, {
        totalStudents: 2,
        tables: [
          createMockTable({
            x: 80,
            y: 120,
            width: 55,
            height: 130,
            seatCount: 2,
            zIndex: 0,
          }),
          createMockTable({
            x: 700,
            y: 120,
            width: 55,
            height: 130,
            seatCount: 2,
            zIndex: 1,
          }),
        ],
        features: [
          {
            id: 'window-left',
            type: 'window',
            x: 0,
            y: 0,
            width: 40,
            height: 600,
            anchor: 'left',
            movable: false,
            visible: true,
            label: 'Fenster',
          },
          {
            id: 'door-right',
            type: 'door',
            x: 860,
            y: 0,
            width: 40,
            height: 200,
            anchor: 'right',
            movable: false,
            visible: true,
            label: 'Tür',
          },
        ],
      });

      const students: Student[] = [
        createMockStudent({
          id: 's1',
          name: 'Fenster-Fan',
          prefersWindow: true,
        }),
        createMockStudent({
          id: 's2',
          name: 'Tür-Fan',
          prefersDoor: true,
        }),
      ];

      const arrangement: SeatingArrangement = [
        [students[0]!, null],
        [students[1]!, null],
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        { preferWindowSeats: 7, preferDoorSeats: 6 },
        [],
        sceneWithFeatures,
      );

      const criteria = getTopFulfilledCriteria(
        stats,
        { preferWindowSeats: 7, preferDoorSeats: 6 },
        10,
      );

      const windowCriterion = criteria.find(
        (criterion) => criterion.key === 'preferWindowSeats',
      );
      const doorCriterion = criteria.find(
        (criterion) => criterion.key === 'preferDoorSeats',
      );

      expect(windowCriterion).toBeDefined();
      expect(windowCriterion!.percentage).toBeGreaterThan(80);
      expect(doorCriterion).toBeDefined();
      expect(doorCriterion!.percentage).toBeGreaterThan(80);
    });
  });

  describe('Environmental preferences', () => {
    it('tracks window and door proximity fulfillment', () => {
      const sceneWithFeatures = createMockClassroomScene(2, {
        totalStudents: 2,
        tables: [
          createMockTable({
            x: 80,
            y: 120,
            width: 55,
            height: 130,
            seatCount: 2,
            zIndex: 0,
          }),
          createMockTable({
            x: 700,
            y: 120,
            width: 55,
            height: 130,
            seatCount: 2,
            zIndex: 1,
          }),
        ],
        features: [
          {
            id: 'window-left',
            type: 'window',
            x: 0,
            y: 0,
            width: 40,
            height: 600,
            anchor: 'left',
            movable: false,
            visible: true,
            label: 'Fenster',
          },
          {
            id: 'door-right',
            type: 'door',
            x: 860,
            y: 0,
            width: 40,
            height: 200,
            anchor: 'right',
            movable: false,
            visible: true,
            label: 'Tür',
          },
        ],
      });

      const students: Student[] = [
        createMockStudent({
          id: 's1',
          name: 'Fenster-Fan',
          prefersWindow: true,
        }),
        createMockStudent({
          id: 's2',
          name: 'Tür-Fan',
          prefersDoor: true,
        }),
      ];

      const arrangement: SeatingArrangement = [
        [students[0]!, null],
        [students[1]!, null],
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        { preferWindowSeats: 8, preferDoorSeats: 8 },
        [],
        sceneWithFeatures,
      );

      expect(stats.windowPreferenceTotal).toBe(1);
      expect(stats.windowPreferenceFulfilled).toBe(1);
      expect(stats.windowPreferencePercentage).toBeGreaterThan(80);
      expect(stats.doorPreferenceTotal).toBe(1);
      expect(stats.doorPreferenceFulfilled).toBe(1);
      expect(stats.doorPreferencePercentage).toBeGreaterThan(80);
    });
  });

  describe('Height placement statistics', () => {
    it('calculates height placement percentage correctly', () => {
      const scene = createMockClassroomScene(4, {
        tables: [
          // Back row (x=100)
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
            x: 100,
            y: 250,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
          // Front row (x=300)
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
          {
            x: 300,
            y: 250,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 3,
            locked: false,
          },
        ],
        totalStudents: 8,
      });

      const students = [
        createMockStudent({ id: 's1', name: 'Klein1', height: 'small' }),
        createMockStudent({ id: 's2', name: 'Klein2', height: 'small' }),
        createMockStudent({ id: 's3', name: 'Groß1', height: 'tall' }),
        createMockStudent({ id: 's4', name: 'Groß2', height: 'tall' }),
        createMockStudent({ id: 's5', name: 'Mittel1', height: 'medium' }),
        createMockStudent({ id: 's6', name: 'Mittel2', height: 'medium' }),
        createMockStudent({ id: 's7', name: 'Klein3', height: 'small' }),
        createMockStudent({ id: 's8', name: 'Groß3', height: 'tall' }),
      ];

      // Optimal arrangement: small students front (x=300), tall students back (x=100)
      const arrangement: SeatingArrangement = [
        [students[3], students[4]], // Tall back left
        [students[2], students[5]], // Tall back right
        [students[0], students[6]], // Small front left (both small)
        [students[1], students[7]], // Small + Tall front right (suboptimal)
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        { preferFrontForSmallerStudents: 5 },
        [],
        scene,
      );

      expect(stats.smallTotalCount).toBe(3);
      expect(stats.tallTotalCount).toBe(3);
      expect(stats.smallInFrontCount).toBe(3); // s0, s1, s6 all in front
      expect(stats.tallInBackCount).toBe(2); // s2, s3 in back
      expect(stats.heightPlacementPercentage).toBeCloseTo((5 / 6) * 100, 1); // 83.33%
      expect(stats.heightPlacementScore).toBeCloseTo((5 / 6) * 100, 1);
    });

    it('returns 100% when no small/tall students', () => {
      const scene = createMockClassroomScene(2, {
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
            x: 300,
            y: 100,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
        totalStudents: 4,
      });

      const students = [
        createMockStudent({ id: 's1', name: 'M1', height: 'medium' }),
        createMockStudent({ id: 's2', name: 'M2', height: 'medium' }),
        createMockStudent({ id: 's3', name: 'M3' }), // undefined height
        createMockStudent({ id: 's4', name: 'M4' }),
      ];

      const arrangement: SeatingArrangement = [
        [students[0], students[1]],
        [students[2], students[3]],
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        { preferFrontForSmallerStudents: 5 },
        [],
        scene,
      );

      expect(stats.smallTotalCount).toBe(0);
      expect(stats.tallTotalCount).toBe(0);
      expect(stats.heightPlacementPercentage).toBe(100); // Default 100%
    });

    it('includes height criterion in getCriteriaFulfillment when active', () => {
      const scene = createMockClassroomScene(2, {
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
            x: 300,
            y: 100,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
            rotation: 0,
            zIndex: 1,
            locked: false,
          },
        ],
        totalStudents: 4,
      });

      const students = [
        createMockStudent({ id: 's1', height: 'small' }),
        createMockStudent({ id: 's2', height: 'tall' }),
        createMockStudent({ id: 's3', height: 'small' }),
        createMockStudent({ id: 's4', height: 'tall' }),
      ];

      const arrangement: SeatingArrangement = [
        [students[1], students[3]], // Tall in back (correct)
        [students[0], students[2]], // Small in front (correct)
      ];

      const stats = calculateSeatingStatistics(
        arrangement,
        students,
        { preferFrontForSmallerStudents: 8 },
        [],
        scene,
      );

      const criteria = getTopFulfilledCriteria(stats, {
        preferFrontForSmallerStudents: 8,
      });

      expect(criteria.length).toBeGreaterThan(0);
      const heightCriterion = criteria.find(
        (c) => c.key === 'preferFrontForSmallerStudents',
      );
      expect(heightCriterion).toBeDefined();
      expect(heightCriterion!.label).toBe('Körpergröße');
      expect(heightCriterion!.percentage).toBe(100); // All correctly placed
      expect(heightCriterion!.weight).toBe(8);
    });
  });
});
