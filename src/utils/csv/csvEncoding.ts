// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logDebug } from '@/utils';

/**
 * Encodings the CSV import can read.
 *
 * Class lists exported on Windows — WebUntis and SchILD in particular — are
 * regularly written in the legacy single-byte encoding, and reading those as
 * UTF-8 turns every umlaut into a replacement character. That failure is
 * silent: the import "succeeds" and the seating plan shows boxes instead of
 * names. Sniffing the encoding before parsing is what stops that.
 *
 * `windows-1252` rather than `iso-8859-1`, because Windows exports really do
 * use the 0x80–0x9F range (typographic quotes, the euro sign) that cp1252
 * defines and latin-1 leaves undefined.
 */
export type CsvEncoding = 'utf-8' | 'windows-1252';

const CSV_ENCODING_CONTEXT = 'csvEncoding';

/** How much of a file is inspected. Class lists are far smaller than this. */
const SNIFF_LIMIT_BYTES = 512 * 1024;

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

const startsWithBom = (bytes: Uint8Array): boolean =>
  bytes.length >= UTF8_BOM.length &&
  UTF8_BOM.every((byte, index) => bytes[index] === byte);

/**
 * Cut a prefix back to the last complete UTF-8 sequence.
 *
 * Without this a file that is perfectly good UTF-8 would be reported as
 * cp1252 whenever the sniff limit happens to fall inside a multi-byte
 * character — the decoder would throw on the truncated tail, not on the
 * content.
 */
const trimToSequenceBoundary = (bytes: Uint8Array): Uint8Array => {
  for (let back = 1; back <= 3 && back <= bytes.length; back += 1) {
    const byte = bytes[bytes.length - back];
    if (byte < 0x80) return bytes; // plain ASCII, nothing pending
    if (byte < 0xc0) continue; // continuation byte, keep walking back
    const expectedLength = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : 2;
    return expectedLength > back
      ? bytes.subarray(0, bytes.length - back)
      : bytes;
  }
  return bytes;
};

/**
 * Decide how a CSV file has to be decoded.
 *
 * A byte order mark settles it outright. Otherwise the prefix is run through a
 * strict UTF-8 decoder: valid UTF-8 (which includes pure ASCII) decodes, and
 * anything else can only be the single-byte encoding.
 *
 * Unreadable files fall back to `utf-8`, which is what the import did before
 * sniffing existed — a read error is reported by the parser, not here.
 */
export const sniffCsvEncoding = async (file: File): Promise<CsvEncoding> => {
  try {
    const buffer = await file.slice(0, SNIFF_LIMIT_BYTES).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (startsWithBom(bytes)) {
      return 'utf-8';
    }

    const candidate =
      file.size > SNIFF_LIMIT_BYTES ? trimToSequenceBoundary(bytes) : bytes;

    new TextDecoder('utf-8', { fatal: true }).decode(candidate);
    return 'utf-8';
  } catch (error) {
    if (error instanceof TypeError) {
      logDebug(
        'CSV file is not valid UTF-8, reading it as windows-1252',
        { fileName: file.name },
        CSV_ENCODING_CONTEXT,
      );
      return 'windows-1252';
    }

    logDebug(
      'CSV encoding sniffing failed, assuming UTF-8',
      { fileName: file.name, error },
      CSV_ENCODING_CONTEXT,
    );
    return 'utf-8';
  }
};
