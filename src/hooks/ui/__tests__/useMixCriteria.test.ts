// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMixCriteria } from '@/hooks/ui/useMixCriteria';
import { createMockStudent } from '@/__tests__/utils';
import { DEFAULT_MIX_WEIGHTS } from '@/utils';
import { CRITERIA_FAMILY_MAP } from '@/utils/ui/criteriaIcons';

// Enough data for every criterion the panel offers.
const students = [
  createMockStudent({
    id: 'a',
    gender: 'girl',
    height: 'small',
    restless: true,
    concentrationIssues: true,
    shy: true,
    needsFrontSeat: true,
    performanceStrong: true,
    prefersWindow: true,
    languageSkill: 'native',
    socialRole: 'mediator',
    wishPartnerId: 'b',
    avoidPartnerId: 'c',
  }),
  createMockStudent({
    id: 'b',
    gender: 'boy',
    height: 'tall',
    restless: true,
    concentrationIssues: true,
    performanceWeak: true,
    prefersDoor: true,
    languageSkill: 'daz',
  }),
  createMockStudent({ id: 'c', gender: 'diverse' }),
];

describe('useMixCriteria', () => {
  it('lists the categories in the class list order, one data family each', () => {
    const { result } = renderHook(() =>
      useMixCriteria({
        settings: { ...DEFAULT_MIX_WEIGHTS },
        setMixSettings: vi.fn(),
        students,
      }),
    );
    const { categories } = result.current;

    expect(categories.map((category) => category.id)).toEqual([
      'history',
      'person',
      'learning',
      'language',
      'behavior',
      'social',
      'space',
    ]);
    // The heading and the row's colour name the same family.
    for (const category of categories) {
      for (const criterion of category.criteria) {
        expect(CRITERIA_FAMILY_MAP[criterion.key]).toBe(category.id);
      }
    }
  });
});
