// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Locale-aware number formatting, the counterpart of `dateTimeFormat.ts`.
 *
 * Percentages used to be glued together by hand — "85%" in one place, "42 %"
 * in another, whatever the language. German sets a (non-breaking) space
 * before the sign, English does not; `Intl.NumberFormat` knows both.
 */
import { resolveLocale } from './dateTimeFormat';

const percentFormatters = new Map<string, Intl.NumberFormat>();

/**
 * A whole percentage as the active language writes it: "85 %" in German,
 * "85%" in English. The value is a percentage already (0–100), not a
 * fraction, and is rounded to a whole number.
 */
export function formatPercent(value: number, language?: string): string {
  const locale = resolveLocale(language);
  let formatter = percentFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    percentFormatters.set(locale, formatter);
  }
  return formatter.format(value / 100);
}
