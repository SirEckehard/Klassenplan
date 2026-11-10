// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PresentationSpotlight from '@/components/scene/PresentationSpotlight';
import {
  createMockClassroomScene,
  createMockStudent,
} from '@/__tests__/utils/testHelpers';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';
import {
  calculateSeatLayout,
  calculateSeatPosition,
} from '@/utils/math/positionCalculations';

describe('PresentationSpotlight', () => {
  const scene = createMockClassroomScene(1);
  const seating = [[createMockStudent(), createMockStudent()]];
  const pad = 20;
  const frame = {
    rotation: 180,
    boxWidth: CLASSROOM_WIDTH + pad * 2,
    boxHeight: CLASSROOM_HEIGHT + pad * 2,
  };
  const viewBox = {
    x: 0,
    y: 0,
    width: frame.boxWidth,
    height: frame.boxHeight,
  };

  const renderSpotlight = (dim?: boolean) =>
    render(
      <svg>
        <PresentationSpotlight
          scene={scene}
          seating={seating}
          target={{ tableIndex: 0, seatIndex: 1 }}
          viewBox={viewBox}
          frame={frame}
          dim={dim}
        />
      </svg>,
    ).container;

  it('rings the seat where the turned classroom shows it', () => {
    const table = scene.tables[0];
    const seat = calculateSeatPosition({
      mode: 'scene',
      table,
      seatIndex: 1,
      layout: calculateSeatLayout(table),
    });
    const ring = renderSpotlight().querySelector('ellipse');
    // Turned by 180° about the classroom's centre, inside the padded box.
    expect(Number(ring?.getAttribute('cx'))).toBeCloseTo(
      CLASSROOM_WIDTH - seat.x + pad,
    );
    expect(Number(ring?.getAttribute('cy'))).toBeCloseTo(
      CLASSROOM_HEIGHT - seat.y + pad,
    );
  });

  it('dims with one even-odd path, not a mask', () => {
    const container = renderSpotlight();
    expect(container.querySelector('mask')).toBeNull();
    expect(container.querySelector('path[fill-rule="evenodd"]')).not.toBeNull();
    expect(renderSpotlight(false).querySelector('path')).toBeNull();
  });
});
