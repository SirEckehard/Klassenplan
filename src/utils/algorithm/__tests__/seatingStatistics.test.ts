// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The fulfilment the teacher reads (decision 0031): every criterion counted
 * by the same relations the mixing weighs — the seat partner, the same table,
 * and at another table only the seat directly beside, in front or behind — and
 * against what the room and the class allow, so a plan the mixing could not
 * improve on reads as 100 %.
 */
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { neutralSettings } from '../../mixSettings';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '../../data/planUsage';
import {
  calculateSeatingStatistics,
  getTopFulfilledCriteria,
} from '../seatingStatistics';

const boardRight: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};
const windowLeft: ClassroomFeature = {
  id: 'window',
  type: 'window',
  x: 0,
  y: 100,
  width: 20,
  height: 160,
  anchor: 'left',
  movable: false,
};

const table = (
  x: number,
  y: number,
  templateType: ClassroomTable['templateType'] = 'double',
): ClassroomTable => {
  const size = {
    single: { width: 55, height: 65, seatCount: 1 },
    double: { width: 55, height: 130, seatCount: 2 },
    group4: { width: 110, height: 130, seatCount: 4 },
    group6: { width: 165, height: 130, seatCount: 6 },
  }[templateType];
  return { x, y, rotation: 0, locked: false, zIndex: 0, templateType, ...size };
};

const room = (tables: ClassroomTable[]): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [boardRight, windowLeft],
});

/** Three double desks along the board's wall, with aisles between them. */
const DESKS_IN_A_ROW = room([table(600, 60), table(600, 250), table(600, 440)]);
/** A desk and the desk directly behind it, one row further from the board. */
const DESK_BEHIND_DESK = room([table(600, 100), table(485, 100)]);
/** Three single desks along the wall, directly beside each other. */
const SINGLES_SIDE_BY_SIDE = room([
  table(600, 100, 'single'),
  table(600, 195, 'single'),
  table(600, 290, 'single'),
]);

const student = (id: string, extra: Partial<Student> = {}): Student =>
  ({
    id,
    name: id,
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    ...extra,
  }) as Student;

const studentsOf = (arrangement: SeatingArrangement): Student[] =>
  arrangement.flat().filter((seat): seat is Student => Boolean(seat));

const fulfilment = (
  scene: ClassroomScene,
  arrangement: SeatingArrangement,
  weights: Partial<MixSettings>,
  extras: {
    students?: Student[];
    seatingHistory?: SavedPlan[];
    planUsage?: PlanUsage[];
  } = {},
) => {
  const settings = { ...neutralSettings, ...weights };
  const stats = calculateSeatingStatistics(
    arrangement,
    extras.students ?? studentsOf(arrangement),
    settings,
    extras.seatingHistory ?? [],
    scene,
    { planUsage: extras.planUsage },
  );
  const criteria = getTopFulfilledCriteria(stats, settings);
  return {
    stats,
    criteria,
    percentage: (key: keyof MixSettings) =>
      criteria.find((criterion) => criterion.key === key)?.percentage,
  };
};

describe('seatingStatistics', () => {
  describe('wish partners', () => {
    it('counts a wish fully at the seat partner', () => {
      const ada = student('ada', { wishPartnerIds: ['grace'] });
      const grace = student('grace');
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [[ada, grace], [student('x'), null], []],
        { considerWishPartners: 8 },
      );
      expect(percentage('considerWishPartners')).toBe(100);
    });

    it('counts the rest of a group table less, the desk behind least', () => {
      const ada = student('ada', { wishPartnerIds: ['grace'] });
      const grace = student('grace');
      const group = room([table(600, 100, 'group4')]);
      expect(
        fulfilment(group, [[ada, student('x'), grace, null]], {
          considerWishPartners: 8,
        }).percentage('considerWishPartners'),
      ).toBeCloseTo(60, 5);
      expect(
        fulfilment(
          DESK_BEHIND_DESK,
          [
            [grace, null],
            [ada, null],
          ],
          {
            considerWishPartners: 8,
          },
        ).percentage('considerWishPartners'),
      ).toBeCloseTo(30, 5);
    });

    it('counts the wish met best: one seat partner cannot meet two wishes', () => {
      const ada = student('ada', { wishPartnerIds: ['grace', 'alan'] });
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [[ada, student('alan')], [student('grace'), null], []],
        { considerWishPartners: 8 },
      );
      expect(percentage('considerWishPartners')).toBe(100);
    });

    it('counts a neighbour at single desks as all the room can give', () => {
      const ada = student('ada', { wishPartnerIds: ['grace'] });
      const { percentage } = fulfilment(
        SINGLES_SIDE_BY_SIDE,
        [[ada], [student('grace')], [student('x')]],
        { considerWishPartners: 8 },
      );
      expect(percentage('considerWishPartners')).toBe(100);
    });

    it('leaves out a wish answered with a distance wish while those count', () => {
      const ada = student('ada', { wishPartnerIds: ['grace'] });
      const grace = student('grace', { avoidPartnerIds: ['ada'] });
      const { percentage, criteria } = fulfilment(
        DESKS_IN_A_ROW,
        [[ada, null], [grace, null], []],
        { considerWishPartners: 8, avoidConflictPartners: 7 },
      );
      expect(
        criteria.some((criterion) => criterion.key === 'considerWishPartners'),
      ).toBe(false);
      expect(percentage('avoidConflictPartners')).toBe(100);
    });

    it('leaves out a wish for a student no longer in the class', () => {
      const ada = student('ada', { wishPartnerIds: ['gone'] });
      const { criteria } = fulfilment(DESKS_IN_A_ROW, [[ada, null], [], []], {
        considerWishPartners: 8,
      });
      expect(criteria).toEqual([]);
    });
  });

  describe('distance wishes', () => {
    it('counts the seat partner as unmet and a desk across the aisle as met', () => {
      const ada = student('ada', { avoidPartnerIds: ['alan'] });
      const alan = student('alan');
      expect(
        fulfilment(DESKS_IN_A_ROW, [[ada, alan], [], []], {
          avoidConflictPartners: 7,
        }).percentage('avoidConflictPartners'),
      ).toBe(0);
      expect(
        fulfilment(DESKS_IN_A_ROW, [[ada, null], [alan, null], []], {
          avoidConflictPartners: 7,
        }).percentage('avoidConflictPartners'),
      ).toBe(100);
    });

    it('does not count single desks directly beside each other as apart', () => {
      const ada = student('ada', { avoidPartnerIds: ['alan'] });
      const { percentage } = fulfilment(
        SINGLES_SIDE_BY_SIDE,
        [[ada], [student('alan')], [student('x')]],
        { avoidConflictPartners: 7 },
      );
      expect(percentage('avoidConflictPartners')).toBe(50);
    });
  });

  describe('restless and distractible students', () => {
    it('counts restless seat partners as unmet for both', () => {
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [
          [
            student('r1', { restless: true }),
            student('r2', { restless: true }),
          ],
          [student('x'), student('y')],
          [],
        ],
        { avoidRestlessTogether: 5 },
      );
      expect(percentage('avoidRestlessTogether')).toBe(0);
    });

    it('counts a restless classmate directly behind as partly unmet', () => {
      const { percentage } = fulfilment(
        DESK_BEHIND_DESK,
        [
          [student('r1', { restless: true }), student('x')],
          [student('r2', { restless: true }), student('y')],
        ],
        { avoidRestlessTogether: 5 },
      );
      expect(percentage('avoidRestlessTogether')).toBeCloseTo(70, 5);
    });

    it('counts restless students across an aisle as apart', () => {
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [
          [student('r1', { restless: true }), student('x')],
          [student('r2', { restless: true }), student('y')],
          [],
        ],
        { avoidRestlessTogether: 5 },
      );
      expect(percentage('avoidRestlessTogether')).toBe(100);
    });

    it('reads both distractibility weights as one criterion', () => {
      const distractible = student('c', { concentrationIssues: true });
      const restless = student('r', { restless: true });
      const { criteria } = fulfilment(
        DESKS_IN_A_ROW,
        [
          [distractible, restless],
          [student('c2', { concentrationIssues: true }), null],
          [],
        ],
        { avoidConcentrationTogether: 5, avoidConcentrationNearRestless: 5 },
      );
      const concentration = criteria.find(
        (criterion) => criterion.key === 'avoidConcentrationTogether',
      );
      // Apart from each other: 100 %; beside a restless one: 50 % of the two.
      expect(concentration?.percentage).toBeCloseTo(75, 5);
      expect(
        criteria.some(
          (criterion) => criterion.key === 'avoidConcentrationNearRestless',
        ),
      ).toBe(false);
    });
  });

  describe('shy students', () => {
    it('counts a shy student without anybody close as alone', () => {
      const shy = student('s', { shy: true });
      expect(
        fulfilment(DESKS_IN_A_ROW, [[shy, null], [student('x'), null], []], {
          avoidShyAlone: 2,
        }).percentage('avoidShyAlone'),
      ).toBe(0);
    });

    it('does not count a shy student at a group table as alone', () => {
      const shy = student('s', { shy: true });
      expect(
        fulfilment(
          room([table(600, 100, 'group4')]),
          [[shy, null, student('x'), null]],
          { avoidShyAlone: 2 },
        ).percentage('avoidShyAlone'),
      ).toBe(100);
    });
  });

  describe('repetition', () => {
    const ada = student('ada');
    const alan = student('alan');
    const grace = student('grace');
    const hedy = student('hedy');
    const used = (seating: SeatingArrangement, day: number): PlanUsage => {
      const pairs = collectSeatingPairKeys(seating);
      return {
        id: `u${day}`,
        fingerprint: computePlanFingerprint(pairs),
        pairs,
        firstSeenAt: `2026-10-0${day}T08:00:00.000Z`,
        lastSeenAt: `2026-10-0${day}T08:00:00.000Z`,
        sources: ['presented'],
        confidence: 1,
      };
    };

    it('does not count a plan in use as its own repetition', () => {
      const plan: SeatingArrangement = [[ada, alan], [], []];
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        plan,
        { avoidPreviousPairs: 6 },
        { planUsage: [used(plan, 1)] },
      );
      expect(percentage('avoidPreviousPairs')).toBe(100);
    });

    it('counts a pair of a plan in use', () => {
      // Another pair in it: a plan with exactly the same pairs is this plan.
      const before: SeatingArrangement = [[ada, alan], [grace, hedy], []];
      const plan: SeatingArrangement = [
        [alan, ada],
        [grace, null],
        [hedy, null],
      ];
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        plan,
        { avoidPreviousPairs: 6 },
        { planUsage: [used(before, 1), used(plan, 2)] },
      );
      expect(percentage('avoidPreviousPairs')).toBe(0);
    });

    it('exempts a wish pair while wishes count', () => {
      const wisher = student('ada', { wishPartnerIds: ['alan'] });
      const before: SeatingArrangement = [[wisher, alan], [grace, hedy], []];
      const plan: SeatingArrangement = [[alan, wisher], [], []];
      const { criteria } = fulfilment(
        DESKS_IN_A_ROW,
        plan,
        { avoidPreviousPairs: 6, considerWishPartners: 8 },
        { planUsage: [used(before, 1)] },
      );
      expect(
        criteria.some((criterion) => criterion.key === 'avoidPreviousPairs'),
      ).toBe(false);
    });
  });

  describe('gender', () => {
    const boy = (id: string) => student(id, { gender: 'boy' });
    const girl = (id: string) => student(id, { gender: 'girl' });
    const diverse = (id: string) => student(id, { gender: 'diverse' });

    it('reads a plan as balanced as the class allows as 100 %', () => {
      // Three boys and one girl: one desk can be mixed, the other cannot.
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [[boy('b1'), girl('g1')], [boy('b2'), boy('b3')], []],
        { preferGenderMix: 2 },
      );
      expect(percentage('preferGenderMix')).toBe(100);
    });

    it('counts two diverse students at a desk like two boys', () => {
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [[diverse('d1'), diverse('d2')], [boy('b1'), girl('g1')], []],
        { preferGenderMix: 2 },
      );
      expect(percentage('preferGenderMix')).toBe(50);
    });

    it('lets one diverse student leave a group table balanced', () => {
      const { percentage } = fulfilment(
        room([table(600, 100, 'group6')]),
        [
          [
            boy('b1'),
            boy('b2'),
            boy('b3'),
            girl('g1'),
            girl('g2'),
            diverse('d'),
          ],
        ],
        { preferGenderMix: 2 },
      );
      expect(percentage('preferGenderMix')).toBe(100);
    });
  });

  describe('performance', () => {
    const strong = (id: string) => student(id, { performanceStrong: true });
    const weak = (id: string) => student(id, { performanceWeak: true });

    it('counts tutoring pairs against the pairs the class has in it', () => {
      // One strong, two weak: one tutoring pair is all there can be.
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [[strong('s'), weak('w1')], [weak('w2'), student('n')], []],
        { peerTutoring: 3 },
      );
      expect(percentage('peerTutoring')).toBe(100);
    });

    it('has no case at single desks, where no pair can sit', () => {
      const { criteria } = fulfilment(
        SINGLES_SIDE_BY_SIDE,
        [[strong('s')], [weak('w')], [student('n')]],
        { peerTutoring: 3 },
      );
      expect(criteria).toEqual([]);
    });
  });

  describe('language support', () => {
    it('reads every student needing support beside a strong speaker as 100 %', () => {
      const daz = (id: string) => student(id, { languageSkill: 'daz' });
      const native = (id: string) => student(id, { languageSkill: 'native' });
      const { percentage } = fulfilment(
        DESKS_IN_A_ROW,
        [
          [daz('d1'), native('n1')],
          [native('n2'), native('n3')],
          [native('n4'), native('n5')],
        ],
        { preferLanguageMixing: 4 },
      );
      expect(percentage('preferLanguageMixing')).toBe(100);
    });
  });

  describe('front seats', () => {
    it('counts the front rows that hold every student needing one', () => {
      const front = (id: string) => student(id, { needsFrontSeat: true });
      // The front row has two seats for three students: the row behind it
      // is as far forward as the third can sit.
      const { percentage } = fulfilment(
        DESK_BEHIND_DESK,
        [
          [front('f1'), front('f2')],
          [front('f3'), student('x')],
        ],
        { preferFrontForNeedsFrontSeat: 8 },
      );
      expect(percentage('preferFrontForNeedsFrontSeat')).toBe(100);
    });

    it('counts a student needing a front seat at the back as unmet', () => {
      const { percentage } = fulfilment(
        DESK_BEHIND_DESK,
        [
          [student('x'), student('y')],
          [student('f', { needsFrontSeat: true }), null],
        ],
        { preferFrontForNeedsFrontSeat: 8 },
      );
      expect(percentage('preferFrontForNeedsFrontSeat')).toBe(0);
    });
  });

  describe('getTopFulfilledCriteria', () => {
    it('lists a criterion only while it carries weight and has a case', () => {
      const { criteria } = fulfilment(
        DESKS_IN_A_ROW,
        [[student('x'), student('y')], [], []],
        { avoidRestlessTogether: 5, considerWishPartners: 8 },
      );
      expect(criteria).toEqual([]);
    });

    it('measures window seats without a count', () => {
      const { criteria } = fulfilment(
        DESKS_IN_A_ROW,
        [[student('w', { prefersWindow: true }), null], [], []],
        { preferWindowSeats: 3 },
      );
      const windows = criteria.find(
        (criterion) => criterion.key === 'preferWindowSeats',
      );
      expect(windows?.percentage).toBeGreaterThan(0);
      expect(windows?.count).toBeUndefined();
    });

    it('keeps the inspector order and honours a limit', () => {
      const ada = student('ada', {
        wishPartnerIds: ['alan'],
        restless: true,
        gender: 'girl',
      });
      const alan = student('alan', { restless: true, gender: 'boy' });
      const settings = {
        considerWishPartners: 8,
        avoidRestlessTogether: 5,
        preferGenderMix: 2,
      };
      const { criteria } = fulfilment(
        DESKS_IN_A_ROW,
        [[ada, alan], [], []],
        settings,
      );
      expect(criteria.map((criterion) => criterion.key)).toEqual([
        'preferGenderMix',
        'avoidRestlessTogether',
        'considerWishPartners',
      ]);
      const stats = calculateSeatingStatistics(
        [[ada, alan], [], []],
        [ada, alan],
        { ...neutralSettings, ...settings },
        [],
        DESKS_IN_A_ROW,
      );
      expect(
        getTopFulfilledCriteria(stats, { ...neutralSettings, ...settings }, 1),
      ).toHaveLength(1);
    });
  });
});
