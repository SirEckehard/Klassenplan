// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import { getAllStudentBadges } from '@/utils/ui/studentAppearance';
import { brushMarker, brushPatch } from '../markerBrush';
import { fittingBadgeCount } from '../StudentChips';

describe('brushPatch', () => {
  it('sets a marker a student lacks and takes off one they carry', () => {
    const student = createMockStudent({ restless: false, shy: true });
    expect(brushPatch(student, brushMarker('restless'))).toEqual({
      restless: true,
    });
    expect(brushPatch(student, brushMarker('shy'))).toEqual({ shy: false });
  });

  it('takes off the marker one rules out, as the inspector does', () => {
    const student = createMockStudent({ performanceWeak: true });
    expect(brushPatch(student, brushMarker('performanceStrong'))).toEqual({
      performanceStrong: true,
      performanceWeak: false,
    });
  });

  it('sets the room preferences too', () => {
    const student = createMockStudent({});
    expect(brushPatch(student, brushMarker('leftHanded'))).toEqual({
      leftHanded: true,
    });
  });
});

describe('fittingBadgeCount', () => {
  const badges = getAllStudentBadges(
    createMockStudent({
      restless: true,
      concentrationIssues: true,
      shy: true,
      performanceStrong: true,
      needsFrontSeat: true,
      prefersWindow: true,
      leftHanded: true,
    }),
    [],
  );

  it('shows every badge where nothing was measured or all fit', () => {
    expect(fittingBadgeCount(badges, 0)).toBe(badges.length);
    expect(fittingBadgeCount(badges, 1000)).toBe(badges.length);
  });

  it('leaves room for the "+N" where they do not', () => {
    // Two behaviour icons (22 + 3 + 22) and the family gap before the next
    // fill 55px; with the "+N" beside them 93px hold two, not three.
    expect(fittingBadgeCount(badges, 93)).toBe(2);
    expect(fittingBadgeCount(badges, 20)).toBe(0);
  });
});
