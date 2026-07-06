// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect } from 'vitest';
import type { Student } from '../../types';
import {
  isCriterionAvailable,
  getAllCriteriaAvailability,
} from '../criteriaValidation';

// Helper function to create test students
function createStudent(id: string, overrides: Partial<Student> = {}): Student {
  return {
    id,
    name: `Student ${id}`,
    gender: 'diverse',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    performanceStrong: false,
    performanceWeak: false,
    ...overrides,
  };
}

describe('criteriaValidation', () => {
  describe('isCriterionAvailable', () => {
    test('considerWishPartners is available when at least one student has wishPartnerId', () => {
      const students = [
        createStudent('1'),
        createStudent('2', { wishPartnerId: '1' }),
      ];

      const result = isCriterionAvailable('considerWishPartners', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('considerWishPartners is unavailable when no student has wishPartnerId', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable('considerWishPartners', students);
      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        'generator:mix.unavailable.considerWishPartners',
      );
    });

    test('avoidConflictPartners is available when at least one student has avoidPartnerId', () => {
      const students = [
        createStudent('1'),
        createStudent('2', { avoidPartnerId: '1' }),
      ];

      const result = isCriterionAvailable('avoidConflictPartners', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('avoidConflictPartners is unavailable when no student has avoidPartnerId', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable('avoidConflictPartners', students);
      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        'generator:mix.unavailable.avoidConflictPartners',
      );
    });

    test('avoidPreviousPairs is always available', () => {
      const students = [createStudent('1')];

      const result = isCriterionAvailable('avoidPreviousPairs', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('avoidRestlessTogether is available when at least 2 students are restless', () => {
      const students = [
        createStudent('1', { restless: true }),
        createStudent('2', { restless: true }),
      ];

      const result = isCriterionAvailable('avoidRestlessTogether', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('avoidRestlessTogether is unavailable when less than 2 students are restless', () => {
      const students = [
        createStudent('1', { restless: true }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable('avoidRestlessTogether', students);
      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        'generator:mix.unavailable.avoidRestlessTogether',
      );
    });

    test('avoidConcentrationTogether is available when at least 2 students have concentration issues', () => {
      const students = [
        createStudent('1', { concentrationIssues: true }),
        createStudent('2', { concentrationIssues: true }),
      ];

      const result = isCriterionAvailable(
        'avoidConcentrationTogether',
        students,
      );
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('avoidConcentrationTogether is unavailable when less than 2 students have concentration issues', () => {
      const students = [
        createStudent('1', { concentrationIssues: true }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable(
        'avoidConcentrationTogether',
        students,
      );
      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        'generator:mix.unavailable.avoidConcentrationTogether',
      );
    });

    test('preferGenderMix is available when at least two students have gender set', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable('preferGenderMix', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('preferGenderMix is unavailable with fewer than two gender entries', () => {
      const students = [
        createStudent('1', { gender: undefined }),
        createStudent('2', { gender: undefined }),
      ];

      const result = isCriterionAvailable('preferGenderMix', students);
      expect(result.available).toBe(false);
      expect(result.reason).toBe('generator:mix.unavailable.preferGenderMix');
    });

    test('avoidShyAlone is available when at least one student is shy', () => {
      const students = [createStudent('1', { shy: true }), createStudent('2')];

      const result = isCriterionAvailable('avoidShyAlone', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('avoidShyAlone is unavailable when no student is shy', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable('avoidShyAlone', students);
      expect(result.available).toBe(false);
      expect(result.reason).toBe('generator:mix.unavailable.avoidShyAlone');
    });

    test('peerTutoring is available when at least one student has performance rating', () => {
      const students = [
        createStudent('1', { performanceStrong: true }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable('peerTutoring', students);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('peerTutoring is unavailable when no student has performance rating', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable('peerTutoring', students);
      expect(result.available).toBe(false);
      expect(result.reason).toBe('generator:mix.unavailable.performanceLevels');
    });

    test('homogeneousPerformanceGroups is available when at least one student has performance rating', () => {
      const students = [
        createStudent('1', { performanceWeak: true }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable(
        'homogeneousPerformanceGroups',
        students,
      );
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('homogeneousPerformanceGroups is unavailable when no student has performance rating', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable(
        'homogeneousPerformanceGroups',
        students,
      );
      expect(result.available).toBe(false);
      expect(result.reason).toBe('generator:mix.unavailable.performanceLevels');
    });

    test('preferFrontForNeedsFrontSeat is available when at least one student has front seat need', () => {
      const students = [
        createStudent('1', { needsFrontSeat: true }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable(
        'preferFrontForNeedsFrontSeat',
        students,
      );
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('preferFrontForNeedsFrontSeat is unavailable when no student has front seat need', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable(
        'preferFrontForNeedsFrontSeat',
        students,
      );
      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        'generator:mix.unavailable.preferFrontForNeedsFrontSeat',
      );
    });

    test('preferFrontForSmallerStudents is available when at least one student has height rating', () => {
      const students = [
        createStudent('1', { height: 'small' }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable(
        'preferFrontForSmallerStudents',
        students,
      );
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('preferFrontForSmallerStudents is unavailable when no student has height rating', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = isCriterionAvailable(
        'preferFrontForSmallerStudents',
        students,
      );
      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        'generator:mix.unavailable.preferFrontForSmallerStudents',
      );
    });

    test('preferFrontForSmallerStudents is available when at least one student is tall', () => {
      const students = [
        createStudent('1', { height: 'tall' }),
        createStudent('2'),
      ];

      const result = isCriterionAvailable(
        'preferFrontForSmallerStudents',
        students,
      );
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('getAllCriteriaAvailability', () => {
    test('returns availability for all criteria', () => {
      const students = [
        createStudent('1', {
          wishPartnerId: '2',
          avoidPartnerId: '3',
          restless: true,
          concentrationIssues: true,
          shy: true,
          performanceStrong: true,
          needsFrontSeat: true,
          height: 'small',
          prefersWindow: true,
          languageSkill: 'native',
          socialRole: 'mediator',
        }),
        createStudent('2', {
          restless: true,
          concentrationIssues: true,
          prefersDoor: true,
          languageSkill: 'beginner',
        }),
        createStudent('3'),
      ];

      const result = getAllCriteriaAvailability(students);

      expect(result.size).toBe(16);
      expect(result.get('considerWishPartners')?.available).toBe(true);
      expect(result.get('avoidConflictPartners')?.available).toBe(true);
      expect(result.get('avoidPreviousPairs')?.available).toBe(true);
      expect(result.get('avoidRestlessTogether')?.available).toBe(true);
      expect(result.get('avoidConcentrationTogether')?.available).toBe(true);
      expect(result.get('avoidConcentrationNearRestless')?.available).toBe(
        true,
      );
      expect(result.get('preferGenderMix')?.available).toBe(true);
      expect(result.get('avoidShyAlone')?.available).toBe(true);
      expect(result.get('peerTutoring')?.available).toBe(true);
      expect(result.get('homogeneousPerformanceGroups')?.available).toBe(true);
      expect(result.get('preferFrontForNeedsFrontSeat')?.available).toBe(true);
      expect(result.get('preferFrontForSmallerStudents')?.available).toBe(true);
      expect(result.get('preferWindowSeats')?.available).toBe(true);
      expect(result.get('preferDoorSeats')?.available).toBe(true);
      expect(result.get('preferLanguageMixing')?.available).toBe(true);
      expect(result.get('distributeSocialRoles')?.available).toBe(true);
    });

    test('returns all unavailable for students with no special attributes', () => {
      const students = [createStudent('1'), createStudent('2')];

      const result = getAllCriteriaAvailability(students);

      expect(result.get('considerWishPartners')?.available).toBe(false);
      expect(result.get('avoidConflictPartners')?.available).toBe(false);
      expect(result.get('avoidRestlessTogether')?.available).toBe(false);
      expect(result.get('avoidConcentrationTogether')?.available).toBe(false);
      expect(result.get('avoidShyAlone')?.available).toBe(false);
      expect(result.get('peerTutoring')?.available).toBe(false);
      expect(result.get('homogeneousPerformanceGroups')?.available).toBe(false);
      expect(result.get('preferFrontForNeedsFrontSeat')?.available).toBe(false);
      expect(result.get('preferFrontForSmallerStudents')?.available).toBe(
        false,
      );

      // These should always be available
      expect(result.get('avoidPreviousPairs')?.available).toBe(true);
      expect(result.get('preferGenderMix')?.available).toBe(true);
    });

    test('marks preferGenderMix unavailable when fewer than two genders provided', () => {
      const students = [
        createStudent('1', { gender: undefined }),
        createStudent('2', { gender: undefined }),
        createStudent('3', { gender: undefined }),
      ];

      const result = getAllCriteriaAvailability(students);

      const genderMixAvailability = result.get('preferGenderMix');
      expect(genderMixAvailability?.available).toBe(false);
      expect(genderMixAvailability?.reason).toBe(
        'generator:mix.unavailable.preferGenderMix',
      );
    });
  });
});
