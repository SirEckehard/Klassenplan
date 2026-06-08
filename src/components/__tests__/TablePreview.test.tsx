// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TablePreview from '../TablePreview';

describe('TablePreview', () => {
  it('renders correct number of seats for single table', () => {
    const { getByTestId } = render(<TablePreview type="single" />);
    const svg = getByTestId('table-preview');
    expect(svg.querySelectorAll('circle').length).toBe(1);
  });

  it('renders correct number of seats for double table', () => {
    const { getByTestId } = render(<TablePreview type="double" />);
    const svg = getByTestId('table-preview');
    expect(svg.querySelectorAll('circle').length).toBe(2);
  });

  it('renders correct number of seats for group4', () => {
    const { getByTestId } = render(<TablePreview type="group4" />);
    const svg = getByTestId('table-preview');
    expect(svg.querySelectorAll('circle').length).toBe(4);
  });

  it('renders correct number of seats for group6', () => {
    const { getByTestId } = render(<TablePreview type="group6" />);
    const svg = getByTestId('table-preview');
    expect(svg.querySelectorAll('circle').length).toBe(6);
  });

  it('positions group6 seats in U-shaped layout', () => {
    const { getByTestId } = render(<TablePreview type="group6" />);
    const svg = getByTestId('table-preview');
    const circles = svg.querySelectorAll('circle');

    expect(circles.length).toBe(6);

    // Convert NodeList to array for easier testing
    const circlePositions = Array.from(circles).map((circle) => ({
      cx: parseFloat(circle.getAttribute('cx') || '0'),
      cy: parseFloat(circle.getAttribute('cy') || '0'),
    }));

    const xs = circlePositions.map((pos) => pos.cx);
    const ys = circlePositions.map((pos) => pos.cy);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const isClose = (value: number, target: number) =>
      Math.abs(value - target) < 0.1;

    const leftSeats = circlePositions.filter((pos) => isClose(pos.cx, minX));
    const topSeats = circlePositions.filter((pos) => isClose(pos.cy, minY));
    const bottomSeats = circlePositions.filter((pos) => isClose(pos.cy, maxY));

    expect(leftSeats).toHaveLength(2);
    expect(topSeats).toHaveLength(2);
    expect(bottomSeats).toHaveLength(2);
  });

  it('renders table rectangle with correct dimensions', () => {
    const { getByTestId } = render(<TablePreview type="group6" />);
    const svg = getByTestId('table-preview');
    const rect = svg.querySelector('rect');

    expect(rect).toBeTruthy();
    expect(rect?.getAttribute('width')).toBeTruthy();
    expect(rect?.getAttribute('height')).toBeTruthy();
  });

  it('scales group6 table preview correctly', () => {
    const { getByTestId } = render(<TablePreview type="group6" />);
    const svg = getByTestId('table-preview');
    const rect = svg.querySelector('rect');

    if (rect) {
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');

      // Group6 should be wider than it is tall (180x120 proportions)
      // After scaling: ~107x71 pixels for 80px preview height
      expect(width).toBeGreaterThan(height);

      // Should maintain 180:120 ratio (1.5:1)
      const ratio = width / height;
      expect(ratio).toBeCloseTo(1.5, 0.1);
    }
  });

  it('renders all table types without errors', () => {
    // Test that all table template types can be rendered
    const types = ['single', 'double', 'group4', 'group6'] as const;

    types.forEach((type) => {
      const { getByTestId, unmount } = render(<TablePreview type={type} />);
      const svg = getByTestId('table-preview');
      expect(svg).toBeTruthy();

      // Should have at least one circle (seat)
      expect(svg.querySelectorAll('circle').length).toBeGreaterThan(0);

      // Should have a table rectangle
      expect(svg.querySelector('rect')).toBeTruthy();

      // Clean up to avoid multiple elements issue
      unmount();
    });
  });
});
