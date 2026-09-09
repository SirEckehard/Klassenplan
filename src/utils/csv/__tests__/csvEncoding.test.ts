// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test } from 'vitest';
import { sniffCsvEncoding } from '@/utils/csv/csvEncoding';

const fileFromBytes = (bytes: Uint8Array, name = 'klasse.csv'): File =>
  new File([bytes as BlobPart], name, { type: 'text/csv' });

const fileFromText = (text: string, name = 'klasse.csv'): File =>
  new File([text], name, { type: 'text/csv' });

/** "Name,Geschlecht\nMüller,w\n" written in windows-1252 (0xFC is "ü"). */
const CP1252_BYTES = Uint8Array.from([
  0x4e, 0x61, 0x6d, 0x65, 0x2c, 0x47, 0x65, 0x73, 0x63, 0x68, 0x6c, 0x65, 0x63,
  0x68, 0x74, 0x0a, 0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x2c, 0x77, 0x0a,
]);

describe('sniffCsvEncoding', () => {
  test('reads plain ASCII as UTF-8', async () => {
    await expect(sniffCsvEncoding(fileFromText('Name\nMax\n'))).resolves.toBe(
      'utf-8',
    );
  });

  test('reads UTF-8 umlauts as UTF-8', async () => {
    await expect(
      sniffCsvEncoding(fileFromText('Name\nMüller\n')),
    ).resolves.toBe('utf-8');
  });

  test('accepts a byte order mark', async () => {
    await expect(
      sniffCsvEncoding(fileFromText('﻿Name\nMüller\n')),
    ).resolves.toBe('utf-8');
  });

  test('recognises a windows-1252 export', async () => {
    await expect(sniffCsvEncoding(fileFromBytes(CP1252_BYTES))).resolves.toBe(
      'windows-1252',
    );
  });

  test('does not mistake a truncated multi-byte sequence for windows-1252', async () => {
    // The sniff limit is 512 KB. Placing "ü" so that only its lead byte falls
    // inside the inspected prefix is exactly the case that would make a strict
    // decoder throw on a perfectly valid UTF-8 file.
    const limit = 512 * 1024;
    const bytes = new Uint8Array(limit + 8).fill(0x61);
    bytes[limit - 1] = 0xc3;
    bytes[limit] = 0xbc;

    await expect(sniffCsvEncoding(fileFromBytes(bytes))).resolves.toBe('utf-8');
  });
});
