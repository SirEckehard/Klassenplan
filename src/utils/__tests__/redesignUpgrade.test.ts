// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { isRedesignUpgrade } from '@/utils';

describe('isRedesignUpgrade', () => {
  it('is true for a step from a 2.x release to 3.0 or later', () => {
    expect(isRedesignUpgrade('2.2.0', '3.0.0')).toBe(true);
    expect(isRedesignUpgrade('1.4.2', '3.1.0')).toBe(true);
  });

  it('is false within the redesign or before it', () => {
    expect(isRedesignUpgrade('3.0.0', '3.0.1')).toBe(false);
    expect(isRedesignUpgrade('2.1.1', '2.2.0')).toBe(false);
  });

  it('is false on a first visit, which has no earlier version', () => {
    expect(isRedesignUpgrade('', '3.0.0')).toBe(false);
    expect(isRedesignUpgrade('unknown', '3.0.0')).toBe(false);
  });
});
