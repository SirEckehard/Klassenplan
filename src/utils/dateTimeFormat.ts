// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Locale-aware date and time formatting.
 *
 * Every date in the UI used to be formatted with a hardcoded `'de-DE'`, so the
 * English build showed German dates (`31.07.2026` instead of `Jul 31, 2026`).
 * These helpers resolve the locale from the active i18n language instead.
 *
 * Formatters are memoized: `Intl.DateTimeFormat` construction is the expensive
 * part, and the mix history renders up to 20 timestamps at once.
 */
import i18n from '@/i18n';

/** BCP 47 tags for the two supported UI languages. */
const LOCALE_BY_LANGUAGE: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
};

const DEFAULT_LOCALE = LOCALE_BY_LANGUAGE.de as string;

/**
 * Maps the active i18n language onto a BCP 47 tag. i18next may report a
 * regional variant (`en-GB`, `de-AT`), so only the primary subtag is matched.
 */
export function resolveLocale(language?: string): string {
  const active = language ?? i18n.language ?? 'de';
  const primary = active.split('-')[0]?.toLowerCase() ?? 'de';
  return LOCALE_BY_LANGUAGE[primary] ?? DEFAULT_LOCALE;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cacheKey = `${locale}|${JSON.stringify(options)}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function toDate(value: Date | number | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a date with the given options in the active language.
 * Returns an empty string for unparseable input so a broken timestamp cannot
 * render as `Invalid Date`.
 */
export function formatDateTime(
  value: Date | number | string,
  options: Intl.DateTimeFormatOptions,
  language?: string,
): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }
  return getFormatter(resolveLocale(language), options).format(date);
}

/** Numeric date, e.g. `31.07.2026` (de) / `07/31/2026` (en). */
export function formatDate(
  value: Date | number | string,
  language?: string,
): string {
  return formatDateTime(
    value,
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    language,
  );
}

/** Day and month only, e.g. `31.07.` (de) / `07/31` (en). */
export function formatDayMonth(
  value: Date | number | string,
  language?: string,
): string {
  return formatDateTime(value, { day: '2-digit', month: '2-digit' }, language);
}

/** Hours and minutes, e.g. `14:05` (de) / `2:05 PM` (en). */
export function formatTime(
  value: Date | number | string,
  language?: string,
): string {
  return formatDateTime(
    value,
    { hour: '2-digit', minute: '2-digit' },
    language,
  );
}

/** Hours, minutes and seconds. */
export function formatTimeWithSeconds(
  value: Date | number | string,
  language?: string,
): string {
  return formatDateTime(
    value,
    { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    language,
  );
}

/**
 * Full date and time down to the second, used for auto-generated plan names.
 * Seconds are not decoration: two plans saved in the same minute would
 * otherwise carry identical names in the history list.
 */
export function formatDateAndTime(
  value: Date | number | string,
  language?: string,
): string {
  return formatDateTime(
    value,
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
    language,
  );
}

/** `YYYY-MM-DD` in local time — the storage format for `SavedPlan.date`. */
export function toIsoDate(value: Date | number | string = new Date()): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;

/**
 * Renders a stored date string.
 *
 * Plans written before this change hold a pre-formatted German string
 * (`'31.07.2026'`); those are passed through untouched rather than migrated, so
 * no existing entry can be lost or misread. Anything in ISO 8601 — everything
 * written from now on — is formatted in the active language.
 */
export function formatStoredDate(stored: string, language?: string): string {
  if (!ISO_DATE_PATTERN.test(stored)) {
    return stored;
  }
  return formatDate(stored, language) || stored;
}

/** Clears the formatter cache. Exported for tests. */
export function resetDateTimeFormatCache(): void {
  formatterCache.clear();
}
