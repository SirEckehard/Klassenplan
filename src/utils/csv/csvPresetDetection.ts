// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logDebug } from '@/utils';
import { normalizeHeaderKey } from '@/utils/data/csvNormalization';
import { CSV_PRESETS, type CsvPreset } from '@/utils/csv/csvPresets';
import type { CsvParseResult } from '@/utils/csv/csvTypes';

/**
 * Recognising a class list export and translating it into Klassenplan's own
 * column vocabulary — two pure functions, no I/O, no parsing.
 */

const CSV_PRESET_CONTEXT = 'csvPreset';

/** A recognised export format together with how strongly it matched. */
export type CsvPresetMatch = {
  preset: CsvPreset;
  score: number;
};

/**
 * Pick the preset that fits these headings best, or `null` when none does.
 *
 * A preset needs *all* of its required headings plus at least one
 * vendor-characteristic signal. Requiring both is what keeps an ordinary
 * "Nachname, Vorname, Klasse" list from being claimed by a vendor whose
 * columns simply happen to be named the same way.
 */
export const detectCsvPreset = (
  headers: readonly string[],
): CsvPresetMatch | null => {
  const present = new Set(
    headers.map((header) => normalizeHeaderKey(header)).filter(Boolean),
  );

  let best: CsvPresetMatch | null = null;

  for (const preset of CSV_PRESETS) {
    if (!preset.required.every((heading) => present.has(heading))) continue;

    const signalHits = preset.signals.filter((heading) =>
      present.has(heading),
    ).length;
    if (signalHits === 0) continue;

    const score = preset.required.length * 2 + signalHits;
    if (!best || score > best.score) {
      best = { preset, score };
    }
  }

  if (best) {
    logDebug(
      'CSV import preset recognised',
      { preset: best.preset.id, score: best.score },
      CSV_PRESET_CONTEXT,
    );
  }

  return best;
};

/**
 * Build the source→target header map for this file.
 *
 * A rename is skipped whenever its target heading is already taken — by a
 * column the file brought along, or by an earlier rename. A sheet carrying both
 * "Name" and "Nachname" therefore keeps its own "Nachname" instead of having it
 * overwritten by a guess.
 */
const buildRenameMap = (
  fields: readonly string[],
  preset: CsvPreset,
): Map<string, string> => {
  const taken = new Set(fields);
  const renames = new Map<string, string>();

  for (const field of fields) {
    const target = preset.rename[normalizeHeaderKey(field)];
    if (!target || target === field) continue;

    if (taken.has(target)) {
      logDebug(
        'CSV preset rename skipped, target column already present',
        { preset: preset.id, from: field, to: target },
        CSV_PRESET_CONTEXT,
      );
      continue;
    }

    renames.set(field, target);
    taken.add(target);
  }

  return renames;
};

/** Translate one cell through the preset's decode table, if it has one. */
const decodeCell = (
  preset: CsvPreset,
  column: string,
  value: unknown,
): unknown => {
  const table = preset.decode?.[column];
  if (!table) return value;

  const key = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!key) return value;

  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : value;
};

/**
 * Apply a preset to a parsed file: rename the headings, decode the values.
 *
 * Returns a new result object; the input is left untouched. Column order is
 * preserved, which the parser's loose height/language/role lookups rely on.
 */
export const applyCsvPreset = (
  result: CsvParseResult,
  preset: CsvPreset,
): CsvParseResult => {
  const fields = result.meta?.fields ?? [];
  const renames = buildRenameMap(fields, preset);
  const hasDecoding = Boolean(preset.decode);

  if (renames.size === 0 && !hasDecoding) {
    return result;
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  const data = rows.map((row) => {
    if (row == null || typeof row !== 'object') return row;

    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const column = renames.get(key) ?? key;
      next[column] = hasDecoding ? decodeCell(preset, column, value) : value;
    }
    return next;
  });

  return {
    ...result,
    data,
    meta: {
      ...result.meta,
      fields: fields.map((field) => renames.get(field) ?? field),
    },
  };
};
