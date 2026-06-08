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
    it('defines all gender colors with light and dark modes', () => {
      expect(STUDENT_COLORS.girl.fill.light).toBe('#f5f3ff');
      expect(STUDENT_COLORS.girl.fill.dark).toBe('#5b21b6');
      expect(STUDENT_COLORS.girl.stroke.light).toBe('#8b5cf6');
      expect(STUDENT_COLORS.girl.stroke.dark).toBe('#a855f7');

      expect(STUDENT_COLORS.boy.fill.light).toBe('#ecfdf5');
      expect(STUDENT_COLORS.boy.fill.dark).toBe('#047857');
      expect(STUDENT_COLORS.boy.stroke.light).toBe('#10b981');
      expect(STUDENT_COLORS.boy.stroke.dark).toBe('#10b981');

      expect(STUDENT_COLORS.diverse.fill.light).toBe('#eff6ff');
      expect(STUDENT_COLORS.diverse.fill.dark).toBe('#1e40af');
      expect(STUDENT_COLORS.diverse.stroke.light).toBe('#3b82f6');
      expect(STUDENT_COLORS.diverse.stroke.dark).toBe('#3b82f6');

      expect(STUDENT_COLORS.neutral.fill.light).toBe('#ffffff');
      expect(STUDENT_COLORS.neutral.fill.dark).toBe('#1f2937');
      expect(STUDENT_COLORS.neutral.stroke.light).toBe('#d1d5db');
      expect(STUDENT_COLORS.neutral.stroke.dark).toBe('#4b5563');
    });

    it('defines empty seat colors', () => {
      expect(STUDENT_COLORS.empty.fill.light).toBe('#f0f0f0');
      expect(STUDENT_COLORS.empty.fill.dark).toBe('#374151');
      expect(STUDENT_COLORS.empty.stroke.light).toBe('#d1d5db');
      expect(STUDENT_COLORS.empty.stroke.dark).toBe('#6b7280');
    });

    it('defines locked seat colors', () => {
      expect(STUDENT_COLORS.locked.fill.light).toBe('#e5e7eb');
      expect(STUDENT_COLORS.locked.fill.dark).toBe('#4b5563');
      expect(STUDENT_COLORS.locked.stroke.light).toBe('#d1d5db');
      expect(STUDENT_COLORS.locked.stroke.dark).toBe('#6b7280');
    });
  });

  describe('SEAT_UI_COLORS constants', () => {
    it('defines text colors', () => {
      expect(SEAT_UI_COLORS.text.light).toBe('#000');
      expect(SEAT_UI_COLORS.text.dark).toBe('#fff');
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

    describe('gender colors', () => {
      it('returns girl colors in light mode', () => {
        const result = getStudentAppearance(girlStudent, false);
        expect(result.fill).toBe('#f5f3ff');
        expect(result.stroke).toBe('#8b5cf6');
        expect(result.text).toBe('#000');
      });

      it('returns girl colors in dark mode', () => {
        const result = getStudentAppearance(girlStudent, true);
        expect(result.fill).toBe('#5b21b6');
        expect(result.stroke).toBe('#a855f7');
        expect(result.text).toBe('#fff');
      });

      it('returns boy colors in light mode', () => {
        const result = getStudentAppearance(boyStudent, false);
        expect(result.fill).toBe('#ecfdf5');
        expect(result.stroke).toBe('#10b981');
        expect(result.text).toBe('#000');
      });

      it('returns boy colors in dark mode', () => {
        const result = getStudentAppearance(boyStudent, true);
        expect(result.fill).toBe('#047857');
        expect(result.stroke).toBe('#10b981');
        expect(result.text).toBe('#fff');
      });

      it('returns diverse colors in light mode', () => {
        const result = getStudentAppearance(diverseStudent, false);
        expect(result.fill).toBe('#eff6ff');
        expect(result.stroke).toBe('#3b82f6');
        expect(result.text).toBe('#000');
      });

      it('returns diverse colors in dark mode', () => {
        const result = getStudentAppearance(diverseStudent, true);
        expect(result.fill).toBe('#1e40af');
        expect(result.stroke).toBe('#3b82f6');
        expect(result.text).toBe('#fff');
      });
    });

    describe('empty seats', () => {
      it('returns empty seat colors in light mode', () => {
        const result = getStudentAppearance(null, false);
        expect(result.fill).toBe('#f0f0f0');
        expect(result.stroke).toBe('#d1d5db');
        expect(result.text).toBe('#000');
      });

      it('returns empty seat colors in dark mode', () => {
        const result = getStudentAppearance(null, true);
        expect(result.fill).toBe('#374151');
        expect(result.stroke).toBe('#6b7280');
        expect(result.text).toBe('#fff');
      });
    });

    describe('unspecified gender', () => {
      it('returns neutral colors in light mode', () => {
        const result = getStudentAppearance(unspecifiedStudent, false);
        expect(result.fill).toBe('#ffffff');
        expect(result.stroke).toBe('#d1d5db');
        expect(result.text).toBe('#000');
      });

      it('returns neutral colors in dark mode', () => {
        const result = getStudentAppearance(unspecifiedStudent, true);
        expect(result.fill).toBe('#1f2937');
        expect(result.stroke).toBe('#4b5563');
        expect(result.text).toBe('#fff');
      });
    });

    describe('locked seats', () => {
      it('returns locked colors overriding gender in light mode', () => {
        const result = getStudentAppearance(girlStudent, false, true);
        expect(result.fill).toBe('#e5e7eb');
        expect(result.stroke).toBe('#d1d5db');
        expect(result.text).toBe('#000');
      });

      it('returns locked colors overriding gender in dark mode', () => {
        const result = getStudentAppearance(boyStudent, true, true);
        expect(result.fill).toBe('#4b5563');
        expect(result.stroke).toBe('#6b7280');
        expect(result.text).toBe('#fff');
      });

      it('returns locked colors for empty seats', () => {
        const result = getStudentAppearance(null, false, true);
        expect(result.fill).toBe('#e5e7eb');
        expect(result.stroke).toBe('#d1d5db');
        expect(result.text).toBe('#000');
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
      expect(result.fill).toBe('#f5f3ff');
      expect(result.stroke).toBe('#8b5cf6');
      expect(result.text).toBe('#000');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].key).toBe('restless');
    });

    it('respects locked option', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false, {
        locked: true,
      });
      expect(result.fill).toBe('#e5e7eb');
      expect(result.stroke).toBe('#d1d5db');
    });

    it('respects showSpecialNeeds option', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false, {
        showSpecialNeeds: false,
      });
      expect(result.flags).toHaveLength(0);
    });

    it('handles null student', () => {
      const result = getCompleteStudentAppearance(null, false);
      expect(result.fill).toBe('#f0f0f0');
      expect(result.stroke).toBe('#d1d5db');
      expect(result.flags).toHaveLength(0);
    });

    it('uses default options when not provided', () => {
      const result = getCompleteStudentAppearance(studentWithFlags, false);
      expect(result.flags).toHaveLength(1);
      expect(result.fill).toBe('#f5f3ff'); // Not locked
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
