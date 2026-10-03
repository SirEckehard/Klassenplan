// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  renderCircleSvg,
  renderSceneSvg,
} from '@/services/export/sceneRenderer';
import { createMockStudent } from '@/__tests__/utils';
import { buildDemoClassroomScene } from '@/utils/demo/demoClass';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';

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

  describe('name display mode', () => {
    const seating: SeatingArrangement = [
      [
        createMockStudent({ id: 's1', name: 'Anna Meier' }),
        createMockStudent({ id: 's2', name: 'Maximilian Schneider' }),
      ],
    ];

    // Seat labels render as `<title>full name</title>shown label`, a long one
    // as a `tspan` per line; the assertions read the shown label, its lines
    // joined, rather than the tooltip.
    const seatLabels = (svg: string) =>
      [...svg.matchAll(/<text[^>]*><title>[^<]*<\/title>(.*?)<\/text>/g)].map(
        ([, body]) =>
          body.includes('<tspan')
            ? [...body.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)]
                .map(([, line]) => line)
                .join(' ')
            : body,
      );

    it('shortens only the overlong name without a mode', async () => {
      const svg = await renderSceneSvg(scene, seating, 'Test');

      expect(seatLabels(svg)).toContain('Anna Meier');
      expect(seatLabels(svg)).toContain('Maximilian S');
    });

    it('renders first names only', async () => {
      const svg = await renderSceneSvg(scene, seating, 'Test', {
        nameDisplay: 'firstName',
      });

      expect(seatLabels(svg)).toContain('Anna');
      expect(seatLabels(svg)).toContain('Maximilian');
    });

    it('renders every name as first name plus last initial', async () => {
      const svg = await renderSceneSvg(scene, seating, 'Test', {
        nameDisplay: 'firstNameInitial',
      });

      expect(seatLabels(svg)).toContain('Anna M.');
      // One character over the seat limit, so the period is dropped instead of
      // cutting into the first name.
      expect(seatLabels(svg)).toContain('Maximilian S');
    });

    it('keeps long names intact in the full mode', async () => {
      const svg = await renderSceneSvg(scene, seating, 'Test', {
        nameDisplay: 'full',
      });

      expect(seatLabels(svg)).toContain('Maximilian Schneider');
    });

    it('keeps the complete name in the seat tooltip', async () => {
      const svg = await renderSceneSvg(scene, seating, 'Test', {
        nameDisplay: 'firstName',
      });

      expect(svg).toContain('<title>Maximilian Schneider</title>');
    });

    describe('students who would read the same', () => {
      const frida = createMockStudent({ id: 'f1', name: 'Frida Ehrmann' });
      const eike = createMockStudent({ id: 'e1', name: 'Eike Schäfer' });
      const allStudents = [
        frida,
        createMockStudent({ id: 'f2', name: 'Frida Emmerich' }),
        eike,
        createMockStudent({ id: 'e2', name: 'Eike Schwuchow' }),
      ];

      it('lengthens their labels against the whole class, not the table', async () => {
        const svg = await renderSceneSvg(scene, [[frida, eike]], 'Test', {
          allStudents,
          nameDisplay: 'firstNameInitial',
        });

        expect(seatLabels(svg)).toContain('Frida Eh.');
        expect(seatLabels(svg)).toContain('Eike Schä.');
      });

      it('lengthens the circle labels the same way', async () => {
        const position = (student: Student, angle: number) => ({
          student,
          angle,
          x: 0,
          y: 0,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        });
        const layout: CircleLayout = {
          students: allStudents.map((student, index) =>
            position(student, index * 90),
          ),
          radius: { horizontal: 200, vertical: 150 },
          center: { x: 450, y: 300 },
          preservedNeighborhoods: 0,
          totalOriginalNeighborhoods: 0,
          newNeighborhoods: 0,
          preservationRate: 0,
          mode: 'preserve-neighbors',
          timestamp: 0,
          neighborhoodPairs: [],
        };

        const svg = await renderCircleSvg(layout, 'Test', {
          nameDisplay: 'firstName',
        });

        expect(seatLabels(svg)).toContain('Frida Eh.');
        expect(seatLabels(svg)).toContain('Frida Em.');
        expect(seatLabels(svg)).toContain('Eike Schä.');
        expect(seatLabels(svg)).toContain('Eike Schw.');
      });
    });
  });

  describe('framing the sheet', () => {
    const outline = 'width="900" height="600"';
    const scaleOf = (svg: string) =>
      Number(/rotate\(\d+\) scale\(([\d.]+)\)/.exec(svg)?.[1]);
    // The sample class's room: twelve double desks, the board and the door
    // on the right wall, windows on the left.
    const sampleRoom = buildDemoClassroomScene(24);

    it('frames the tables without the room outline', async () => {
      const svg = await renderSceneSvg(sampleRoom, [], 'Test');
      expect(svg).not.toContain(outline);
    });

    it('draws the plan far larger than the whole room left it', async () => {
      const portrait = await renderSceneSvg(sampleRoom, [], 'Test', {
        orientation: 'portrait',
      });
      const landscape = await renderSceneSvg(sampleRoom, [], 'Test', {
        orientation: 'landscape',
      });
      // The whole room came out at 0.757 in portrait and 0.581 in landscape.
      expect(scaleOf(portrait)).toBeGreaterThan(0.95);
      expect(scaleOf(landscape)).toBeGreaterThan(0.85);
    });

    it('does not blow a few tables up to fill the page', async () => {
      const svg = await renderSceneSvg(scene, [], 'Test');
      expect(scaleOf(svg)).toBe(1.8);
    });

    it('shows the whole room with its outline when asked to', async () => {
      const svg = await renderSceneSvg(sampleRoom, [], 'Test', {
        frameOnTables: false,
      });
      expect(svg).toContain(outline);
      // Still larger than before: 10 mm margins instead of 14 to 25.
      expect(scaleOf(svg)).toBeGreaterThan(0.757);
    });

    it('frames the whole room when there is nothing on it', async () => {
      const empty: ClassroomScene = {
        tables: [],
        totalStudents: 0,
        features: [],
      };
      const svg = await renderSceneSvg(empty, [], 'Test');
      expect(svg).not.toContain(outline);
      expect(scaleOf(svg)).toBeGreaterThan(0.5);
    });
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
