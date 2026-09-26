// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What a seat does with its badges: which a view shows, what gives way to a
 * "+N" when they do not fit, and whom a hovered badge points at.
 */
import { describe, expect, it } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';
import {
  BADGE_MORE_KEY,
  buildBadgeHighlightLookup,
  createBadgeDisplayFilter,
  createHiddenFamiliesFilter,
  fitSeatBadges,
  getBadgeHighlightStudentIds,
  getClassBadges,
  getSeatBadgePillParams,
  getSeatBadges,
  groupBadgesByFamily,
  isBadgeCriterionActive,
  LEGIBLE_BADGE_ICON_SIZE,
  normalizeBadgeHover,
} from '../seatBadges';
import { describeBadge, getBadgeCriteria } from '../studentAppearance';

const student = (id: string, overrides: Partial<Student> = {}) =>
  createMockStudent({ id, name: `${id} Test`, ...overrides });

/** A student who carries a badge of every family. */
const busy = student('busy', {
  restless: true,
  concentrationIssues: true,
  shy: true,
  socialRole: 'leader',
  performanceWeak: true,
  languageSkill: 'daz',
  needsFrontSeat: true,
  height: 'small',
  prefersWindow: true,
  prefersDoor: true,
  wishPartnerIds: ['friend'],
});
const friend = student('friend');
const klass = [busy, friend];

describe('badge criteria', () => {
  it('names the criteria each badge feeds, levels and roles included', () => {
    expect(getBadgeCriteria('restless')).toContain('avoidRestlessTogether');
    expect(getBadgeCriteria('languageSkill_daz')).toEqual([
      'preferLanguageMixing',
    ]);
    expect(getBadgeCriteria('socialRole_leader')).toEqual([
      'distributeSocialRoles',
    ]);
    expect(getBadgeCriteria('unknown')).toEqual([]);
  });

  it('counts a badge as active while one of its criteria is weighed', () => {
    expect(
      isBadgeCriterionActive(
        { key: 'restless' },
        { avoidRestlessTogether: 0, avoidConcentrationNearRestless: 3 },
      ),
    ).toBe(true);
    expect(
      isBadgeCriterionActive(
        { key: 'prefersWindow' },
        { preferWindowSeats: 0 },
      ),
    ).toBe(false);
  });
});

describe('display filters', () => {
  it('shows everything, only the active criteria, or nothing', () => {
    const badges = getSeatBadges(busy, klass);
    const settings = { preferWindowSeats: 5 };

    expect(createBadgeDisplayFilter('all', settings)).toBeUndefined();
    expect(
      badges
        .filter(createBadgeDisplayFilter('active', settings)!)
        .map((badge) => badge.key),
    ).toEqual(['prefersWindow']);
    expect(badges.filter(createBadgeDisplayFilter('off', settings)!)).toEqual(
      [],
    );
  });

  it('leaves whole families off a printout', () => {
    const filter = createHiddenFamiliesFilter(['behavior', 'learning']);
    const families = new Set(
      getSeatBadges(busy, klass, true, filter).map((badge) => badge.family),
    );
    expect(families.has('behavior')).toBe(false);
    expect(families.has('learning')).toBe(false);
    expect(families.has('social')).toBe(true);
    expect(createHiddenFamiliesFilter([])).toBeUndefined();
  });
});

describe('fitSeatBadges', () => {
  const badges = getSeatBadges(busy, klass);
  // A double table's seat: 55 wide, 65 tall.
  const collapsed = getSeatBadgePillParams(55, 65, true);

  it('prints every badge when the view cannot explain a "+N"', () => {
    const fit = fitSeatBadges(badges, getSeatBadgePillParams(55, 65, false));
    expect(fit?.visible).toHaveLength(badges.length);
    expect(fit?.hidden).toEqual([]);
  });

  it('keeps icons legible and folds the rest into a "+N"', () => {
    const fit = fitSeatBadges(badges, collapsed, { collapse: true });
    expect(fit).not.toBeNull();
    expect(fit!.layout.iconSize).toBeGreaterThanOrEqual(
      LEGIBLE_BADGE_ICON_SIZE,
    );
    expect(fit!.hidden.length).toBeGreaterThan(0);
    expect(fit!.visible.length + fit!.hidden.length).toBe(badges.length);
    // One slot more than the icons drawn: the "+N".
    expect(fit!.layout.iconPositions).toHaveLength(fit!.visible.length + 1);
    // The pill stays below the name in the middle of the seat.
    expect(fit!.layout.height).toBeLessThanOrEqual(65 / 2 - 12);
  });

  it('keeps the badges of active criteria first, drawn in reading order', () => {
    const fit = fitSeatBadges(badges, collapsed, {
      collapse: true,
      prioritize: (badge) =>
        badge.key === 'prefersDoor' || badge.key === 'prefersWindow',
    })!;
    const visible = fit.visible.map((badge) => badge.key);
    expect(visible).toContain('prefersDoor');
    expect(visible).toContain('prefersWindow');
    const order = badges.map((badge) => badge.key);
    expect(
      [...visible].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    ).toEqual(visible);
  });

  it('draws nothing for a seat without badges', () => {
    expect(fitSeatBadges([], collapsed, { collapse: true })).toBeNull();
  });
});

describe('badge highlights', () => {
  const quiet = student('quiet', { restless: false });
  const restless = student('restless', { restless: true });
  const everyone = [busy, friend, quiet, restless];

  it('points a wish at the student and the classmates it names', () => {
    expect(
      [...getBadgeHighlightStudentIds('wishPartner', 'busy', everyone)].sort(),
    ).toEqual(['busy', 'friend']);
  });

  it('points a trait at everyone who shares it', () => {
    expect(
      [...getBadgeHighlightStudentIds('restless', 'busy', everyone)].sort(),
    ).toEqual(['busy', 'restless']);
  });

  it('lights their seats the way a hovered criterion does', () => {
    const lookup = buildBadgeHighlightLookup(
      { badgeKey: 'restless', studentId: null },
      [
        [busy, quiet],
        [null, restless],
      ],
      everyone,
    );
    expect([...(lookup?.keys() ?? [])].sort()).toEqual(['0-0', '1-1']);
    // A badge points at seats; it passes no verdict on them.
    expect(lookup?.get('1-1')).toMatchObject({ mode: 'hover', tone: 'focus' });
    expect(
      buildBadgeHighlightLookup(
        { badgeKey: BADGE_MORE_KEY, studentId: 'busy' },
        [[busy]],
        everyone,
      ),
    ).toBeNull();
  });
});

describe('legend', () => {
  it('lists each badge of the class once, grouped by family in order', () => {
    const groups = groupBadgesByFamily(
      getClassBadges([busy, friend, student('other', { restless: true })]),
    );
    expect(groups.map((group) => group.family)).toEqual([
      'behavior',
      'social',
      'learning',
      'language',
      'space',
    ]);
    expect(
      groups[0].entries.filter((badge) => badge.key === 'restless'),
    ).toHaveLength(1);
  });

  it('says in words what a badge means', () => {
    const [height] = getSeatBadges(student('s', { height: 'small' }), []);
    expect(describeBadge(height)).toEqual({
      heading: 'Körpergröße: Klein',
      detail: 'Kleinere Schüler werden bevorzugt vorne platziert',
    });
    const wish = getSeatBadges(busy, klass).find(
      (badge) => badge.key === 'wishPartner',
    )!;
    expect(describeBadge(wish).detail).toBe('friend Test');
  });
});

describe('normalizeBadgeHover', () => {
  it('keeps both on unless a stored value switched one off', () => {
    expect(normalizeBadgeHover(undefined)).toEqual({
      tooltip: true,
      highlight: true,
    });
    expect(normalizeBadgeHover({ highlight: false })).toEqual({
      tooltip: true,
      highlight: false,
    });
    expect(normalizeBadgeHover('garbage')).toEqual({
      tooltip: true,
      highlight: true,
    });
  });
});
