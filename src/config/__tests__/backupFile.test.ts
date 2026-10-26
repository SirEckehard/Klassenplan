// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { backupFileAccept } from '../backupFile';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
// An iPad asks for the desktop site and reports a Mac.
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('backupFileAccept', () => {
  it('offers backups by their extensions on a computer', () => {
    expect(backupFileAccept({ userAgent: WINDOWS, maxTouchPoints: 0 })).toBe(
      '.klassenplan,.json',
    );
    expect(backupFileAccept({ userAgent: MAC, maxTouchPoints: 0 })).toBe(
      '.klassenplan,.json',
    );
  });

  // iOS knows no file type for ".klassenplan" and greys every backup out.
  it('takes any file on an iPhone and an iPad', () => {
    expect(
      backupFileAccept({ userAgent: IPHONE, maxTouchPoints: 5 }),
    ).toBeUndefined();
    expect(
      backupFileAccept({ userAgent: MAC, maxTouchPoints: 5 }),
    ).toBeUndefined();
  });
});
