// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BADGE_DISPLAY_MODES,
  DEFAULT_BADGE_HOVER,
  normalizeBadgeHover,
} from '../badgePreferences';

describe('badgePreferences', () => {
  it('keeps both hover effects on unless a stored value switched one off', () => {
    expect(normalizeBadgeHover(undefined)).toEqual(DEFAULT_BADGE_HOVER);
    expect(normalizeBadgeHover({ highlight: false })).toEqual({
      tooltip: true,
      highlight: false,
    });
    expect(normalizeBadgeHover('garbage')).toEqual({
      tooltip: true,
      highlight: true,
    });
  });

  it('offers every display mode once', () => {
    expect([...BADGE_DISPLAY_MODES].sort()).toEqual(['active', 'all', 'off']);
  });

  // The provider that stores these preferences wraps every page, so an import
  // here would join the start page's download (see the module comment).
  it('imports nothing', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/utils/ui/badgePreferences.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});
