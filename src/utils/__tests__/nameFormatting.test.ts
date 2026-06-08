// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { getDisplayName, getTooltipName } from '../nameFormatting';
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
});
