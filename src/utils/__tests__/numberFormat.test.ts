// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { formatPercent } from '../numberFormat';

describe('formatPercent', () => {
  it('sets the sign apart in German, as German typesetting does', () => {
    expect(formatPercent(85, 'de')).toBe('85 %');
  });

  it('writes the sign straight after the number in English', () => {
    expect(formatPercent(85, 'en')).toBe('85%');
  });

  it('rounds to a whole percentage', () => {
    expect(formatPercent(84.6, 'en')).toBe('85%');
    expect(formatPercent(0, 'de')).toBe('0 %');
    expect(formatPercent(100, 'en')).toBe('100%');
  });

  it('follows a regional variant of the language', () => {
    expect(formatPercent(42, 'en-GB')).toBe('42%');
    expect(formatPercent(42, 'de-AT')).toBe('42 %');
  });
});
