// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0044: a marker carries the day it changed, and the app asks once
 * the markers of a class stood still for twelve weeks.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { Student } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import {
  hasMarkers,
  isMarkerReviewSnoozed,
  MARKER_REVIEW_AGE_WEEKS,
  snoozeMarkerReview,
  stampMarkerChange,
  stampNewStudent,
  staleMarkerCount,
} from '../markerReview';

const NOW = new Date(2026, 10, 13, 10, 0);
const plain = (extra: Partial<Student> = {}): Student =>
  createMockStudent({ id: 's', name: 'Ada', ...extra });

describe('a marker', () => {
  it('is whatever describes a student for the mixing', () => {
    expect(hasMarkers(plain())).toBe(false);
    expect(hasMarkers(plain({ restless: true }))).toBe(true);
    expect(hasMarkers(plain({ wishPartnerIds: ['b'] }))).toBe(true);
    expect(hasMarkers(plain({ languageSkill: 'daz' }))).toBe(true);
    expect(hasMarkers(plain({ needsFreeNeighbourSeat: true }))).toBe(true);
  });

  it('is not the name, the gender or the photo', () => {
    expect(
      hasMarkers(plain({ name: 'Bea', gender: 'girl', hasPhoto: true })),
    ).toBe(false);
  });

  // Review of 2026-11-14: the hand and the height do not change with the
  // weeks, so they neither carry a day nor bring the question.
  it('is not the hand a child writes with or its height', () => {
    expect(hasMarkers(plain({ leftHanded: true, height: 'tall' }))).toBe(false);
    const before = plain({ markersUpdatedAt: '2026-01-01' });
    const patch = { leftHanded: true, height: 'small' } as Partial<Student>;
    expect(
      stampMarkerChange(
        before,
        { ...before, ...patch } as Student,
        patch,
        '2026-11-13',
      ).markersUpdatedAt,
    ).toBe('2026-01-01');
    expect(
      staleMarkerCount({
        students: [plain({ leftHanded: true }), plain({ height: 'tall' })],
        createdAt: '2026-01-01',
        now: NOW,
      }),
    ).toBe(0);
  });

  it('stamps the day it changes', () => {
    const before = plain();
    const patch = { shy: true };
    const after = stampMarkerChange(
      before,
      { ...before, ...patch },
      patch,
      '2026-11-13',
    );
    expect(after.markersUpdatedAt).toBe('2026-11-13');
  });

  it('leaves the day alone when nothing of a marker changes', () => {
    const before = plain({ shy: false, markersUpdatedAt: '2026-01-01' });
    for (const patch of [
      { name: 'Bea' },
      { shy: false },
      { prefersWindow: false },
      { wishPartnerIds: [] },
    ] as Partial<Student>[]) {
      const after = stampMarkerChange(
        before,
        { ...before, ...patch } as Student,
        patch,
        '2026-11-13',
      );
      expect(after.markersUpdatedAt).toBe('2026-01-01');
    }
  });

  it('stamps a student who arrives with markers, not one without', () => {
    expect(stampNewStudent(plain({ shy: true }), '2026-11-13')).toMatchObject({
      markersUpdatedAt: '2026-11-13',
    });
    expect(stampNewStudent(plain(), '2026-11-13').markersUpdatedAt).toBe(
      undefined,
    );
  });
});

describe('the question whether markers still hold', () => {
  const weeksBefore = (weeks: number) => {
    const day = new Date(NOW);
    day.setDate(day.getDate() - weeks * 7);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  };

  it('counts a class from before the dates from the day it was made', () => {
    const students = [plain({ id: 'a', shy: true }), plain({ id: 'b' })];
    expect(
      staleMarkerCount({
        students,
        createdAt: `${weeksBefore(MARKER_REVIEW_AGE_WEEKS)}T08:00:00.000Z`,
        now: NOW,
      }),
    ).toBe(1);
    expect(
      staleMarkerCount({
        students,
        createdAt: `${weeksBefore(MARKER_REVIEW_AGE_WEEKS - 1)}T08:00:00.000Z`,
        now: NOW,
      }),
    ).toBe(0);
  });

  it('starts anew for the whole class when the markers were said to hold', () => {
    const students = [plain({ id: 'a', shy: true })];
    expect(
      staleMarkerCount({
        students,
        createdAt: '2025-01-01T08:00:00.000Z',
        reviewedAt: weeksBefore(2),
        now: NOW,
      }),
    ).toBe(0);
  });

  it('starts anew for a student whose markers changed', () => {
    const students = [
      plain({ id: 'a', shy: true, markersUpdatedAt: weeksBefore(3) }),
      plain({ id: 'b', restless: true }),
    ];
    expect(
      staleMarkerCount({
        students,
        createdAt: '2025-01-01T08:00:00.000Z',
        now: NOW,
      }),
    ).toBe(1);
  });

  it('never asks about a student without markers', () => {
    expect(
      staleMarkerCount({
        students: [plain()],
        createdAt: '2020-01-01T08:00:00.000Z',
        now: NOW,
      }),
    ).toBe(0);
  });
});

describe('"Später"', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the question away for a week, for that class alone', () => {
    snoozeMarkerReview('c1', NOW);

    expect(isMarkerReviewSnoozed('c1', NOW)).toBe(true);
    expect(isMarkerReviewSnoozed('c2', NOW)).toBe(false);
    const nextWeek = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000 + 1);
    expect(isMarkerReviewSnoozed('c1', nextWeek)).toBe(false);
  });
});
