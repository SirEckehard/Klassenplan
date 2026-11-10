// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { dimPathWithHole } from '@/utils/ui/spotlightHole';

describe('dimPathWithHole', () => {
  const area = { x: -10, y: -20, width: 100, height: 50 };

  it('covers the area and leaves an ellipse out at its centre', () => {
    expect(
      dimPathWithHole(area, { cx: 40, cy: 5, rx: 10, ry: 6, rotation: 0 }),
    ).toBe(
      'M -10 -20 H 90 V 30 H -10 Z ' +
        'M 50 5 A 10 6 0 1 1 30 5 A 10 6 0 1 1 50 5 Z',
    );
  });

  it('turns the ellipse with its rotation', () => {
    const d = dimPathWithHole(area, {
      cx: 0,
      cy: 0,
      rx: 10,
      ry: 6,
      rotation: 90,
    });
    const [, hole] = d.split('Z ');
    const [x, y] = hole.replace('M ', '').split(' ').map(Number);
    // The long axis now points down: the hole starts below its centre.
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
    expect(hole).toContain('A 10 6 90 1 1');
  });
});
