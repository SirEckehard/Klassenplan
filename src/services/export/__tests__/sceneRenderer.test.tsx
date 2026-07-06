// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { renderSceneSvg } from '@/services/export/sceneRenderer';
import type { ClassroomScene } from '@/types';

const scene: ClassroomScene = {
  tables: [
    {
      x: 100,
      y: 200,
      width: 100,
      height: 60,
      rotation: 0,
      seatCount: 2,
      locked: false,
      zIndex: 0,
    },
  ],
  totalStudents: 2,
  features: [
    {
      id: 'podium-1',
      type: 'podium',
      x: 100,
      y: 50,
      width: 90,
      height: 60,
      anchor: 'free',
      movable: true,
      rotation: 0,
    },
  ],
};

describe('renderSceneSvg', () => {
  it('serializes feature icons as nested svg without foreignObject', async () => {
    const svg = await renderSceneSvg(scene, [], 'Test');

    expect(svg).toContain('data-feature-id="podium-1"');
    // The Phosphor icon must survive static markup rendering as nested <svg>.
    const svgTagCount = (svg.match(/<svg/g) ?? []).length;
    expect(svgTagCount).toBeGreaterThanOrEqual(2);
    // foreignObject would break the SVG → canvas → PDF rasterization.
    expect(svg).not.toContain('<foreignObject');
    // The old text label must be gone.
    expect(svg).not.toContain("Teacher's Desk");
  });

  it('honours the feature visibility record', async () => {
    const svg = await renderSceneSvg(scene, [], 'Test', {
      featureVisibility: { podium: false },
    });
    expect(svg).not.toContain('data-feature-id="podium-1"');
  });
});
