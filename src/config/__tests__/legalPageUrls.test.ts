// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { readLegalPageUrls } from '../legalPageUrls';

describe('readLegalPageUrls', () => {
  it('keeps the bundled pages when nothing is configured', () => {
    expect(readLegalPageUrls({})).toEqual({
      '/impressum': null,
      '/datenschutz': null,
    });
    expect(readLegalPageUrls({ IMPRINT_URL: '  ', PRIVACY_URL: '' })).toEqual({
      '/impressum': null,
      '/datenschutz': null,
    });
  });

  it('accepts absolute http and https URLs, each on its own', () => {
    expect(
      readLegalPageUrls({ IMPRINT_URL: ' https://schule.example/impressum ' }),
    ).toEqual({
      '/impressum': 'https://schule.example/impressum',
      '/datenschutz': null,
    });
    expect(
      readLegalPageUrls({ PRIVACY_URL: 'http://intranet.example/datenschutz' }),
    ).toEqual({
      '/impressum': null,
      '/datenschutz': 'http://intranet.example/datenschutz',
    });
  });

  it('fails the build on anything that is not an absolute http(s) URL', () => {
    expect(() => readLegalPageUrls({ IMPRINT_URL: '/impressum' })).toThrow(
      /IMPRINT_URL/,
    );
    expect(() =>
      readLegalPageUrls({ PRIVACY_URL: 'javascript:alert(1)' }),
    ).toThrow(/PRIVACY_URL/);
    expect(() =>
      readLegalPageUrls({ PRIVACY_URL: 'mailto:dsb@schule.example' }),
    ).toThrow(/PRIVACY_URL/);
  });
});
