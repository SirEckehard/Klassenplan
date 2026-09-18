// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTACT_EMAIL, readContactEmail } from '../contactEmail';

describe('readContactEmail', () => {
  it('keeps the maintainer address when nothing is configured', () => {
    expect(readContactEmail({})).toBe(DEFAULT_CONTACT_EMAIL);
    expect(readContactEmail({ CONTACT_EMAIL: '   ' })).toBe(
      DEFAULT_CONTACT_EMAIL,
    );
  });

  it('accepts an operator address and trims it', () => {
    expect(readContactEmail({ CONTACT_EMAIL: ' it@schule.example ' })).toBe(
      'it@schule.example',
    );
  });

  it('throws instead of silently falling back to the maintainer', () => {
    expect(() => readContactEmail({ CONTACT_EMAIL: 'schule.example' })).toThrow(
      /CONTACT_EMAIL/,
    );
    expect(() =>
      readContactEmail({ CONTACT_EMAIL: 'it@schule example.de' }),
    ).toThrow(/CONTACT_EMAIL/);
    expect(() => readContactEmail({ CONTACT_EMAIL: 'it@localhost' })).toThrow(
      /CONTACT_EMAIL/,
    );
  });
});
