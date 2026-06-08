import { describe, it, expect } from 'vitest';
import {
  calculateResponsiveViewBox,
  formatViewBox,
  calculateResponsiveFontSize,
} from '../responsiveViewBox';

describe('responsiveViewBox', () => {
  describe('calculateResponsiveViewBox', () => {
    it('calculates viewBox for container wider than content', () => {
      const result = calculateResponsiveViewBox({
        containerWidth: 1200,
        containerHeight: 600,
        contentWidth: 900,
        contentHeight: 600,
        padding: 0,
      });

      // Container ratio 2.0 matches max aspect ratio, so expand width based on content height
      expect(result.width).toBe(1200); // 600 * 2.0
      expect(result.height).toBe(600);
      expect(result.x).toBe(-150); // (900 - 1200) / 2
      expect(result.y).toBe(0);
    });

    it('calculates viewBox for container taller than content', () => {
      const result = calculateResponsiveViewBox({
        containerWidth: 600,
        containerHeight: 1200,
        contentWidth: 900,
        contentHeight: 600,
        padding: 0,
      });

      // Container ratio 0.5 matches min aspect ratio, so expand height based on content width
      expect(result.width).toBe(900);
      expect(result.height).toBe(1800); // 900 / 0.5
      expect(result.x).toBe(0);
      expect(result.y).toBe(-600); // (600 - 1800) / 2
    });

    it('applies padding correctly', () => {
      const result = calculateResponsiveViewBox({
        containerWidth: 900,
        containerHeight: 600,
        contentWidth: 900,
        contentHeight: 600,
        padding: 20,
      });

      expect(result.width).toBe(940); // 900 + 40
      expect(result.height).toBe(640); // 600 + 40
      expect(result.x).toBe(-20); // (900 - 940) / 2
      expect(result.y).toBe(-20); // (600 - 640) / 2
    });

    it('respects aspect ratio limits', () => {
      const result = calculateResponsiveViewBox({
        containerWidth: 2000,
        containerHeight: 500,
        contentWidth: 900,
        contentHeight: 600,
        minAspectRatio: 0.8,
        maxAspectRatio: 1.5,
        padding: 0,
      });

      // Container ratio is 4.0, but should be limited to 1.5
      expect(result.width).toBe(900);
      expect(result.height).toBe(600); // 900 / 1.5
    });
  });

  describe('formatViewBox', () => {
    it('formats viewBox dimensions as string', () => {
      const result = formatViewBox({
        x: 10,
        y: 20,
        width: 300,
        height: 200,
      });

      expect(result).toBe('10 20 300 200');
    });

    it('handles negative coordinates', () => {
      const result = formatViewBox({
        x: -10,
        y: -5,
        width: 320,
        height: 210,
      });

      expect(result).toBe('-10 -5 320 210');
    });
  });

  describe('calculateResponsiveFontSize', () => {
    it('scales font size proportionally', () => {
      const result = calculateResponsiveFontSize(12, 1800, 900); // 2x scale
      expect(result).toBe(24);
    });

    it('respects minimum font size', () => {
      const result = calculateResponsiveFontSize(12, 450, 900, 10, 24); // 0.5x scale
      expect(result).toBe(10); // Should not go below minSize
    });

    it('respects maximum font size', () => {
      const result = calculateResponsiveFontSize(12, 3600, 900, 8, 20); // 4x scale
      expect(result).toBe(20); // Should not go above maxSize
    });

    it('uses default base viewBox width', () => {
      const result = calculateResponsiveFontSize(14, 1800); // Should use 900 as base
      expect(result).toBe(24); // Clipped to maxSize of 24
    });

    it('handles edge cases', () => {
      // Zero viewBox width
      const result1 = calculateResponsiveFontSize(12, 0);
      expect(result1).toBe(8); // Should default to minSize

      // Negative scale
      const result2 = calculateResponsiveFontSize(12, -900);
      expect(result2).toBe(8); // Should default to minSize
    });
  });
});
