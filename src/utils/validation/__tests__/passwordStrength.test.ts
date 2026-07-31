// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  MIN_BACKUP_PASSWORD_LENGTH,
  ratePasswordStrength,
} from '../passwordStrength';

describe('ratePasswordStrength', () => {
  it('rates anything below the minimum length as weak', () => {
    expect(ratePasswordStrength('')).toBe('weak');
    expect(ratePasswordStrength('Ab3!x')).toBe('weak');
    expect(
      ratePasswordStrength('a'.repeat(MIN_BACKUP_PASSWORD_LENGTH - 1)),
    ).toBe('weak');
  });

  it('rates a bare minimum-length password as weak', () => {
    expect(ratePasswordStrength('abcdefgh')).toBe('weak');
  });

  it('rewards mixed character classes at the minimum length', () => {
    expect(ratePasswordStrength('Abcdef1!')).toBe('medium');
  });

  it('rewards length on its own', () => {
    expect(ratePasswordStrength('abcdefghijkl')).toBe('medium');
  });

  it('rates long or long-and-mixed passwords as strong', () => {
    expect(ratePasswordStrength('abcdefghijklmnop')).toBe('strong');
    expect(ratePasswordStrength('Abcdefghijk1!')).toBe('strong');
  });
});
