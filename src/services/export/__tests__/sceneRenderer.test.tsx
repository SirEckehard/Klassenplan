// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { renderSceneSvg } from '@/services/export/sceneRenderer';
import { createMockStudent } from '@/__tests__/utils';
import type { ClassroomScene, SeatingArrangement } from '@/types';

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

  describe('flipped viewing direction', () => {
    it('leaves the landscape export unrotated by default', async () => {
      const svg = await renderSceneSvg(scene, [], 'Test', {
        orientation: 'landscape',
      });

      expect(svg).toContain('rotate(0)');
      expect(svg).not.toContain('rotate(180)');
    });

    it('rotates the landscape classroom by 180 degrees when flipped', async () => {
      const svg = await renderSceneSvg(scene, [], 'Test', {
        orientation: 'landscape',
        flipped: true,
      });

      expect(svg).toContain('rotate(180)');
    });

    it('turns the portrait rotation from 90 into 270 degrees when flipped', async () => {
      const upright = await renderSceneSvg(scene, [], 'Test', {
        orientation: 'portrait',
      });
      const flipped = await renderSceneSvg(scene, [], 'Test', {
        orientation: 'portrait',
        flipped: true,
      });

      expect(upright).toContain('rotate(90)');
      expect(flipped).toContain('rotate(270)');
      expect(flipped).not.toContain('rotate(90)');
    });

    it('counter-rotates the seat labels so names stay upright', async () => {
      const seating: SeatingArrangement = [
        [createMockStudent({ id: 's1', name: 'Anna' }), null],
      ];
      const svg = await renderSceneSvg(scene, seating, 'Test', {
        orientation: 'landscape',
        flipped: true,
      });

      // Classroom at 180° → every seat label rotates back by the same amount.
      expect(svg).toContain('rotate(-180');
    });
  });
});
