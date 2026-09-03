// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  applyNameDisplayMode,
  countAmbiguousFirstNames,
  getDisplayName,
  getDisplayNameForMode,
  getTooltipName,
} from '../nameFormatting';
import { describe, it, expect } from 'vitest';

describe('nameFormatting utilities', () => {
  // Note: truncateStudentName is now an internal function and tested via getDisplayName
  describe('getDisplayName (internal truncation logic)', () => {
    it('returns name as-is when under max length (via table context)', () => {
      expect(getDisplayName('Max', 'table')).toBe('Max'); // 12 char max
      expect(getDisplayName('Anna', 'circle')).toBe('Anna'); // 12 char max
    });

    it('handles hyphenated names intelligently (via table context)', () => {
      // Shorten second part first (more readable)
      expect(getDisplayName('Jan-Patrick', 'table')).toBe('Jan-Patrick'); // 12 chars

      // Longer context allows full name
      expect(getDisplayName('Jan-Patrick', 'circle')).toBe('Jan-Patrick'); // 12 chars
    });

    it('handles names with spaces correctly (via contexts)', () => {
      // Table context (12 chars) - keeps full names more often
      expect(getDisplayName('Anna Schmidt', 'table')).toBe('Anna Schmidt');
      expect(getDisplayName('Max Mueller', 'table')).toBe('Max Mueller');

      // Circle context (12 chars) - may fit or truncate
      expect(getDisplayName('Anna Schmidt', 'circle')).toBe('Anna Schmidt'); // fits
    });

    it('handles edge cases', () => {
      expect(getDisplayName('', 'table')).toBe('');
      expect(getDisplayName('   Max   ', 'table')).toBe('Max');
      expect(getDisplayName('A-B', 'table')).toBe('A-B');
    });
  });

  describe('getDisplayName', () => {
    it('uses correct max lengths for different contexts', () => {
      const longName = 'Christopher Alexander';

      // Table context (12 chars max)
      const tableResult = getDisplayName(longName, 'table');
      expect(tableResult.length).toBeLessThanOrEqual(12);
      expect(tableResult).toBe('Christophe A');

      // Circle context (12 chars max)
      const circleResult = getDisplayName(longName, 'circle');
      expect(circleResult.length).toBeLessThanOrEqual(12);
      expect(circleResult).toBe('Christophe A');

      // PDF context (15 chars max)
      const pdfResult = getDisplayName(longName, 'pdf');
      expect(pdfResult.length).toBeLessThanOrEqual(15);
      expect(pdfResult).toBe('Christopher A');
    });

    it('handles context-specific requirements', () => {
      // Short names should remain unchanged in all contexts
      expect(getDisplayName('Max', 'table')).toBe('Max');
      expect(getDisplayName('Max', 'circle')).toBe('Max');
      expect(getDisplayName('Max', 'pdf')).toBe('Max');

      // Medium names should be handled appropriately
      const mediumName = 'Jan-Patrick';
      expect(getDisplayName(mediumName, 'table')).toBe('Jan-Patrick'); // 12 chars max - fits
      expect(getDisplayName(mediumName, 'circle')).toBe('Jan-Patrick'); // 12 chars max - fits
      expect(getDisplayName(mediumName, 'pdf')).toBe('Jan-Patrick'); // 15 chars max - fits
    });
  });

  describe('getTooltipName', () => {
    it('returns clean full name for tooltips', () => {
      expect(getTooltipName('Max Schmidt')).toBe('Max Schmidt');
      expect(getTooltipName('  Anna Mueller  ')).toBe('Anna Mueller');
      expect(getTooltipName('Jan-Patrick')).toBe('Jan-Patrick');
    });

    it('handles edge cases', () => {
      expect(getTooltipName('')).toBe('');
      expect(getTooltipName('   ')).toBe('');
    });
  });

  // Note: isNameTruncated was removed as it was unused outside tests
  describe('name truncation behavior', () => {
    it('correctly truncates names based on context', () => {
      // Short name - not truncated in any context
      expect(getDisplayName('Max', 'table')).toBe('Max');
      expect(getDisplayName('Max', 'circle')).toBe('Max');
      expect(getDisplayName('Max', 'pdf')).toBe('Max');

      // Long name - truncated differently per context
      expect(getDisplayName('Alexander', 'table')).toBe('Alexander');
      expect(getDisplayName('Alexander', 'circle')).toBe('Alexander'); // Fits
      expect(getDisplayName('Alexander', 'pdf')).toBe('Alexander'); // Fits

      // Very long name - truncated in all contexts
      const longName = 'Christopher Alexander Benjamin';
      expect(getDisplayName(longName, 'table').length).toBeLessThanOrEqual(12);
      expect(getDisplayName(longName, 'circle').length).toBeLessThanOrEqual(12);
      expect(getDisplayName(longName, 'pdf').length).toBeLessThanOrEqual(15);
    });
  });

  describe('real-world examples', () => {
    it('handles common German names correctly', () => {
      const testCases = [
        {
          name: 'Jan-Patrick Schmidt',
          table: 'Jan-P S', // Complex name - shortened second part + initial
          circle: 'Jan-P S', // Circle view shares the same truncation limit
          pdf: 'Jan-Patrick S', // Full space available (14 chars fits in 15)
        },
        {
          name: 'Claudia H.',
          table: 'Claudia H.', // Original abbreviation is preserved
          circle: 'Claudia H.', // Fits in 12 chars
          pdf: 'Claudia H.', // Fits in 15 chars
        },
        {
          name: 'Alexander',
          table: 'Alexander', // Fits entirely with extended table limit
          circle: 'Alexander', // Fits in circles (9 chars fits in 12)
          pdf: 'Alexander', // Fits in PDF (9 chars fits in 15)
        },
        {
          name: 'Marie-Claire Dupont',
          table: 'Marie-C D', // Hyphenated name shortened without trailing periods
          circle: 'Marie-C D', // Medium truncation
          pdf: 'Marie-Claire D', // Light truncation
        },
      ];

      testCases.forEach(({ name, table, circle, pdf }) => {
        expect(getDisplayName(name, 'table')).toBe(table);
        expect(getDisplayName(name, 'circle')).toBe(circle);
        expect(getDisplayName(name, 'pdf')).toBe(pdf);

        // All results should be within length limits
        expect(getDisplayName(name, 'table').length).toBeLessThanOrEqual(12);
        expect(getDisplayName(name, 'circle').length).toBeLessThanOrEqual(12);
        expect(getDisplayName(name, 'pdf').length).toBeLessThanOrEqual(15);
      });
    });

    it('preserves readability in all truncation scenarios', () => {
      const names = [
        'Christopher-Sebastian',
        'Anna-Maria Schneider',
        'Maximilian K.',
        'Jean-Baptiste',
        'Sophie-Charlotte Weber',
        'Alexander Müller',
        'Marie-Claire',
      ];

      names.forEach((name) => {
        const tableResult = getDisplayName(name, 'table');
        const circleResult = getDisplayName(name, 'circle');
        const pdfResult = getDisplayName(name, 'pdf');

        // Results should not be empty
        expect(tableResult.length).toBeGreaterThan(0);
        expect(circleResult.length).toBeGreaterThan(0);
        expect(pdfResult.length).toBeGreaterThan(0);

        // Results should preserve meaningful parts of the name
        // At least one character from the original name should be preserved
        const firstChar = name.charAt(0).toLowerCase();
        expect(tableResult.toLowerCase()).toContain(firstChar);
        expect(circleResult.toLowerCase()).toContain(firstChar);
        expect(pdfResult.toLowerCase()).toContain(firstChar);
      });
    });
  });

  describe('name display modes', () => {
    describe('applyNameDisplayMode', () => {
      it('reduces a name to its first name', () => {
        expect(applyNameDisplayMode('Anna Meier', 'firstName')).toBe('Anna');
        expect(applyNameDisplayMode('Jan-Patrick Schmidt', 'firstName')).toBe(
          'Jan-Patrick',
        );
      });

      it('appends the last initial', () => {
        expect(applyNameDisplayMode('Anna Meier', 'firstNameInitial')).toBe(
          'Anna M.',
        );
        expect(
          applyNameDisplayMode('Jan-Patrick Schmidt', 'firstNameInitial'),
        ).toBe('Jan-Patrick S.');
      });

      it('drops middle names, since the model stores one free-text name', () => {
        expect(applyNameDisplayMode('Anna Maria Meier', 'firstName')).toBe(
          'Anna',
        );
        expect(
          applyNameDisplayMode('Anna Maria Meier', 'firstNameInitial'),
        ).toBe('Anna M.');
      });

      it('reads the initial past name particles', () => {
        expect(applyNameDisplayMode('Anna von Berg', 'firstNameInitial')).toBe(
          'Anna B.',
        );
        expect(
          applyNameDisplayMode('Anna van der Berg', 'firstNameInitial'),
        ).toBe('Anna B.');
      });

      it('keeps single-token names untouched in every mode', () => {
        expect(applyNameDisplayMode('Ronaldo', 'firstName')).toBe('Ronaldo');
        expect(applyNameDisplayMode('Ronaldo', 'firstNameInitial')).toBe(
          'Ronaldo',
        );
        expect(applyNameDisplayMode('Ronaldo', 'full')).toBe('Ronaldo');
      });

      it('does not double the period of an abbreviated last name', () => {
        expect(applyNameDisplayMode('Lena M.', 'firstNameInitial')).toBe(
          'Lena M.',
        );
        expect(applyNameDisplayMode('Lena M.', 'firstName')).toBe('Lena');
      });

      it('uppercases the initial and tolerates extra whitespace', () => {
        expect(
          applyNameDisplayMode('  anna   meier  ', 'firstNameInitial'),
        ).toBe('anna M.');
      });

      it('leaves the full mode untouched apart from trimming', () => {
        expect(applyNameDisplayMode('  Anna Maria Meier ', 'full')).toBe(
          'Anna Maria Meier',
        );
      });
    });

    describe('countAmbiguousFirstNames', () => {
      it('counts every student sharing a first name', () => {
        expect(
          countAmbiguousFirstNames([
            'Lukas Meier',
            'Lukas Schneider',
            'Anna Weber',
          ]),
        ).toBe(2);
      });

      it('ignores case and returns zero when all first names are unique', () => {
        expect(countAmbiguousFirstNames(['Anna Weber', 'anna Meier'])).toBe(2);
        expect(countAmbiguousFirstNames(['Anna Weber', 'Lena Meier'])).toBe(0);
        expect(countAmbiguousFirstNames([])).toBe(0);
      });
    });

    describe('getDisplayNameForMode', () => {
      it('falls back to the plain context behaviour without a mode', () => {
        expect(getDisplayNameForMode('Anna Meier', 'table')).toBe(
          getDisplayName('Anna Meier', 'table'),
        );
      });

      it('applies the same rule to every name, not just the long ones', () => {
        // The context default keeps the short name and shortens only the long
        // one - the mixture this mode exists to avoid.
        expect(getDisplayName('Anna Meier', 'table')).toBe('Anna Meier');
        expect(
          getDisplayNameForMode('Anna Meier', 'table', 'firstNameInitial'),
        ).toBe('Anna M.');
        expect(
          getDisplayNameForMode('Lena Weber', 'table', 'firstNameInitial'),
        ).toBe('Lena W.');
      });

      it('drops the period before cutting into a first name', () => {
        // "Konstantin S." is 13 characters, one over the seat limit.
        expect(
          getDisplayNameForMode(
            'Konstantin Schneider',
            'table',
            'firstNameInitial',
          ),
        ).toBe('Konstantin S');
      });

      it('still truncates names that do not fit the seat', () => {
        const result = getDisplayNameForMode(
          'Maximiliane-Charlotte Schneider',
          'table',
          'firstName',
        );
        expect(result.length).toBeLessThanOrEqual(12);
      });

      it('never truncates in the full mode', () => {
        expect(
          getDisplayNameForMode('Maximilian Schneider', 'table', 'full'),
        ).toBe('Maximilian Schneider');
      });
    });
  });
});
