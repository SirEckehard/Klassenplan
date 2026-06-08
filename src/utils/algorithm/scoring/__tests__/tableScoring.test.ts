import { describe, it, expect } from 'vitest';
import { scoreTableComposition } from '../tableScoring';
import { createMockStudent } from '@/__tests__/utils';
import type { MixSettings } from '@/types';

describe('tableScoring', () => {
  const defaultSettings: Partial<MixSettings> = {
    avoidRestlessTogether: 5,
    avoidConcentrationTogether: 5,
    distributeSocialRoles: 5,
    preferGenderMix: 5,
    peerTutoring: 5,
  };

  describe('scoreTableComposition', () => {
    it('returns 0 for tables with less than 4 students', () => {
      const members = [
        createMockStudent({ id: '1' }),
        createMockStudent({ id: '2' }),
        createMockStudent({ id: '3' }),
      ];

      const score = scoreTableComposition({
        members,
        tableIndex: 0,
        settings: defaultSettings,
      });

      expect(score).toBe(0);
    });

    it('penalizes multiple restless students at same table', () => {
      const members = [
        createMockStudent({ id: '1', restless: true }),
        createMockStudent({ id: '2', restless: true }),
        createMockStudent({ id: '3' }),
        createMockStudent({ id: '4' }),
      ];

      const score = scoreTableComposition({
        members,
        tableIndex: 0,
        settings: defaultSettings,
      });

      // Should have penalty for 2 restless students
      expect(score).toBeGreaterThan(0);
    });

    it('increases penalty with more restless students', () => {
      const twoRestless = [
        createMockStudent({ id: '1', restless: true }),
        createMockStudent({ id: '2', restless: true }),
        createMockStudent({ id: '3' }),
        createMockStudent({ id: '4' }),
      ];

      const threeRestless = [
        createMockStudent({ id: '1', restless: true }),
        createMockStudent({ id: '2', restless: true }),
        createMockStudent({ id: '3', restless: true }),
        createMockStudent({ id: '4' }),
      ];

      const scoreTwoRestless = scoreTableComposition({
        members: twoRestless,
        tableIndex: 0,
        settings: defaultSettings,
      });

      const scoreThreeRestless = scoreTableComposition({
        members: threeRestless,
        tableIndex: 0,
        settings: defaultSettings,
      });

      expect(scoreThreeRestless).toBeGreaterThan(scoreTwoRestless);
    });

    it('penalizes multiple concentration issues at same table', () => {
      const members = [
        createMockStudent({ id: '1', concentrationIssues: true }),
        createMockStudent({ id: '2', concentrationIssues: true }),
        createMockStudent({ id: '3' }),
        createMockStudent({ id: '4' }),
      ];

      const score = scoreTableComposition({
        members,
        tableIndex: 0,
        settings: defaultSettings,
      });

      expect(score).toBeGreaterThan(0);
    });

    it('rewards loner with mediator support', () => {
      const lonerWithMediator = [
        createMockStudent({ id: '1', socialRole: 'loner' }),
        createMockStudent({ id: '2', socialRole: 'mediator' }),
        createMockStudent({ id: '3' }),
        createMockStudent({ id: '4' }),
      ];

      const lonerAlone = [
        createMockStudent({ id: '1', socialRole: 'loner' }),
        createMockStudent({ id: '2' }),
        createMockStudent({ id: '3' }),
        createMockStudent({ id: '4' }),
      ];

      const scoreWithMediator = scoreTableComposition({
        members: lonerWithMediator,
        tableIndex: 0,
        settings: defaultSettings,
      });

      const scoreWithoutMediator = scoreTableComposition({
        members: lonerAlone,
        tableIndex: 0,
        settings: defaultSettings,
      });

      // With mediator should have better (lower) score
      expect(scoreWithMediator).toBeLessThan(scoreWithoutMediator);
    });

    it('penalizes gender imbalance at 4-person table', () => {
      const allBoys = [
        createMockStudent({ id: '1', gender: 'boy' }),
        createMockStudent({ id: '2', gender: 'boy' }),
        createMockStudent({ id: '3', gender: 'boy' }),
        createMockStudent({ id: '4', gender: 'boy' }),
      ];

      const balanced = [
        createMockStudent({ id: '1', gender: 'boy' }),
        createMockStudent({ id: '2', gender: 'boy' }),
        createMockStudent({ id: '3', gender: 'girl' }),
        createMockStudent({ id: '4', gender: 'girl' }),
      ];

      const scoreAllBoys = scoreTableComposition({
        members: allBoys,
        tableIndex: 0,
        settings: defaultSettings,
      });

      const scoreBalanced = scoreTableComposition({
        members: balanced,
        tableIndex: 0,
        settings: defaultSettings,
      });

      // All boys should have worse (higher) score
      expect(scoreAllBoys).toBeGreaterThan(scoreBalanced);
    });

    it('rewards heterogeneous performance mix for peer tutoring', () => {
      const mixedPerformance = [
        createMockStudent({ id: '1', performanceStrong: true }),
        createMockStudent({ id: '2', performanceWeak: true }),
        createMockStudent({ id: '3' }),
        createMockStudent({ id: '4' }),
      ];

      const allHigh = [
        createMockStudent({ id: '1', performanceStrong: true }),
        createMockStudent({ id: '2', performanceStrong: true }),
        createMockStudent({ id: '3', performanceStrong: true }),
        createMockStudent({ id: '4' }),
      ];

      const scoreMixed = scoreTableComposition({
        members: mixedPerformance,
        tableIndex: 0,
        settings: defaultSettings,
      });

      const scoreAllHigh = scoreTableComposition({
        members: allHigh,
        tableIndex: 0,
        settings: defaultSettings,
      });

      // Mixed should have better (lower) score
      expect(scoreMixed).toBeLessThan(scoreAllHigh);
    });

    it('returns 0 when all settings are disabled', () => {
      const members = [
        createMockStudent({ id: '1', restless: true }),
        createMockStudent({ id: '2', restless: true }),
        createMockStudent({ id: '3', concentrationIssues: true }),
        createMockStudent({ id: '4', socialRole: 'loner' }),
      ];

      const score = scoreTableComposition({
        members,
        tableIndex: 0,
        settings: {},
      });

      expect(score).toBe(0);
    });
  });
});
