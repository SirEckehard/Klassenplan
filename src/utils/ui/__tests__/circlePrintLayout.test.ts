// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  fitPrintRing,
  printAvatarRadius,
  PRINT_TOKEN_MAX_RADIUS,
  PRINT_TOKEN_MIN_RADIUS,
} from '../circlePrintLayout';

const placements = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `s${index}`,
    angle: (360 / count) * index,
  }));

// A landscape A4 page's plan area with 10 mm margins.
const area = { x: 28, y: 68, width: 786, height: 499 };
// The oval a circle layout stores: 1.3 times as wide as high.
const radius = { horizontal: 338, vertical: 260 };

const reachOf = (tokenRadius: number, withPhotos: boolean) =>
  tokenRadius + (withPhotos ? 2 * printAvatarRadius(tokenRadius) : 0);

const staysInside = (
  ring: ReturnType<typeof fitPrintRing>,
  withPhotos: boolean,
) => {
  const reach = reachOf(ring.tokenRadius, withPhotos);
  for (const { x, y } of ring.positions.values()) {
    expect(x - reach).toBeGreaterThanOrEqual(area.x - 0.01);
    expect(x + reach).toBeLessThanOrEqual(area.x + area.width + 0.01);
    expect(y - reach).toBeGreaterThanOrEqual(area.y - 0.01);
    expect(y + reach).toBeLessThanOrEqual(area.y + area.height + 0.01);
  }
};

describe('fitPrintRing', () => {
  it('fills the area with the ring and keeps every place on the page', () => {
    const ring = fitPrintRing({
      placements: placements(24),
      radius,
      area,
      portrait: false,
      withPhotos: false,
    });
    staysInside(ring, false);
    // A place used to have a radius of 22 points for 24 students.
    expect(ring.tokenRadius).toBeGreaterThan(25);
    // It fills the area in whichever direction binds, here the height.
    const ys = [...ring.positions.values()].map(({ y }) => y);
    expect(
      Math.max(...ys) - Math.min(...ys) + 2 * ring.tokenRadius,
    ).toBeGreaterThan(area.height * 0.95);
  });

  it('leaves room for the photos docked outside the places', () => {
    const withPhotos = fitPrintRing({
      placements: placements(24),
      radius,
      area,
      portrait: false,
      withPhotos: true,
    });
    staysInside(withPhotos, true);
  });

  it('makes the places of a small class larger, up to the cap', () => {
    const small = fitPrintRing({
      placements: placements(6),
      radius,
      area,
      portrait: false,
      withPhotos: false,
    });
    const large = fitPrintRing({
      placements: placements(36),
      radius,
      area,
      portrait: false,
      withPhotos: false,
    });
    expect(small.tokenRadius).toBe(PRINT_TOKEN_MAX_RADIUS);
    expect(large.tokenRadius).toBeLessThan(small.tokenRadius);
    expect(large.tokenRadius).toBeGreaterThanOrEqual(PRINT_TOKEN_MIN_RADIUS);
  });

  it('turns the oval a quarter on a portrait sheet', () => {
    const portraitArea = { x: 28, y: 68, width: 539, height: 746 };
    const ring = fitPrintRing({
      placements: placements(24),
      radius,
      area: portraitArea,
      portrait: true,
      withPhotos: false,
    });
    const xs = [...ring.positions.values()].map(({ x }) => x);
    const ys = [...ring.positions.values()].map(({ y }) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(
      Math.max(...xs) - Math.min(...xs),
    );
  });
});
