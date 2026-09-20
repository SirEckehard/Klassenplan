// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  getStudentAppearance,
  getStudentBadges,
  getCompleteStudentAppearance,
  getAllStudentBadges,
  STUDENT_COLORS,
  SEAT_UI_COLORS,
} from '../studentAppearance';
import type { Student } from '../../../types';

describe('studentAppearance', () => {
  describe('STUDENT_COLORS constants', () => {
    it('gives every occupied seat the same paper, whatever the gender', () => {
      for (const key of ['girl', 'boy', 'diverse', 'neutral'] as const) {
        expect(STUDENT_COLORS[key].fill.light).toBe('#ffffff');
        expect(STUDENT_COLORS[key].fill.dark).toBe('#181a1d');
        expect(STUDENT_COLORS[key].stroke.light).toBe('#cec8bb');
        expect(STUDENT_COLORS[key].stroke.dark).toBe('#3a3e44');
      }
    });

    it('keeps an empty seat apart from an occupied one', () => {
      expect(STUDENT_COLORS.empty.fill.light).toBe('#f3f1ec');
      expect(STUDENT_COLORS.empty.fill.dark).toBe('#202327');
      expect(STUDENT_COLORS.empty.fill.light).not.toBe(
        STUDENT_COLORS.neutral.fill.light,
      );
    });

    it('marks a held seat with the one colour that means "you did this"', () => {
      expect(STUDENT_COLORS.locked.fill.light).toBe('#eaf0fe');
      expect(STUDENT_COLORS.locked.stroke.light).toBe('#2563eb');
    });
  });

  describe('SEAT_UI_COLORS constants', () => {
    it('defines text colors', () => {
      expect(SEAT_UI_COLORS.text.light).toBe('#17181a');
      expect(SEAT_UI_COLORS.text.dark).toBe('#f2f1ee');
    });

    it('defines lock icon colors', () => {
      expect(SEAT_UI_COLORS.lockIcon.light).toBe('#d97706');
      expect(SEAT_UI_COLORS.lockIcon.dark).toBe('#facc15');
      expect(SEAT_UI_COLORS.unlockIcon.light).toBe('#6b7280');
      expect(SEAT_UI_COLORS.unlockIcon.dark).toBe('#e5e7eb');
    });

    it('defines lock button surface colors', () => {
      expect(SEAT_UI_COLORS.lockButtonBackground.light).toBe(
        'rgba(255, 255, 255, 0.7)',
      );
      expect(SEAT_UI_COLORS.lockButtonBackground.dark).toBe(
        'rgba(3, 7, 18, 0.6)',
      );
      expect(SEAT_UI_COLORS.lockButtonBorder.light).toBe('#dbeafe');
      expect(SEAT_UI_COLORS.lockButtonBorder.dark).toBe(
        'rgba(29, 78, 216, 0.4)',
      );
    });
  });

  describe('getStudentAppearance', () => {
    const girlStudent: Student = {
      id: '1',
      name: 'Alice',
      gender: 'girl',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
      performanceStrong: false,
      performanceWeak: false,
      wishPartnerId: null,
    };

    const boyStudent: Student = {
      ...girlStudent,
      id: '2',
      name: 'Bob',
      gender: 'boy',
    };

    const diverseStudent: Student = {
      ...girlStudent,
      id: '3',
      name: 'Charlie',
      gender: 'diverse',
    };

    const unspecifiedStudent: Student = {
      ...girlStudent,
      id: '4',
      name: 'Dana',
      gender: undefined,
    };

    describe('seats', () => {
      it('renders the same for every gender', () => {
        const paper = { fill: '#ffffff', stroke: '#cec8bb', text: '#17181a' };
        for (const student of [girlStudent, boyStudent, diverseStudent]) {
          expect(getStudentAppearance(student, false)).toEqual(paper);
        }
      });

      it('renders the same for every gender in dark mode', () => {
        const paper = { fill: '#181a1d', stroke: '#3a3e44', text: '#f2f1ee' };
        for (const student of [girlStudent, boyStudent, diverseStudent]) {
          expect(getStudentAppearance(student, true)).toEqual(paper);
        }
      });
    });

    describe('empty seats', () => {
      it('returns empty seat colors in light mode', () => {
        const result = getStudentAppearance(null, false);
        expect(result.fill).toBe('#f3f1ec');
        expect(result.stroke).toBe('#e3dfd6');
        expect(result.text).toBe('#17181a');
      });

      it('returns empty seat colors in dark mode', () => {
        const result = getStudentAppearance(null, true);
        expect(result.fill).toBe('#202327');
        expect(result.stroke).toBe('#2a2d31');
        expect(result.text).toBe('#f2f1ee');
      });
    });

    describe('unspecified gender', () => {
      it('returns neutral colors in light mode', () => {
        const result = getStudentAppearance(unspecifiedStudent, false);
        expect(result.fill).toBe('#ffffff');
        expect(result.stroke).toBe('#cec8bb');
        expect(result.text).toBe('#17181a');
      });

      it('returns neutral colors in dark mode', () => {
        const result = getStudentAppearance(unspecifiedStudent, true);
        expect(result.fill).toBe('#181a1d');
        expect(result.stroke).toBe('#3a3e44');
        expect(result.text).toBe('#f2f1ee');
      });
    });

    describe('locked seats', () => {
      it('marks a held seat, whoever sits in it', () => {
        const result = getStudentAppearance(girlStudent, false, true);
        expect(result.fill).toBe('#eaf0fe');
        expect(result.stroke).toBe('#2563eb');
        expect(result.text).toBe('#17181a');
      });

      it('marks a held seat in dark mode', () => {
        const result = getStudentAppearance(boyStudent, true, true);
        expect(result.fill).toBe('#16243f');
        expect(result.stroke).toBe('#4f86f7');
        expect(result.text).toBe('#f2f1ee');
      });

      it('marks a held seat that is empty', () => {
        const result = getStudentAppearance(null, false, true);
        expect(result.fill).toBe('#eaf0fe');
        expect(result.stroke).toBe('#2563eb');
        expect(result.text).toBe('#17181a');
      });
    });
  });

  describe('getStudentBadges', () => {
    const studentWithFlags: Student = {
      id: '1',
      name: 'Test',
      gender: 'girl',
      restless: true,
      shy: true,
      concentrationIssues: false,
      needsFrontSeat: true,
      performanceStrong: false,
      performanceWeak: true,
      wishPartnerId: null,
    };

    const studentNoFlags: Student = {
      ...studentWithFlags,
      restless: false,
      shy: false,
      needsFrontSeat: false,
      performanceWeak: false,
    };

    it('returns all active flags when showSpecialNeeds is true', () => {
      const badges = getStudentBadges(studentWithFlags, true);
      expect(badges).toHaveLength(4);
      const badgeKeys = badges.map(
        (badge: ReturnType<typeof getStudentBadges>[number]) => badge.key,
      );
      // Order follows STUDENT_FLAGS order: performanceStrong, performanceWeak, needsFrontSeat, restless, shy, concentration
      expect(badgeKeys).toEqual([
        'performanceWeak',
        'needsFrontSeat',
        'restless',
        'shy',
      ]);
    });

    it('returns empty array when showSpecialNeeds is false', () => {
      const badges = getStudentBadges(studentWithFlags, false);
      expect(badges).toHaveLength(0);
    });

    it('returns empty array when student is null', () => {
      const badges = getStudentBadges(null, true);
      expect(badges).toHaveLength(0);
    });

    it('returns empty array when no flags are active', () => {
      const badges = getStudentBadges(studentNoFlags, true);
      expect(badges).toHaveLength(0);
    });

    it('defaults to showing badges when showSpecialNeeds is undefined', () => {
      const badges = getStudentBadges(studentWithFlags);
      expect(badges).toHaveLength(4);
    });

    it('includes all 6 possible flag types', () => {
      const allFlagsStudent: Student = {
        id: '1',
        name: 'Test',
        gender: 'girl',
        restless: true,
        shy: true,
        concentrationIssues: true,
        needsFrontSeat: true,
        performanceStrong: true,
        performanceWeak: false, // exclusive with performanceStrong
        wishPartnerId: null,
      };

      const badges = getStudentBadges(allFlagsStudent, true);
      expect(badges).toHaveLength(5); // 6 possible - 1 excluded
      const badgeKeys = badges.map(
        (badge: ReturnType<typeof getStudentBadges>[number]) => badge.key,
      );
      // Order follows STUDENT_FLAGS order: performanceStrong, performanceWeak, needsFrontSeat, restless, shy, concentration
      expect(badgeKeys).toEqual([
        'performanceStrong',
        'needsFrontSeat',
        'restless',
        'shy',
        'concentrationIssues',
      ]);
    });
  });

  describe('getCompleteStudentAppearance', () => {
    const studentWithFlags: Student = {
      id: '1',
      name: 'Alice',
      gender: 'girl',
      restless: true,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
      performanceStrong: false,
      performanceWeak: false,
      wishPartnerId: null,
    };

    it('combines appearance and badges', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false);
      expect(result.fill).toBe('#ffffff');
      expect(result.stroke).toBe('#cec8bb');
      expect(result.text).toBe('#17181a');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].key).toBe('restless');
    });

    it('respects locked option', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false, {
        locked: true,
      });
      expect(result.fill).toBe('#eaf0fe');
      expect(result.stroke).toBe('#2563eb');
    });

    it('respects showSpecialNeeds option', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false, {
        showSpecialNeeds: false,
      });
      expect(result.flags).toHaveLength(0);
    });

    it('handles null student', () => {
      const result = getCompleteStudentAppearance(null, false);
      expect(result.fill).toBe('#f3f1ec');
      expect(result.stroke).toBe('#e3dfd6');
      expect(result.flags).toHaveLength(0);
    });

    it('uses default options when not provided', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false);
      expect(result.flags).toHaveLength(1);
      expect(result.fill).toBe('#ffffff'); // Not locked
    });
  });

  describe('getAllStudentBadges', () => {
    const wishPartner: Student = {
      id: 'wish',
      name: 'Wish Partner',
      gender: 'boy',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
      performanceStrong: false,
      performanceWeak: false,
      wishPartnerId: null,
    };

    const avoidPartner: Student = {
      ...wishPartner,
      id: 'avoid',
      name: 'Avoid Partner',
    };

    it('orders badges as height, performance, behavior, partners, environment', () => {
      const student: Student = {
        id: 'student',
        name: 'Sample',
        gender: 'girl',
        restless: true,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        performanceStrong: true,
        performanceWeak: false,
        wishPartnerId: 'wish',
        avoidPartnerId: 'avoid',
        height: 'small',
        prefersWindow: true,
        prefersDoor: true,
      };

      const badges = getAllStudentBadges(
        student,
        [student, wishPartner, avoidPartner],
        {
          showHeight: true,
          showSpecialNeeds: true,
          showPartners: true,
        },
      );

      // Order follows Option A: height → performance → behavior → partners → environment
      expect(badges.map((badge) => badge.key)).toEqual([
        'heightSmall',
        'performanceStrong',
        'restless',
        'wishPartner',
        'avoidPartner',
        'prefersWindow',
        'prefersDoor',
      ]);
    });

    it('names every partner of the array fields in one badge', () => {
      const secondWish: Student = {
        ...wishPartner,
        id: 'wish-2',
        name: 'Second Wish',
      };
      const student: Student = {
        id: 'student-multi',
        name: 'Multi',
        gender: 'girl',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        performanceStrong: false,
        performanceWeak: false,
        // No legacy field, as the sample class stores it
        wishPartnerId: null,
        wishPartnerIds: ['wish', 'wish-2'],
        avoidPartnerIds: ['avoid'],
      };

      const badges = getAllStudentBadges(
        student,
        [student, wishPartner, secondWish, avoidPartner],
        { showPartners: true },
      );

      const wishBadge = badges.find((badge) => badge.key === 'wishPartner');
      const avoidBadge = badges.find((badge) => badge.key === 'avoidPartner');

      expect(wishBadge?.tooltip).toContain('Wish Partner');
      expect(wishBadge?.tooltip).toContain('Second Wish');
      expect(avoidBadge?.tooltip).toContain('Avoid Partner');
    });

    it('uses step-one color palette for height and partner badges', () => {
      const student: Student = {
        id: 'student-colors',
        name: 'Color Check',
        gender: 'girl',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        performanceStrong: false,
        performanceWeak: false,
        wishPartnerId: 'wish',
        avoidPartnerId: 'avoid',
        height: 'small',
      };

      const badges = getAllStudentBadges(
        student,
        [student, wishPartner, avoidPartner],
        {
          showHeight: true,
          showPartners: true,
        },
      );

      const wishBadge = badges.find((badge) => badge.key === 'wishPartner');
      const avoidBadge = badges.find((badge) => badge.key === 'avoidPartner');
      const heightBadge = badges.find((badge) => badge.key === 'heightSmall');

      expect(
        wishBadge && 'color' in wishBadge ? wishBadge.color : undefined,
      ).toBe('#22c55e');
      expect(
        avoidBadge && 'color' in avoidBadge ? avoidBadge.color : undefined,
      ).toBe('#f43f5e');
      expect(
        heightBadge && 'color' in heightBadge ? heightBadge.color : undefined,
      ).toBe('#60a5fa');
    });

    it('includes environment badges when preferences are set', () => {
      const student: Student = {
        id: 'student-environment',
        name: 'Env Check',
        gender: 'girl',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        performanceStrong: false,
        performanceWeak: false,
        wishPartnerId: null,
        avoidPartnerId: null,
        prefersWindow: true,
        prefersDoor: false,
      };

      const badges = getAllStudentBadges(student, [student], {
        showSpecialNeeds: true,
        showPartners: false,
        showHeight: false,
      });

      const windowBadge = badges.find((badge) => badge.key === 'prefersWindow');
      expect(windowBadge).toBeDefined();
      expect(
        windowBadge && 'color' in windowBadge ? windowBadge.color : undefined,
      ).toBe('#38bdf8');
    });
  });
});
