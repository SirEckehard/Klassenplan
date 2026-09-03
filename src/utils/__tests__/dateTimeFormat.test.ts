// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatDate,
  formatDateAndTime,
  formatDayMonth,
  formatLongDate,
  formatStoredDate,
  formatTime,
  formatTimeWithSeconds,
  resetDateTimeFormatCache,
  resolveLocale,
  toIsoDate,
} from '../dateTimeFormat';

// 31 July 2026, 14:05:03 local time. Constructed from parts rather than an ISO
// string so the assertions do not depend on the runner's timezone.
const REFERENCE = new Date(2026, 6, 31, 14, 5, 3);

describe('dateTimeFormat', () => {
  beforeEach(() => {
    resetDateTimeFormatCache();
  });

  describe('resolveLocale', () => {
    it('maps the supported languages to BCP 47 tags', () => {
      expect(resolveLocale('de')).toBe('de-DE');
      expect(resolveLocale('en')).toBe('en-US');
    });

    it('accepts regional variants reported by the language detector', () => {
      expect(resolveLocale('en-GB')).toBe('en-US');
      expect(resolveLocale('de-AT')).toBe('de-DE');
      expect(resolveLocale('EN')).toBe('en-US');
    });

    it('falls back to German for unknown languages', () => {
      expect(resolveLocale('fr')).toBe('de-DE');
      expect(resolveLocale('')).toBe('de-DE');
    });
  });

  describe('formatDate', () => {
    it('formats German dates day-first', () => {
      expect(formatDate(REFERENCE, 'de')).toBe('31.07.2026');
    });

    it('formats English dates month-first', () => {
      expect(formatDate(REFERENCE, 'en')).toBe('07/31/2026');
    });

    it('accepts timestamps and ISO strings', () => {
      expect(formatDate(REFERENCE.getTime(), 'de')).toBe('31.07.2026');
      expect(formatDate('2026-07-31T12:00:00Z', 'de')).toMatch(
        /^\d{2}\.\d{2}\.2026$/,
      );
    });

    it('returns an empty string instead of "Invalid Date"', () => {
      expect(formatDate('not a date', 'de')).toBe('');
      expect(formatDate(Number.NaN, 'en')).toBe('');
    });
  });

  describe('formatLongDate', () => {
    it('spells the month out in both languages', () => {
      expect(formatLongDate(REFERENCE, 'de')).toBe('31. Juli 2026');
      expect(formatLongDate(REFERENCE, 'en')).toBe('July 31, 2026');
    });

    it('renders the ISO release dates the changelog stores', () => {
      expect(formatLongDate('2026-09-03', 'de')).toBe('3. September 2026');
      expect(formatLongDate('2026-09-03', 'en')).toBe('September 3, 2026');
    });

    it('returns an empty string instead of "Invalid Date"', () => {
      expect(formatLongDate('not a date', 'de')).toBe('');
    });
  });

  describe('date-only ISO strings', () => {
    // `new Date('2026-09-03')` is UTC midnight, which renders as 2 September
    // west of UTC. These assertions therefore only bite outside UTC+x — run
    // the suite with TZ=America/New_York to exercise them.
    it('reads them as local midnight, not UTC', () => {
      expect(formatLongDate('2026-09-03', 'de')).toBe('3. September 2026');
      expect(formatDate('2026-09-03', 'de')).toBe('03.09.2026');
      expect(formatStoredDate('2026-01-01', 'de')).toBe('01.01.2026');
    });

    it('round-trips whatever toIsoDate wrote', () => {
      expect(formatDate(toIsoDate(REFERENCE), 'de')).toBe('31.07.2026');
    });

    it('still treats strings carrying a time as absolute instants', () => {
      expect(formatDate('2026-07-31T12:00:00Z', 'de')).toMatch(
        /^\d{2}\.\d{2}\.2026$/,
      );
    });
  });

  describe('time formats', () => {
    it('formats German times as 24 hours', () => {
      expect(formatTime(REFERENCE, 'de')).toBe('14:05');
      expect(formatTimeWithSeconds(REFERENCE, 'de')).toBe('14:05:03');
    });

    it('formats English times with a day period', () => {
      expect(formatTime(REFERENCE, 'en')).toMatch(/^02:05\sPM$/);
    });

    it('formats day and month only', () => {
      expect(formatDayMonth(REFERENCE, 'de')).toBe('31.07.');
      expect(formatDayMonth(REFERENCE, 'en')).toBe('07/31');
    });
  });

  describe('formatDateAndTime', () => {
    it('includes seconds so same-minute plan names stay distinguishable', () => {
      expect(formatDateAndTime(REFERENCE, 'de')).toBe('31.07.2026, 14:05:03');
      expect(formatDateAndTime(REFERENCE, 'en')).toMatch(
        /^07\/31\/2026, 02:05:03\sPM$/,
      );
    });
  });

  describe('toIsoDate', () => {
    it('emits YYYY-MM-DD in local time', () => {
      expect(toIsoDate(REFERENCE)).toBe('2026-07-31');
    });

    it('pads single-digit months and days', () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('returns an empty string for unparseable input', () => {
      expect(toIsoDate('nonsense')).toBe('');
    });
  });

  describe('formatStoredDate', () => {
    it('formats ISO dates in the active language', () => {
      expect(formatStoredDate('2026-07-31', 'de')).toBe('31.07.2026');
      expect(formatStoredDate('2026-07-31', 'en')).toBe('07/31/2026');
    });

    it('passes legacy German strings through untouched', () => {
      // Plans saved before the ISO switch. Reformatting them is impossible
      // (the string is ambiguous across locales), so they must survive as-is.
      expect(formatStoredDate('31.07.2026', 'en')).toBe('31.07.2026');
      expect(formatStoredDate('1.8.2026', 'de')).toBe('1.8.2026');
    });

    it('leaves anything unparseable alone rather than blanking it', () => {
      expect(formatStoredDate('', 'de')).toBe('');
      expect(formatStoredDate('irgendwas', 'de')).toBe('irgendwas');
    });
  });
});
