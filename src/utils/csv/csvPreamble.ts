// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { hasRecognizedCsvHeaders } from '@/utils/csv/csvColumnVocabulary';

/**
 * Drops title lines that sit above the real header row.
 *
 * School systems like to stamp an export with something like
 * "Schülerliste 5a — Stand 01.09.2026" before the table starts. Papa then reads
 * that line as the header, finds a single column, and the import fails with
 * advice about delimiters that does not apply.
 *
 * Runs inside the CSV worker too, so this module deliberately imports nothing
 * but the shared column vocabulary.
 */

/** How far down a header row is still looked for. */
const MAX_PREAMBLE_LINES = 5;

/** Separators a class list realistically uses. */
const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const;

/**
 * Split a single line on whichever candidate delimiter yields the most cells.
 *
 * Quoting is ignored on purpose: this only has to recognise a header row, and
 * the real parse happens afterwards with Papa's own delimiter detection.
 */
const splitLine = (line: string): string[] => {
  let cells: string[] = [line];
  for (const delimiter of CANDIDATE_DELIMITERS) {
    const candidate = line.split(delimiter);
    if (candidate.length > cells.length) {
      cells = candidate;
    }
  }
  return cells.map((cell) =>
    cell
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .trim(),
  );
};

/**
 * Returns the chunk without its preamble, or `undefined` when there is nothing
 * to strip — which is also what Papa's `beforeFirstChunk` expects for "leave it
 * alone".
 *
 * Nothing is stripped unless a *later* line is recognisable as a header row and
 * the first one is not: a file whose first line already names known columns is
 * passed through untouched, and so is a file where no line looks like a header
 * at all. That keeps a genuine data row from ever being thrown away.
 */
export const stripCsvPreamble = (chunk: string): string | undefined => {
  const lines = chunk.split(/\r?\n/);
  const limit = Math.min(lines.length, MAX_PREAMBLE_LINES);

  for (let index = 0; index < limit; index += 1) {
    const line = lines[index];
    if (!line || !line.trim()) continue;

    const cells = splitLine(line);
    if (cells.length < 2 || !hasRecognizedCsvHeaders(cells)) continue;

    return index === 0 ? undefined : lines.slice(index).join('\n');
  }

  return undefined;
};
